
(function (global) {
    'use strict';
    var LIB_METHODS = ['setItem', 'getItem', 'hasItem', 'removeItem', 'getKeys', 'getLength', 'clear'];
    var CONFIGURABLE_PROPS = ['dbName', 'storeName', 'defaultType'];

    var TYPE_DB = 'db';
    var TYPE_LS = 'ls';
    var TYPE_AUTO = 'auto';

    var TR_READ_WRITE = 'readwrite';
    var TR_READ_ONLY = 'readonly';

    var ERR_PREFIX = '[kv-keeper] ';

    var getObjectKeys = Object.keys;

    var instances = {};
    var errorListeners = [];

    function noop() {}

    /**
     * KvKeeper
     * @type {KvKeeper.Host}
     */
    var KvKeeper = {};

    /* ~EXPORTING START~ */
    var defineAsGlobal = true;

    // as CommonJS
    if (typeof exports === 'object') {
        exports = KvKeeper;
        defineAsGlobal = false;
    }

    /* global modules */
    // as YModules module
    if (global.modules && modules.define && modules.require) {
        modules.define('kv-keeper', function (provide) {
            provide(KvKeeper);
        });
        defineAsGlobal = false;
    }

    // as global
    if (defineAsGlobal) {
        global.KvKeeper = KvKeeper;
    }
    /* ~EXPORTING END~ */

    setDefaultConfiguration();

    /**
     * Warm up storage connection
     */
    KvKeeper.preconnect = function () {
        KvKeeper.getStorage(noop);
    };

    /**
     * Add a global error listener
     * @param {Function} listener
     */
    KvKeeper.addErrorListener = function (listener) {
        if (typeof listener != 'function') {
            throw new Error('Listener must be a function');
        }
        errorListeners.push(listener);
    };

    /**
     * Remove an error listener
     * @param {Function} listener
     */
    KvKeeper.removeErrorListener = function (listener) {
        var index = errorListeners.indexOf(listener);
        if (index > -1) {
            errorListeners.splice(index, 1);
        }
    };

    /**
     * Get all error listeners
     * @returns {Function[]}
     */
    KvKeeper.getErrorListeners = function () {
        return errorListeners;
    };

    /**
     * Remove all the error listeners
     */
    KvKeeper.removeAllErrorListeners = function () {
        errorListeners = [];
    };

    function setDefaultConfiguration() {
        KvKeeper.dbVersion = 1;
        KvKeeper.dbName = 'kv-keeper-items';
        KvKeeper.storeName = 'items';
        KvKeeper.defaultType = TYPE_AUTO;
        KvKeeper.namespace = createNamespace();
    }

    function createNamespace() {
        return KvKeeper.dbName + ':' + KvKeeper.storeName + ':';
    }

    /**
     * Configure KvKeeper. Can be ran only once
     * @param {Object} options
     * @param {String} [options.dbName]
     * @param {String} [options.storeMame]
     * @param {String} [options.defaultType]
     */
    KvKeeper.configure = function (options) {
        if (KvKeeper.__configured) {
            throw new Error(ERR_PREFIX + 'Configuration can be set only once');
        }
        KvKeeper.__configured = true;

        if ('defaultType' in options) {
            validateType(options.defaultType);
        }

        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                if (CONFIGURABLE_PROPS.indexOf(key) > -1) {
                    KvKeeper[key] = options[key];
                } else {
                    setDefaultConfiguration();
                    throw new Error(ERR_PREFIX + key + ' is not configurable');
                }
            }
        }

        KvKeeper.namespace = createNamespace();
    };

    function validateType(type) {
        if ([TYPE_LS, TYPE_DB, TYPE_AUTO].indexOf(type) == -1) {
            throw new Error(ERR_PREFIX + 'Invalid type ' + type);
        }
    }

    function wrapCallback(callback) {
        var cb = callback || noop;
        return function wrappedCallback(err, result) {
            if (err) {
                for (var i = 0; i < errorListeners.length; i++) {
                    errorListeners[i](err);
                }
            }
            return cb(err, result);
        };
    }

    /**
     * Get key-value storage instance
     * @param {String} [type=auto] Storage type: ls, db, auto
     * @param {KvKeeper.Callback} callback
     */
    KvKeeper.getStorage = function (type, callback) {
        var finalType = type;
        var finalCallback = callback;

        if (typeof finalType == 'function') {
            finalCallback = type;
            finalType = null;
        }

        finalCallback = wrapCallback(finalCallback);

        finalType = finalType || KvKeeper.defaultType;
        validateType(finalType);

        KvKeeper._getInstance(finalType, finalCallback);
    };

    KvKeeper._getInstance = function (type, callback) {
        var instance = instances[type];
        if (instance) {
            return callback(null, instance);
        }

        var errorMessage = ERR_PREFIX + (
                type == TYPE_AUTO ?
                    'No supported storages' :
                    'No "' + type + '" storage support'
            );

        if (instance === null) {
            return callback(new Error(errorMessage));
        }

        var data = createInstance(type);
        if (!data || !data.instance) {
            return callback(new Error(errorMessage));
        }

        instance = instances[type] = data.instance;
        instance.init(callback);
    };

    function createInstance(type) {
        switch (type) {
            case TYPE_AUTO:
                return createAutoInstance();
            case TYPE_DB:
                return formInstanceData(TYPE_DB, DB.create());
            case TYPE_LS:
                return formInstanceData(TYPE_LS, LS.create());
        }
        return null;
    }

    function formInstanceData(type, instance) {
        return {type: type, instance: instance};
    }

    function createAutoInstance() {
        var instance = instances.db;
        if (instance) {
            return formInstanceData(TYPE_DB, instance);
        }

        instance = typeof DB != 'undefined' && DB.create();
        if (instance) {
            return formInstanceData(TYPE_DB, instance);
        }

        instance = instances.ls;
        if (instance) {
            return formInstanceData(TYPE_LS, instance);
        }

        if (typeof LS != 'undefined') {
            return formInstanceData(TYPE_LS, LS.create());
        }
    }

    // Add static methods with auto storage
    LIB_METHODS.forEach(function setMethod(method) {
        KvKeeper[method] = function wrappedMethod() {
            var args = [];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            KvKeeper.getStorage(function storageCallback(err, storage) {
                if (err) {
                    var callback = args.filter(function getCallback(arg) {
                        return typeof arg == 'function';
                    })[0] || noop;
                    return callback(err);
                }
                storage[method].apply(storage, args);
            });
        };
    });
    
    /**
     * IndexedDB driver
     * @constructor
     */
    var DB = KvKeeper.StorageDB = function (indexedDb) {
        var that = this;
        var dbInstance;

        /**
         * Ensure IndexedDB driver is ready
         * @param {KvKeeper.Callback} callback
         */
        that.init = function (callback) {
            var cb = wrapCallback(callback);

            openDb(indexedDb, function (err, db) {
                if (err) {
                    return cb(err);
                }
                dbInstance = db;
                cb(null, that);
            });
        };

        /**
         * Close DB connection
         */
        that.close = function () {
            if (dbInstance) {
                dbInstance.close();
            }
            delete instances.db;
            delete instances.auto;
        };

        /**
         * Set item to DB
         * @param {String} key
         * @param {String} value
         * @param {KvKeeper.Callback} callback
         */
        that.setItem = function (key, value, callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).put({key: key, value: String(value)}),
                wrapRequestCallback(cb)
            );
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.getItem = function (key, callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).get(key),
                function getItemCallback(err, event) {
                    if (err) {
                        return cb(err);
                    }
                    var res = event.target.result;
                    cb(null, res ? res.value : null);
                }
            );
        };

        /**
         * Check if DB has item
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.hasItem = function (key, callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).get(key),
                function hasItemCallback(err, event) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, Boolean(event.target.result));
                }
            );
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.removeItem = function (key, callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).delete(key),
                wrapRequestCallback(function removeItemCallback(err, event) {
                    // We need to defer callback for some old browsers
                    // which needs timeout to make removing
                    setTimeout(cb.bind(null, err, event), 0);
                })
            );
        };

        /**
         * Get keys of stored items
         * @param {KvKeeper.Callback} callback
         */
        that.getKeys = function (callback) {
            var cb = wrapCallback(callback);

            var keys = [];

            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).openCursor(),
                function getKeysCallback(err, event) {
                    if (err) {
                        return cb(err);
                    }

                    var cursor = event.target.result;
                    if (cursor) {
                        keys.push(cursor.key);
                        return cursor.continue();
                    }

                    cb(null, keys);
                }
            );
        };

        /**
         * Get stored items count
         * @param {KvKeeper.Callback} callback
         */
        that.getLength = function (callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).count(),
                wrapRequestCallback(cb)
            );
        };

        /**
         * Clear all the storage
         * @param {KvKeeper.Callback} callback
         */
        that.clear = function (callback) {
            var cb = wrapCallback(callback);

            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).clear(),
                wrapRequestCallback(cb)
            );
        };

        /**
         * Get store from transaction with given type
         * @param {String} type TYPE_READ_ONLY or TYPE_READ_WRITE
         * @returns {IDBObjectStore}
         */
        function getTransactionStore(type) {
            return dbInstance.transaction([KvKeeper.storeName], type)
                .objectStore(KvKeeper.storeName);
        }
    };

    /**
     * Create DB storage instance
     * or null if not supported
     * @returns {KvKeeper.Storage|null}
     */
    DB.create = function () {
        var indexedDb = global.indexedDB;
        return indexedDb && indexedDb.open && global.IDBKeyRange ? new DB(indexedDb) : null;
    };

    /**
     * Create DB schema
     * @param {IDBDatabase} db
     */
    DB.setupSchema = function (db) {
        if (!db.objectStoreNames.contains(KvKeeper.storeName)) {
            db.createObjectStore(KvKeeper.storeName, {keyPath: 'key'});
        }
    };

    /**
     * Open connection to DB
     * @param {IDBFactory} indexedDb
     * @param {KvKeeper.Callback} callback
     */
    function openDb(indexedDb, callback) {
        var cb = wrapCallback(callback);

        var req = indexedDb.open(KvKeeper.dbName, KvKeeper.dbVersion);

        req.onsuccess = function () {
            var db = req.result;

            db.onversionchange = function () {
                db.close(); // Triggers mostly on database deletion
            };

            cb(null, db);
        };

        req.onerror = function (event) {
            var err = new Error(ERR_PREFIX + 'DB open request error');
            err.event = event;
            cb(err);
        };

        req.onupgradeneeded = function () {
            DB.setupSchema(req.result);
        };

        req.onblocked = function (event) {
            var err = new Error(ERR_PREFIX + 'DB is blocked');
            err.event = event;
            cb(err);
        };
    }

    /**
     * Wrap IDB request for using Node-style callback instead of separated onsuccess and onerror
     * @param {IDBRequest} req
     * @param {KvKeeper.Callback} callback
     */
    function wrapDbRequest(req, callback) {
        req.onsuccess = function (event) {
            callback(null, event);
        };

        req.onerror = function (event) {
            var errMessage = req.error.message || 'Unknown error ';
            var err = new Error(ERR_PREFIX + 'DB request error: ' + errMessage);
            err.event = event;
            callback(err);
        };
    }

    /**
     * Wrap KvKeeper.Callback for extracting data and correct error handling
     * @param {KvKeeper.Callback} callback
     * @returns {Function}
     */
    function wrapRequestCallback(callback) {
        return function requestCallback(err, event) {
            err ?
                callback(err) :
                callback(null, event.target.result);
        };
    }
    
})(self);

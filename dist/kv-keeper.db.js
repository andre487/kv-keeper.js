
(function (global, exports) {
    'use strict';
    var LIB_METHODS = ['setItem', 'getItem', 'removeItem', 'getKeys', 'getLength', 'clear'];
    var CONFIGURABLE_PROPS = ['dbName', 'storeName', 'defaultType'];

    var TYPE_DB = 'db';
    var TYPE_LS = 'ls';
    var TYPE_AUTO = 'auto';

    var TR_READ_WRITE = 'readwrite';
    var TR_READ_ONLY = 'readonly';

    var ERR_PREFIX = '[kv-keeper] ';

    var getObjectKeys = Object.keys;

    var instances = {};

    /**
     * KvKeeper
     * @type {KvKeeper.Host}
     */
    var KvKeeper;

    // Exporting
    if (exports) { // CommonJS
        KvKeeper = exports;
    } else { // Globals
        global.KvKeeper = KvKeeper = {};
    }

    setDefaultConfiguration();

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

        getObjectKeys(options).forEach(function (key) {
            if (CONFIGURABLE_PROPS.indexOf(key) > -1) {
                KvKeeper[key] = options[key];
            } else {
                setDefaultConfiguration();
                throw new Error(ERR_PREFIX + key + ' is not configurable');
            }
        });

        KvKeeper.namespace = createNamespace();
    };

    function validateType(type) {
        if ([TYPE_LS, TYPE_DB, TYPE_AUTO].indexOf(type) == -1) {
            throw new Error(ERR_PREFIX + 'Invalid type ' + type);
        }
    }

    /**
     * Get key-value storage instance
     * @param {String} [type=auto] Storage type: ls, db, auto
     * @param {KvKeeper.Callback} callback
     */
    KvKeeper.getStorage = function (type, callback) {
        if (typeof type == 'function') {
            callback = type;
            type = null;
        }

        type = type || KvKeeper.defaultType;
        validateType(type);

        var storage = KvKeeper._getInstance(type);
        if (storage) {
            storage.init(callback);
        } else {
            var message = type == TYPE_AUTO ? 'No supported stores' : 'No "' + type + '" store support';
            callback(new Error(ERR_PREFIX + message));
        }
    };

    KvKeeper._getInstance = function (type) {
        var instance = instances[type];
        if (!instance) {
            var data = createInstance(type);
            instance = instances[data.type] = data.instance;
        }
        return instance;
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
            return formInstanceData(TYPE_DB, LS.create());
        }
    }

    // Add static methods with auto storage
    LIB_METHODS.forEach(function (method) {
        KvKeeper[method] = function () {
            var args = arguments;
            KvKeeper.getStorage(function (err, storage) {
                if (err) {
                    var callback = args[args.length - 1];
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
            openDb(indexedDb, function (err, db) {
                if (err) {
                    return callback(err);
                }
                dbInstance = db;
                callback(null, that);
            });
        };

        /**
         * Close DB connection
         */
        that.close = function () {
            dbInstance.close();
            instances.db = null;
        };

        /**
         * Set item to DB
         * @param {String} key
         * @param {String} value
         * @param {KvKeeper.Callback} callback
         */
        that.setItem = function (key, value, callback) {
            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).put({key: key, value: String(value)}),
                wrapRequestCallback(callback)
            );
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.getItem = function (key, callback) {
            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).get(key),
                function (err, event) {
                    if (err) {
                        return callback(err);
                    }
                    var res = event.target.result;
                    callback(null, res ? res.value : null);
                }
            );
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.removeItem = function (key, callback) {
            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).delete(key),
                wrapRequestCallback(function (err, event) {
                    // We need to defer callback for some old browsers
                    // which needs timeout to make removing
                    setTimeout(callback.bind(null, err, event), 0);
                })
            );
        };

        /**
         * Get keys of stored items
         * @param {KvKeeper.Callback} callback
         */
        that.getKeys = function (callback) {
            var keys = [];

            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).openCursor(),
                function (err, event) {
                    if (err) {
                        return callback(err);
                    }

                    var cursor = event.target.result;
                    if (cursor) {
                        keys.push(cursor.key);
                        return cursor.continue();
                    }

                    callback(null, keys);
                }
            );
        };

        /**
         * Get stored items count
         * @param {KvKeeper.Callback} callback
         */
        that.getLength = function (callback) {
            wrapDbRequest(
                getTransactionStore(TR_READ_ONLY).count(),
                wrapRequestCallback(callback)
            );
        };

        /**
         * Clear all the storage
         * @param {KvKeeper.Callback} callback
         */
        that.clear = function (callback) {
            wrapDbRequest(
                getTransactionStore(TR_READ_WRITE).clear(),
                wrapRequestCallback(callback)
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
        var req = indexedDb.open(KvKeeper.dbName, KvKeeper.dbVersion);

        req.onsuccess = function () {
            var db = req.result;

            db.onversionchange = function () {
                db.close(); // Triggers mostly on database deletion
            };

            callback(null, db);
        };

        req.onerror = function (event) {
            var err = new Error(ERR_PREFIX + 'DB open request error');
            err.event = event;
            callback(err);
        };

        req.onupgradeneeded = function () {
            DB.setupSchema(req.result);
        };

        req.onblocked = function (event) {
            var err = new Error(ERR_PREFIX + 'DB is blocked');
            err.event = event;
            callback(err);
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
        return function (err, event) {
            err ?
                callback(err) :
                callback(null, event.target.result);
        };
    }
    
})(self, typeof exports != 'undefined' && exports);
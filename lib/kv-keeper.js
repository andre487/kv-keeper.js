(function (global, undefined) {
    'use strict';
    var TR_READ_WRITE = 'readwrite';
    var TR_READ_ONLY = 'readonly';

    var TYPE_AUTO = 'auto';
    var TYPE_DB = 'db';
    var TYPE_LS = 'ls';

    var instances = {};

    /**
     * KvKeeper
     * @type {KvKeeper.Host}
     */
    var KvKeeper;

    // Exporting
    if (typeof exports !== 'undefined') { // CommonJS
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

    var configurable = ['dbName', 'storeName', 'defaultType'];

    /**
     * Configure KvKeeper. Can be ran only once
     * @param {Object} options
     */
    KvKeeper.configure = function (options) {
        if (KvKeeper.__configured) {
            throw new Error('[kv-keeper] Configuration can be set only once');
        }
        KvKeeper.__configured = true;

        if ('defaultType' in options) {
            validateType(options.defaultType);
        }

        Object.keys(options).forEach(function (key) {
            if (configurable.indexOf(key) > -1) {
                KvKeeper[key] = options[key];
            } else {
                setDefaultConfiguration();
                throw new Error('[kv-keeper] Option ' + key + ' is not configurable');
            }
        });

        KvKeeper.namespace = createNamespace();
    };

    var validTypes = [TYPE_LS, TYPE_DB, TYPE_AUTO];

    function validateType(type) {
        if (validTypes.indexOf(type) == -1) {
            throw new Error('[kv-keeper] Invalid type ' + type);
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
            var message = type == TYPE_AUTO ?
                'This platform does not support any storages' :
                'Storage with type "' + type + '" is not supported';
            callback(new Error('[kv-keeper] ' + message));
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

        instance = DB.create();
        if (instance) {
            return formInstanceData(TYPE_DB, instance);
        }

        instance = instances.ls;
        if (instance) {
            return formInstanceData(TYPE_LS, instance);
        }
        return formInstanceData(TYPE_DB, LS.create());
    }

    // Add static methods with auto storage
    var methods = ['setItem', 'getItem', 'hasItem', 'removeItem', 'getKeys', 'getLength', 'clear'];

    methods.forEach(function (method) {
        KvKeeper[method] = function () {
            var args = [];
            [].push.apply(args, arguments);

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
     * LocalStorage driver
     * @constructor
     */
    var LS = KvKeeper.StorageLS = function (storage) {
        var that = this;

        /**
         * Ensure LocalStorage driver is ready
         * @param {KvKeeper.Callback} callback
         */
        that.init = function (callback) {
            callback(null, that);
        };

        /**
         * Set item to storage
         * @param {String} key
         * @param {String} value
         * @param {KvKeeper.Callback} callback
         */
        that.setItem = function (key, value, callback) {
            key = LS.createKey(key);
            try { // Error example: no space left for store or on device
                storage.setItem(key, value);
                callback(null);
            } catch (e) {
                callback(e);
            }
        };

        /**
         * Get item from storage
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.getItem = function (key, callback) {
            key = LS.createKey(key);
            callback(null, storage.getItem(key));
        };

        /**
         * Is item exist in localStorage?
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.hasItem = function (key, callback) {
            key = LS.createKey(key);
            callback(null, storage[key] !== undefined); // Can't check by key inclusion because of Opera's bug
        };

        /**
         * Remove item from storage by key
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.removeItem = function (key, callback) {
            key = LS.createKey(key);
            storage.removeItem(key);
            callback(null);
        };

        /**
         * Get keys of stored items
         * @param {KvKeeper.Callback} callback
         */
        that.getKeys = function (callback) {
            var keys = Object.keys(storage).filter(LS.isKeeperKey);
            callback(null, keys);
        };

        /**
         * Get stored items count
         * @param {KvKeeper.Callback} callback
         */
        that.getLength = function (callback) {
            callback(null, storage.length);
        };

        /**
         * Clear all the storage
         * @param {KvKeeper.Callback} [callback]
         */
        that.clear = function (callback) {
            Object.keys(storage)
                .filter(LS.isKeeperKey)
                .forEach(storage.removeItem, storage);
            callback(null);
        };

        /**
         * Close instance
         */
        that.close = function () {
            instances.ls = null;
        };
    };

    /**
     * Build a namespaced key for LS
     * @param {String} base
     * @returns {String}
     */
    LS.createKey = function (base) {
        return KvKeeper.namespace + base;
    };

    /**
     * Test is key ours
     * @param {String} key
     * @returns {Boolean}
     */
    LS.isKeeperKey = function (key) {
        return key.indexOf(KvKeeper.namespace) == 0;
    };

    /**
     * Create LS storage instance
     * or null if localStorage is not supported
     * @returns {KvKeeper.Storage|null}
     */
    LS.create = function () {
        var storage = global.localStorage;
        return storage ? new LS(storage) : null;
    };

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
         * @param {KvKeeper.Callback} [callback]
         */
        that.setItem = function (key, value, callback) {
            var req = getTransactionStore(TR_READ_WRITE).put({key: key, value: value});

            wrapDbRequest(req, dataGetter(callback));
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} [callback]
         */
        that.getItem = function (key, callback) {
            var req = getTransactionStore(TR_READ_ONLY).get(key);

            wrapDbRequest(req, dataGetter(callback, 'target.result.value'));
        };

        /**
         * Is item exist in DB?
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.hasItem = function (key, callback) {
            var req = getTransactionStore(TR_READ_ONLY).openCursor(key);

            wrapDbRequest(req, function (err, event) {
                if (err) {
                    return callback(err);
                }
                callback(null, Boolean(event.target.result)); // Check is cursor not empty
            });
        };

        /**
         * Get item from DB
         * @param {String} key
         * @param {KvKeeper.Callback} [callback]
         */
        that.removeItem = function (key, callback) {
            var req = getTransactionStore(TR_READ_WRITE).delete(key);

            // Need defer callback for some old browsers
            // which needs timeout to make removing
            function deferredCallback() {
                var args = arguments;
                setTimeout(function () { callback.apply(null, args); }, 0);
            }

            wrapDbRequest(req, dataGetter(deferredCallback));
        };

        /**
         * Get keys of stored items
         * @param {KvKeeper.Callback} callback
         */
        that.getKeys = function (callback) {
            var req = getTransactionStore(TR_READ_ONLY).openCursor();
            var keys = [];

            wrapDbRequest(req, function (err, event) {
                if (err) {
                    return callback(err);
                }

                var cursor = event.target.result;
                if (cursor) {
                    keys.push(cursor.key);
                    return cursor.continue();
                }

                callback(null, keys);
            });
        };

        /**
         * Get stored items count
         * @param {KvKeeper.Callback} callback
         */
        that.getLength = function (callback) {
            var req = getTransactionStore(TR_READ_ONLY).count();

            wrapDbRequest(req, dataGetter(callback, 'target.result'));
        };

        /**
         * Clear all the storage
         * @param {KvKeeper.Callback} callback
         */
        that.clear = function (callback) {
            var req = getTransactionStore(TR_READ_WRITE).clear();

            wrapDbRequest(req, dataGetter(callback));
        };

        function getTransactionStore(type) {
            return dbInstance.transaction([KvKeeper.storeName], type)
                .objectStore(KvKeeper.storeName);
        }
    };

    /**
     * Create DB storage instance
     * or null if not supported
     * @returns {KvKeeper.Storage}
     */
    DB.create = function () {
        var indexedDb = global.indexedDB;
        return indexedDb ? new DB(indexedDb) : null;
    };

    /**
     * Create DB schema
     * @param {IDBDatabase} db
     */
    DB.setupSchema = function (db) {
        try {
            db.createObjectStore(KvKeeper.storeName, {keyPath: 'key'});
        } catch (e) {
            if (e.name != 'ConstraintError') {
                throw e;
            }
            console.warn('[kv-keeper] data store already exists'); // eslint-disable-line no-console
        }
    };

    function openDb(indexedDb, callback) {
        var req = indexedDb.open(KvKeeper.dbName, KvKeeper.dbVersion);

        req.onsuccess = function (event) {
            var db = event.target.result;

            db.onversionchange = function () {
                db.close(); // Triggers mostly on database deletion
            };

            callback(null, db);
        };

        req.onerror = function (event) {
            var err = new Error('[kv-keeper] DB request error');
            err.event = event;
            callback(err);
        };

        req.onupgradeneeded = function (event) {
            DB.setupSchema(event.target.result);
        };

        req.onblocked = function (event) {
            var err = new Error('[kv-keeper] DB is blocked');
            err.event = event;
            callback(err);
        };
    }

    function wrapDbRequest(req, callback) {
        req.onsuccess = function (event) {
            callback(null, event);
        };

        req.onerror = function (event) {
            var err = new Error('[kv-keeper] DB request error');
            err.event = event;
            callback(err);
        };
    }

    function dataGetter(callback, resPath) {
        if (!callback) {
            return function () {};
        }

        return function (err, event) {
            if (err) {
                return callback(err);
            }

            if (resPath === undefined) {
                return callback(null);
            }

            var pathParts = resPath.split('.');
            var result = event;

            for (var i = 0; i < pathParts.length; i++) {
                if (!(pathParts[i] in result)) {
                    result = null;
                    break;
                }
                result = result[pathParts[i]];
            }

            callback(null, result);
        };
    }
})(self);

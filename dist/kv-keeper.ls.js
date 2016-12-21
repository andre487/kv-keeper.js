
(function (global, exports) {
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
    var KvKeeper;

    // Exporting
    if (exports) { // CommonJS
        KvKeeper = exports;
    } else { // Globals
        global.KvKeeper = KvKeeper = {};
    }

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
            var cb = wrapCallback(callback);
            try { // Error example: no space left for store or on device
                storage.setItem(LS.createKey(key), value);
                cb(null);
            } catch (e) {
                cb(e);
            }
        };

        /**
         * Get item from storage
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.getItem = function (key, callback) {
            callback(null, storage.getItem(LS.createKey(key)));
        };

        /**
         * Check if storage has item
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.hasItem = function (key, callback) {
            callback(null, storage.getItem(LS.createKey(key)) !== null);
        };

        /**
         * Remove item from storage by key
         * @param {String} key
         * @param {KvKeeper.Callback} callback
         */
        that.removeItem = function (key, callback) {
            var cb = callback || noop;
            storage.removeItem(LS.createKey(key));
            cb(null);
        };

        /**
         * Get keys of stored items
         * @param {KvKeeper.Callback} callback
         */
        that.getKeys = function (callback) {
            var allKeys = getObjectKeys(storage);
            var nsLength = KvKeeper.namespace.length;

            var thatKeys = [];
            for (var i = 0; i < allKeys.length; i++) {
                var key = allKeys[i];
                if (isKeeperKey(key)) {
                    thatKeys.push(key.slice(nsLength));
                }
            }

            callback(null, thatKeys);
        };

        /**
         * Get stored items count
         * @param {KvKeeper.Callback} callback
         */
        that.getLength = function (callback) {
            callback(null, getObjectKeys(storage).filter(isKeeperKey).length);
        };

        /**
         * Clear all the storage
         * @param {KvKeeper.Callback} callback
         */
        that.clear = function (callback) {
            getObjectKeys(storage)
                .filter(isKeeperKey)
                .forEach(storage.removeItem, storage);
            callback(null);
        };

        /**
         * Close instance
         */
        that.close = function () {
            delete instances.ls;
            delete instances.auto;
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
    var isKeeperKey = LS.isKeeperKey = function (key) {
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
    
})(self, typeof exports != 'undefined' && exports);

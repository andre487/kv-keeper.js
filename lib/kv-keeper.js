'use strict';
var instances = {};

/**
 * KvKeeper
 * @type {KvKeeper.Host}
 */
var KvKeeper = {};

// Exporting
if (typeof exports !== 'undefined') {
    KvKeeper = exports;
}

setDefaultConfiguration();

function setDefaultConfiguration() {
    KvKeeper.dbVersion = 1;
    KvKeeper.dbName = 'kv-keeper-items';
    KvKeeper.storeName = 'items';
    KvKeeper.namespace = createNamespace();
}

function createNamespace() {
    return KvKeeper.dbName + ':' + KvKeeper.storeName + ':';
}

/**
 * Configurable options
 * @type {String[]}
 */
KvKeeper.configurable = ['dbName', 'storeName'];

/**
 * Configure KvKeeper. Can be ran only once
 * @param {Object} options
 */
KvKeeper.configure = function (options) {
    if (KvKeeper.__configured) {
        throw new Error('[kv-keeper] Configuration can be set only once');
    }
    KvKeeper.__configured = true;

    Object.keys(options).forEach(function (key) {
        if (KvKeeper.configurable.indexOf(key) > -1) {
            KvKeeper[key] = options[key];
        } else {
            setDefaultConfiguration();
            throw new Error('[kv-keeper] Option ' + key + ' is not configurable');
        }
    });

    KvKeeper.namespace = createNamespace();
};

/**
 * Get key-value storage instance
 * @param {String} [type=auto] Storage type: ls, db, auto
 * @param {KvKeeper.Callback} callback
 */
KvKeeper.getStorage = function (type, callback) {
    if (typeof type === 'function') {
        callback = type;
        type = null;
    }
    type = type || 'auto';

    var storage = KvKeeper._getInstance(type);
    if (storage) {
        storage.init(callback);
    } else {
        var message = type === 'auto' ?
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
        case 'auto':
            return createAutoInstance();
        case 'db':
            return {type: 'db', instance: DB.create()};
        case 'ls':
            return {type: 'ls', instance: LS.create()};
    }
    return null;
}

function createAutoInstance() {
    var instance = instances.db;
    if (instance) {
        return {type: 'db', instance: instance};
    }

    instance = DB.create();
    if (instance) {
        return {type: 'db', instance: instance};
    }

    instance = instances.ls;
    if (instance) {
        return {type: 'ls', instance: instance};
    }
    return {type: 'ls', instance: LS.create()};
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
    this.init = function (callback) {
        callback(null, that);
    };

    /**
     * Set item to storage
     * @param {String} key
     * @param {String} value
     * @param {KvKeeper.Callback} [callback]
     */
    this.setItem = function (key, value, callback) {
        key = LS.createKey(key);
        try { // Error example: no space left for store or on device
            storage.setItem(key, value);
            callback && callback(null);
        } catch (e) {
            callback && callback(e);
        }
    };

    /**
     * Get item from storage
     * @param {String} key
     * @param {KvKeeper.Callback} callback
     */
    this.getItem = function (key, callback) {
        key = LS.createKey(key);
        callback(null, storage.getItem(key));
    };

    /**
     * Is item exist in localStorage?
     * @param {String} key
     * @param {KvKeeper.Callback} callback
     */
    this.hasItem = function (key, callback) {
        key = LS.createKey(key);
        callback(null, storage[key] !== undefined); // Can't check by key inclusion because of Opera's bug
    };

    /**
     * Remove item from storage by key
     * @param {String} key
     * @param {KvKeeper.Callback} [callback]
     */
    this.removeItem = function (key, callback) {
        key = LS.createKey(key);
        storage.removeItem(key);
        callback && callback(null);
    };

    /**
     * Get keys of stored items
     * @param {KvKeeper.Callback} callback
     */
    this.getKeys = function (callback) {
        var keys = Object.keys(storage).filter(LS.isKeeperKey);
        callback(null, keys);
    };

    /**
     * Get stored items count
     * @param {KvKeeper.Callback} callback
     */
    this.getLength = function (callback) {
        callback(null, storage.length);
    };

    /**
     * Clear all the storage
     * @param {KvKeeper.Callback} [callback]
     */
    this.clear = function (callback) {
        storage.clear();
        callback && callback(null);
    };

    /**
     * Close instance
     */
    this.close = function () {
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
    return key.indexOf(KvKeeper.namespace) === 0;
};

/**
 * Create LS storage instance
 * or null if localStorage is not supported
 * @returns {KvKeeper.Storage|null}
 */
LS.create = function () {
    var storage = window.localStorage;
    return storage ? new LS(storage) : null;
};

/**
 * IndexedDB driver
 * @constructor
 */
var DB = KvKeeper.StorageDB = function (indexedDb) {
    var that = this;

    /**
     * Ensure IndexedDB driver is ready
     * @param {KvKeeper.Callback} callback
     */
    this.init = function (callback) {
        openDb(indexedDb, function (err, db) {
            if (err) {
                return callback(err);
            }
            that._db = db;
            callback(null, that);
        });
    };

    /**
     * Close DB connection
     */
    this.close = function () {
        that._db.close();
        instances.db = null;
    };

    /**
     * Set item to DB
     * @param {String} key
     * @param {String} value
     * @param {KvKeeper.Callback} [callback]
     */
    this.setItem = function (key, value, callback) {
        var req = getTransactionStore('readwrite').put({key: key, value: value});

        wrapDbRequest(req, dataGetter(callback));
    };

    /**
     * Get item from DB
     * @param {String} key
     * @param {KvKeeper.Callback} [callback]
     */
    this.getItem = function (key, callback) {
        var req = getTransactionStore('readonly').get(key);

        wrapDbRequest(req, dataGetter(callback, 'target.result.value'));
    };

    /**
     * Is item exist in DB?
     * @param {String} key
     * @param {KvKeeper.Callback} callback
     */
    this.hasItem = function (key, callback) {
        var req = getTransactionStore('readonly').openCursor(key);

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
    this.removeItem = function (key, callback) {
        var req = getTransactionStore('readwrite').delete(key);

        // Need defer callback for some old browsers
        // which need timeout to make removing
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
    this.getKeys = function (callback) {
        var req = getTransactionStore('readonly').openCursor();
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
    this.getLength = function (callback) {
        var req = getTransactionStore('readonly').count();

        wrapDbRequest(req, dataGetter(callback, 'target.result'));
    };

    /**
     * Clear all the storage
     * @param {KvKeeper.Callback} [callback]
     */
    this.clear = function (callback) {
        var req = getTransactionStore('readwrite').clear();

        wrapDbRequest(req, dataGetter(callback));
    };

    function getTransactionStore(type) {
        return that._db.transaction([KvKeeper.storeName], type)
            .objectStore(KvKeeper.storeName);
    }
};

/**
 * Create DB storage instance
 * or null if not supported
 * @returns {KvKeeper.Storage}
 */
DB.create = function () {
    var indexedDb = window.indexedDB;
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
        if (e.name !== 'ConstraintError') {
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

        if (typeof resPath === 'undefined') {
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

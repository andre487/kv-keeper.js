'use strict';
var KvKeeper = exports;

var instances = {};

/**
 * DB name and part of storage items prefix
 * @type {String}
 */
KvKeeper.DB_NAME = 'kv-keeper-items';

/**
 * DB version
 * @type {Number}
 */
KvKeeper.DB_VERSION = 1;

/**
 * Object store name and part of storage items prefix
 * @type {String}
 */
KvKeeper.STORE_NAME = 'items';

/**
 * Get key-value storage instance
 * @param {String} [type=auto] Storage type: ls, db, auto
 * @param {Function} callback
 */
KvKeeper.getStorage = function (type, callback) {
    if (typeof type === 'function') {
        callback = type;
        type = null;
    }
    type = type || 'auto';

    var storage = KvKeeper._getInstance(type);
    if (storage) {
        storage.ensureReady(callback);
    } else {
        var message = type === 'auto' ?
            'This platform does not support any storages' :
        'Storage with type "' + type + '" is not supported';
        callback(new Error('[kv-keeper] ' + message));
    }
};

KvKeeper._getInstance = function (type) {
    if (!instances[type]) {
        var Class = getStorageClass(type);
        if (Class) {
            instances[type] = Class.create();
        }
    }
    return instances[type];
};

function getStorageClass(type) {
    switch (type) {
        case 'auto':
            return Auto;
        case 'db':
            return DB;
        case 'ls':
            return LS;
    }
}

KvKeeper._clearInstance = function (type) {
    instances[type] = null;
};

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
 * Driver builder. Chooses IndexedDB if available with fallback to LocalStorage.
 * If non IDB neither LS available it creates null
 */
var Auto = {
    /**
     * Create storage
     * @returns {KvStorage}
     */
    create: function () {
        return DB.create() || LS.create();
    }
};

/**
 * LocalStorage driver
 * @constructor
 */
var LS = KvKeeper.StorageLS = function (storage) {
    var that = this;

    /**
     * Ensure LocalStorage driver is ready
     * @param {Function} callback
     */
    this.ensureReady = function (callback) {
        callback(null, that);
    };

    /**
     * Set item to storage
     * @param {String} key
     * @param {String} value
     * @param {Function} [callback]
     */
    this.setItem = function (key, value, callback) {
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
     * @param {Function} callback
     */
    this.getItem = function (key, callback) {
        callback(null, storage.getItem(key));
    };

    /**
     * Is item exist in localStorage?
     * @param {String} key
     * @param {Function} callback
     */
    this.hasItem = function (key, callback) {
        callback(null, key in storage);
    };

    /**
     * Remove item from storage by key
     * @param {String} key
     * @param {Function} [callback]
     */
    this.removeItem = function (key, callback) {
        storage.removeItem(key);
        callback && callback(null);
    };

    /**
     * Get keys of stored items
     * @param {Function} callback
     */
    this.getKeys = function (callback) {
        callback(null, Object.keys(storage));
    };

    /**
     * Get stored items count
     * @param {Function} callback
     */
    this.getLength = function (callback) {
        callback(null, storage.length);
    };

    /**
     * Clear all the storage
     * @param {Function} [callback]
     */
    this.clear = function (callback) {
        storage.clear();
        callback && callback(null);
    };

    /**
     * Nothing to close with localStorage
     */
    this.close = function () {
    };
};

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
     * @param {Function} callback
     */
    this.ensureReady = function (callback) {
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
    };

    /**
     * Set item to DB
     * @param {String} key
     * @param {String} value
     * @param {Function} [callback]
     */
    this.setItem = function (key, value, callback) {
        var req = getTransactionStore('readwrite').put({key: key, value: value});

        wrapDbRequest(req, dataGetter(callback));
    };

    /**
     * Get item from DB
     * @param {String} key
     * @param {Function} [callback]
     */
    this.getItem = function (key, callback) {
        var req = getTransactionStore('readonly').get(key);

        wrapDbRequest(req, dataGetter(callback, 'target.result.value'));
    };

    /**
     * Is item exist in DB?
     * @param {String} key
     * @param {Function} callback
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
     * @param {Function} [callback]
     */
    this.removeItem = function (key, callback) {
        var req = getTransactionStore('readwrite').delete(key);

        wrapDbRequest(req, dataGetter(callback));
    };

    /**
     * Get keys of stored items
     * @param {Function} callback
     */
    this.getKeys = function (callback) {
        var req = getTransactionStore('readonly').openKeyCursor();
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
     * @param {Function} callback
     */
    this.getLength = function (callback) {
        var req = getTransactionStore('readonly').count();

        wrapDbRequest(req, dataGetter(callback, 'target.result'));
    };

    /**
     * Clear all the storage
     * @param {Function} [callback]
     */
    this.clear = function (callback) {
        var req = getTransactionStore('readwrite').clear();

        wrapDbRequest(req, dataGetter(callback));
    };

    function getTransactionStore(type) {
        return that._db.transaction([KvKeeper.STORE_NAME], type)
            .objectStore(KvKeeper.STORE_NAME);
    }
};

DB.create = function () {
    var indexedDb = window.indexedDB;
    return indexedDb ? new DB(indexedDb) : null;
};

DB.setupSchema = function (db) {
    db.createObjectStore(KvKeeper.STORE_NAME, {keyPath: 'key'});
};

function openDb(indexedDb, callback) {
    var req = indexedDb.open(KvKeeper.DB_NAME, KvKeeper.DB_VERSION);

    wrapDbRequest(req, dataGetter(callback, 'target.result'));

    req.onupgradeneeded = function (event) {
        var db = event.target.result;
        DB.setupSchema(db);
        callback(null, db);
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

/**
 * @typedef {Object} KvStorage
 */

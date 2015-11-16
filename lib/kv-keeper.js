'use strict';
var KvKeeper = exports;

var instances = {};

/**
 * @typedef {Object} KvStorage
 */

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

        KvKeeper.getStorage('ls', function getStorage(err, storage) { // TODO: type = auto
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
     * @param callback
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
     * Is item exists in localStorage?
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
};

LS.create = function () {
    var storage = window.localStorage;
    return storage ? new LS(storage) : null;
};

/**
 * IndexedDB driver
 * @constructor
 */
var DB = KvKeeper.StorageDB = function (storage) {
    this._storage = storage;

    var that = this;

    this.ensureReady = function (callback) {
        callback(null, that);
    };
};

DB.create = function () {
    var storage = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    return storage ? new DB(storage) : null;
};

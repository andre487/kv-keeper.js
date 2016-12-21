/**
 * KvKeeper module
 * @typedef {Object} KvKeeper
 */

/**
 * @typedef {Function} KvKeeper.Callback
 *
 * @param {Error|null} err
 * @param {*} [data]
 */

/**
 * @typedef {Object} KvKeeper.Storage
 *
 * @property {Function} setItem
 * @property {Function} getItem
 * @property {Function} hasItem
 * @property {Function} removeItem
 *
 * @property {Function} getKeys
 * @property {Function} getLength
 *
 * @property {Function} clear
 *
 * @property {Function} [ensureReady]
 * @property {Function} [close]
 */

/**
 * @typedef {Object} KvKeeper.Host
 * @extends {KvKeeper.Storage}
 *
 * @property {constructor<KvKeeper.Storage>} StorageLS
 * @property {constructor<KvKeeper.Storage>} StorageDB
 *
 * @property {Function} addErrorListener
 * @property {Function} removeErrorListener
 * @property {Function} getErrorListeners
 * @property {Function} removeAllErrorListeners
 * @property {Function} preconnect
 *
 * @property {String} dbName
 * @property {Number} dbVersion
 * @property {String} storeName
 * @property {String} namespace
 * @property {String} defaultType
 *
 * @property {String[]} configurable
 *
 * @property {Function} configure
 * @property {Function} getStorage
 *
 * @property {Function} _getInstance For tests only
 */

// End

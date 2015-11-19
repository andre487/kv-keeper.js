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
 * @extends KvKeeper.Storage
 *
 * @property {constructor<KvKeeper.Storage>} StorageLS
 * @property {constructor<KvKeeper.Storage>} StorageDB
 *
 * @property {String} DB_NAME
 * @property {Number} DB_VERSION
 * @property {String} STORE_NAME
 * @property {String} NAMESPACE
 *
 * @property {Function} getStorage
 *
 * @property {Function} _getInstance For tests only
 */

// End

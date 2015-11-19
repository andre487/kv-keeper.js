# KV Keeper

Key-value storage for JS that wraps IndexedDB with fallback to LocalStorage
  
  * Very light, 1.7KiB in gzip.
  * Can store much data when IndexedDB is available.
  * Simple LS-like interface with Node.js-like callbacks.

## Exports and modularity
If CommonJS module environment is available, Kv Keeper exports to it. 
Otherwise exports to global variable `KvKeeper`.

## Basic usage

Using default storage. Trying IndexedDB at first and using LocalStorage if IDB is not supported.

```js
var KvKeeper = require('kv-keeper.js')

KvKeeper.setItem('foo', 'bar', function (err) {
  if (err) return console.error("Can't save the foo item")

  console.error('The foo item is successfully stored!')
})

KvKeeper.getItem('foo', function (err, value) {
  if (err) return console.error('💀')

  console.log('The foo item value:', value)
})

KvKeeper.hasItem('foo', function (err, has) {
  if (err) return console.error('💀')

  console.log(has ? 'There is foo in our storage' : 'No foo')
})

KvKeeper.removeItem('foo', function (err) {
  if (err) return console.error('💀')

  console.log('There is no more foo')
})

KvKeeper.getKeys('foo', function (err, keys) {
  if (err) return console.error('💀')

  console.log('We have that items in out storage:', keys)
})

KvKeeper.getLength('foo', function (err, length) {
  if (err) return console.error('💀')

  console.log('Our storage have that count of items:', length)
})

KvKeeper.clear(function (err) {
  if (err) return console.error('💀')

  console.log('Our storage is empty now')
})
```

## Options
You can configure the Kv Keeper with `configure` method:

```js
KvKeeper.configure({
  dbName: 'foo', 
  storeName: 'bar', 
  defaultType: 'ls'
})
```

The options are:
  * `dbName` - name of database when IndexedDB is used or part of a prefix in LocalStorage
  * `storeName` - name of store in IndexedDB or part of a prefix in LocalStorage
  * `defaultType` - default storage type. Can be `db`, `ls` or `auto` 
  (try `db` at first and `ls` if `db` is not supported)

## Advanced usage
You can get storage with needed driver using `KvKeeper.getStorage`. Storage instances's method are similar 
to basic methods and have extra `close` method that closes DB and destroys instance 

```js
var type = 'db' // Can be auto, db or ls or can absent (not required param)

KvKeeper.getStorage(type, function (err, storage) {
  if (err) return console.error('💀')

  storage.getItem('foo', function (err, value) {
    if (err) return console.error('💀')

    console.log("Look! It's foo!", value)
  })  

  storage.close()

  // You need to get new instance after closing
})
```

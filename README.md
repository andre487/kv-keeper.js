# KV Keeper

Key-value storage for JS that wraps IndexedDB with fallback to LocalStorage
  
  * Very light: 3.8KiB minified and 1.6KiB in gzip.
  * Can store much data when IndexedDB is available.
  * Simple LS-like interface with Node.js-like callbacks.

[![Build Status](https://travis-ci.org/andre487/kv-keeper.js.svg?branch=master)](https://travis-ci.org/andre487/kv-keeper.js)

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
  if (err) return console.error('Oh no!')

  console.log('The foo item value:', value)
})

KvKeeper.removeItem('foo', function (err) {
  if (err) return console.error('Oh no!')

  console.log('There is no more foo')
})

KvKeeper.getKeys(function (err, keys) {
  if (err) return console.error('Oh no!')

  console.log('We have that items in out storage:', keys)
})

KvKeeper.getLength('foo', function (err, length) {
  if (err) return console.error('Oh no!')

  console.log('Our storage have that count of items:', length)
})

KvKeeper.clear(function (err) {
  if (err) return console.error('Oh no!')

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
  if (err) return console.error('Error =/')

  storage.getItem('foo', function (err, value) {
    if (err) return console.error('Error =/')

    console.log("Look! It's foo!", value)
  })  

  storage.close()

  // You need to get new instance after closing
})
```

## Using with promises
Node.js callbacks style allows to wrap methods in promises with many well known libraries:

```js
var Q = require('q')

Q.ninvoke(KvKeeper, 'getItem', 'foo')
  .then(function (val) {
    console.log("Look! It's foo!", value)
  })
  .catch(function (err) {
    console.error('👎')
  })
```

And you can build promises chain with it:

```js
var Q = require('q')

Q.ninvoke(KvKeeper, 'getStorage')
  .then(function (storage) {
    return Q.ninvoke(storage, 'setItem', 'foo')
  })
  .then(function () {
    console.log('We have set foo!')
  })
  .catch(function (err) {
    // This catch catches errors from all the chain
    console.error('💩')
  })
```

## Testing
TODO

## Browser support
There is lists of browsers where library is well tested

### Desktop
#### IndexedDB
  * Yandex Browser 1.7+
  * Google Chrome 24+
  * FireFox 40+ (it needs more testing between 30 and 40)
  * InternetExplorer 10+ 
  
Safari doesn't support IndexedDB driver because of bugs:
  * http://www.raymondcamden.com/2014/9/25/IndexedDB-on-iOS-8--Broken-Bad
  * https://bugs.webkit.org/show_bug.cgi?id=136888
  * https://github.com/pouchdb/pouchdb/issues/2533

#### LocalStorage
  * YandexBrowser 1.1+
  * Google Chrome 22+
  * FireFox 10+
  * Safari 5+
  * InternetExplorer 9+

### Mobile
TODO

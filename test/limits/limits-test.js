// We run tests with symbols
// Each symbol in UTF-16 stored with 2 bytes and with 1 in UTF-8
describe('KvKeeper.StorageLS sizes test', function () {
    before(function () {
        KvKeeper.__configured = false;

        KvKeeper.configure({
            dbName: 'kv-keeper-sizes-test',
            defaultType: 'ls'
        });
    });

    beforeEach(function () {
        localStorage.clear();
    });

    after(function () {
        localStorage.clear();
    });

    var keyLength = KvKeeper.StorageLS.createKey('foo').length;

    describe('with one item', function () {
        _.each(
            [
                512,
                1024,
                1024 * 1024,
                2.5 * 1024 * 1024 - keyLength - 5, // Chrome 22 limit
                2.5 * 1024 * 1024, // FireFox 10 limit (but there is a bug with which you can write more data)
                4.5 * 1024 * 1024 + 80779, // FireFox 31 limit
                4.7 * 1024 * 1024 + 70 * 1024 - 18, // IE11 limit
                5 * 1024 * 1024 - keyLength - 529, // FireFox 44-dev limit
                5 * 1024 * 1024 - keyLength - 5, // Chrome 48 limit,
                5 * 1024 * 1024 // FireFox 42 limit
            ],
            function (count) {
                it('should store ' + Math.floor(count) + ' of bytes in one item', function () {
                    var stub = _.repeat('1', count);
                    return Q.ninvoke(KvKeeper, 'setItem', 'foo', stub);
                });
            }
        );
    });

    describe('with many items', function () {
        // Browsers show no difference between this test and test with one key
        _.range(1, 11).forEach(function (count) {
            it('should store ' + count + ' items by 512KiB', function () {
                var deferred = [];

                _.times(count, function (i) {
                    var stub = _.repeat('1', 512 * 1024);
                    deferred.push(Q.ninvoke(KvKeeper, 'setItem', 'foo:' + i, stub));
                });

                return Q.all(deferred);
            });
        });
    });
});

describe('KvKeeper.StorageDB sizes test', function () {
    // jscs:disable maximumLineLength

    this.timeout(60000);

    before(function () {
        KvKeeper.__configured = false;

        KvKeeper.configure({
            dbName: 'kv-keeper-sizes-test',
            defaultType: 'db'
        });
    });

    beforeEach(function () {
        return Q.ninvoke(KvKeeper, 'getStorage', 'db')
            .then(function (storage) {
                return Q.ninvoke(storage, 'clear');
            });
    });

    after(function () {
        return Q.ninvoke(KvKeeper, 'getStorage', 'db')
            .then(function (storage) {
                return Q.ninvoke(storage, 'clear');
            });
    });

    describe('with one item', function () {
        _.each(
            [
                512,
                1024,
                1024 * 1024,
                9 * 1024 * 1024, // IE11 limit. Unstable after this: sometimes returns undefined error, sometimes "Not enough memory"
                127 * 1024 * 1024 - 59, // Chrome 46, 48 limit. If more symbols got "The serialized value is too large"
                128 * 1024 * 1024 - 1 // FireFox 42, 44-dev limit. If more symbols got "InternalError: allocation size overflowrepeat"
            ],
            function (count) {
                it('should store ' + Math.floor(count) + ' of symbols', function () {
                    var stub = _.repeat('1', count);
                    return Q.ninvoke(KvKeeper, 'setItem', 'foo', stub);
                });
            }
        );
    });

    describe('with many items', function () {
        // Chrome 24+ - OK
        // FireFox 42+ - OK
        // IE11 returns error "Not enough memory" after 10 MiB
        _.range(1, 27).forEach(function (count) {
            it('should store ' + count + ' items by 5MiB', function () {
                var deferred = [];

                _.times(count, function (i) {
                    var stub = _.repeat('1', 5 * 1024 * 1024);
                    deferred.push(Q.ninvoke(KvKeeper, 'setItem', 'foo:' + i, stub));
                });

                return Q.all(deferred);
            });
        });
    });
});

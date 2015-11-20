describe('KvKeeper.StorageLS', function () {
    beforeEach(function () {
        localStorage.clear();
    });

    afterEach(function () {
        localStorage.clear();
    });

    var key = KvKeeper.StorageLS.createKey;

    it('should work on supported platform', function (done) {
        KvKeeper.getStorage('ls', function (err, storage) {
            assert.isNull(err);
            assert.instanceOf(storage, KvKeeper.StorageLS);
            done();
        });
    });

    describe('#setItem()', function () {
        it('should set items to LS', function (done) {
            KvKeeper.getStorage('ls', function (err, storage) {
                storage.setItem('foo', 'bar', function (err) {
                    assert.isNull(err);
                    assert.equal(localStorage.getItem(key('foo')), 'bar');
                    done();
                });
            });
        });
    });

    describe('#getItem()', function () {
        it('should get items from LS', function (done) {
            localStorage.setItem(key('foo'), 'bar');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.getItem('foo', function (err, val) {
                    assert.isNull(err);
                    assert.equal(val, 'bar');
                    done();
                });
            });
        });
    });

    describe('#removeItem()', function () {
        it('should remove items from LS', function (done) {
            localStorage.setItem(key('foo'), 'bar');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.removeItem('foo', function (err) {
                    assert.isNull(err);
                    assert.notOk(localStorage.getItem('foo'));
                    done();
                });
            });
        });
    });

    describe('#getKeys()', function () {
        it('should get items keys from LS', function (done) {
            localStorage.setItem(key('foo'), 'bar');
            localStorage.setItem(key('baz'), 'qux');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.getKeys(function (err, keys) {
                    assert.isNull(err);
                    assert.sameMembers([key('baz'), key('foo')], keys);
                    done();
                });
            });
        });
    });

    describe('#getLength()', function () {
        it('should length of LS', function (done) {
            localStorage.setItem(key('foo'), 'bar');
            localStorage.setItem(key('baz'), 'qux');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.getLength(function (err, length) {
                    assert.isNull(err);
                    assert.equal(length, localStorage.length);
                    done();
                });
            });
        });
    });

    describe('#clear()', function () {
        it('should clear LS', function (done) {
            localStorage.setItem(key('foo'), 'bar');
            localStorage.setItem(key('baz'), 'qux');
            localStorage.setItem('quux', 'norf');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.clear(function (err) {
                    assert.isNull(err);

                    assert.equal(localStorage.length, 1);
                    assert.equal(localStorage.getItem('quux'), 'norf');

                    done();
                });
            });
        });
    });
});

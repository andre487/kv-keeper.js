describe('KvKeeper.StorageLS', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        localStorage.clear();
    });

    afterEach(function () {
        sandbox.restore();
        localStorage.clear();

        KvKeeper.removeAllErrorListeners();
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

        describe('error', function () {
            beforeEach(function () {
                function bigRand(iterations) {
                    var x = '1234567890';
                    for (var i = 0; i < iterations; i++) {
                        x += x + x;
                    }
                    return x;
                }

                function fillUntilException(rand, prefix) {
                    for (var i = 0; i < 1000; i++) {
                        try {
                            localStorage.setItem(prefix + i, rand);
                        } catch (e) {
                            break;
                        }
                    }
                }

                for (var i = 12; i > 0; i--) {
                    fillUntilException(bigRand(i), '__' + i + '__');
                }
            });

            afterEach(function () {
                localStorage.clear();
            });

            it('should handle an LS error', function (done) {
                KvKeeper.getStorage('ls', function (err, storage) {
                    storage.setItem('foo', 'bar', function (err) {
                        assert.ok(err, 'Error is not handled');
                        assert.property(err, 'message');
                        done();
                    });
                });
            });

            it('should call global error listener', function (done) {
                var listener = sinon.spy();

                KvKeeper.addErrorListener(listener);

                KvKeeper.getStorage('ls', function (err, storage) {
                    storage.setItem('foo', 'bar', function (err) {
                        assert.ok(err, 'Error is not handled');

                        sinon.assert.calledOnce(listener);
                        assert.property(listener.args[0][0], 'message');

                        done();
                    });
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

    describe('#hasItem()', function () {
        it('should return true about existing item', function (done) {
            localStorage.setItem(key('foo'), 'bar');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.hasItem('foo', function (err, val) {
                    assert.isNull(err);
                    assert.isTrue(val);
                    done();
                });
            });
        });

        it('should return false about not existing item', function (done) {
            localStorage.setItem(key('foo'), 'bar');

            KvKeeper.getStorage('ls', function (err, storage) {
                storage.hasItem('bar', function (err, val) {
                    assert.isNull(err);
                    assert.isFalse(val);
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
                    assert.sameMembers(['baz', 'foo'], keys);
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

describe('KvKeeper.StorageLS', function () {
    beforeEach(function () {
        localStorage.clear();
    });

    afterEach(function () {
        KvKeeper._clearInstance('ls');
        localStorage.clear();
    });
    
    it('should work on supported platform', function (done) {
        KvKeeper.getStorage('ls', function (err, storage) {
            assert.isNull(err);
            assert.instanceOf(storage, KvKeeper.StorageLS);
            done();
        });
    });

    it('should set items to LS', function (done) {
        KvKeeper.getStorage('ls', function (err, storage) {
            storage.setItem('foo', 'bar', function (err) {
                assert.isNull(err);
                assert.equal(localStorage.getItem('foo'), '"bar"');
                done();
            });
        });
    });

    it('should get items from LS when it is a correct JSON', function (done) {
        localStorage.setItem('foo', '"bar"');

        KvKeeper.getStorage('ls', function (err, storage) {
            storage.getItem('foo', function (err, val) {
                assert.isNull(err);
                assert.equal(val, 'bar');
                done();
            });
        });
    });

    it('should provide error when value is LS is not a correct JSON', function (done) {
        localStorage.setItem('foo', 'bar');

        KvKeeper.getStorage('ls', function (err, storage) {
            storage.getItem('foo', function (err, val) {
                assert.instanceOf(err, Error);
                assert.include(err.toString(), 'SyntaxError: Unexpected token');
                done();
            });
        });
    });
});

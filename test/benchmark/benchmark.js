'use strict';
var timings = [];

window.onerror = function (err) {
    var errContainer = document.createElement('p');

    errContainer.innerHTML = err.toString();
    errContainer.style.color = 'red';

    removePreload();
    getReportContainer().appendChild(errContainer);
};

warpUpDb()
    .then(runSetBenchmarks)
    .then(runGetBenchmarks)
    .then(runRemoveBenchmarks)
    .then(printReport)
    .done();

function removePreload() {
    var preload = document.getElementById('report-preload');
    preload.parentNode.removeChild(preload);
}

function getReportContainer() {
    return document.getElementById('report');
}

function warpUpDb() {
    KvKeeper.configure({
        dbName: 'benchmark-vk-keeper-db',
        storeName: 'benchmark-store'
    });

    var deferredAll = Q.defer();
    var startTime = performance.now();

    KvKeeper.getStorage('db', function (err, storage) {
        var connectTime = Math.round((performance.now() - startTime) * 100) / 100;
        timings.push('DB connect time: ' +  connectTime + ' ms for now (it varies)');

        err ?
            deferredAll.reject() :
            deferredAll.resolve(storage);
    });

    return deferredAll.promise;
}

function runSetBenchmarks() {
    var deferredAll = Q.defer();
    var suite = new Benchmark.Suite();

    suite
        .on('cycle', function (event) {
            timings.push(String(event.target));
        })
        .on('complete', function () {
            timings.push('Fastest is ' + this.filter('fastest').pluck('name'));
            deferredAll.resolve(timings);
        })
        .add('LS#setItem', function (deferred) {
            KvKeeper.getStorage('ls', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.setItem('foo', 'bar', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .add('DB#setItem', function (deferred) {
            KvKeeper.getStorage('db', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.setItem('foo', 'bar', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .run({async: true});

    return deferredAll.promise;
}

function runGetBenchmarks() {
    var deferredAll = Q.defer();
    var suite = new Benchmark.Suite();

    suite
        .on('cycle', function (event) {
            timings.push(String(event.target));
        })
        .on('complete', function () {
            timings.push('Fastest is ' + this.filter('fastest').pluck('name'));
            deferredAll.resolve(timings);
        })
        .add('LS#getItem', function (deferred) {
            KvKeeper.getStorage('ls', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.getItem('foo', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .add('DB#getItem', function (deferred) {
            KvKeeper.getStorage('db', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.getItem('foo', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .run({async: true});

    return deferredAll.promise;
}

function runRemoveBenchmarks() {
    var deferredAll = Q.defer();
    var suite = new Benchmark.Suite();

    suite
        .on('cycle', function (event) {
            timings.push(String(event.target));
        })
        .on('complete', function () {
            timings.push('Fastest is ' + this.filter('fastest').pluck('name'));
            deferredAll.resolve(timings);
        })
        .add('LS#removeItem', function (deferred) {
            KvKeeper.getStorage('ls', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.removeItem('foo', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .add('DB#removeItem', function (deferred) {
            KvKeeper.getStorage('db', function (err, storage) {
                if (err) {
                    throw err;
                }

                storage.removeItem('foo', function (err) {
                    if (err) {
                        throw err;
                    }
                    deferred.resolve();
                });
            });
        }, {defer: true})
        .run({async: true});

    return deferredAll.promise;
}

function printReport() {
    removePreload();

    var reportContainer = getReportContainer();

    timings.forEach(function (timing) {
        var timingItem = document.createElement('p');
        timingItem.innerHTML = timing;
        reportContainer.appendChild(timingItem);
    });
}

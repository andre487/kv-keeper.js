module.exports = function (config) {
    require('./shared.conf.js')(config);

    config.set({
        files: ['../../../lib/kv-keeper.js'].concat(config.files),

        browsers: ['Firefox']
    });
};

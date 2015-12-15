#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var sh = require('shelljs');

var FILE_PREAMBLE = '// KV-Keeper.js by andre487, see https://clck.ru/9cB92';
var TMP_DIR = sh.tempdir();

var SRC_DIR = path.join(__dirname, '..', 'lib');
var DIST_DIR = path.join(__dirname, '..', 'dist');
var SRC_FILE = path.join(SRC_DIR, 'kv-keeper.js');

(function main() {
    sh.config.fatal = true;

    var filesData = compressFile(SRC_FILE);
    mvFilesToDist(SRC_DIR, [
        filesData.minName,
        filesData.mapName,
        filesData.gzName
    ]);
    sh.cp('-f', SRC_FILE, path.join(DIST_DIR, filesData.fileInfo.base));

    var src = sh.cat(SRC_FILE);
    var srcPeaces = splitSrc(src);
    var reducedTypes = ['ls', 'db'];

    reducedTypes.forEach(createReducedFile.bind(null, srcPeaces));

    sh.cd(DIST_DIR);
    sh.echo('# Dist files');
    sh.exec('ls -lh');
})();

function splitSrc(src) {
    return {
        header: getMarkedPeace(src, 'header'),
        ls: getMarkedPeace(src, 'ls'),
        db: getMarkedPeace(src, 'db'),
        footer: getMarkedPeace(src, 'footer')
    };
}

function getMarkedPeace(src, mark) {
    mark = mark.toUpperCase();

    var startMark = '/* ~' + mark + ' START~ */';
    var endMark = '/* ~' + mark + ' END~ */';

    var startPos = src.indexOf(startMark) + startMark.length;
    var endPos = src.indexOf(endMark, startPos);

    return src.slice(startPos, endPos);
}

function createReducedFile(srcPeaces, type) {
    var filePath = writeFileByType(srcPeaces, type);
    var filesData = compressFile(filePath);

    mvFilesToDist(TMP_DIR, [
        filesData.fileInfo.base,
        filesData.minName,
        filesData.mapName,
        filesData.gzName
    ]);
}

function mvFilesToDist(baseDir, filesToMove) {
    filesToMove.forEach(function (name) {
        sh.mv('-f', path.join(baseDir, name), path.join(DIST_DIR, name));
    });
}

function writeFileByType(srcPeaces, type) {
    var src = srcPeaces.header + srcPeaces[type] + srcPeaces.footer;
    var filePath = path.join(TMP_DIR, 'kv-keeper.' + type + '.js');

    fs.writeFileSync(filePath, src);

    return filePath;
}

function compressFile(filePath) {
    var fileInfo = path.parse(filePath);

    var minName = fileInfo.name + '.min' + fileInfo.ext;
    var mapName = fileInfo.name + '.map';
    var gzName = minName + '.gz';

    sh.cd(fileInfo.dir);
    sh.exec([
        'uglifyjs', fileInfo.base,
        '-o', minName,
        '--source-map=' + mapName,
        '--source-map-url=' + mapName,
        '--preamble="' + FILE_PREAMBLE + '"',
        '--mangle="sort=true"',
        '--compress',
        '--screw-ie8',
        '--verbose'
    ].join(' '));

    sh.exec([
        'gzip', '-7', '-c ' + minName,
        '> ' + gzName
    ].join(' '));

    return {
        fileInfo: fileInfo,
        minName: minName,
        mapName: mapName,
        gzName: gzName
    };
}

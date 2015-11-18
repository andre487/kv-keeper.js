#!/usr/bin/env bash
set -ex

dir=$(cd `dirname $0` && pwd)
cd "$dir/.."

uglifyjs lib/kv-keeper.js --output dist/kv-keeper.min.js \
    --source-map=dist/kv-keeper.map \
    --source-map-url=kv-keeper.map \
    --preamble="// Key-Value Keeper by andre487, see https://clck.ru/9cB92" \
    --mangle \
    --screw-ie8 \
    --name-cache \
    --pure-funcs \
    --globals=KvKeeper \
    --wrap=KvKeeper \
    --verbose

cd dist
gzip -7 -c kv-keeper.min.js > kv-keeper.min.js.gz

ls -lh

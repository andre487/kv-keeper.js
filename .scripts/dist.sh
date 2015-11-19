#!/usr/bin/env bash
set -e

dir=$(cd `dirname $0` && pwd)
cd "$dir/.."

sed "s/'use strict';//" lib/kv-keeper.js > dist/kv-keeper.work.js

uglifyjs dist/kv-keeper.work.js --output dist/kv-keeper.min.js \
    --source-map=dist/kv-keeper.map \
    --source-map-url=kv-keeper.map \
    --preamble="// Key-Value Keeper by andre487, see https://clck.ru/9cB92" \
    --mangle="sort=true" \
    --compress \
    --screw-ie8 \
    --pure-funcs \
    --verbose

rm -f dist/kv-keeper.work.js

cd dist
gzip -7 -c kv-keeper.min.js > kv-keeper.min.js.gz

echo "# Dist files"
ls -lh

#!/usr/bin/env bash
set -e

dir=$(cd `dirname $0` && pwd)
cd "$dir/../.."

npm run dist
git add dist

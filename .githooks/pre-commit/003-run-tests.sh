#!/usr/bin/env bash
if [[ "$SKIP_TESTS" == 1 ]]; then
    exit 0
fi

npm run test

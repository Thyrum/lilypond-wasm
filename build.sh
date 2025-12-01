#!/bin/sh

# Usage: ./build.sh <lilypond-version> [--to-js|--no-js]
if [ -z "$1" ]; then
  echo "Error: LilyPond version not provided."
  echo "Usage: $0 <version> [--to-js|--no-js]"
  exit 1
fi

set -x

LILYPOND_VERSION="$1"
shift

# Parse optional flag
case "$1" in
  --to-js)
    TO_JS_FLAG="--to-js"
    ;;
  --no-js)
    TO_JS_FLAG=""
    ;;
  "" )
    ;; # No flag provided
  *)
    echo "Unknown flag: $1"
    echo "Allowed: --to-js, --no-js"
    exit 1
    ;;
esac

curl -L "https://github.com/container2wasm/container2wasm/releases/download/v0.8.3/container2wasm-v0.8.3-linux-amd64.tar.gz" > c2w.tar.gz
tar -xvf c2w.tar.gz

echo "::group::Building docker image"
docker build -t lilypond --build-arg LILYPOND_VERSION="$LILYPOND_VERSION" .
echo "::endgroup::"

echo "::group::Building lilypond-wasm"
./c2w $TO_JS_FLAG lilypond lilypond-wasm/
echo "::endgroup::"

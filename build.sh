#!/bin/sh

set -x

curl -L "https://github.com/container2wasm/container2wasm/releases/download/v0.8.3/container2wasm-v0.8.3-linux-amd64.tar.gz" > c2w.tar.gz
tar -xvf c2w.tar.gz

echo "::group::Building lilypond.wasm"
./c2w --to-js jeandeaual/lilypond:2.25.12 lilypond-wasm/
echo "::endgroup::"

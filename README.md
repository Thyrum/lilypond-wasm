# lilypond-wasm

[![Build lilypond wasm](https://github.com/Thyrum/lilypond-wasm/actions/workflows/build.yml/badge.svg)](https://github.com/Thyrum/lilypond-wasm/actions/workflows/build.yml)  
[Try it out!](https://thyrum.github.io/lilypond-wasm/)

This repository contains a WebAssembly (WASM) build of
[LilyPond](https://lilypond.org), a music engraving program. The WASM build
allows you to run LilyPond directly in web browsers or other environments that
support WebAssembly.

## What

This repository provides a precompiled version of LilyPond as a WebAssembly
module. This enables users to render music notation directly in web
applications without the need for server-side processing.

## Why

When working on a music notation web application, I wanted to integrate
LilyPond for rendering scores. I challenged myself to do this without hosting
costs, so I couldn't use server-side rendering. By compiling LilyPond to
WebAssembly, I am able to run it entirely in the user's browser, eliminating
the need for server resources.

## How

In order to compile LilyPond to WebAssembly, I use
[container2wasm](https://github.com/container2wasm/container2wasm), an
application which converts Docker containers to WebAssembly modules. The
process involves the following steps:
1. **Create a Dockerfile**: Create a [`Dockerfile`](Dockerfile) that installs
   LilyPond and its dependencies in a suitable environment (based on
   [jeandeaual/lilypond](https://hub.docker.com/r/jeandeaual/lilypond)).
2. **Build the Docker Image**: Build the Docker image using the Dockerfile.
3. **Convert to WebAssembly**: Use
   [container2wasm](https://github.com/container2wasm/container2wasm) to
   convert the Docker image into a WebAssembly module.

The full build code can be seen in [`build.sh`](build.sh).

#!/bin/bash

export CC=$HOME/conda/bin/x86_64-conda_cos6-linux-gnu-gcc
export CXX=$HOME/conda/bin/x86_64-conda_cos6-linux-gnu-g++
export CPATH="$HOME/conda/include"
export LD_LIBRARY_PATH="$HOME/conda/lib"
export LDFLAGS="-L`pwd`/libs/lib -L$HOME/conda/lib"

node out/main/start_orchestrator.js "$@"
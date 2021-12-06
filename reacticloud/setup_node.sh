#!/bin/bash


# Step 1: Install NVM

export NVM_DIR="$HOME/.nvm" && (
  git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
  cd "$NVM_DIR"
  git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)`
) && \. "$NVM_DIR/nvm.sh"


# Step 2: Setup NVM in ~/.profile
if [ ! -f ~/.profile ]
then
	touch ~/.profile
fi

read -r -d '' PROFILE_CODE <<'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF

echo "$PROFILE_CODE" >> ~/.profile

# Step 3: Use NVM to install a newer version of node and NPM
nvm install 17.2.0

# Step 4: Install conda package manager
curl https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh > ~/Miniconda.sh
bash ~/Miniconda.sh -b -p ~/conda

# Step 5: Setup conda in ~/.profile
read -r -d '' PROFILE_CONDA_CODE <<'EOF'
export PATH="$HOME/conda/bin:$PATH"
EOF

echo "$PROFILE_CONDA_CODE" >> ~/.profile

source ~/.profile

# Step 6: Install newer C/C++ compilers and various native dependencies with conda
conda install gcc_linux-64 gxx_linux-64 -y
conda install cairo -y
conda install -c conda-forge libjpeg-turbo -y
conda install -c anaconda cairo-devel-cos6-x86_64 -y
conda install -c conda-forge libjpeg-turbo-cos6-x86_64 -y
conda install -c conda-forge giflib -y
conda install -c conda-forge pango -y

# Step 7: Setup compilation flags so that we use the compilers installed by conda
export CC=$HOME/conda/bin/x86_64-conda_cos6-linux-gnu-gcc
export CXX=$HOME/conda/bin/x86_64-conda_cos6-linux-gnu-g++
# and flags so we find include files and library paths in conda, as well as a special case for libpng15 packaged in reacticloud
export CPATH="$HOME/conda/include"
export LD_LIBRARY_PATH="$HOME/conda/lib"
export LDFLAGS="-L`pwd`/libs/lib -L$HOME/conda/lib"

# Step 8: Activate the newer version of node / NPM, install depenendencies for reacticloud, and compile a native module.
nvm use 17.2.0
nvm alias default 17.2.0
npm install
npx node-pre-gyp rebuild -C ./node_modules/canvas

#!/bin/bash



export NVM_DIR="$HOME/.nvm" && (
  git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
  cd "$NVM_DIR"
  git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)`
) && \. "$NVM_DIR/nvm.sh"



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

nvm install 17.2.0


curl https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh > ~/Miniconda.sh
bash ~/Miniconda.sh -b -p ~/conda

read -r -d '' PROFILE_CONDA_CODE <<'EOF'
export PATH="$HOME/conda/bin:$PATH"
EOF

echo "$PROFILE_CONDA_CODE" >> ~/.profile

source ~/.profile

conda install gcc_linux-64 gxx_linux-64 -y

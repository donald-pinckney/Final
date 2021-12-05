# Reacticloud

# TODO

- [x] Orchestrator Code
- [x] Fix merge and seq_id
- [ ] Runnable Graph
- [ ] Optimizer 


## Installation on VDI Machines

### 1. Clone the repository:
```
cd ~
git clone https://github.com/donald-pinckney/Final
```

### 2. Setup a newer version of node:
```
cd ~/Final/reacticloud
./setup_node.sh
```

### 3. Exit your SSH session, then log back in again

### 4. Check that the version of node is now correct:
```
# This should print: v17.2.0
# VERY IMPORTANT: the code will not run with old versions of node,
# so check that the right version is printed!!!!
node --version
```

### 5. Start the Orchestrator on VDI Machine 45
Note that many examples are hard-coded to connect to the orchestrator running on VDI Machine 45,
so you should run the orchestrator on that VDI machine
```
ssh <user>@vdi-linux-045.ccs.neu.edu
hostname # This should print: vdi-linux-045.ccs.neu.edu
cd ~/Final/reacticloud
node out/main/start_orchestrator.js 12000
```


### 6. Start Worker Nodes on VDI Machines
On a VDI machine of your choice, start a worker:

```
ssh <user>@vdi-linux-<MACHINE>.ccs.neu.edu
cd ~/Final/reacticloud
node out/main/start_worker.js vdi-linux-045.ccs.neu.edu 12000
```

> You may start multiple of these worker nodes if you want,
> this will just increase compute capacity of the serverless
> platform, though right now the job scheduler is not meant to handle
> a larger number of workers.


### 7. 


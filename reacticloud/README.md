# Reacticloud

# TODO

- [x] Orchestrator Code
- [x] Fix merge and seq_id
- [ ] Runnable Graph
- [ ] Optimizer 


# Running on VDI Machines

## Warning: VDI Machine Usage
Many examples are hard-coded to connect to the reacticloud orchestrator running on VDI Machine 45 port 12000.
Therefore, you **must** run the orchestrator on VDI Machine 45 port 12000.

## Setup and Dependencies (you can run this on any VDI machine)

#### 1. Clone the repository:
```bash
cd ~
git clone https://github.com/donald-pinckney/Final
```

#### 2. Run the setup script:
```bash
cd ~/Final/reacticloud
./setup.sh # This MUST be run from the reacticloud directory!!!
```

## 3. Run the Orchestrator on VDI Machine 45 Port 12000:
```
# This MUST be run on VDI machine 45
cd ~/Final/reacticloud
node out/main/start_orchestrator.js 12000
```

> Note: By default the orchestrator will NOT use worker nodes to run functions, since the performance is quite poor due to
> the intra-VDI networking.
> However, *if you really want*, you can enable worker nodes as so: `node out/main/start_orchestrator.js 12000 --use-workers`,
> and then start worker nodes on other VDI machines with: `node out/main/start_worker.js vdi-linux-045.ccs.neu.edu 12000`.



## 4. Running Command Line Examples:
There are 3 examples that can be run from the command line.
These are meant to check that the orchestrator is working correctly,
and demonstrate the basics of the reacticloud system.

- `node out/examples/cli/ex_serial.js vdi-linux-045.ccs.neu.edu 12000`
  + You can see the source code of this example in `examples/cli/ex_serial.ts`.
- `node out/examples/cli/ex_parallel.js vdi-linux-045.ccs.neu.edu 12000`
  + You can see the source code of this example in `examples/cli/ex_parallel.ts`.
- `node out/examples/cli/ex_adder.js vdi-linux-045.ccs.neu.edu 12000`
  + You can see the source code of this example in `examples/cli/ex_adder.ts`.

## 5. Running the Web Example:
A more complex example is in a Web app format.
Make sure that the orchestrator is running correctly on VDI machine 45 port 12000.
Then, on your local computer, clone the repository, and open `examples/web/plot.html` in your browser
(I have tested it on Firefox).

In the Web app, there are 4 button which can be used to fill in 4 different options
for the GUI. After choosing one (e.g. Tiny Dataset), click Plot. This will then show
both the resulting plot, as well as the total execution time.

At the top of the page, bullet points are shown describing where the individual functions
have been placed (browser or cloud). If you repeatedly click Plot, you will see that
the functions are dynamically re-placed to minimize total data transfer,
which will also reduce the total execution time.


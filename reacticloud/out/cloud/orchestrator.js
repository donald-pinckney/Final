"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const dag_1 = require("../dsl/dag");
const dag_runner_1 = require("../dsl/dag_runner");
const compute_partition_1 = require("./compute_partition");
const socket_io_1 = require("socket.io");
const fetch = require('node-fetch');
const parse_csv = require('csv-parse').parse;
const plot = require('../examples/plot_helper.js');
class Orchestrator {
    constructor(withWorkers) {
        this.useWorkers = withWorkers;
        this.io = new socket_io_1.Server({
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"]
            },
            maxHttpBufferSize: 8e9 // 8 GB
        });
        this.unique_deployment_id = 0;
        this.original_deploy_requests = new Map();
        this.deployments = new Map();
        this.clients = new Map();
        this.workers = new Map();
        this.function_sources = new Map();
        this.allTraceData = new Map();
        this.derivedDeploymentIds = new Map();
        this.io.on('connection', (socket) => {
            console.log("Socket connected: " + socket.id);
            socket.on('disconnect', () => this.receiveDisconnect(socket));
            socket.on('client_orch_deploy', (dag, callback) => this.receiveDeployRequest(socket, dag, callback));
            socket.on('client_orch_send_traces', (original_deploy_id, fns_data, inputs_data) => this.receiveTraces(socket, original_deploy_id, fns_data, inputs_data));
            socket.on('iam', (role) => this.receiveIam(socket, role));
            socket.on('input_available', (xJSON, dep_id, fn_id, input_seq_id, selector) => this.receiveInputAvailable(socket, xJSON, dep_id, fn_id, input_seq_id, selector));
            socket.on('worker_request_fn', (dep_id, fn_id, callback) => this.receiveWorkerRequestFn(socket, dep_id, fn_id, callback));
            socket.on('worker_result', (task_deploy_id, task_fn_id, task_seq_id, result) => this.receivedWorkerResult(socket, task_deploy_id, task_fn_id, task_seq_id, result));
        });
    }
    // -------- Events received by orchestrator ---------
    receiveIam(socket, role) {
        if (this.clients.has(socket.id) || this.workers.has(socket.id)) {
            throw new Error("BUG: duplicate connection with socket id: " + socket.id);
        }
        if (role == 'client') {
            console.log(socket.id + " is a client");
            this.clients.set(socket.id, socket);
        }
        else if (role == 'worker') {
            console.log(socket.id + " is a worker");
            this.workers.set(socket.id, [socket, []]);
        }
        else {
            throw new Error("bad role: " + role);
        }
    }
    receiveDisconnect(socket) {
        if (this.clients.has(socket.id)) {
            console.log("Client disconnected: " + socket.id);
        }
        else if (this.workers.has(socket.id)) {
            console.log("Worker disconnected: " + socket.id);
            // console.log("IGNORING")
            // return
            const workerData = this.workers.get(socket.id);
            if (workerData === undefined) {
                throw new Error("unreachable");
            }
            const toReschedule = workerData[1];
            this.workers.delete(socket.id);
            toReschedule.forEach(task => {
                this.scheduleExecTask(task);
            });
        }
        else {
            console.log("Unknown socket disconnected: " + socket.id);
        }
    }
    receiveDeployRequest(socket, dagSer, callback) {
        console.log("Received deploy request from socket: " + socket.id);
        const dagReq = dag_1.Dag.deserialize(dagSer);
        const this_deploy_id = this.unique_deployment_id++;
        if (this.original_deploy_requests.has(this_deploy_id)) {
            throw new Error("Duplicate deploy id: " + this_deploy_id);
        }
        this.original_deploy_requests.set(this_deploy_id, dagReq);
        const emptyTraceData = dagReq.map((fn_id, fn_deploy) => {
            return new Map();
        });
        if (this.allTraceData.has(this_deploy_id)) {
            throw new Error("Duplicate deploy id (2): " + this_deploy_id);
        }
        this.allTraceData.set(this_deploy_id, { inputs_trace: new Map(), fns_trace: emptyTraceData });
        this.derivedDeploymentIds.set(this_deploy_id, []);
        const partitionResponse = this.deployARequest(dagReq, this_deploy_id, this_deploy_id, socket);
        callback(this_deploy_id, partitionResponse);
    }
    mergeSelectorSizes(originalSizes, newSizes) {
        const pathToStr = (sel) => sel.join(',');
        const originalMap = new Map();
        originalSizes.forEach(({ out_selector, bytes }) => {
            originalMap.set(pathToStr(out_selector), [bytes, out_selector]);
        });
        newSizes.forEach(({ out_selector, bytes }) => {
            const path = pathToStr(out_selector);
            const originalSizeAndPath = originalMap.get(path);
            if (originalSizeAndPath == undefined) {
                originalSizes.push({ out_selector, bytes });
            }
            else if (bytes != originalSizeAndPath[0]) {
                throw new Error('BUG: incompatible duplicate traces!');
            }
        });
    }
    mergeTraceData(original_deploy_id, new_fns_traces, new_inputs_traces) {
        const oldTraceData = this.allTraceData.get(original_deploy_id);
        if (oldTraceData === undefined) {
            throw new Error("BUG: received trace data before deployment for dep_id: " + original_deploy_id);
        }
        oldTraceData.fns_trace.map((fn_id, oldTraces) => {
            const newTraces = new_fns_traces.getNode(fn_id).data;
            newTraces.forEach((newRow, new_seq_id) => {
                const oldRow = oldTraces.get(new_seq_id);
                if (oldRow != undefined) {
                    if (oldRow.exec_location != newRow.exec_location || oldRow.exec_time_ms != newRow.exec_time_ms) {
                        console.log(`BUG: incompatible fn trace data for original_deploy_id: ${original_deploy_id}, seq_id: ${new_seq_id}.`);
                        throw new Error('unreachable');
                    }
                    this.mergeSelectorSizes(oldRow.output_sizes, newRow.output_sizes);
                }
                else {
                    oldTraces.set(new_seq_id, newRow);
                }
            });
        });
        new_inputs_traces.forEach((newRow, seq_id) => {
            const oldRow = oldTraceData.inputs_trace.get(seq_id);
            if (oldRow != undefined) {
                this.mergeSelectorSizes(oldRow, newRow);
                console.log(`WARNING: duplicate input trace data for original_deploy_id: ${original_deploy_id}, seq_id: ${seq_id}. Discarding new data`);
            }
            else {
                oldTraceData.inputs_trace.set(seq_id, newRow);
            }
        });
    }
    receiveTraces(socket, original_deploy_id, fns_data, inputs_data_ser) {
        console.log("Received trace data from socket: " + socket.id);
        const newFnsTraceDataSer = dag_1.Dag.deserialize(fns_data);
        const newFnsTraceData = newFnsTraceDataSer.map((fn_id, dataSer) => {
            return new Map(dataSer.map(({ seq_id, exec_data }) => [seq_id, exec_data]));
        });
        const newInputData = new Map(inputs_data_ser.map(({ seq_id, sizes }) => [seq_id, sizes]));
        this.mergeTraceData(original_deploy_id, newFnsTraceData, newInputData);
        const derivedDeployIds = this.derivedDeploymentIds.get(original_deploy_id);
        if (derivedDeployIds === undefined) {
            throw new Error("unreachable");
        }
        derivedDeployIds.forEach(otherDeployId => {
            const runningDag = this.deployments.get(otherDeployId);
            if (runningDag === undefined) {
                throw new Error("unreachable");
            }
            const otherTraceData = runningDag.extractPartialTraceData();
            this.mergeTraceData(original_deploy_id, otherTraceData.fns, otherTraceData.inputs);
        });
        if (this.shouldTriggerReSolve(original_deploy_id)) {
            console.log("Received deploy request from socket: " + socket.id);
            const dagReq = this.original_deploy_requests.get(original_deploy_id);
            if (dagReq === undefined) {
                throw new Error("unreachable");
            }
            const new_deploy_id = this.unique_deployment_id++;
            const partitionResponse = this.deployARequest(dagReq, original_deploy_id, new_deploy_id, socket);
            socket.emit('updated_deployment', original_deploy_id, new_deploy_id, partitionResponse);
        }
    }
    receiveInputAvailable(socket, xJSON, dep_id, fn_id, input_seq_id, selector) {
        console.log("Received input available from socket: " + socket.id);
        const runningDag = this.deployments.get(dep_id);
        if (runningDag === undefined) {
            throw new Error('deployment not found: ' + dep_id);
        }
        const x = JSON.parse(xJSON);
        runningDag.localInputAvailable(x, fn_id, input_seq_id, selector);
    }
    receiveWorkerRequestFn(socket, dep_id, fn_id, callback) {
        const globalId = `${dep_id}-${fn_id}`;
        const src = this.function_sources.get(globalId);
        if (src === undefined) {
            throw new Error(`Source code requested for undefined function: (dep_id = ${dep_id}, fn_id = ${fn_id})`);
        }
        callback(src);
    }
    // -------------- Helpers ---------------
    shouldTriggerReSolve(original_deploy_id) {
        return true;
    }
    deployARequest(request, original_deploy_id, fresh_deploy_id, socket) {
        const traceData = this.allTraceData.get(original_deploy_id);
        if (traceData === undefined) {
            throw new Error("BUG: trace data does not exist for deploy id: " + original_deploy_id);
        }
        const locationAbsMap = (0, compute_partition_1.computeLocations)(request, traceData);
        const locationRelMap = (0, compute_partition_1.relativizeLocations)(locationAbsMap, 'cloud');
        const dagPart = (0, dag_runner_1.partitionDag)(request, locationRelMap, 'cloud');
        const cloudDag = dagPart.map((fn_id, part_fn) => {
            return (0, dag_runner_1.mapPartitionedFn)(part_fn, data => {
                if (data.constraint == 'client') {
                    throw new Error("BUG: bad partitioning");
                }
                else {
                    const src = data.fnSrc;
                    const global_fn_id = `${fresh_deploy_id}-${fn_id}`;
                    if (this.function_sources.has(global_fn_id)) {
                        throw new Error("BUG: function already deployed!");
                    }
                    this.function_sources.set(global_fn_id, src);
                    return { deploy_id: fresh_deploy_id, fn_id: fn_id };
                }
            });
        });
        const runnableDag = new dag_runner_1.RunnableDag(cloudDag, 'cloud');
        runnableDag.runFnHere = (run_fn, run_seq_id, run_arg, run_done) => {
            if (this.useWorkers) {
                const task = {
                    deploy_id: run_fn.deploy_id,
                    fn_id: run_fn.fn_id,
                    seq_id: run_seq_id,
                    arg: run_arg,
                    done: run_done
                };
                this.scheduleExecTask(task);
            }
            else {
                const globalId = `${run_fn.deploy_id}-${run_fn.fn_id}`;
                const src = this.function_sources.get(globalId);
                if (src === undefined) {
                    throw new Error(`Source code requested for undefined function: (dep_id = ${run_fn.deploy_id}, fn_id = ${run_fn.fn_id})`);
                }
                const fn_evaled = eval(src);
                fn_evaled(run_arg, run_done);
            }
        };
        runnableDag.sendInputThere = (xJSON, fn_id, input_seq_id, selector) => {
            socket.emit('input_available', xJSON, fresh_deploy_id, fn_id, input_seq_id, selector);
        };
        if (this.deployments.has(fresh_deploy_id)) {
            throw new Error("BUG: duplicate deployment");
        }
        this.deployments.set(fresh_deploy_id, runnableDag);
        const derivedIds = this.derivedDeploymentIds.get(original_deploy_id);
        if (derivedIds === undefined) {
            throw new Error('unreachable');
        }
        derivedIds.push(fresh_deploy_id);
        const partitionResponse = Array.from((0, compute_partition_1.partitionComplement)(locationRelMap).entries());
        return partitionResponse;
    }
    listen(port) {
        this.io.listen(port);
        console.log("Orchestrator listening");
    }
    freshDeploymentId() {
        return this.unique_deployment_id++;
    }
    scheduleExecTask(task) {
        if (this.workers.size == 0) {
            throw new Error("Error: cannot run serverless functions, no attached worker nodes!!!");
        }
        let min_tasks_len = null;
        let min_tasks_id_tmp = null;
        this.workers.forEach(([workerSocket, tasks], worker_id) => {
            if (min_tasks_len === null || tasks.length < min_tasks_len) {
                min_tasks_len = tasks.length;
                min_tasks_id_tmp = worker_id;
            }
        });
        if (min_tasks_id_tmp === null) {
            throw new Error("BUG: nonnull expected");
        }
        const min_tasks_id = min_tasks_id_tmp;
        const destWorkerData = this.workers.get(min_tasks_id);
        if (destWorkerData === undefined) {
            throw new Error("unreachable");
        }
        destWorkerData[1].push(task);
        destWorkerData[0].emit('worker_run_fn', task.arg, task.deploy_id, task.fn_id, task.seq_id);
    }
    receivedWorkerResult(socket, task_deploy_id, task_fn_id, task_seq_id, result) {
        const destWorkerData = this.workers.get(socket.id);
        if (destWorkerData === undefined) {
            throw new Error("unreachable");
        }
        console.log("GOT RESULT FROM WORKER!");
        let foundIndex = -1;
        for (let index = 0; index < destWorkerData[1].length; index++) {
            const scheduledTask = destWorkerData[1][index];
            if (scheduledTask.deploy_id == task_deploy_id && scheduledTask.fn_id == task_fn_id && scheduledTask.seq_id == task_seq_id) {
                foundIndex = index;
                break;
            }
        }
        if (foundIndex != -1) {
            const foundTask = destWorkerData[1][foundIndex];
            destWorkerData[1].splice(foundIndex, 1);
            foundTask.done(result);
        }
        else {
            throw new Error("BUG: couldn't find worker node for task");
        }
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map
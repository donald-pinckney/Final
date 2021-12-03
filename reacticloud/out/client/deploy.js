"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = void 0;
const dag_1 = require("../dsl/dag");
// import { deploymentRequestForSF } from "../dsl/deployment_request"
// import { Location } from "../dsl/sf"
const socket_io_client_1 = require("socket.io-client");
const dag_runner_1 = require("../dsl/dag_runner");
const SEND_NUM_THRESHOLD = 10;
const SEND_MS_THRESHOLD = 1000;
const socketsMap = new Map();
const input_available_callbacks = new Map();
const updated_deployment_callbacks = new Map();
function getSocket(address, port) {
    const addressPort = `${address}:${port}`;
    let sock = socketsMap.get(addressPort);
    if (sock == undefined) {
        console.log('Opening connection to orchestrator');
        sock = (0, socket_io_client_1.io)(`ws://${addressPort}`);
        sock.emit('iam', 'client');
        sock.on("input_available", (x, deploy_id, fn_id, input_seq_id, selector) => {
            const addressPortDeployId = `${addressPort}:${deploy_id}`;
            const callback = input_available_callbacks.get(addressPortDeployId);
            if (callback == undefined) {
                console.log("BUG: received input for which no callback is registered!");
                console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_seq_id: ${input_seq_id}), selector: ${selector})`);
            }
            else {
                callback(x, fn_id, input_seq_id, selector);
            }
        });
        sock.on("updated_deployment", (original_deploy_id, new_deploy_id, new_partition) => {
            const addressPortDeployId = `${addressPort}:${original_deploy_id}`;
            const callback = updated_deployment_callbacks.get(addressPortDeployId);
            if (callback == undefined) {
                console.log("BUG: received updated deployment for which no callback is registered!");
                console.log(`Received updated deployment for (original_deploy_id: ${original_deploy_id}, new_deploy_id: ${new_deploy_id})`);
            }
            else {
                callback(new_deploy_id, new_partition);
            }
        });
        socketsMap.set(addressPort, sock);
        return sock;
    }
    else {
        return sock;
    }
}
function stripClientFunction(id, f) {
    if (f.constraint == 'client') {
        return { constraint: 'client' };
    }
    else {
        return { constraint: f.constraint, fnSrc: f.fn.toString() };
    }
}
function deploy(address, port, sf) {
    const addressPort = `${address}:${port}`;
    const socket = getSocket(address, port);
    const dag = (0, dag_1.buildDAG)(sf);
    const dagStripped = dag.map(stripClientFunction);
    const request = dagStripped.serialize();
    return new Promise((resolve, reject) => {
        socket.emit('client_orch_deploy', request, (original_deploy_id, partitionList) => {
            const addressPortDeployId = `${addressPort}:${original_deploy_id}`;
            const partition = new Map(partitionList);
            const clientDagTmp = (0, dag_runner_1.partitionDag)(dag, partition, 'client');
            const clientDag = clientDagTmp.map((fn_id, part_sf) => {
                return (0, dag_runner_1.mapPartitionedFn)(part_sf, sf => sf.fn);
            });
            let current_dep_id = original_deploy_id;
            const deployments = new Map();
            const original_runnableDag = new dag_runner_1.RunnableDag(clientDag, 'client');
            let last_trace_send_time_ms = Date.now();
            original_runnableDag.runFnHere = (fn, seq_id, arg, done) => {
                fn(arg, done);
            };
            original_runnableDag.sendInputThere = (x, fn_id, input_seq_id, selector) => {
                socket.emit('input_available', x, original_deploy_id, fn_id, input_seq_id, selector);
            };
            deployments.set(current_dep_id, original_runnableDag);
            input_available_callbacks.set(addressPortDeployId, (x, fn_id, input_seq_id, selector) => {
                original_runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector);
            });
            updated_deployment_callbacks.set(addressPortDeployId, (new_deploy_id, newPartitionList) => {
                const newPartition = new Map(newPartitionList);
                const newClientDagTmp = (0, dag_runner_1.partitionDag)(dag, newPartition, 'client');
                const newClientDag = newClientDagTmp.map((fn_id, part_sf) => {
                    return (0, dag_runner_1.mapPartitionedFn)(part_sf, sf => sf.fn);
                });
                const new_runnableDag = new dag_runner_1.RunnableDag(newClientDag, 'client');
                const addressPortDeployIdNew = `${addressPort}:${new_deploy_id}`;
                new_runnableDag.runFnHere = (fn, seq_id, arg, done) => {
                    fn(arg, done);
                };
                new_runnableDag.sendInputThere = (x, fn_id, input_seq_id, selector) => {
                    socket.emit('input_available', x, new_deploy_id, fn_id, input_seq_id, selector);
                };
                input_available_callbacks.set(addressPortDeployIdNew, (x, fn_id, input_seq_id, selector) => {
                    new_runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector);
                });
                deployments.set(new_deploy_id, new_runnableDag);
                current_dep_id = new_deploy_id;
            });
            let the_unique_seq_id = 0;
            resolve(initial_input => {
                const currentDag = deployments.get(current_dep_id);
                const now = Date.now();
                if (currentDag.getInputCount() > SEND_NUM_THRESHOLD && (now - last_trace_send_time_ms) > SEND_MS_THRESHOLD) {
                    last_trace_send_time_ms = now;
                    const traceData = currentDag.extractPartialTraceData();
                    const traceDataFn = traceData.fns.map((fn_id, traces) => {
                        return Array.from(traces.entries()).map(([seq_id, row]) => {
                            return { seq_id: seq_id, exec_data: row };
                        });
                    });
                    const traceDataInput = Array.from(traceData.inputs.entries()).map(([seq_id, row]) => {
                        return { seq_id: seq_id, sizes: row };
                    });
                    socket.emit('client_orch_send_traces', original_deploy_id, traceDataFn.serialize(), traceDataInput);
                }
                currentDag.acceptInitialInput(initial_input, the_unique_seq_id++);
            });
        });
    });
}
exports.deploy = deploy;
//# sourceMappingURL=deploy.js.map
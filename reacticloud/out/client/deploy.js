"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = void 0;
const dag_1 = require("../dsl/dag");
// import { deploymentRequestForSF } from "../dsl/deployment_request"
// import { Location } from "../dsl/sf"
const socket_io_client_1 = require("socket.io-client");
const dag_runner_1 = require("../dsl/dag_runner");
const socketsMap = new Map();
const input_available_callbacks = new Map();
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
        socketsMap.set(addressPort, sock);
        return sock;
    }
    else {
        return sock;
    }
}
function stripClientFunction(f) {
    if (f.constraint == 'client') {
        return { constraint: 'client' };
    }
    else {
        return { constraint: f.constraint, fnSrc: f.fn.toString() };
    }
}
function partitionClientDag(dag, partition) {
    return dag.map(sf => {
        const id = sf.uniqueId;
        const loc = partition.get(id);
        if (loc == undefined) {
            throw new Error(`BUG: Could not find placement for ${id}`);
        }
        else if (loc == 'here' && sf.constraint == 'cloud') {
            throw new Error(`BUG: Invalid partition from orchestrator`);
        }
        else if (loc == 'there' && sf.constraint == 'client') {
            throw new Error(`BUG: Invalid partition from orchestrator`);
        }
        else if (loc == 'here') {
            return { location: 'here', fn: sf.fn };
        }
        else if (loc == 'there') {
            return { location: 'there' };
        }
        else {
            throw new Error(`BUG: unreachable`);
        }
    });
}
function deploy(address, port, sf) {
    const addressPort = `${address}:${port}`;
    const socket = getSocket(address, port);
    const dag = (0, dag_1.buildDAG)(sf);
    const dagStripped = dag.map(stripClientFunction);
    const request = dagStripped.serialize();
    return new Promise((resolve, reject) => {
        socket.emit('client_orch_deploy', request, (dep_id, partitionList) => {
            const addressPortDeployId = `${addressPort}:${dep_id}`;
            const partition = new Map(partitionList);
            const clientDag = partitionClientDag(dag, partition);
            const runnableDag = new dag_runner_1.RunnableDag(clientDag, (fn, arg, done) => {
                fn(arg, done);
            }, (x, fn_id, input_seq_id, selector) => {
                socket.emit('input_available', x, dep_id, fn_id, input_seq_id, selector);
            });
            input_available_callbacks.set(addressPortDeployId, (x, fn_id, input_seq_id, selector) => {
                runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector);
            });
            resolve(initial_input => {
                runnableDag.acceptInitialInput(initial_input);
            });
        });
    });
}
exports.deploy = deploy;
//# sourceMappingURL=deploy.js.map
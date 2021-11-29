"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const socket_io_1 = require("socket.io");
class Orchestrator {
    constructor() {
        this.io = new socket_io_1.Server();
        this.unique_deployment_id = 0;
        this.io.on('connection', (socket) => {
            console.log("Socket connected: " + socket.id);
            socket.on('disconnect', () => this.receiveDisconnect(socket));
            socket.on('client_orch_deploy', (dag, callback) => this.receiveDeployRequest(socket, dag, callback));
            socket.on('iam', (role) => this.receiveIam(socket, role));
            socket.on('input_available', (x, dep_id, fn_id, input_seq_id, selector) => this.receiveInputAvailable(socket, x, dep_id, fn_id, input_seq_id, selector));
            socket.on('worker_request_fn', (dep_id, fn_id, callback) => this.receiveWorkerRequestFn(socket, dep_id, fn_id, callback));
        });
    }
    listen(port) {
        this.io.listen(port);
        console.log("Orchestrator listening");
    }
    freshDeploymentId() {
        return this.unique_deployment_id++;
    }
    receiveDisconnect(socket) {
        console.log("Socket disconnected: " + socket.id);
    }
    receiveDeployRequest(socket, dag, callback) {
        console.log("Received deploy request from socket: " + socket.id);
    }
    receiveIam(socket, role) {
        console.log("Received iam from socket: " + socket.id);
    }
    receiveInputAvailable(socket, x, dep_id, fn_id, input_seq_id, selector) {
        console.log("Received input available from socket: " + socket.id);
    }
    receiveWorkerRequestFn(socket, dep_id, fn_id, callback) {
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map
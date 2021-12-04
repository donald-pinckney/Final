"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const socket_io_client_1 = require("socket.io-client");
const fetch = require('node-fetch');
const parse_csv = require('csv-parse').parse;
const plot = require('../examples/plot_helper.js');
class Worker {
    // threadPool: DynamicPool
    constructor(address, port) {
        this.preparedFunctions = new Map();
        // this.threadPool = new DynamicPool(16)
        const addressPort = `${address}:${port}`;
        this.socket = (0, socket_io_client_1.io)(`ws://${addressPort}`);
        this.socket.emit('iam', 'worker');
        this.socket.on('worker_run_fn', (x, dep_id, fn_id, seq_id) => this.receiveWorkerRunFn(x, dep_id, fn_id, seq_id));
    }
    receiveWorkerRunFn(x, dep_id, fn_id, seq_id) {
        const fnKey = `fn-${dep_id}-${fn_id}`;
        const maybeFn = this.preparedFunctions.get(fnKey);
        if (maybeFn == undefined) {
            console.log(`Requesting source code for function (dep_id=${dep_id}, fn_id=${fn_id}) from orchestrator`);
            this.requestFn(dep_id, fn_id, src => {
                console.log(`Received src (dep_id=${dep_id}, fn_id=${fn_id}) = ${src}`);
                const fn_to_run = eval(src);
                this.preparedFunctions.set(fnKey, fn_to_run);
                fn_to_run(x, (r) => {
                    this.socket.emit('worker_result', dep_id, fn_id, seq_id, r);
                });
            });
        }
        else {
            maybeFn(x, (r) => {
                this.socket.emit('worker_result', dep_id, fn_id, seq_id, r);
            });
        }
    }
    requestFn(dep_id, fn_id, reply_src) {
        this.socket.emit('worker_request_fn', dep_id, fn_id, reply_src);
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map
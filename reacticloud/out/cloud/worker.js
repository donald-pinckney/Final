"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const node_worker_threads_pool_1 = require("node-worker-threads-pool");
const socket_io_client_1 = require("socket.io-client");
class Worker {
    constructor(address, port) {
        this.preparedFunctions = new Map();
        this.threadPool = new node_worker_threads_pool_1.DynamicPool(16);
        const addressPort = `${address}:${port}`;
        this.socket = (0, socket_io_client_1.io)(`ws://${addressPort}`);
        this.socket.emit('iam', 'worker');
        this.socket.on('worker_run_fn', (x, dep_id, fn_id, done) => this.receiveWorkerRunFn(x, dep_id, fn_id, done));
    }
    receiveWorkerRunFn(x, dep_id, fn_id, done) {
        const fnKey = `fn-${dep_id}-${fn_id}`;
        const maybeFn = this.preparedFunctions.get(fnKey);
        if (maybeFn == undefined) {
            console.log(`Requesting source code for function (dep_id=${dep_id}, fn_id=${fn_id}) from orchestrator`);
            this.requestFn(dep_id, fn_id, src => {
                console.log(`Received src (dep_id=${dep_id}, fn_id=${fn_id}) = ${src}`);
                const newFn = eval(src);
                this.preparedFunctions.set(fnKey, newFn);
                // newFn(x, done)
                this.threadPool.exec({
                    task: ([threadFuncArg, threadFunc]) => {
                        return new Promise((resolve, reject) => {
                            threadFunc(threadFuncArg, (r) => {
                                resolve(r);
                            });
                        });
                    },
                    param: [x, newFn]
                }).then(result => {
                    done(result);
                });
            });
        }
        else {
            // maybeFn(x, done)
            this.threadPool.exec({
                task: ([threadFuncArg, threadFunc]) => {
                    return new Promise((resolve, reject) => {
                        threadFunc(threadFuncArg, (r) => {
                            resolve(r);
                        });
                    });
                },
                param: [x, maybeFn]
            }).then(result => {
                done(result);
            });
        }
    }
    requestFn(dep_id, fn_id, reply_src) {
        this.socket.emit('worker_request_fn', dep_id, fn_id, reply_src);
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map
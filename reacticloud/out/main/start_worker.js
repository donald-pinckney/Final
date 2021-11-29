"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_1 = require("../cloud/worker");
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 2) {
    console.log(`Usage: node out/main/start_worker.js [orchestrator address] [orchestrator port]`);
}
const address = cliArgs[0];
const port = parseInt(cliArgs[1]);
const worker = new worker_1.Worker(address, port);
//# sourceMappingURL=start_worker.js.map
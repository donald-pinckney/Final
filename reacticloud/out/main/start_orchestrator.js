"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../cloud/orchestrator");
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 1 && cliArgs.length != 2) {
    console.log(`Usage: node out/main/start_orchestrator.js [listening port] --use-workers`);
    process.exit(1);
}
const port = parseInt(cliArgs[0]);
let useWorkers = false;
if (cliArgs.length == 2) {
    useWorkers = cliArgs[1] == '--use-workers';
}
// We do not use workers to run code by default
// because it turns out that network speed between VDI machines is not
// very good actually
const orchestrator = new orchestrator_1.Orchestrator(useWorkers);
orchestrator.listen(port);
//# sourceMappingURL=start_orchestrator.js.map
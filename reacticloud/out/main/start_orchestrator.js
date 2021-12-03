"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../cloud/orchestrator");
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 1) {
    console.log(`Usage: node out/main/start_orchestrator.js [listening port]`);
    process.exit(1);
}
const port = parseInt(cliArgs[0]);
const orchestrator = new orchestrator_1.Orchestrator();
orchestrator.listen(port);
//# sourceMappingURL=start_orchestrator.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sf_1 = require("../../dsl/sf");
const deploy_1 = require("../../client/deploy");
const int1 = sf_1.SF.arr((x) => parseInt(x));
const int2 = sf_1.SF.arr((x) => parseInt(x));
const adder = sf_1.SF.arr(([x, y]) => x + y);
const stringOut = sf_1.SF.arr((x) => x.toString());
const final_sf = int1.parallel(int2)
    .then(adder)
    .then(stringOut)
    .subscribe(answer => {
    console.log(answer);
});
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 2) {
    console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`);
    process.exit(1);
}
const address = cliArgs[0];
const port = parseInt(cliArgs[1]);
(0, deploy_1.deploy)(address, port, final_sf).then(runnable => {
    runnable(['3', '4']);
});
//# sourceMappingURL=ex_adder.js.map
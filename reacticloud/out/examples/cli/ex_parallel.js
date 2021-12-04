"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sf_1 = require("../../dsl/sf");
const deploy_1 = require("../../client/deploy");
const f0 = sf_1.SF.arr((x) => x + 100);
const f1 = sf_1.SF.arrAsync((x, done) => {
    const answer = x * 5;
    setTimeout(() => {
        done(answer);
    }, 5000);
});
const f2 = sf_1.SF.arrAsync((x, done) => {
    const answer = x.toString();
    setTimeout(() => {
        done(answer);
    }, 5000);
});
const final_sf = f0
    .then(f1.lift2(([x, y]) => `x=${x}, y=${y}`, f2))
    .subscribe(output => console.log('Output: ' + output));
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 2) {
    console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`);
    process.exit(1);
}
const address = cliArgs[0];
const port = parseInt(cliArgs[1]);
(0, deploy_1.deploy)(address, port, final_sf).then(runnable => {
    runnable(42);
});
//# sourceMappingURL=ex_parallel.js.map
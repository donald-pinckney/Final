"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sf_1 = require("../../dsl/sf");
const deploy_1 = require("../../client/deploy");
const f0 = sf_1.SF.arr((x) => x + 100);
const f1 = sf_1.SF.arr((x) => x + 5);
const f2 = sf_1.SF.arr((x) => x * 2);
const theAnd = f1.and(f2);
const after = sf_1.SF.arr(([x, y]) => [x + y, x * y]);
const f3 = f0.then(theAnd).then(after).then(sf_1.SF.p1());
// const getFirst = SF.p1()
// const f0: SF<number, [number, number]> = SF.arr((x: number) => [x, x + 1])
// const f3 = f0.then(SF.p1())
// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
// const chain = f3.subscribe(console.log)
// console.log(chain)
// []             (lambda x1 . (lambda x0 . p1 x0) (f0 x1)) i
// [x1 => i]      (lambda x0 . p1 x0) (f0 x1)
// [x1 => i, x0 => f0 i]     p1 x0
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 2) {
    console.log(`Usage: node out/main/sample_client.js [orchestrator address] [orchestrator port]`);
}
const address = cliArgs[0];
const port = parseInt(cliArgs[1]);
(0, deploy_1.deploy)(address, port, f3).then(runnable => {
    runnable(42);
});
//# sourceMappingURL=sample_client.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExamples = void 0;
const lib_1 = require("../lib/lib");
function runExamples() {
    const f11 = lib_1.SF.arr((x) => x + 5);
    // const f1: SF<number, string> = f11
    const f2 = lib_1.SF.arr((x) => x.toString());
    const f3 = lib_1.SF.arr((x) => x.toString());
    const g1 = f11.then(f2);
    // const g2 = f11.then(f3)
    const q = f2.first();
    const combine = lib_1.SF.arr((x) => x[1]);
    const all = q.then(combine);
    console.log("hi!");
    const d = (0, lib_1.deploy)(g1);
    d(4, (r) => console.log(r));
}
exports.runExamples = runExamples;

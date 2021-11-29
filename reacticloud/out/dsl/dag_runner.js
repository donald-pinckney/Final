"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnableDag = void 0;
class RunnableDag {
    constructor(dag, runFnHere, sendInputThere) {
        this.dag = dag;
        this.runFnHere = runFnHere;
        this.sendInputThere = sendInputThere;
    }
    acceptInitialInput(input) {
    }
    localInputAvailable(x, for_fn, input_seq_id, selector) {
    }
}
exports.RunnableDag = RunnableDag;
//# sourceMappingURL=dag_runner.js.map
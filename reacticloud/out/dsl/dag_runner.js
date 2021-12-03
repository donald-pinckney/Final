"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partitionDag = exports.mapPartitionedFn = exports.RunnableDag = void 0;
class RunnableDag {
    // sendTraceData?: (partial_trace_data_inputs: InputTraceData, partial_trace_data_fns: SerializedDag<FunctionTraceData>) => void
    constructor(dag) {
        this.dag = dag;
        // this.runFnHere = null
        // this.sendInputThere = null
    }
    acceptInitialInput(input) {
    }
    localInputAvailable(x, for_fn, input_seq_id, selector) {
    }
    getInputCount() {
        throw new Error("TODO");
    }
    extractPartialTraceData() {
        // TODO: note: this should drain from this to save mem!
        throw new Error("TODO");
    }
}
exports.RunnableDag = RunnableDag;
function mapPartitionedFn(p, f) {
    if (p.location == 'here') {
        return { location: 'here', fn: f(p.fn) };
    }
    else if (p.location == 'there') {
        return { location: 'there' };
    }
    else {
        throw new Error("BUG: bad PartitionedFn");
    }
}
exports.mapPartitionedFn = mapPartitionedFn;
function partitionDag(dag, partition, herePlace) {
    const therePlace = herePlace == 'cloud' ? 'client' : 'cloud';
    return dag.map((fn_id, f_data) => {
        // const id = sf.uniqueId
        const loc = partition.get(fn_id);
        if (loc == undefined) {
            throw new Error(`BUG: Could not find placement for ${fn_id}`);
        }
        else if (loc == 'here' && f_data.constraint == therePlace) {
            throw new Error(`BUG: Invalid partition`);
        }
        else if (loc == 'there' && f_data.constraint == herePlace) {
            throw new Error(`BUG: Invalid partition`);
        }
        else if (loc == 'here') {
            return { location: 'here', fn: f_data };
        }
        else if (loc == 'there') {
            return { location: 'there' };
        }
        else {
            throw new Error(`BUG: unreachable`);
        }
    });
}
exports.partitionDag = partitionDag;
//# sourceMappingURL=dag_runner.js.map
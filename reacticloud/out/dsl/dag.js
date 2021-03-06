"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arityToTuple = exports.mapArity = exports.DagFunction = exports.Dag = exports.buildDAG = void 0;
class Dag {
    constructor(nodes, initial_wires) {
        this.nodes = nodes;
        this.initial_wires = initial_wires;
    }
    map(f) {
        return new Dag(new Map(Array.from(this.nodes.entries()).map(([id, fn]) => [id, fn.map(f)])), this.initial_wires);
    }
    serialize() {
        return {
            nodes: Array.from(this.nodes).map(([id, fn]) => [id, fn.serialize()]),
            initial_wires: this.initial_wires
        };
    }
    getNode(fn_id) {
        const mNode = this.nodes.get(fn_id);
        if (mNode === undefined) {
            throw new Error("BUG: unknown node: " + fn_id);
        }
        return mNode;
    }
    static deserialize(s) {
        return new Dag(new Map(s.nodes.map(([id, fn]) => [id, DagFunction.deserialize(fn)])), s.initial_wires);
    }
}
exports.Dag = Dag;
class DagFunction {
    constructor(data, id, param_shape, output_wires) {
        this.data = data;
        this.id = id;
        this.param_shape = param_shape;
        this.output_wires = output_wires;
    }
    map(f) {
        return new DagFunction(f(this.id, this.data), this.id, this.param_shape, this.output_wires);
    }
    serialize() {
        return {
            data: this.data,
            id: this.id,
            param_shape: this.param_shape,
            output_wires: this.output_wires
        };
    }
    static deserialize(s) {
        return new DagFunction(s.data, s.id, s.param_shape, s.output_wires);
    }
}
exports.DagFunction = DagFunction;
function mapArity(e, f) {
    switch (e.type) {
        case 'singleton':
            return { type: 'singleton', data: f(e.data) };
        case 'pair':
            return { type: 'pair', fst: mapArity(e.fst, f), snd: mapArity(e.snd, f) };
    }
}
exports.mapArity = mapArity;
function arityToTuple(arity) {
    if (arity.type == 'singleton') {
        return arity.data;
    }
    else if (arity.type == 'pair') {
        return [arityToTuple(arity.fst), arityToTuple(arity.snd)];
    }
    else {
        throw new Error('unreachable');
    }
}
exports.arityToTuple = arityToTuple;
const compute_dag_1 = require("./compute_dag");
Object.defineProperty(exports, "buildDAG", { enumerable: true, get: function () { return compute_dag_1.buildDAG; } });
//# sourceMappingURL=dag.js.map
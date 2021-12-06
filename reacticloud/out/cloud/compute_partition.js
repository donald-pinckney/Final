"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partitionComplement = exports.relativizeLocations = exports.computeLocations = void 0;
function setUnique(m, k, v) {
    if (m.has(k)) {
        throw new Error(`BUG: key ${k} should be unique!`);
    }
    m.set(k, v);
}
function setIntersect(x, y) {
    return new Set([...x].filter(i => y.has(i)));
}
function arraysEqual(xs, ys) {
    if (xs.length != ys.length) {
        throw new Error('BUG');
    }
    for (let i = 0; i < xs.length; i++) {
        if (xs[i] != ys[i]) {
            return false;
        }
    }
    return true;
}
function lookupSelector(selector, data) {
    for (let i = 0; i < data.length; i++) {
        if (arraysEqual(data[i].out_selector, selector)) {
            return data[i].bytes;
        }
    }
    throw new Error('BUG');
}
function computeTransfer(input, fns, places) {
    // iterate over edges to compute total transfered bytes
    const edges = [];
    fns.initial_wires.forEach(wire => {
        const bytes = lookupSelector(wire.from, input);
        const srcLoc = 'client';
        const dstId = wire.to.fn_id_or_input;
        if (dstId == 'input') {
            throw new Error('unreachable');
        }
        const dstLoc = places.get(dstId);
        if (dstLoc == undefined) {
            throw new Error('unreachable');
        }
        edges.push({ from: srcLoc, to: dstLoc, bytes });
    });
    fns.nodes.forEach(node => {
        if (node.data == 'terminal') {
            return;
        }
        const outSizes = node.data.output_sizes;
        node.output_wires.forEach(wire => {
            const bytes = lookupSelector(wire.from, outSizes);
            const srcLoc = places.get(node.id);
            if (srcLoc == undefined) {
                throw new Error('unreachable');
            }
            const dstId = wire.to.fn_id_or_input;
            if (dstId == 'input') {
                throw new Error('unreachable');
            }
            const dstLoc = places.get(dstId);
            if (dstLoc == undefined) {
                throw new Error('unreachable');
            }
            edges.push({ from: srcLoc, to: dstLoc, bytes });
        });
    });
    let transferSum = 0;
    edges.forEach(({ from, to, bytes }) => {
        if (from != to) {
            transferSum += bytes;
        }
    });
    return transferSum;
}
function computeTotalTransfer(complete_seq_ids, traceData, places) {
    let total = 0;
    complete_seq_ids.forEach(seq_id => {
        const fnsTrace = traceData.fns_trace.map((fn_id, traces) => {
            const node = traceData.fns_trace.getNode(fn_id);
            const trace = traces.get(seq_id);
            if (node.output_wires.length == 0) {
                return 'terminal';
            }
            if (trace === undefined) {
                throw new Error('unreachable');
            }
            return trace;
        });
        const inputs = traceData.inputs_trace.get(seq_id);
        if (inputs === undefined) {
            throw new Error('unreachable');
        }
        const transfer = computeTransfer(inputs, fnsTrace, places);
        total += transfer;
    });
    return total;
}
function genChoices(vars) {
    const vs = Array.from(vars.keys());
    if (vs.length == 0) {
        return [new Map()];
    }
    else {
        const v = vs[0];
        const cs = vars.get(v);
        if (cs == undefined) {
            throw new Error('unreachable');
        }
        const nextVars = new Map(vars.entries());
        nextVars.delete(v);
        const subChoices = genChoices(nextVars);
        return cs.flatMap(c => {
            return subChoices.map(subChoice => {
                const newChoice = new Map(subChoice.entries());
                newChoice.set(v, c);
                return newChoice;
            });
        });
    }
}
function computeLocations(dag, traceData) {
    console.log("here");
    let complete_seq_ids = new Set(Array.from(traceData.inputs_trace.keys()).filter(seq_id => {
        const seq_input = traceData.inputs_trace.get(seq_id);
        if (seq_input == undefined) {
            throw new Error('unreachable');
        }
        return seq_input.length == dag.initial_wires.length;
    }));
    traceData.fns_trace.map((fn_id, traces) => {
        const node = dag.getNode(fn_id);
        if (node.output_wires.length == 0) {
            return;
        }
        const traceKeys = Array.from(new Set(traces.keys()));
        const fullKeys = traceKeys.filter(seq_id => {
            const trace = traces.get(seq_id);
            if (trace == undefined) {
                throw new Error('unreachable');
            }
            return trace.output_sizes.length == node.output_wires.length;
        });
        complete_seq_ids = setIntersect(complete_seq_ids, new Set(fullKeys));
    });
    const biggest_seq_ids = Array.from(complete_seq_ids).sort((a, b) => b - a);
    complete_seq_ids = new Set(biggest_seq_ids.slice(0, Math.min(biggest_seq_ids.length, 5)));
    const variables = new Map();
    dag.map((fn_id, { constraint }) => {
        if (constraint == 'client') {
            setUnique(variables, fn_id, ['client']);
        }
        else if (constraint == 'cloud') {
            setUnique(variables, fn_id, ['cloud']);
        }
        else if (constraint == 'unconstrained') {
            setUnique(variables, fn_id, ['client', 'cloud']);
        }
        else {
            throw new Error("BUG: unknown constraint: " + constraint);
        }
    });
    const choices = genChoices(variables);
    let leastCost = -1;
    let leastClients = -1;
    let leastChoice = null;
    choices.forEach(choice => {
        const cost = computeTotalTransfer(complete_seq_ids, traceData, choice);
        const numClient = Array.from(choice.values())
            .reduce((acc, x) => acc + (x == 'client' ? 1 : 0), 0);
        if (leastChoice == null) {
            leastCost = cost;
            leastClients = numClient;
            leastChoice = choice;
        }
        else if (cost < leastCost) {
            leastCost = cost;
            leastClients = numClient;
            leastChoice = choice;
        }
        else if (cost == leastCost && numClient < leastClients) {
            leastCost = cost;
            leastClients = numClient;
            leastChoice = choice;
        }
    });
    if (leastChoice == null) {
        throw new Error('unreachable');
    }
    return leastChoice;
}
exports.computeLocations = computeLocations;
function relativizeLocations(locs, me) {
    return new Map(Array.from(locs.entries()).map(([id, loc]) => {
        return [id, loc == me ? 'here' : 'there'];
    }));
}
exports.relativizeLocations = relativizeLocations;
function locationComplement(loc) {
    if (loc == 'here') {
        return 'there';
    }
    else if (loc == 'there') {
        return 'here';
    }
    else {
        throw new Error("BUG");
    }
}
function partitionComplement(locs) {
    return new Map(Array.from(locs.entries()).map(([id, loc]) => [id, locationComplement(loc)]));
}
exports.partitionComplement = partitionComplement;
//# sourceMappingURL=compute_partition.js.map
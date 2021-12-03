"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partitionComplement = exports.relativizeLocations = exports.computeLocations = void 0;
function setUnique(m, k, v) {
    if (m.has(k)) {
        throw new Error(`BUG: key ${k} should be unique!`);
    }
    m.set(k, v);
}
function computeLocations(dag, traceData) {
    const locs = new Map();
    dag.map((fn_id, { constraint }) => {
        if (constraint == 'client') {
            setUnique(locs, fn_id, 'client');
        }
        else if (constraint == 'cloud') {
            setUnique(locs, fn_id, 'cloud');
        }
        else if (constraint == 'unconstrained') {
            setUnique(locs, fn_id, 'cloud');
        }
        else {
            throw new Error("BUG: unknown constraint: " + constraint);
        }
    });
    return locs;
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
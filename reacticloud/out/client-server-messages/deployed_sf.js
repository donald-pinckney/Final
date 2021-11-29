"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placementListToMap = exports.placementMapToList = exports.SF_first_deployed = exports.SF_then_deployed = exports.SF_arr_deployed = void 0;
function placementListToMap(xs) {
    return new Map(xs);
}
exports.placementListToMap = placementListToMap;
function placementMapToList(xs) {
    return [...xs.entries()];
}
exports.placementMapToList = placementMapToList;
class SF_arr_deployed {
    constructor(uniqueId, deployment) {
        this.uniqueId = uniqueId;
        this.deployment = deployment;
    }
}
exports.SF_arr_deployed = SF_arr_deployed;
class SF_then_deployed {
    constructor(f, g) {
        this.f = f;
        this.g = g;
    }
}
exports.SF_then_deployed = SF_then_deployed;
class SF_first_deployed {
    constructor(first_sf) {
        this.first_sf = first_sf;
    }
}
exports.SF_first_deployed = SF_first_deployed;
//# sourceMappingURL=deployed_sf.js.map
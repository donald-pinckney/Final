"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function placementListToMap(xs) {
    return new Map(xs);
}
function placementMapToList(xs) {
    return [...xs.entries()];
}
class SF_arr_deployed {
    constructor(uniqueId, deployment) {
        this.uniqueId = uniqueId;
        this.deployment = deployment;
    }
}
class SF_then_deployed {
    constructor(f, g) {
        this.f = f;
        this.g = g;
    }
}
class SF_first_deployed {
    constructor(first_sf) {
        this.first_sf = first_sf;
    }
}
//# sourceMappingURL=deployed_sf.js.map
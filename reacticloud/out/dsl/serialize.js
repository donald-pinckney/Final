"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentRequestForSF = exports.deserialize = exports.SF_deployment_request_first = exports.SF_deployment_request_then = exports.SF_deployment_request_arr = void 0;
class SF_deployment_request_arr {
    constructor(uniqueId, constraint) {
        this.uniqueId = uniqueId;
        this.constraint = constraint;
    }
}
exports.SF_deployment_request_arr = SF_deployment_request_arr;
class SF_deployment_request_then {
    constructor(f, g) {
        this.f = f;
        this.g = g;
    }
}
exports.SF_deployment_request_then = SF_deployment_request_then;
class SF_deployment_request_first {
    constructor(first_sf) {
        this.first_sf = first_sf;
    }
}
exports.SF_deployment_request_first = SF_deployment_request_first;
function deploymentRequestForSF(sf) {
    throw new Error("TODO: unimplemented");
}
exports.deploymentRequestForSF = deploymentRequestForSF;
function deserialize(serialized) {
    throw new Error("TODO: unimplemented");
}
exports.deserialize = deserialize;

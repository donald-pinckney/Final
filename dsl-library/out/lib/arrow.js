"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arr = void 0;
class SF_arr {
    constructor(f) {
        this.fn = f;
    }
    then(next) {
        return new SF_then(this, next);
    }
}
function arr(f) {
    return new SF_arr(f);
}
exports.arr = arr;
class SF_then {
    constructor(f, g) {
        this.f = f;
        this.g = g;
    }
    then(next) {
        return new SF_then(this, next);
    }
}

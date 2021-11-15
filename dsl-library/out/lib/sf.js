"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SF_first = exports.SF_then = exports.SF_arr = exports.SF = void 0;
class SF {
    constructor(w) {
        this._wrapped = w;
    }
    static arr(f, constraint = "unconstrained") {
        const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`;
        const fAsync = eval(fAsyncStr);
        return SF.arrAsync(f, constraint);
    }
    static arrAsync(f, constraint = "unconstrained") {
        return new SF(new SF_arr(f, constraint));
    }
    then(next) {
        return new SF(new SF_then(this._wrapped, next._wrapped));
    }
    first() {
        return new SF(new SF_first(this._wrapped));
    }
    second() {
        const swap = (x) => [x[1], x[0]];
        const swap1 = SF.arr(swap);
        const swap2 = SF.arr(swap);
        return swap1.then(this.first()).then(swap2);
    }
    with(other) {
        const f = this.first();
        const g = other.second();
        return f.then(g);
    }
    and(other) {
        const copy = SF.arr(x => [x, x]);
        return copy.then(this.with(other));
    }
    lift2(op, other) {
        const op_arr = SF.arr((args) => op(args[0], args[1]));
        return this.and(other).then(op_arr);
    }
    subscribe(f) {
        const subArr = SF.arrAsync((xx, cont) => f(xx), "client");
        return this.then(subArr);
    }
}
exports.SF = SF;
class SF_arr {
    constructor(f, constraint = "unconstrained") {
        this.fn = f;
    }
}
exports.SF_arr = SF_arr;
class SF_then {
    constructor(f, g) {
        this.f = f;
        this.g = g;
    }
}
exports.SF_then = SF_then;
class SF_first {
    constructor(first_sf) {
        this.first_sf = first_sf;
    }
}
exports.SF_first = SF_first;

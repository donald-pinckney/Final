"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SF_input = exports.SF_var = exports.SF_fn = exports.SF_pair = exports.SF_p2 = exports.SF_p1 = exports.SF_app = exports.SF_lambda = exports.SF = void 0;
var GLOBAL_UNIQUE_ARR_ID = 0;
function getFreshArrId() {
    return GLOBAL_UNIQUE_ARR_ID++;
}
var freshVarId = 0;
function freshVar() {
    return "x" + freshVarId++;
}
class SF {
    constructor(w) {
        this._wrapped = w;
    }
    static arr(f, constraint = "unconstrained") {
        if (constraint == "client") {
            const fAsync = (x, cont) => cont(f(x));
            return SF.arrAsync(fAsync, constraint);
        }
        else {
            const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`;
            const fAsync = eval(fAsyncStr);
            return SF.arrAsync(fAsync, constraint);
        }
    }
    static arrAsync(f, constraint = "unconstrained") {
        return new SF(new SF_fn(f, constraint));
    }
    static p1() {
        const x = freshVar();
        return new SF(new SF_lambda(x, new SF_p1(new SF_var(x))));
    }
    static p2() {
        const x = freshVar();
        return new SF(new SF_lambda(x, new SF_p2(new SF_var(x))));
    }
    then(next) {
        const x = freshVar();
        return new SF(new SF_lambda(x, new SF_app(next._wrapped, new SF_app(this._wrapped, new SF_var(x)))));
    }
    first() {
        const x = freshVar();
        const xv = new SF_var(x);
        return new SF(new SF_lambda(x, new SF_pair(new SF_app(this._wrapped, new SF_p1(xv)), new SF_p2(xv))));
    }
    second() {
        const x = freshVar();
        const xv = new SF_var(x);
        const swap1 = new SF(new SF_lambda(x, new SF_pair(new SF_p2(xv), new SF_p1(xv))));
        const y = freshVar();
        const yv = new SF_var(y);
        const swap2 = new SF(new SF_lambda(y, new SF_pair(new SF_p2(yv), new SF_p1(yv))));
        return swap1.then(this.first()).then(swap2);
    }
    parallel(other) {
        const f = this.first();
        const g = other.second();
        return f.then(g);
    }
    and(other) {
        const x = freshVar();
        const xv = new SF_var(x);
        const copy = new SF(new SF_lambda(x, new SF_pair(xv, xv)));
        return copy.then(this.parallel(other));
    }
    lift2(op, other) {
        const op_arr = SF.arr(op);
        return this.and(other).then(op_arr);
    }
    subscribe(f) {
        const subArr = SF.arrAsync((xx, cont) => f(xx), "client");
        return this.then(subArr);
    }
}
exports.SF = SF;
class SF_lambda {
    constructor(arg, body) {
        this.arg = arg;
        this.body = body;
    }
}
exports.SF_lambda = SF_lambda;
class SF_app {
    constructor(fn, arg) {
        this.fn = fn;
        this.arg = arg;
    }
}
exports.SF_app = SF_app;
class SF_p1 {
    constructor(e) {
        this.e = e;
    }
}
exports.SF_p1 = SF_p1;
class SF_p2 {
    constructor(e) {
        this.e = e;
    }
}
exports.SF_p2 = SF_p2;
class SF_pair {
    constructor(fst, snd) {
        this.fst = fst;
        this.snd = snd;
    }
}
exports.SF_pair = SF_pair;
class SF_fn {
    constructor(f, constraint) {
        this.fn = f;
        this.constraint = constraint;
        this.uniqueId = getFreshArrId();
    }
}
exports.SF_fn = SF_fn;
class SF_var {
    constructor(name) {
        this.name = name;
    }
}
exports.SF_var = SF_var;
class SF_input {
    constructor() {
    }
}
exports.SF_input = SF_input;
//# sourceMappingURL=sf.js.map
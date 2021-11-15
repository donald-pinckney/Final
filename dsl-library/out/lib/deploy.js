"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = void 0;
function deploy(f) {
    const deployed = (x, cont) => {
        cont(1234);
    };
    return deployed;
}
exports.deploy = deploy;

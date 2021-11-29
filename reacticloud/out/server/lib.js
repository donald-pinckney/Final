"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverMain = void 0;
const socket_io_1 = require("socket.io");
const deployment_request_1 = require("../dsl/deployment_request");
const deployed_sf_1 = require("../client-server-messages/deployed_sf");
const util = __importStar(require("util"));
function serverMain() {
    const io = new socket_io_1.Server();
    let UNIQUE_DEPLOYMENT_ID = 0;
    io.on('connection', (socket) => {
        console.log("New client connection: " + socket);
        // socket.on('disconnect', () => {
        //   console.log("Client disconnected")
        // })
        socket.on("deploy", (req_ser, callback) => {
            const deployment_req = (0, deployment_request_1.deserialize)(req_ser);
            console.log("Received deployment request:");
            console.log(util.inspect(deployment_req, false, null, true));
            const deployment_id = UNIQUE_DEPLOYMENT_ID++;
            const placementMap = computePlacementMap(deployment_req);
            const placementMapSer = (0, deployed_sf_1.placementMapToList)(placementMap);
            console.log(placementMap);
            const deployedSF = computeDeployment(deployment_req, placementMap);
            console.log(deployedSF);
            callback(deployment_id, placementMapSer);
        });
        socket.on("input_available", (x, deploy_id, fn_id, input_id) => {
            console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_id: ${input_id})`);
        });
    });
    io.listen(3000);
    console.log("Server listening");
}
exports.serverMain = serverMain;
function computePlacementMap(dep_req) {
    if (dep_req instanceof deployment_request_1.SF_deployment_request_arr) {
        if (dep_req.constraint.constraint == 'client') {
            return new Map([[dep_req.uniqueId, 'client']]);
        }
        else {
            return new Map([[dep_req.uniqueId, 'cloud']]);
        }
    }
    else if (dep_req instanceof deployment_request_1.SF_deployment_request_then) {
        const left = computePlacementMap(dep_req.f);
        const right = computePlacementMap(dep_req.g);
        const combined = new Map();
        left.forEach((loc, id) => {
            if (combined.has(id)) {
                throw new Error("BUG in computePlacementMap");
            }
            else {
                combined.set(id, loc);
            }
        });
        right.forEach((loc, id) => {
            if (combined.has(id)) {
                throw new Error("BUG in computePlacementMap");
            }
            else {
                combined.set(id, loc);
            }
        });
        return combined;
    }
    else if (dep_req instanceof deployment_request_1.SF_deployment_request_first) {
        return computePlacementMap(dep_req.first_sf);
    }
    else {
        throw new Error(`Unknown dep_req type: ${dep_req}`);
    }
}
function computeDeployment(dep_req, placements) {
    if (dep_req instanceof deployment_request_1.SF_deployment_request_arr) {
        const place = placements.get(dep_req.uniqueId);
        let deploy;
        if (place == "cloud") {
            if (dep_req.constraint.constraint == "cloud" || dep_req.constraint.constraint == "unconstrained") {
                deploy = { location: "here", fn: dep_req.constraint.fn };
            }
            else {
                throw new Error("BUG: Invalid placements. A client constrained function was assigned to cloud");
            }
        }
        else if (place == "client") {
            if (dep_req.constraint.constraint == "client" || dep_req.constraint.constraint == "unconstrained") {
                deploy = { location: "there" };
            }
            else {
                throw new Error("BUG: Invalid placements. A cloud constrained function was assigned to client");
            }
        }
        else {
            throw new Error("BUG: Invalid placements");
        }
        return new deployed_sf_1.SF_arr_deployed(dep_req.uniqueId, deploy);
    }
    else if (dep_req instanceof deployment_request_1.SF_deployment_request_then) {
        return new deployed_sf_1.SF_then_deployed(computeDeployment(dep_req.f, placements), computeDeployment(dep_req.g, placements));
    }
    else if (dep_req instanceof deployment_request_1.SF_deployment_request_first) {
        return new deployed_sf_1.SF_first_deployed(computeDeployment(dep_req.first_sf, placements));
    }
    else {
        throw new Error(`Unknown dep_req type: ${dep_req}`);
    }
}

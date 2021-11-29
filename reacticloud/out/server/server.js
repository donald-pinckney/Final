"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverMain = void 0;
const socket_io_1 = require("socket.io");
function serverMain() {
    const io = new socket_io_1.Server();
    let UNIQUE_DEPLOYMENT_ID = 0;
    io.on('connection', (socket) => {
        console.log("New client connection: " + socket);
        // socket.on('disconnect', () => {
        //   console.log("Client disconnected")
        // })
        socket.on("deploy", (req_ser, callback) => {
            // const deployment_req = deserialize(req_ser)
            // console.log("Received deployment request:")
            // console.log(util.inspect(deployment_req, false, null, true))
            // const deployment_id = UNIQUE_DEPLOYMENT_ID++
            // const placementMap = computePlacementMap(deployment_req)
            // const placementMapSer: [number, Location][] = placementMapToList(placementMap)
            // console.log(placementMap)
            // const deployedSF = computeDeployment(deployment_req, placementMap)
            // console.log(util.inspect(deployedSF, false, null, true))
            // callback(deployment_id, placementMapSer)
        });
        socket.on("input_available", (x, deploy_id, arr_id, input_seq_id) => {
            console.log(`Received input ${x} for (deploy_id: ${deploy_id}, arr_id: ${arr_id}, input_seq_id: ${input_seq_id})`);
        });
    });
    io.listen(3000);
    console.log("Server listening");
}
exports.serverMain = serverMain;
//# sourceMappingURL=server.js.map
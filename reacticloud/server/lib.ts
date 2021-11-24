import { Server } from "socket.io"
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../client-server-messages/lib"
import { deserialize, SF_deployment_request } from "../dsl/deployment_request"
import { PlacementMap, placementMapToList, SF_core_deployed } from "../client-server-messages/deployed_sf"
import { Location } from "../dsl/sf"

import * as util from "util"

function serverMain() {

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>()

  let UNIQUE_DEPLOYMENT_ID = 0

  io.on('connection', (socket) => {
    console.log("New client connection: " + socket)

    // socket.on('disconnect', () => {
    //   console.log("Client disconnected")
    // })

    socket.on("deploy", (req_ser, callback) => {
      const deployment_req = deserialize(req_ser)
      console.log("Received deployment request:")
      console.log(util.inspect(deployment_req, false, null, true))

      const deployment_id = UNIQUE_DEPLOYMENT_ID++

      const placementMap = computePlacementMap(deployment_req)
      const placementMapSer: [number, Location][] = placementMapToList(placementMap)

      const deployedSF = computeDeployment(deployment_req, placementMap)

      // TODO: implement this
      callback(deployment_id, placementMapSer)
    })

    socket.on("input_available", (x, deploy_id, fn_id, input_id) => {
      console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_id: ${input_id})`)
    })

  })

  io.listen(3000)
  console.log("Server listening")
}


function computePlacementMap<A, B>(dep_req: SF_deployment_request<A, B>): PlacementMap {
  throw new Error("TODO: Not implemented")
}

function computeDeployment<A, B>(dep_req: SF_deployment_request<A, B>, placements: PlacementMap): SF_core_deployed<A, B> {
  throw new Error("TODO: Not implemented")
}

export { serverMain }
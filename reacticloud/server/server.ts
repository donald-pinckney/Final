import { Server } from "socket.io"
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../client-server-messages/lib"
// import { deserialize, SF_deployment_request, SF_deployment_request_arr, SF_deployment_request_then, SF_deployment_request_first } from "../dsl/deployment_request"
import { PlacementMap, placementMapToList, SF_core_deployed, SF_arr_deployed, SF_then_deployed, SF_first_deployed, Arr_Deployment } from "../client-server-messages/deployed_sf"
import { Location } from "../dsl/sf"

import { DynamicPool } from "node-worker-threads-pool" 

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
    })

    socket.on("input_available", (x, deploy_id, arr_id, input_seq_id) => {
      console.log(`Received input ${x} for (deploy_id: ${deploy_id}, arr_id: ${arr_id}, input_seq_id: ${input_seq_id})`)
    })

  })

  io.listen(3000)
  console.log("Server listening")
}


// function computePlacementMap<A, B>(dep_req: SF_deployment_request<A, B>): PlacementMap {
//   if(dep_req instanceof SF_deployment_request_arr) {
//     if(dep_req.constraint.constraint == 'client') {
//       return new Map<number, Location>([[dep_req.uniqueId, 'client']])
//     } else {
//       return new Map<number, Location>([[dep_req.uniqueId, 'cloud']])
//     }
//   } else if(dep_req instanceof SF_deployment_request_then) {
//     const left = computePlacementMap(dep_req.f)
//     const right = computePlacementMap(dep_req.g)
//     const combined = new Map()
//     left.forEach((loc, id) => {
//       if(combined.has(id)) {
//         throw new Error("BUG in computePlacementMap")
//       } else {
//         combined.set(id, loc)
//       }
//     })
//     right.forEach((loc, id) => {
//       if(combined.has(id)) {
//         throw new Error("BUG in computePlacementMap")
//       } else {
//         combined.set(id, loc)
//       }
//     })
//     return combined
//   } else if(dep_req instanceof SF_deployment_request_first) {
//     return computePlacementMap(dep_req.first_sf)
//   } else {
//     throw new Error(`Unknown dep_req type: ${dep_req}`)
//   }
// }

// function computeDeployment<A, B>(dep_req: SF_deployment_request<A, B>, placements: PlacementMap): SF_core_deployed<A, B> {
//   if(dep_req instanceof SF_deployment_request_arr) {
//     const place = placements.get(dep_req.uniqueId)
//     let deploy: Arr_Deployment<A, B>
//     if(place == "cloud") {
//       if(dep_req.constraint.constraint == "cloud" || dep_req.constraint.constraint == "unconstrained") {
//         deploy = { location: "here", fn: dep_req.constraint.fn }
//       } else {
//         throw new Error("BUG: Invalid placements. A client constrained function was assigned to cloud")
//       }
//     } else if(place == "client") {
//       if(dep_req.constraint.constraint == "client" || dep_req.constraint.constraint == "unconstrained") {
//         deploy = { location: "there" }
//       } else {
//         throw new Error("BUG: Invalid placements. A cloud constrained function was assigned to client")
//       }
//     } else {
//       throw new Error("BUG: Invalid placements")
//     }

//     return new SF_arr_deployed(dep_req.uniqueId, deploy)
//   } else if(dep_req instanceof SF_deployment_request_then) {
//     return new SF_then_deployed(
//       computeDeployment(dep_req.f, placements),
//       computeDeployment(dep_req.g, placements)
//     )
//   } else if(dep_req instanceof SF_deployment_request_first) {
//     return new SF_first_deployed(computeDeployment(dep_req.first_sf, placements))
//   } else {
//     throw new Error(`Unknown dep_req type: ${dep_req}`)
//   }
// }

export { serverMain }
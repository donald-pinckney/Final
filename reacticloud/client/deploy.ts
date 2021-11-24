import { SF } from "../dsl/lib"
import { SF_core, SF_arr, SF_then, SF_first } from "../dsl/sf"
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../client-server-messages/lib"
import { placementListToMap, PlacementMap, SF_core_deployed, SF_arr_deployed, SF_then_deployed, SF_first_deployed, Arr_Deployment } from "../client-server-messages/deployed_sf"
import { deploymentRequestForSF } from "../dsl/deployment_request"
import { Location } from "../dsl/sf"


console.log('Opening connection to server')
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("ws://localhost:3000")


socket.on("input_available", (x, deploy_id, arr_id, input_seq_id) => {
  console.log(`Received input ${x} for (deploy_id: ${deploy_id}, arr_id: ${arr_id}, input_seq_id: ${input_seq_id})`)
})


type RunnableSF_core<A, B> = (x: A) => Promise<B>
type RunnableSF<A, B> = (x: A) => void




function deploy<A, B>(f: SF<A, B>): Promise<RunnableSF<A, B>> {

  let dep_req = deploymentRequestForSF(f._wrapped)

  return new Promise((resolve, reject) => {
    socket.emit('deploy', dep_req, (deploy_id, placementsList) => {
      const placements = placementListToMap(placementsList)
      console.log("received placements from server:")
      console.log(placements)
      resolve(buildRunnableSF(f._wrapped, deploy_id, placements))
    })
  })
}

function buildRunnableSF<A, B>(sf: SF_core<A, B>, deploy_id: number, placements: PlacementMap): RunnableSF<A, B> {
  const deployment = computeDeployment(sf, placements)
  console.log(deployment)
  throw new Error("Not implemented")
}

function computeDeployment<A, B>(sf: SF_core<A, B>, placements: PlacementMap): SF_core_deployed<A, B> {
  if(sf instanceof SF_arr) {
    const place = placements.get(sf.uniqueId)
    let deploy: Arr_Deployment<A, B>
    if(place == "cloud") {
      if(sf.constraint == "cloud" || sf.constraint == "unconstrained") {
        deploy = { location: "there" }
      } else {
        throw new Error("BUG: Invalid placements. A client constrained function was assigned to cloud")
      }
    } else if(place == "client") {
      if(sf.constraint == "client" || sf.constraint == "unconstrained") {
        deploy = { location: "here", fn: sf.fn }
      } else {
        throw new Error("BUG: Invalid placements. A cloud constrained function was assigned to client")
      }
    } else {
      throw new Error("BUG: Invalid placements")
    }

    return new SF_arr_deployed(sf.uniqueId, deploy)
  } else if(sf instanceof SF_then) {
    return new SF_then_deployed(
      computeDeployment(sf.f, placements),
      computeDeployment(sf.g, placements)
    )
  } else if(sf instanceof SF_first) {
    return new SF_first_deployed(computeDeployment(sf.first_sf, placements))
  } else {
    throw new Error(`Unknown sf type: ${sf}`)
  }
}

export { deploy, RunnableSF, RunnableSF_core }



import { SF } from "../dsl/lib"
import { SF_core } from "../dsl/sf"
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../client-server-messages/lib"
import { placementListToMap, PlacementMap, SF_core_deployed } from "../client-server-messages/deployed_sf"
import { deploymentRequestForSF } from "../dsl/deployment_request"
import { Location } from "../dsl/sf"


console.log('Opening connection to server')
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("ws://localhost:3000")


socket.on("input_available", (x, deploy_id, fn_id, input_id) => {
  console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_id: ${input_id})`)
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
  throw new Error("Not implemented")
}

function computeDeployment<A, B>(sf: SF_core<A, B>, placements: PlacementMap): SF_core_deployed<A, B> {
  throw new Error("TODO: Not implemented")
}

export { deploy, RunnableSF, RunnableSF_core }



import { SF } from "../dsl/lib"
import { SF_core } from "../dsl/sf"
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, serialized_placements } from "../client-server-messages/lib"
import { deploymentRequestForSF } from "../dsl/deployment_request"


console.log('Opening connection to server')
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("ws://localhost:3000")


socket.on("input_available", (x, deploy_id, fn_id, input_id) => {
  console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_id: ${input_id})`)
})


type RunnableSF<A, B> = (x: A) => Promise<B>


function buildRunnableSF<A, B>(sf: SF_core<A, B>, deploy_id: number, placements: serialized_placements): RunnableSF<A, B> {
  throw new Error("Not implemented")
}

function deploy<A, B>(f: SF<A, B>): Promise<RunnableSF<A, B>> {

  let dep_req = deploymentRequestForSF(f._wrapped)

  return new Promise((resolve, reject) => {
    socket.emit('deploy', dep_req, (deploy_id, placements) => {
      console.log("received placements from server:")
      console.log(placements)
      resolve(buildRunnableSF(f._wrapped, deploy_id, placements))
    })
  })
}

export { deploy, RunnableSF }



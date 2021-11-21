import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../client-server-messages/lib"
import { SF } from "../client/lib"
import { deploymentRequestForSF } from "../dsl/deployment_request"

const f11: SF<number, number> = SF.arr((x: number) => x + 5)
const f2 = SF.arr((x: number) => x.toString())
const g1 = f11.then(f2)



console.log('Opening connection to server')
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("ws://localhost:3000")


let dep_req = deploymentRequestForSF(g1)
socket.emit('deploy', dep_req, placements => {
  console.log("received placements from server:")
  console.log(placements)
})
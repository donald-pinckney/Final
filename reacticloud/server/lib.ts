import { Server } from "socket.io"
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../client-server-messages/lib"
import { deserialize } from "../dsl/deployment_request"

import * as util from "util"

function serverMain() {

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>()

  io.on('connection', (socket) => {
    console.log("New client connection: " + socket)

    // socket.on('disconnect', () => {
    //   console.log("Client disconnected")
    // })

    socket.on("deploy", (req_ser, callback) => {
      console.log("Received deployment request:")
      console.log(req_ser)
      const deployment_req = deserialize(req_ser)
      console.log(util.inspect(deployment_req, false, null, true))

      // TODO: implement this
      callback(0, [])
    })

    socket.on("input_available", (x, deploy_id, fn_id, input_id) => {
      console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_id: ${input_id})`)
    })

  })

  io.listen(3000)
  console.log("Server listening")
}

export { serverMain }
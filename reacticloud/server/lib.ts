import { Server } from "socket.io"
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../client-server-messages/lib"
import { deserialize } from "../dsl/deployment_request"


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

      callback([])
    })

  })

  io.listen(3000)
  console.log("Server listening")
}

export { serverMain }
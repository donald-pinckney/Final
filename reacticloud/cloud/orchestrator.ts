import { Server, Socket } from "socket.io"
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, FunctionDeployData, RelativeLocation, Role } from "../client-server-messages/lib"
import { PlacementMap, placementMapToList, SF_core_deployed, SF_arr_deployed, SF_then_deployed, SF_first_deployed, Arr_Deployment } from "../client-server-messages/deployed_sf"
import { Location } from "../dsl/sf"

import { DynamicPool } from "node-worker-threads-pool" 

import * as util from "util"
import { Selector, SerializedDag } from "../dsl/dag"
import { FunctionTraceData, InputTraceData } from "../client-server-messages/trace_data"

type ServerSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

class Orchestrator {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  unique_deployment_id: number

  constructor() {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>()
    this.unique_deployment_id = 0

    this.io.on('connection', (socket) => {
      console.log("Socket connected: " + socket.id)
      socket.on('disconnect', () => this.receiveDisconnect(socket))
      socket.on('client_orch_deploy', (dag, callback) => this.receiveDeployRequest(socket, dag, callback))
      socket.on('client_orch_send_traces', (original_deploy_id, fns_data, inputs_data) => this.receiveTraces(socket, original_deploy_id, fns_data, inputs_data))
      socket.on('iam', (role) => this.receiveIam(socket, role))
      socket.on('input_available', (x, dep_id, fn_id, input_seq_id, selector) => this.receiveInputAvailable(socket, x, dep_id, fn_id, input_seq_id, selector))
      socket.on('worker_request_fn', (dep_id, fn_id, callback) => this.receiveWorkerRequestFn(socket, dep_id, fn_id, callback))
    })

    
  }

  listen(port: number) {
    this.io.listen(port)
    console.log("Orchestrator listening")
  }


  freshDeploymentId(): number {
    return this.unique_deployment_id++
  }


  receiveDisconnect(socket: ServerSocket) {
    console.log("Socket disconnected: " + socket.id)
  }

  receiveDeployRequest(socket: ServerSocket, dag: SerializedDag<FunctionDeployData>, callback: (deploy_id: number, partition: [number, RelativeLocation][]) => void) {
    console.log("Received deploy request from socket: " + socket.id)
    
  }

  receiveTraces(socket: ServerSocket, original_deploy_id: number, fns_data: SerializedDag<FunctionTraceData>, inputs_data: InputTraceData) {
    console.log("Received trace data from socket: " + socket.id)
  }

  receiveIam(socket: ServerSocket, role: Role) {
    console.log("Received iam from socket: " + socket.id)
  }

  receiveInputAvailable(socket: ServerSocket, x: any, dep_id: number, fn_id: number, input_seq_id: number, selector: Selector[]) {
    console.log("Received input available from socket: " + socket.id)

  }

  receiveWorkerRequestFn(socket: ServerSocket, dep_id: number, fn_id: number, callback: (src: string) => void) {

  }
}

export { Orchestrator }
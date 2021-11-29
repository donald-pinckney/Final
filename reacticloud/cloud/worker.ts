// import { Server, Socket } from "socket.io"
// import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, FunctionDeployData, RelativeLocation, Role } from "../client-server-messages/lib"
// import { PlacementMap, placementMapToList, SF_core_deployed, SF_arr_deployed, SF_then_deployed, SF_first_deployed, Arr_Deployment } from "../client-server-messages/deployed_sf"
// import { Location } from "../dsl/sf"

import { DynamicPool } from "node-worker-threads-pool" 

// import * as util from "util"
// import { Selector, SerializedDag } from "../dsl/dag"




import { io, Socket } from "socket.io-client";
import * as util from "util"
import { PartitionedFn, RunnableDag } from "../dsl/dag_runner";
import { ClientToServerEvents, ServerToClientEvents, FunctionDeployData, RelativeLocation } from "../client-server-messages/lib"



type WorkerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

class Worker {
  socket: WorkerSocket
  preparedFunctions: Map<string, (arg: any, cont: (r: any) => void) => void>
  threadPool: DynamicPool

  constructor(address: string, port: number) {
    this.preparedFunctions = new Map()
    this.threadPool = new DynamicPool(16)

    const addressPort = `${address}:${port}`
    this.socket = io(`ws://${addressPort}`)
    this.socket.emit('iam', 'worker')
    this.socket.on('worker_run_fn', (x, dep_id, fn_id, done) => this.receiveWorkerRunFn(x, dep_id, fn_id, done))
  }

  receiveWorkerRunFn(x: any, dep_id: number, fn_id: number, done: (r: any) => void) {
    const fnKey = `fn-${dep_id}-${fn_id}`
    const maybeFn = this.preparedFunctions.get(fnKey)

    if(maybeFn == undefined) {
      console.log(`Requesting source code for function (dep_id=${dep_id}, fn_id=${fn_id}) from orchestrator`)
      this.requestFn(dep_id, fn_id, src => {
        console.log(`Received src (dep_id=${dep_id}, fn_id=${fn_id}) = ${src}`)

        const newFn = eval(src) as (arg: any, cont: (r: any) => void) => void
        this.preparedFunctions.set(fnKey, newFn)

        // newFn(x, done)

        this.threadPool.exec({
          task: ([threadFuncArg, threadFunc]) => { 
            return new Promise((resolve, reject) => {
              threadFunc(threadFuncArg, (r: any) => {
                resolve(r)
              })
            })
          },
          param: [x, newFn]
        }).then(result => {
          done(result)
        })
      })
    } else {
      
      // maybeFn(x, done)

      this.threadPool.exec({
        task: ([threadFuncArg, threadFunc]) => { 
          return new Promise((resolve, reject) => {
            threadFunc(threadFuncArg, (r: any) => {
              resolve(r)
            })
          })
        },
        param: [x, maybeFn]
      }).then(result => {
        done(result)
      })

    }
  }

  requestFn(dep_id: number, fn_id: number, reply_src: (src: string) => void) {
    this.socket.emit('worker_request_fn', dep_id, fn_id, reply_src)
  }
}

export { Worker }
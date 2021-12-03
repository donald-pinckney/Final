import { ClientToServerEvents, ServerToClientEvents } from "../client-server-messages/lib"

import { DynamicPool } from "node-worker-threads-pool" 
import { io, Socket } from "socket.io-client";

import * as util from "util"


type WorkerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

class Worker {
  socket: WorkerSocket
  preparedFunctions: Map<string, string>
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
    const maybeFnSrc = this.preparedFunctions.get(fnKey)

    if(maybeFnSrc == undefined) {
      console.log(`Requesting source code for function (dep_id=${dep_id}, fn_id=${fn_id}) from orchestrator`)
      this.requestFn(dep_id, fn_id, src => {
        console.log(`Received src (dep_id=${dep_id}, fn_id=${fn_id}) = ${src}`)

        this.preparedFunctions.set(fnKey, src)


        this.threadPool.exec({
          task: ([threadFuncArg, threadFuncSrc]) => {
            const threadFunc = eval(threadFuncSrc) as (arg: any, cont: (r: any) => void) => void

            return new Promise((resolve, reject) => {
              threadFunc(threadFuncArg, (r: any) => {
                resolve(r)
              })
            })
          },
          param: [x, src]
        }).then(result => {
          done(result)
        })
      })
    } else {
      
      // maybeFn(x, done)

      this.threadPool.exec({
        task: ([threadFuncArg, threadFuncSrc]) => { 
          const threadFunc = eval(threadFuncSrc) as (arg: any, cont: (r: any) => void) => void

          return new Promise((resolve, reject) => {
            threadFunc(threadFuncArg, (r: any) => {
              resolve(r)
            })
          })
        },
        param: [x, maybeFnSrc]
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
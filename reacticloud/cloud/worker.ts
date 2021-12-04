import { ClientToServerEvents, ServerToClientEvents } from "../client-server-messages/lib"

import { DynamicPool } from "node-worker-threads-pool" 
import { io, Socket } from "socket.io-client";

const fetch = require('node-fetch')
const parse_csv = require('csv-parse/sync').parse
const plot = require('../examples/plot_helper.js')

import * as util from "util"

type WorkerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

class Worker {
  socket: WorkerSocket
  preparedFunctions: Map<string, (x: any, done: (r: any) => void) => void>
  // threadPool: DynamicPool

  constructor(address: string, port: number) {
    this.preparedFunctions = new Map()
    // this.threadPool = new DynamicPool(16)

    const addressPort = `${address}:${port}`
    this.socket = io(`ws://${addressPort}`)
    this.socket.emit('iam', 'worker')
    this.socket.on('worker_run_fn', (x, dep_id, fn_id, seq_id) => this.receiveWorkerRunFn(x, dep_id, fn_id, seq_id))
  }

  receiveWorkerRunFn(x: any, dep_id: number, fn_id: number, seq_id: number) {
    const fnKey = `fn-${dep_id}-${fn_id}`
    const maybeFn = this.preparedFunctions.get(fnKey)

    if(maybeFn == undefined) {
      console.log(`Requesting source code for function (dep_id=${dep_id}, fn_id=${fn_id}) from orchestrator`)
      this.requestFn(dep_id, fn_id, src => {
        console.log(`Received src (dep_id=${dep_id}, fn_id=${fn_id}) = ${src}`)

        const fn_to_run: (x: any, done: (r: any) => void) => void = eval(src)
        this.preparedFunctions.set(fnKey, fn_to_run)

        fn_to_run(x, (r: any) => {
          this.socket.emit('worker_result', dep_id, fn_id, seq_id, r)
        })
      })
    } else {
      maybeFn(x, (r: any) => {
        this.socket.emit('worker_result', dep_id, fn_id, seq_id, r)
      })
    }
  }

  requestFn(dep_id: number, fn_id: number, reply_src: (src: string) => void) {
    this.socket.emit('worker_request_fn', dep_id, fn_id, reply_src)
  }
}

export { Worker }
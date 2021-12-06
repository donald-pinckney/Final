import { SF, SF_fn } from "../dsl/sf"
import { buildDAG, Dag, Selector } from "../dsl/dag"
import { ClientToServerEvents, ServerToClientEvents, FunctionDeployData, RelativeLocation } from "../client-server-messages/lib"
import { mapPartitionedFn, PartitionedFn, RunnableDag, partitionDag } from "../dsl/dag_runner";
import { FunctionTraceDataSerialized, InputTraceData, InputTraceDataSerialized } from "../client-server-messages/trace_data";

import { io, Socket } from "socket.io-client";

import * as util from "util"


const SEND_NUM_THRESHOLD = 3
const SEND_MS_THRESHOLD = 500



const socketsMap: Map<string, Socket<ServerToClientEvents, ClientToServerEvents>> = new Map()

const input_available_callbacks: Map<string, (xJSON: string, fn_id: number, input_seq_id: number, selector: Selector[]) => void> = new Map()
const updated_deployment_callbacks: Map<string, (new_deploy_id: number, new_partition: [number, RelativeLocation][]) => void> = new Map()

function getSocket(address: string, port: number): Socket<ServerToClientEvents, ClientToServerEvents> {
  const addressPort = `${address}:${port}`
  let sock = socketsMap.get(addressPort)
  if(sock == undefined) {
    console.log('Opening connection to orchestrator')
    sock = io(`ws://${addressPort}`)
    sock.emit('iam', 'client')

    sock.on("input_available", (x, deploy_id, fn_id, input_seq_id, selector) => {
      const addressPortDeployId = `${addressPort}:${deploy_id}`

      const callback = input_available_callbacks.get(addressPortDeployId)
      if(callback == undefined) {
        console.log("BUG: received input for which no callback is registered!")
        console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_seq_id: ${input_seq_id}), selector: ${selector})`)
      } else {
        callback(x, fn_id, input_seq_id, selector)
      }
    })

    sock.on("updated_deployment", (original_deploy_id, new_deploy_id, new_partition) => {
      const addressPortDeployId = `${addressPort}:${original_deploy_id}`

      const callback = updated_deployment_callbacks.get(addressPortDeployId)
      if(callback == undefined) {
        console.log("BUG: received updated deployment for which no callback is registered!")
        console.log(`Received updated deployment for (original_deploy_id: ${original_deploy_id}, new_deploy_id: ${new_deploy_id})`)
      } else {
        callback(new_deploy_id, new_partition)
      }
    })

    socketsMap.set(addressPort, sock)
    return sock
  } else {
    return sock
  }
}




type RunnableSF<A, B> = (x: A) => void



function stripClientFunction(id: number, f: SF_fn): FunctionDeployData {
  if(f.constraint == 'client') {
    return { constraint: 'client' }
  } else {
    return { constraint: f.constraint, fnSrc: f.fn.toString() }
  }
}

type ClientDag = Dag<PartitionedFn<(arg: any, cont: (r: any) => void) => void>>


function deploy<A, B>(address: string, port: number, sf: SF<A, B>, partitionInfo?: (p: Map<number, RelativeLocation>) => void): Promise<RunnableSF<A, B>> {
  const addressPort = `${address}:${port}`

  const socket = getSocket(address, port)
  const dag = buildDAG(sf)
  const dagStripped = dag.map(stripClientFunction)
  const request = dagStripped.serialize()


  return new Promise((resolve, reject) => {
    socket.emit('client_orch_deploy', request, (original_deploy_id, partitionList) => {
      const addressPortDeployId = `${addressPort}:${original_deploy_id}`

      const partition = new Map(partitionList)
      if(partitionInfo != undefined) {
        partitionInfo(partition)
      }

      const clientDagTmp = partitionDag(dag, partition, 'client')
      const clientDag: ClientDag = clientDagTmp.map((fn_id, part_sf) => {
        return mapPartitionedFn(part_sf, sf => sf.fn)
      })

      let current_dep_id = original_deploy_id
      const deployments: Map<number, RunnableDag<(arg: any, cont: (r: any) => void) => void>> = new Map()
      const original_runnableDag = new RunnableDag(clientDag, 'client')

      let last_trace_send_time_ms = Date.now()

      original_runnableDag.runFnHere = (fn, seq_id, arg, done) => {
        fn(arg, done)
      }
      original_runnableDag.sendInputThere = (xJSON, fn_id, input_seq_id, selector) => {
        socket.emit('input_available', xJSON, original_deploy_id, fn_id, input_seq_id, selector)
      }

      deployments.set(current_dep_id, original_runnableDag)


      input_available_callbacks.set(addressPortDeployId, (xJSON, fn_id, input_seq_id, selector) => {
        original_runnableDag.localInputAvailable(JSON.parse(xJSON), fn_id, input_seq_id, selector)
      })

      updated_deployment_callbacks.set(addressPortDeployId, (new_deploy_id, newPartitionList) => {
        const newPartition = new Map(newPartitionList)
        if(partitionInfo != undefined) {
          partitionInfo(newPartition)
        }
        
        const newClientDagTmp = partitionDag(dag, newPartition, 'client')
        const newClientDag: ClientDag = newClientDagTmp.map((fn_id, part_sf) => {
          return mapPartitionedFn(part_sf, sf => sf.fn)
        })

        const new_runnableDag = new RunnableDag(newClientDag, 'client')

        const addressPortDeployIdNew = `${addressPort}:${new_deploy_id}`

        new_runnableDag.runFnHere = (fn, seq_id, arg, done) => {
          fn(arg, done)
        }
        new_runnableDag.sendInputThere = (xJSON, fn_id, input_seq_id, selector) => {
          socket.emit('input_available', xJSON, new_deploy_id, fn_id, input_seq_id, selector)
        }

        input_available_callbacks.set(addressPortDeployIdNew, (xJSON, fn_id, input_seq_id, selector) => {
          new_runnableDag.localInputAvailable(JSON.parse(xJSON), fn_id, input_seq_id, selector)
        })

        deployments.set(new_deploy_id, new_runnableDag)
        current_dep_id = new_deploy_id
      })

      let the_unique_seq_id = 0

      resolve(initial_input => {
        const currentDag = deployments.get(current_dep_id) as RunnableDag<(arg: any, cont: (r: any) => void) => void>

        const now = Date.now()
        if(currentDag.getInputCount() >= (SEND_NUM_THRESHOLD - 1) && (now - last_trace_send_time_ms) > SEND_MS_THRESHOLD) {
          last_trace_send_time_ms = now
          const traceData = currentDag.extractPartialTraceData()
          const traceDataFn: Dag<FunctionTraceDataSerialized> = traceData.fns.map((fn_id, traces) => {
            return Array.from(traces.entries()).map(([seq_id, row]) => {
              return {seq_id: seq_id, exec_data: row}
            })
          })
          const traceDataInput: InputTraceDataSerialized = Array.from(traceData.inputs.entries()).map(([seq_id, row]) => {
            return {seq_id: seq_id, sizes: row}
          })
          socket.emit('client_orch_send_traces', original_deploy_id, traceDataFn.serialize(), traceDataInput)
        }

        currentDag.acceptInitialInput(initial_input, the_unique_seq_id++)
      })      
    })
  })
}

export { deploy, RunnableSF }



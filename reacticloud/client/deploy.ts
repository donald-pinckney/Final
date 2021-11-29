import { SF, SF_fn } from "../dsl/sf"
import { buildDAG, Dag, Selector } from "../dsl/dag"
import { ClientToServerEvents, ServerToClientEvents, FunctionDeployData, RelativeLocation } from "../client-server-messages/lib"
import { placementListToMap, PlacementMap, SF_core_deployed } from "../client-server-messages/deployed_sf"

// import { deploymentRequestForSF } from "../dsl/deployment_request"
// import { Location } from "../dsl/sf"

import { io, Socket } from "socket.io-client";
import * as util from "util"
import { PartitionedFn, RunnableDag } from "../dsl/dag_runner";


const socketsMap: Map<string, Socket<ServerToClientEvents, ClientToServerEvents>> = new Map()

const input_available_callbacks: Map<string, (x: any, fn_id: number, input_seq_id: number, selector: Selector[]) => void> = new Map()
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



function stripClientFunction(f: SF_fn): FunctionDeployData {
  if(f.constraint == 'client') {
    return { constraint: 'client' }
  } else {
    return { constraint: f.constraint, fnSrc: f.fn.toString() }
  }
}

type ClientDag = Dag<PartitionedFn<(arg: any, cont: (r: any) => void) => void>>

function partitionClientDag(dag: Dag<SF_fn>, partition: Map<number, RelativeLocation>): ClientDag {
  return dag.map(sf => {
    const id = sf.uniqueId
    const loc = partition.get(id)
    if(loc == undefined) {
      throw new Error(`BUG: Could not find placement for ${id}`)
    } else if(loc == 'here' && sf.constraint == 'cloud') {
      throw new Error(`BUG: Invalid partition from orchestrator`)
    } else if(loc == 'there' && sf.constraint == 'client') {
      throw new Error(`BUG: Invalid partition from orchestrator`)
    } else if(loc == 'here') {
      return { location: 'here', fn: sf.fn }
    } else if(loc == 'there') {
      return { location: 'there' }
    } else {
      throw new Error(`BUG: unreachable`)
    }
  })
}

const SEND_NUM_THRESHOLD = 10
const SEND_MS_THRESHOLD = 1000

function deploy<A, B>(address: string, port: number, sf: SF<A, B>): Promise<RunnableSF<A, B>> {
  const addressPort = `${address}:${port}`

  const socket = getSocket(address, port)
  const dag = buildDAG(sf)
  const dagStripped = dag.map(stripClientFunction)
  const request = dagStripped.serialize()


  return new Promise((resolve, reject) => {
    socket.emit('client_orch_deploy', request, (original_deploy_id, partitionList) => {
      const addressPortDeployId = `${addressPort}:${original_deploy_id}`

      const partition = new Map(partitionList)
      const clientDag = partitionClientDag(dag, partition)

      let current_dep_id = original_deploy_id
      const deployments: Map<number, RunnableDag<(arg: any, cont: (r: any) => void) => void>> = new Map()
      const original_runnableDag = new RunnableDag(clientDag)

      let last_trace_send_time_ms = Date.now()

      original_runnableDag.runFnHere = (fn, arg, done) => {
        fn(arg, done)
      }
      original_runnableDag.sendInputThere = (x, fn_id, input_seq_id, selector) => {
        socket.emit('input_available', x, original_deploy_id, fn_id, input_seq_id, selector)
      }

      deployments.set(current_dep_id, original_runnableDag)


      input_available_callbacks.set(addressPortDeployId, (x, fn_id, input_seq_id, selector) => {
        original_runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector)
      })

      updated_deployment_callbacks.set(addressPortDeployId, (new_deploy_id, newPartitionList) => {
        const newPartition = new Map(newPartitionList)
        const newClientDag = partitionClientDag(dag, newPartition)
        const new_runnableDag = new RunnableDag(newClientDag)

        const addressPortDeployIdNew = `${addressPort}:${new_deploy_id}`

        new_runnableDag.runFnHere = (fn, arg, done) => {
          fn(arg, done)
        }
        new_runnableDag.sendInputThere = (x, fn_id, input_seq_id, selector) => {
          socket.emit('input_available', x, new_deploy_id, fn_id, input_seq_id, selector)
        }

        input_available_callbacks.set(addressPortDeployIdNew, (x, fn_id, input_seq_id, selector) => {
          new_runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector)
        })

        deployments.set(new_deploy_id, new_runnableDag)
        current_dep_id = new_deploy_id
      })

      resolve(initial_input => {
        const currentDag = deployments.get(current_dep_id) as RunnableDag<(arg: any, cont: (r: any) => void) => void>

        const now = Date.now()
        if(currentDag.getInputCount() > SEND_NUM_THRESHOLD && (now - last_trace_send_time_ms) > SEND_MS_THRESHOLD) {
          last_trace_send_time_ms = now
          const traceData = currentDag.getPartialTraceData()
          socket.emit('client_orch_send_traces', original_deploy_id, traceData.fns, traceData.inputs)
        }

        currentDag.acceptInitialInput(initial_input)
      })      
    })
  })
}

export { deploy, RunnableSF }



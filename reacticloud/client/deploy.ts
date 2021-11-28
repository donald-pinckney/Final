import { SF, SF_fn } from "../dsl/sf"
import { buildDAG, Dag, Selector } from "../dsl/dag"
import { ClientToServerEvents, ServerToClientEvents, FunctionDeployData, RelativeLocation } from "../client-server-messages/lib"
import { placementListToMap, PlacementMap, SF_core_deployed } from "../client-server-messages/deployed_sf"

// import { deploymentRequestForSF } from "../dsl/deployment_request"
// import { Location } from "../dsl/sf"

import { io, Socket } from "socket.io-client";
import * as util from "util"
import { PartitionedFn, RunnableDag } from "../dsl/dag_runner";


console.log('Opening connection to server')
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("ws://localhost:3000")
socket.emit('iam', 'client')


const input_available_callbacks: Map<number, (x: any, fn_id: number, input_seq_id: number, selector: Selector[]) => void> = new Map()

socket.on("input_available", (x, deploy_id, fn_id, input_seq_id, selector) => {
  const callback = input_available_callbacks.get(deploy_id)
  if(callback == undefined) {
    console.log("BUG: received input for which no callback is registered!")
    console.log(`Received input ${x} for (deploy_id: ${deploy_id}, fn_id: ${fn_id}, input_seq_id: ${input_seq_id}), selector: ${selector})`)
  } else {
    callback(x, fn_id, input_seq_id, selector)
  }
})

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

function deploy<A, B>(sf: SF<A, B>): Promise<RunnableSF<A, B>> {

  const dag = buildDAG(sf)
  const dagStripped = dag.map(stripClientFunction)
  const request = dagStripped.serialize()

  return new Promise((resolve, reject) => {
    socket.emit('client_orch_deploy', request, (dep_id, partitionList) => {
      const partition = new Map(partitionList)
      const clientDag = partitionClientDag(dag, partition)

      const runnableDag = 
        new RunnableDag(clientDag, (fn, arg, done) => {
          fn(arg, done)
        }, (x, fn_id, input_seq_id, selector) => {
          socket.emit('input_available', x, dep_id, fn_id, input_seq_id, selector)
        })

      input_available_callbacks.set(dep_id, (x, fn_id, input_seq_id, selector) => {
        runnableDag.localInputAvailable(x, fn_id, input_seq_id, selector)
      })

      resolve(initial_input => {
        runnableDag.acceptInitialInput(initial_input)
      })      
    })
  })
}

export { deploy, RunnableSF }



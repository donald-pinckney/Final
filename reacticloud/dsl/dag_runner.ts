import { Dag, Selector, SerializedDag } from "./dag"
import { RelativeLocation } from "../client-server-messages/lib"
import { InputTraceData, FunctionTraceData } from "../client-server-messages/trace_data"
import { Location, LocationConstraint } from "../dsl/sf"

class RunnableDag<F> {
  private dag: Dag<PartitionedFn<F>>
  runFnHere?: (fn: F, seq_id: number, arg: any, done: (r: any) => void) => void
  sendInputThere?: (x: any, fn_id: number, input_seq_id: number, selector: Selector[]) => void
  // sendTraceData?: (partial_trace_data_inputs: InputTraceData, partial_trace_data_fns: SerializedDag<FunctionTraceData>) => void

  constructor(dag: Dag<PartitionedFn<F>>) {
    this.dag = dag
    // this.runFnHere = null
    // this.sendInputThere = null
  }

  acceptInitialInput(input: any) {

  }

  localInputAvailable(x: any, for_fn: number, input_seq_id: number, selector: Selector[]) {

  }

  getInputCount(): number {
    throw new Error("TODO")
  }

  extractPartialTraceData(): { inputs: InputTraceData, fns: Dag<FunctionTraceData> } {
    // TODO: note: this should drain from this to save mem!
    throw new Error("TODO")
  }
}

type PartitionedFn<F> = { location: 'here', fn: F } | { location: 'there' }
function mapPartitionedFn<F, G>(p: PartitionedFn<F>, f: (x: F) => G): PartitionedFn<G> {
  if(p.location == 'here') {
    return { location: 'here', fn: f(p.fn) }
  } else if(p.location == 'there') {
    return { location: 'there' }
  } else {
    throw new Error("BUG: bad PartitionedFn")
  }
}


function partitionDag<F extends { constraint: LocationConstraint }>(dag: Dag<F>, partition: Map<number, RelativeLocation>, herePlace: Location): Dag<PartitionedFn<F>> {
  const therePlace: Location = herePlace == 'cloud' ? 'client' : 'cloud'
  return dag.map((fn_id, f_data) => {
    // const id = sf.uniqueId
    const loc = partition.get(fn_id)
    if(loc == undefined) {
      throw new Error(`BUG: Could not find placement for ${fn_id}`)
    } else if(loc == 'here' && f_data.constraint == therePlace) {
      throw new Error(`BUG: Invalid partition`)
    } else if(loc == 'there' && f_data.constraint == herePlace) {
      throw new Error(`BUG: Invalid partition`)
    } else if(loc == 'here') {
      return { location: 'here', fn: f_data }
    } else if(loc == 'there') {
      return { location: 'there' }
    } else {
      throw new Error(`BUG: unreachable`)
    }
  })
}

export {
  RunnableDag,
  PartitionedFn,
  mapPartitionedFn,
  partitionDag
}
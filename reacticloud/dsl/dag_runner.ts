import { Dag, Selector, SerializedDag } from "./dag"
import { RelativeLocation } from "../client-server-messages/lib"
import { InputTraceData, FunctionTraceData } from "../client-server-messages/trace_data"

class RunnableDag<F> {
  private dag: Dag<PartitionedFn<F>>
  runFnHere?: (fn: F, arg: any, done: (r: any) => void) => void
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

  getPartialTraceData(): { inputs: InputTraceData, fns: SerializedDag<FunctionTraceData> } {
    throw new Error("TODO")
  }
  // setRunFnHere
  setDag(newDag: Dag<PartitionedFn<F>>) {
    this.dag = newDag
  }
}

type PartitionedFn<F> = { location: 'here', fn: F } | { location: 'there' }


export {
  RunnableDag,
  PartitionedFn
}
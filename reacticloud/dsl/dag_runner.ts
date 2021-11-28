import { Dag, Selector } from "./dag"
import { RelativeLocation } from "../client-server-messages/lib"

class RunnableDag<F> {
  dag: Dag<PartitionedFn<F>>
  runFnHere: (fn: F, arg: any, done: (r: any) => void) => void
  sendInputThere: (x: any, fn_id: number, input_seq_id: number, selector: Selector[]) => void

  constructor(dag: Dag<PartitionedFn<F>>, 
    runFnHere: (fn: F, arg: any, done: (r: any) => void) => void,
    sendInputThere: (x: any, fn_id: number, input_seq_id: number, selector: Selector[]) => void) {
    this.dag = dag
    this.runFnHere = runFnHere
    this.sendInputThere = sendInputThere
  }

  acceptInitialInput(input: any) {

  }

  localInputAvailable(x: any, for_fn: number, input_seq_id: number, selector: Selector[]) {

  }
}

type PartitionedFn<F> = { location: 'here', fn: F } | { location: 'there' }


export {
  RunnableDag,
  PartitionedFn
}
import { Selector } from "../dsl/dag"

type FunctionTraceData = [{
  seq_id: number, 
  exec_data: {
    exec_time_us: number,
    output_sizes: [{
      out_selector: Selector[],
      bytes: number
    }]
  }
}]

type InputTraceData = [
  seq_id: number,
  sizes: [{
    selector: Selector[],
    bytes: number
  }]
]

export { FunctionTraceData, InputTraceData }

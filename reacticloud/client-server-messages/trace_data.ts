import { Selector } from "../dsl/dag"
import { Location } from "../dsl/sf"

type FunctionTraceRow = {
  exec_time_ms: number,
  exec_location: Location,
  output_sizes: {
    out_selector: Selector[],
    bytes: number
  }[]
}

type InputTraceRow = {
  selector: Selector[],
  bytes: number
}[]

type FunctionTraceDataSerialized = {
  seq_id: number, 
  exec_data: FunctionTraceRow
}[]

type InputTraceDataSerialized = {
  seq_id: number,
  sizes: InputTraceRow
}[]



type FunctionTraceData = Map<number, FunctionTraceRow>
type InputTraceData = Map<number, InputTraceRow>


export { FunctionTraceDataSerialized, InputTraceDataSerialized, FunctionTraceData, InputTraceData, FunctionTraceRow, InputTraceRow }

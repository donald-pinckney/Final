import { Selector, SerializedDag } from "../dsl/dag"
import { FunctionTraceDataSerialized, InputTraceDataSerialized } from "./trace_data"


type FunctionDeployData = 
    { constraint: 'client' }
  | { constraint: 'cloud' | 'unconstrained', fnSrc: string }


type Role = 'client' | 'worker'

type RelativeLocation = 'here' | 'there'

interface ClientToServerEvents {
  iam: (role: Role) => void;
  client_orch_deploy: <A, B>(sf: SerializedDag<FunctionDeployData>, callback: (deploy_id: number, partition: [number, RelativeLocation][]) => void) => void;
  client_orch_send_traces: (original_deploy_id: number, partial_trace_data_fns: SerializedDag<FunctionTraceDataSerialized>, partial_trace_data_inputs: InputTraceDataSerialized) => void;
  input_available: (x: string, deploy_id: number, fn_id: number, input_seq_id: number, selector: Selector[]) => void;
  worker_request_fn: (deploy_id: number, fn_id: number, reply_src: (src: string) => void) => void
  worker_result: (task_deploy_id: number, task_fn_id: number, task_seq_id: number, result: any) => void

}

interface ServerToClientEvents {
  input_available: (x: string, deploy_id: number, fn_id: number, input_seq_id: number, selector: Selector[]) => void;
  updated_deployment: (original_deploy_id: number, new_deploy_id: number, new_partition: [number, RelativeLocation][]) => void;
  worker_run_fn: <A, B>(x: A, deploy_id: number, fn_id: number, seq_id: number) => void;
}

interface InterServerEvents {
}

interface SocketData {
}

export { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, FunctionDeployData, RelativeLocation, Role }
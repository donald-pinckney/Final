// import { SF_deployment_request_serialized } from "../dsl/deployment_request"
import { Location } from "../dsl/sf"

import { Selector, SerializedDag } from "../dsl/dag"


type FunctionDeployData = 
    { constraint: 'client' }
  | { constraint: 'cloud' | 'unconstrained', fnSrc: string }


type Role = 'client' | 'worker'

type RelativeLocation = 'here' | 'there'

interface ClientToServerEvents {
  iam: (role: Role) => void;
  client_orch_deploy: <A, B>(sf: SerializedDag<FunctionDeployData>, callback: (deploy_id: number, partition: [number, RelativeLocation][]) => void) => void;
  input_available: <A>(x: A, deploy_id: number, fn_id: number, input_seq_id: number, selector: Selector[]) => void;
  worker_request_fn: (deploy_id: number, fn_id: number, reply_src: (src: string) => void) => void

}

interface ServerToClientEvents {
  input_available: <A>(x: A, deploy_id: number, fn_id: number, input_seq_id: number, selector: Selector[]) => void;
  worker_run_fn: <A, B>(x: A, deploy_id: number, fn_id: number, done: (r: B) => void) => void;
}

interface InterServerEvents {
}

interface SocketData {
}

export { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, FunctionDeployData, RelativeLocation }
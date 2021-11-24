import { SF_deployment_request_serialized } from "../dsl/deployment_request"
import { Location } from "../dsl/sf"

interface ClientToServerEvents {
  deploy: <A, B>(sf: SF_deployment_request_serialized<A, B>, callback: (deploy_id: number, placements: [number, Location][]) => void) => void;
  input_available: <A>(x: A, deploy_id: number, arr_id: number, input_seq_id: number) => void;
}

interface ServerToClientEvents {
  input_available: <A>(x: A, deploy_id: number, arr_id: number, input_seq_id: number) => void;
  // noArg: () => void;
  // basicEmit: (a: number, b: string, c: Buffer) => void;
  // withAck: (d: string, callback: (e: number) => void) => void;
}

interface InterServerEvents {
}

interface SocketData {
}

export { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData }
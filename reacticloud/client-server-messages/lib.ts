
import { SF_deployment_request, SF_deployment_request_serialized } from "../dsl/deployment_request"

type serialized_placements = [number, Location][]

interface ClientToServerEvents {
  deploy: <A, B>(sf: SF_deployment_request_serialized<A, B>, callback: (deploy_id: number, placements: serialized_placements) => void) => void;
  input_available: <A>(x: A, deploy_id: number, fn_id: number, input_id: number) => void;
}

interface ServerToClientEvents {
  input_available: <A>(x: A, deploy_id: number, fn_id: number, input_id: number) => void;
  // noArg: () => void;
  // basicEmit: (a: number, b: string, c: Buffer) => void;
  // withAck: (d: string, callback: (e: number) => void) => void;
}

interface InterServerEvents {
}

interface SocketData {
}

export { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, serialized_placements }
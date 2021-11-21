
import { SF_deployment_request, SF_deployment_request_serialized } from "../dsl/deployment_request"

interface ClientToServerEvents {
  deploy: <A, B>(sf: SF_deployment_request_serialized<A, B>, callback: (placements: [number, Location][]) => void) => void;
}

interface ServerToClientEvents {
  // noArg: () => void;
  // basicEmit: (a: number, b: string, c: Buffer) => void;
  // withAck: (d: string, callback: (e: number) => void) => void;
}

interface InterServerEvents {
}

interface SocketData {
}

export { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData }
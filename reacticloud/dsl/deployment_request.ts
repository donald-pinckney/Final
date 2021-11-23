import { LocationConstraint, SF_core } from "./sf"

type SF_deployment_request_serialized<A, B> =
  | SF_deployment_request_serialized_arr<A, B>
  | SF_deployment_request_serialized_then<A, B>
  | SF_deployment_request_serialized_first<A, B>


type ConstraintAndCode = { fn_src: string, constraint: "unconstrained" | "cloud" } | { constraint: "client" }

type SF_deployment_request_serialized_arr<A, B> = { type: "arr", uniqueId: number, constraint: ConstraintAndCode }
type SF_deployment_request_serialized_then<A, B> = { type: "then", f: SF_deployment_request_serialized<A, any>, g: SF_deployment_request_serialized<any, B> }
type SF_deployment_request_serialized_first<A, B> = { type: "first", first_sf: SF_deployment_request_serialized<any, any> }



type SF_deployment_request<A, B> =
  | SF_deployment_request_arr<A, B>
  | SF_deployment_request_then<A, B>
  | SF_deployment_request_first<A, B>


type ConstraintAndFn<A, B> = { fn: (arg: A, cont: (r: B) => void) => void, constraint: "unconstrained" | "cloud" } | { constraint: "client" }


class SF_deployment_request_arr<A, B> {
  private uniqueId: number
  private constraint: ConstraintAndFn<A, B>

  constructor(uniqueId: number, constraint: ConstraintAndFn<A, B>) {
    this.uniqueId = uniqueId
    this.constraint = constraint
  }
}

class SF_deployment_request_then<A, B> {
  private f: SF_deployment_request<A, any>
  private g: SF_deployment_request<any, B>

  constructor(f: SF_deployment_request<A, any>, g: SF_deployment_request<any, B>) {
    this.f = f
    this.g = g
  }
}

class SF_deployment_request_first<A, B> {
  // A must = (A', C)
  // B must = (B', C)

  // first_sf: SF_deployment_request<A', B'>
  // but we can't write this type, so use any instead
  private first_sf: SF_deployment_request<any, any>

  constructor(first_sf: SF_deployment_request<any, any>) {
    this.first_sf = first_sf
  }
}


function deploymentRequestForSF<A, B>(sf: SF_core<A, B>): SF_deployment_request_serialized<A, B> {
  // TODO: implement
  // throw new Error("TODO: unimplemented")
  let x: any = null
  return x
}

function deserialize<A, B>(serialized: SF_deployment_request_serialized<A, B>): SF_deployment_request<A, B> {
  // TODO: implement
  // throw new Error("TODO: unimplemented")
  let x: any = null
  return x
}


export { 
  SF_deployment_request_serialized, 
  SF_deployment_request_serialized_arr, 
  SF_deployment_request_serialized_then, 
  SF_deployment_request_serialized_first,
  SF_deployment_request,
  SF_deployment_request_arr,
  SF_deployment_request_then,
  SF_deployment_request_first,
  deserialize,
  deploymentRequestForSF
}



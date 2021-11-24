import { SF_core, SF_arr, SF_then, SF_first } from "./sf"

// import * as util from "util"

type SF_deployment_request_serialized<A, B> =
  | SF_deployment_request_serialized_arr<A, B>
  | SF_deployment_request_serialized_then<A, B>
  | SF_deployment_request_serialized_first<A, B>


type ConstraintAndCode = 
    { fn_src: string, constraint: "unconstrained" | "cloud" } 
  | { constraint: "client" }

type SF_deployment_request_serialized_arr<A, B> = { type: "arr", uniqueId: number, constraint: ConstraintAndCode }
type SF_deployment_request_serialized_then<A, B> = { type: "then", f: SF_deployment_request_serialized<A, any>, g: SF_deployment_request_serialized<any, B> }
type SF_deployment_request_serialized_first<A, B> = { type: "first", first_sf: SF_deployment_request_serialized<any, any> }



type SF_deployment_request<A, B> =
  | SF_deployment_request_arr<A, B>
  | SF_deployment_request_then<A, B>
  | SF_deployment_request_first<A, B>


type ConstraintAndFn<A, B> = 
    { fn: (arg: A, cont: (r: B) => void) => void, constraint: "unconstrained" | "cloud" } 
  | { constraint: "client" }


class SF_deployment_request_arr<A, B> {
  private uniqueId: number
  private constraint: ConstraintAndFn<A, B>

  constructor(uniqueId: number, constraint: ConstraintAndFn<A, B>) {
    this.uniqueId = uniqueId
    this.constraint = constraint
  }

  // [util.inspect.custom](depth: any, opts: any) {
  //   let constr = this.constraint.constraint == "client" ? this.constraint : { constraint: this.constraint.constraint, fn: this.constraint.fn.toString() }
  //   return `SF_deployment_request_arr(${this.uniqueId}, ${JSON.stringify(constr)})`
  // }
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
  if(sf instanceof SF_arr) {
    let constraintAndCode: ConstraintAndCode = 
      sf.constraint == "client" ? 
      { constraint: "client" } : 
      { fn_src: sf.fn.toString(), constraint: sf.constraint }

    return {
      type: "arr",
      uniqueId: sf.uniqueId,
      constraint: constraintAndCode
    }
  } else if(sf instanceof SF_then) {
    return {
      type: "then",
      f: deploymentRequestForSF(sf.f),
      g: deploymentRequestForSF(sf.g)
    }
  } else if(sf instanceof SF_first) {
    return {
      type: "first",
      first_sf: deploymentRequestForSF(sf.first_sf)
    }
  } else {
    throw new Error(`Error: unknown sf type: ${sf}`)
  }
}

function deserialize<A, B>(serialized: SF_deployment_request_serialized<A, B>): SF_deployment_request<A, B> {
  if(serialized.type == "arr") {
    let constraintAndCode: ConstraintAndFn<A, B> =
      serialized.constraint.constraint == "client" ?
      { constraint: "client" } :
      { fn: eval(serialized.constraint.fn_src), constraint: serialized.constraint.constraint }
    return new SF_deployment_request_arr(serialized.uniqueId, constraintAndCode)
  } else if(serialized.type == "then") {
    return new SF_deployment_request_then(deserialize(serialized.f), deserialize(serialized.g))
  } else if(serialized.type == "first") {
    return new SF_deployment_request_first(deserialize(serialized.first_sf))
  } else {
    throw new Error(`Error: unknown serialized type: ${serialized}`)
  }
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



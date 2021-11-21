import { Location } from "../dsl/sf"

type PlacementMap = Map<number, Location>

function placementListToMap(xs: [number, Location][]): PlacementMap {
  return new Map(xs)
}

function placementMapToList(xs: PlacementMap): [number, Location][] {
  return [...xs.entries()]
}


type SF_core_deployed<A, B> =
  | SF_arr_deployed<A, B>
  | SF_then_deployed<A, B>
  | SF_first_deployed<A, B>



type Arr_Deployment<A, B> = { location: "client", fn: (arg: A, cont: (r: B) => void) => void } | { location: "cloud" }

class SF_arr_deployed<A, B> {
  private uniqueId: number
  private deployment: Arr_Deployment<A, B>

  constructor(uniqueId: number, deployment: Arr_Deployment<A, B>) {
    this.uniqueId = uniqueId
    this.deployment = deployment
  }
}

class SF_then_deployed<A, B> {
  private f: SF_core_deployed<A, any>
  private g: SF_core_deployed<any, B>

  constructor(f: SF_core_deployed<A, any>, g: SF_core_deployed<any, B>) {
    this.f = f
    this.g = g
  }
}

class SF_first_deployed<A, B> {
  // A must = (A', C)
  // B must = (B', C)

  // first_sf: SF_core<A', B'>
  // but we can't write this type, so use any instead
  private first_sf: SF_core_deployed<any, any>

  constructor(first_sf: SF_core_deployed<any, any>) {
    this.first_sf = first_sf
  }
}

// export { SF_core_deployed_serialized, SF_arr_deployed_serialized, SF_then_deployed_serialized, SF_first_deployed_serialized }

import { Location, LocationConstraint } from "../dsl/sf"
import { Dag } from "../dsl/dag"
import { RelativeLocation } from "../client-server-messages/lib"
import { FunctionTraceData, InputTraceData } from "../client-server-messages/trace_data"


function setUnique<K, V>(m: Map<K, V>, k: K, v: V) {
  if(m.has(k)) {
    throw new Error(`BUG: key ${k} should be unique!`)
  }
  m.set(k, v)
}

type TraceData = {
  inputs_trace: InputTraceData;
  fns_trace: Dag<FunctionTraceData>;
}

function computeLocations(dag: Dag<{ constraint: LocationConstraint }>, traceData: TraceData): Map<number, Location> {
  const locs = new Map()
  dag.map((fn_id, { constraint }) => {
    if(constraint == 'client') {
      setUnique(locs, fn_id, 'client')
    } else if(constraint == 'cloud') {
      setUnique(locs, fn_id, 'cloud')
    } else if(constraint == 'unconstrained') {
      setUnique(locs, fn_id, 'cloud')
    } else {
      throw new Error("BUG: unknown constraint: " + constraint)
    }
  })
  return locs
}


function relativizeLocations(locs: Map<number, Location>, me: Location): Map<number, RelativeLocation> {
  return new Map(Array.from(locs.entries()).map(([id, loc]) => {
    return [id, loc == me ? 'here' : 'there']
  }))
}


function locationComplement(loc: RelativeLocation): RelativeLocation {
  if(loc == 'here') {
    return 'there'
  } else if(loc == 'there') {
    return 'here'
  } else {
    throw new Error("BUG")
  }
}

function partitionComplement(locs: Map<number, RelativeLocation>): Map<number, RelativeLocation> {
  return new Map(Array.from(locs.entries()).map(([id, loc]) => [id, locationComplement(loc)]))
}


export {
  computeLocations,
  relativizeLocations,
  partitionComplement
}
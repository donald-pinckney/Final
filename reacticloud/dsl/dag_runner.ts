import { Arity, arityToTuple, Dag, mapArity, Selector, SymbolicValue } from "./dag"
import { RelativeLocation } from "../client-server-messages/lib"
import { InputTraceData, FunctionTraceData, FunctionTraceRow } from "../client-server-messages/trace_data"
import { Location, LocationConstraint } from "../dsl/sf"


type InputState = {
  arity_cardinality: number,
  received_input_count: number,
  input_values: Arity<{ type: 'unavailable' } | { type: 'available', data: any }>
}

function arityCardinality<T>(arity: Arity<T>): number {
  if(arity.type == 'singleton') {
    return 1
  } else if(arity.type == 'pair') {
    return arityCardinality(arity.fst) + arityCardinality(arity.snd)
  } else {
    throw new Error('unreachable')
  }
}

function extractSelector(x: any, selector: Selector[]): any {
  let v = x
  selector.forEach(sel => {
    if(sel == 'fst') {
      v = v[0]
    } else if(sel == 'snd') {
      v = v[1]
    }
  })
  return v
}

function updateArity<T>(arity: Arity<T>, path: Selector[], x: T) {
  let found = arity
  path.forEach(sel => {
    if(sel == 'fst') {
      found = found.type == 'pair' 
        ? found.fst 
        : (() => { throw new Error('BUG: arity mismatch: path too long (1)') })()
    } else if(sel == 'snd') {
      found = found.type == 'pair' 
        ? found.snd 
        : (() => { throw new Error('BUG: arity mismatch: path too long (2)') })()
    }
  })

  if(found.type == 'singleton') {
    found.data = x
  } else {
    throw new Error('BUG: arity mismatch: path too short')
  }
}

class RunnableDag<F> {
  private dag: Dag<PartitionedFn<F>>
  private inputStates: Map<number, Dag<PartitionedFn<InputState>>>
  private input_count: number
  // private fresh_seq_id: number | null
  // private initial_seq_id: number | null

  private inputTraceData: InputTraceData
  private functionTraceData: Dag<PartitionedFn<FunctionTraceData>>
  private here: Location

  runFnHere?: (fn: F, seq_id: number, arg: any, done: (r: any) => void) => void
  sendInputThere?: (x: string, fn_id: number, input_seq_id: number, selector: Selector[]) => void

  constructor(dag: Dag<PartitionedFn<F>>, here: Location) {
    this.dag = dag
    this.input_count = 0
    this.inputStates = new Map()
    this.inputTraceData = new Map()
    this.functionTraceData = dag.map((_f_id, p) => {
      return mapPartitionedFn(p, (_x) => {
        return new Map()
      })
    })
    this.here = here
  }

  acceptInitialInput(input: any, seq_id: number) {
    this.input_count++

    this.sendOutputs(seq_id, input, this.dag.initial_wires, 'initial')
  }

  sendOutputs(seq_id: number, x: any, wires: { from: Selector[], to: SymbolicValue }[], initialOrSrcFnTime: 'initial' | [number, number]) {
    wires.forEach(({ from, to }) => this.sendOutput(seq_id, x, from, to, initialOrSrcFnTime))
  }

  sendOutput(seq_id: number, x: any, from: Selector[], to: SymbolicValue, initialOrSrcFnTime: 'initial' | [number, number]) {
    const toSend = extractSelector(x, from)
    const toSendJSON = JSON.stringify(toSend)

    const dstFn = to.fn_id_or_input
    if(dstFn == 'input') {
      throw new Error('BUG: cant send back to the input')
    }


    // Trace collection
    if(initialOrSrcFnTime == 'initial') {
      if(!this.inputTraceData.has(seq_id)) {
        this.inputTraceData.set(seq_id, [])
      }
      const row = this.inputTraceData.get(seq_id)
      if(row === undefined) {
        throw new Error('unreachable')
      }
      row.push({ 
        out_selector: from, 
        bytes: toSendJSON.length
      })
    } else {
      const srcFn = initialOrSrcFnTime[0]
      const fnTime = initialOrSrcFnTime[1]

      const fnTraceNode = this.functionTraceData.getNode(srcFn)
      const part_trace_data = fnTraceNode.data
      if(part_trace_data.location == 'there') {
        throw new Error('unreachable')
      }
      const fnTraceData = part_trace_data.fn

      if(!fnTraceData.has(seq_id)) {
        fnTraceData.set(seq_id, {
          exec_time_ms: fnTime,
          exec_location: this.here,
          output_sizes: []
        })
      }
      const row = fnTraceData.get(seq_id)
      if(row === undefined) {
        throw new Error('unreachable')
      }
      row.output_sizes.push({
        out_selector: from,
        bytes: toSendJSON.length
      })
    }

    
    const destPartData = this.dag.getNode(dstFn)
    if(destPartData.data.location == 'here') {
      // send locally
      this.localInputAvailable(toSend, dstFn, seq_id, to.path)
    } else {
      // send there
      if(this.sendInputThere === undefined) {
        throw new Error('unreachable')
      }
      this.sendInputThere(toSendJSON, dstFn, seq_id, to.path)
    }
  }

  getLazySeqInputStates(seq_id: number): Dag<PartitionedFn<InputState>> {
    const maybeState = this.inputStates.get(seq_id)

    if(maybeState != undefined) {
      return maybeState
    } else {
      const initialState = this.dag.map((fn_id, f_data_part) => {
        const node = this.dag.getNode(fn_id)
        const shape = node.param_shape
        const card = arityCardinality(shape)
        return mapPartitionedFn(f_data_part, _f_data => {
          const initialFnState: InputState = {
            arity_cardinality: card,
            received_input_count: 0,
            input_values: mapArity(shape, _null => {
              return { type: 'unavailable' }
            })
          }
          return initialFnState
        })
      })

      this.inputStates.set(seq_id, initialState)
      return initialState
    }
  }

  localInputAvailable(x: any, for_fn: number, input_seq_id: number, selector: Selector[]) {
    const seq_state = this.getLazySeqInputStates(input_seq_id)
    if(seq_state === undefined) {
      throw new Error('unreachable')
    }

    const state_node_data = seq_state.getNode(for_fn).data
    if(state_node_data.location == 'there') {
      throw new Error('BUG: input delivered locally for remote function!')
    }

    const state_data = state_node_data.fn
    updateArity(state_data.input_values, selector, { type: 'available', data: x })
    state_data.received_input_count++

    if(state_data.received_input_count == state_data.arity_cardinality) {
      const fn_node = this.dag.getNode(for_fn)
      const fn_node_data = fn_node.data
      if(fn_node_data.location == 'there') {
        throw new Error('BUG: input delivered locally for remote function!')
      }
      const fn = fn_node_data.fn

      if(this.runFnHere === undefined) {
        throw new Error('unreachable')
      }

      const preparedInputValues = mapArity(state_data.input_values, iv => {
        if(iv.type == 'unavailable') {
          throw new Error('unreachble')
        }
        return iv.data
      })
      const fn_arg = arityToTuple(preparedInputValues)
      
      const startTime = Date.now()
      this.runFnHere(fn, input_seq_id, fn_arg, fn_return => {
        const dt = Date.now() - startTime
        const out_wires = fn_node.output_wires
        this.sendOutputs(input_seq_id, fn_return, out_wires, [for_fn, dt])
      })
    }
  }

  getInputCount(): number {
    return this.input_count
  }

  extractPartialTraceData(): { inputs: InputTraceData, fns: Dag<FunctionTraceData> } {
    const retInputs = drainMap(this.inputTraceData)
    const retFns = this.functionTraceData.map((_fn_id, part_data) => {
      if(part_data.location == 'there') {
        return new Map<number, FunctionTraceRow>()
      } else {
        const traceData = part_data.fn
        return drainMap(traceData)
      }
    })

    return {
      inputs: retInputs,
      fns: retFns
    }
  }
}

type PartitionedFn<F> = { location: 'here', fn: F } | { location: 'there' }
function mapPartitionedFn<F, G>(p: PartitionedFn<F>, f: (x: F) => G): PartitionedFn<G> {
  if(p.location == 'here') {
    return { location: 'here', fn: f(p.fn) }
  } else if(p.location == 'there') {
    return { location: 'there' }
  } else {
    throw new Error("BUG: bad PartitionedFn")
  }
}


function partitionDag<F extends { constraint: LocationConstraint }>(dag: Dag<F>, partition: Map<number, RelativeLocation>, herePlace: Location): Dag<PartitionedFn<F>> {
  const therePlace: Location = herePlace == 'cloud' ? 'client' : 'cloud'
  return dag.map((fn_id, f_data) => {
    // const id = sf.uniqueId
    const loc = partition.get(fn_id)
    if(loc == undefined) {
      throw new Error(`BUG: Could not find placement for ${fn_id}`)
    } else if(loc == 'here' && f_data.constraint == therePlace) {
      throw new Error(`BUG: Invalid partition`)
    } else if(loc == 'there' && f_data.constraint == herePlace) {
      throw new Error(`BUG: Invalid partition`)
    } else if(loc == 'here') {
      return { location: 'here', fn: f_data }
    } else if(loc == 'there') {
      return { location: 'there' }
    } else {
      throw new Error(`BUG: unreachable`)
    }
  })
}


function drainMap<K, V>(m: Map<K, V>): Map<K, V> {
  const mCopy = new Map(Array.from(m.entries()))
  m.clear()
  return mCopy
}

export {
  RunnableDag,
  PartitionedFn,
  mapPartitionedFn,
  partitionDag
}
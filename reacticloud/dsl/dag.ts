import { 
  SF,
  SF_core,
  SF_lambda,
  SF_app,
  SF_p1,
  SF_p2,
  SF_pair,
  SF_fn,
  SF_var,
  SF_input,
} from './sf'

import { buildDAG } from './compute_dag'



class Dag<F> {
  nodes: Map<number, DagFunction<F>>
  initial_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(nodes: Map<number, DagFunction<F>>, initial_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.nodes = nodes
    this.initial_wires = initial_wires
  }
}

class DagFunction<F> {
  def: F
  id: number
  param_shape: Arity<undefined>
  output_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(def: F, id: number, param_shape: Arity<undefined>, output_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.def = def
    this.id = id
    this.param_shape = param_shape
    this.output_wires = output_wires
  }
}

type Selector = 'fst' | 'snd'
type SymbolicValue = { fn_id_or_input: number | 'input', path: Selector[] }
type Arity<D> = 
  | { type: 'singleton', data: D }
  | { type: 'pair', fst: Arity<D>, snd: Arity<D> }





// --------- Everything below here is used for DAG computation ----------


export {
  buildDAG,
  Dag,
  DagFunction,
  Selector,
  SymbolicValue,
  Arity
}


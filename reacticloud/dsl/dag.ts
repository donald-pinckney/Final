class Dag<F> {
  nodes: Map<number, DagFunction<F>>
  initial_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(nodes: Map<number, DagFunction<F>>, initial_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.nodes = nodes
    this.initial_wires = initial_wires
  }

  map<G>(f: (x: F) => G): Dag<G> {
    return new Dag(new Map(Array.from(this.nodes.entries()).map(([id, fn]) => [id, fn.map(f)])), this.initial_wires)
  }

  serialize(): SerializedDag<F> {
    return { 
      nodes: new Map(Array.from(this.nodes).map(([id, fn]) => [id, fn.serialize()])), 
      initial_wires: this.initial_wires 
    }
  }

  static deserialize<G>(s: SerializedDag<G>): Dag<G> {
    return new Dag(
      new Map(Array.from(s.nodes).map(([id, fn]) => [id, DagFunction.deserialize(fn)])), 
      s.initial_wires)
  }
}

class DagFunction<F> {
  data: F
  id: number
  param_shape: Arity<null>
  output_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(data: F, id: number, param_shape: Arity<null>, output_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.data = data
    this.id = id
    this.param_shape = param_shape
    this.output_wires = output_wires
  }

  map<G>(f: (x: F) => G): DagFunction<G> {
    return new DagFunction(f(this.data), this.id, this.param_shape, this.output_wires)
  }

  serialize(): SerializedDagFunction<F> {
    return {
      data: this.data,
      id: this.id,
      param_shape: this.param_shape,
      output_wires: this.output_wires
    }
  }

  static deserialize<G>(s: SerializedDagFunction<G>): DagFunction<G> {
    return new DagFunction(s.data, s.id, s.param_shape, s.output_wires)
  }
}


type Selector = 'fst' | 'snd'
type SymbolicValue = { fn_id_or_input: number | 'input', path: Selector[] }
type Arity<D> = 
  | { type: 'singleton', data: D }
  | { type: 'pair', fst: Arity<D>, snd: Arity<D> }



type SerializedDag<F> = {
  nodes: Map<number, SerializedDagFunction<F>>
  initial_wires: { from: Selector[], to: SymbolicValue }[]
}

type SerializedDagFunction<F> = {
  data: F
  id: number
  param_shape: Arity<null>
  output_wires: { from: Selector[], to: SymbolicValue }[]
}


import { buildDAG } from './compute_dag'

export {
  buildDAG,
  Dag,
  DagFunction,
  Selector,
  SymbolicValue,
  Arity,
  SerializedDag,
  SerializedDagFunction
}


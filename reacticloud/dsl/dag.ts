class Dag<F> {
  nodes: Map<number, DagFunction<F>>
  initial_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(nodes: Map<number, DagFunction<F>>, initial_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.nodes = nodes
    this.initial_wires = initial_wires
  }

  map<G>(f: (fn_id: number, x: F) => G): Dag<G> {
    return new Dag(new Map(Array.from(this.nodes.entries()).map(([id, fn]) => [id, fn.map(f)])), this.initial_wires)
  }

  serialize(): SerializedDag<F> {
    return { 
      nodes: new Map(Array.from(this.nodes).map(([id, fn]) => [id, fn.serialize()])), 
      initial_wires: this.initial_wires 
    }
  }

  getNode(fn_id: number): DagFunction<F> {
    const mNode = this.nodes.get(fn_id)
    if(mNode === undefined) {
      throw new Error("BUG: unknown node: " + fn_id)
    }
    return mNode
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

  map<G>(f: (fn_id: number, x: F) => G): DagFunction<G> {
    return new DagFunction(f(this.id, this.data), this.id, this.param_shape, this.output_wires)
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

function mapArity<A, B>(e: Arity<A>, f: (x: A) => B): Arity<B> {
  switch (e.type) {
    case 'singleton':
      return { type: 'singleton', data: f(e.data) }
    case 'pair':
      return { type: 'pair', fst: mapArity(e.fst, f), snd: mapArity(e.snd, f) }
  }
}

type NestedTuple<T> = [NestedTuple<T>, NestedTuple<T>] | T

function arityToTuple<T>(arity: Arity<T>): NestedTuple<T> {
  if(arity.type == 'singleton') {
    return arity.data
  } else if(arity.type == 'pair') {
    return [arityToTuple(arity.fst), arityToTuple(arity.snd)]
  } else {
    throw new Error('unreachable')
  }
}

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
  mapArity,
  arityToTuple,
  SerializedDag,
  SerializedDagFunction
}


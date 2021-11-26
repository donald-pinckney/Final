// type SF_core<A, B> = 
//   | SF_arr<A, B>
//   | SF_then<A, B>
//   | SF_p1<A, B>
//   | SF_p2<A, B>
//   | SF_product<A, B>

type SF_core =
  | SF_lambda
  | SF_app
  | SF_p1
  | SF_p2
  | SF_pair
  | SF_fn
  | SF_var
  | SF_input

type Location = 
  | "client"
  | "cloud"

type LocationConstraint =
  | "unconstrained"
  | Location

var GLOBAL_UNIQUE_ARR_ID = 0

function getFreshArrId() {
  return GLOBAL_UNIQUE_ARR_ID++
}







var freshVarId = 0
function freshVar(): string {
  return "x" + freshVarId++
}


class SF<A, B> {
  _wrapped: SF_core
  constructor(w: SF_core) {
    this._wrapped = w
  }


  static arr<A, B>(f: (x: A) => B, constraint: LocationConstraint = "unconstrained"): SF<A, B> {
    if(constraint == "client") {
      const fAsync = (x: A, cont: (r: B) => void) => cont(f(x))
      return SF.arrAsync(fAsync, constraint)
    } else {
      const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`
      const fAsync = eval(fAsyncStr)
      return SF.arrAsync(fAsync, constraint)
    }
  }

  static arrAsync<A, B>(f: (x: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained"): SF<A, B> {
    return new SF(new SF_fn(f, constraint))
  }

  static p1<A, B>(): SF<[A, B], A> {
    const x = freshVar()
    return new SF(new SF_lambda(x, new SF_p1(new SF_var(x))))
  }
  
  static p2<A, B>(): SF<[A, B], B> {
    const x = freshVar()
    return new SF(new SF_lambda(x, new SF_p2(new SF_var(x))))
  }

  then<C>(next: SF<B, C>): SF<A, C> {
    const x = freshVar()
    return new SF(new SF_lambda(x, new SF_app(next._wrapped, new SF_app(this._wrapped, new SF_var(x)))))
  }

  first<C>(): SF<[A, C], [B, C]> {
    const x = freshVar()
    const xv = new SF_var(x)
    return new SF(new SF_lambda(x, new SF_pair(new SF_app(this._wrapped, new SF_p1(xv)), new SF_p2(xv))))
  }

  second<C>(): SF<[C, A], [C, B]> {
    const x = freshVar()
    const xv = new SF_var(x)
    const swap1: SF<[C, A], [A, C]> = new SF(new SF_lambda(x, new SF_pair(new SF_p2(xv), new SF_p1(xv))))
    const y = freshVar()
    const yv = new SF_var(y)
    const swap2: SF<[B, C], [C, B]> = new SF(new SF_lambda(y, new SF_pair(new SF_p2(yv), new SF_p1(yv))))

    return swap1.then(this.first()).then(swap2)
  }

  parallel<C, D>(other: SF<C, D>): SF<[A, C], [B, D]> {
    const f = this.first<C>()
    const g = other.second<B>()
    return f.then(g)
  }

  and<C>(other: SF<A, C>): SF<A, [B, C]> {
    const x = freshVar()
    const xv = new SF_var(x)
    const copy: SF<A, [A, A]> = new SF(new SF_lambda(x, new SF_pair(xv, xv)))
    return copy.then(this.parallel(other))
  }

  lift2<C, D>(op: (args: [B, C]) => D, other: SF<A, C>): SF<A, D> {
    const op_arr = SF.arr(op)
    return this.and(other).then(op_arr)
  }

  subscribe(f: (x: B) => void): SF<A, void> {
    const subArr = SF.arrAsync<B, void>((xx: B, cont: (r: void) => void) => f(xx), "client")
    return this.then(subArr)
  } 
}



class SF_lambda {
  arg: string
  body: SF_core

  constructor(arg: string, body: SF_core) {
    this.arg = arg
    this.body = body
  }
}

class SF_app {
  fn: SF_core
  arg: SF_core

  constructor(fn: SF_core, arg: SF_core) {
    this.fn = fn
    this.arg = arg
  }
}

class SF_p1 {
  e: SF_core
  constructor(e: SF_core) {
    this.e = e
  }
}

class SF_p2 {
  e: SF_core
  constructor(e: SF_core) {
    this.e = e
  }
}

class SF_pair {
  fst: SF_core
  snd: SF_core

  constructor(fst: SF_core, snd: SF_core) {
    this.fst = fst
    this.snd = snd
  }
}

class SF_fn {
  fn: (arg: any, cont: (r: any) => void) => void;
  constraint: LocationConstraint
  uniqueId: number

  constructor(f: (arg: any, cont: (r: any) => void) => void, constraint: LocationConstraint) {
    this.fn = f
    this.constraint = constraint
    this.uniqueId = getFreshArrId()
  }
}

class SF_var {
  name: string

  constructor(name: string) {
    this.name = name
  }
}

class SF_input {
  constructor() {

  }
}



function buildDAG(x: normalized<SF_fn, void>) {
  console.log("ARITY ANALYSIS BEFORE:\n\n")
  console.log(util.inspect(x, false, null, true))

  const [xArity, outArity] = analyzeArity_synth(x, UNK)

  console.log("ARITY ANALYSIS AFTER:\n\n")
  console.log(util.inspect(xArity, false, null, true))
  console.log("ARITY ANALYSIS OUT:\n\n")
  console.log(util.inspect(outArity, false, null, true))

  const g = evaluateToDAG(xArity)
  console.log(util.inspect(g, false, null, true))
  console.log()
}

type Selector = 'fst' | 'snd'
type SymbolicValue = { fn_id_or_input: number | 'input', path: Selector[] }

type norm_no_connections = normalized<{ def: SF_fn, inData: arity<void>, outData: arity<void> }, arity<void>>
type norm_connections = normalized<{ def: SF_fn, inData: arity<SymbolicValue>, outData: arity<SymbolicValue> }, arity<SymbolicValue>>


function symbolicValues(a_tmp: arity<void>, fn_id_or_input: number | 'input'): arity<SymbolicValue> {
  function symbolicInputs_rec(a: arity<void>, path: Selector[]): arity<SymbolicValue> {
    switch (a.type) {
      case 'singleton':
        return { type: 'singleton', data: {fn_id_or_input, path: path }}
      case 'pair':
        return { type: 'pair', fst: symbolicInputs_rec(a.fst, [...path, 'fst']), snd: symbolicInputs_rec(a.snd, [...path, 'snd']) }
    }
  }

  return symbolicInputs_rec(a_tmp, [])
}


function checkConsistent(arg: arity<SymbolicValue>, param: arity<void>) {
  if(arg.type == 'singleton' && param.type == 'singleton') {
    return 
  } else if(arg.type == 'pair' && param.type == 'pair') {
    checkConsistent(arg.fst, param.fst)
    checkConsistent(arg.snd, param.snd)
  } else {
    throw new Error("inconsistent arguments! should have been caught in arity checker!")
  }
}

function checkPathsSame(p1: Selector[], p2: Selector[]) {
  if(p1.length != p2.length) {
    return false
  }
  for(let i = 0; i < p1.length; i++) {
    if(p1[i] != p2[i]) {
      return false
    }
  }
  return true
}

function checkArgsSame(args1: arity<SymbolicValue>, args2: arity<SymbolicValue>) {
  if(args1.type == 'singleton' && args2.type == 'singleton') {
    if(args1.data.fn_id_or_input == args2.data.fn_id_or_input && checkPathsSame(args1.data.path, args2.data.path)) {
      return
    } else {
      throw new Error("inconsistent arguments! DONT ALIAS FUNCTIONS!")
    }
  } else if(args1.type == 'pair' && args2.type == 'pair') {
    checkArgsSame(args1.fst, args2.fst)
    checkArgsSame(args1.snd, args2.snd)
  } else {
    throw new Error("inconsistent arguments! should have been caught in arity checker!")
  }
}

// class ClientFunction {
//   constraint: LocationConstraint
//   fn: (arg: any, cont: (r: any) => void) => void
// }

class DagFunction<F> {
  def: F
  id: number
  param_shape: arity<undefined>
  output_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(def: F, id: number, param_shape: arity<undefined>, output_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.def = def
    this.id = id
    this.param_shape = param_shape
    this.output_wires = output_wires
  }
}

class Dag<F> {
  nodes: Map<number, DagFunction<F>>
  initial_wires: { from: Selector[], to: SymbolicValue }[]

  constructor(nodes: Map<number, DagFunction<F>>, initial_wires: { from: Selector[], to: SymbolicValue }[]) {
    this.nodes = nodes
    this.initial_wires = initial_wires
  }
}

function computePathArcs<A>(e_tmp: arity<A>): {from: A, to: Selector[]}[] {
  function computePathArcs_rec(e: arity<A>, path: Selector[]): {from: A, to: Selector[]}[] {
    switch (e.type) {
      case 'singleton':
        const arc = { from: e.data, to: path }
        return [arc]
      case 'pair':
        const arcs1 = computePathArcs_rec(e.fst, [...path, 'fst'])
        const arcs2 = computePathArcs_rec(e.snd, [...path, 'snd'])
        return [...arcs1, ...arcs2]
    }
  }
  return computePathArcs_rec(e_tmp, [])
}


function mapArity<A, B>(e: arity<A>, f: (x: A) => B): arity<B> {
  switch (e.type) {
    case 'singleton':
      return { type: 'singleton', data: f(e.data) }
    case 'pair':
      return { type: 'pair', fst: mapArity(e.fst, f), snd: mapArity(e.snd, f) }
  }
}



function evaluateToDAG(e_tmp: norm_no_connections): Dag<SF_fn> {

  const argDatas = new Map<number, arity<SymbolicValue>>()
  const outputDatas = new Map<number, arity<SymbolicValue>>()
  const functions = new Map<number, SF_fn>()

  let inputOutputsData: arity<SymbolicValue> | null = null

  function evaluate(e: norm_no_connections): arity<SymbolicValue> {
    switch(e.type) {

      case 'call': {
        const { def, inData, outData } = e.fn
        const arg = evaluate(e.arg)
        checkConsistent(arg, inData)

        if(argDatas.has(def.uniqueId)) {
          const otherArgs = argDatas.get(def.uniqueId) as arity<SymbolicValue>
          checkArgsSame(arg, otherArgs)
        } else {
          argDatas.set(def.uniqueId, arg)
        }

        const outputs = symbolicValues(outData, def.uniqueId)
        if(outputDatas.has(def.uniqueId)) {
          const otherOutputs = outputDatas.get(def.uniqueId) as arity<SymbolicValue>
          checkArgsSame(outputs, otherOutputs)
        } else {
          outputDatas.set(def.uniqueId, outputs)
        }

        if(functions.has(def.uniqueId)) {
          const fn = functions.get(def.uniqueId) as SF_fn
          if(fn != def) {
            throw new Error("inconsistent function!")
          }
        } else {
          functions.set(def.uniqueId, def)
        }

        return outputs
      }

      case 'input': {
        const arityData = e.data
        const inputOutputs = symbolicValues(arityData, 'input')
        if(inputOutputsData == null) {
          inputOutputsData = inputOutputs
        } else {
          checkArgsSame(inputOutputs, inputOutputsData)
        }
        return inputOutputs
      }

      case 'pair': {
        return { type: 'pair', fst: evaluate(e.fst), snd: evaluate(e.snd)}
      }

      case 'p1': {
        const p = evaluate(e.e)
        switch (p.type) {
          case 'pair':
            return p.fst
          case 'singleton':
            throw new Error("BUG: pair expected (should have been caught be arity checker!)")
        }
      }

      case 'p2': {
        const p = evaluate(e.e)
        switch (p.type) {
          case 'pair':
            return p.snd
          case 'singleton':
            throw new Error("BUG: pair expected (should have been caught be arity checker!)")
        }
      }
    }
  }

  const outValues = evaluate(e_tmp)

  const arcs = Array.from(argDatas.entries()).flatMap(([f_id, arg]) => {
    const arcsTmp = computePathArcs(arg)
    return arcsTmp.map(arc => {
      const dest: SymbolicValue = {fn_id_or_input: f_id, path: arc.to}
      return {
        from: arc.from, 
        to: dest
      }
    })
  })

  const paramShapes = new Map(Array.from(argDatas.entries()).map(([f_id, a]) => {
    return [f_id, mapArity(a, (s) => undefined)]
  }))


  const nodes = new Map(Array.from(functions.entries()).map(([f_id, def]) => {
    const param_shape = paramShapes.get(f_id) as arity<undefined>
    const output_wires = arcs
      .filter(({from, to}) => from.fn_id_or_input == f_id)
      .map(({from, to}) => ({from: from.path, to}))
    
    return [f_id, new DagFunction(def, f_id, param_shape, output_wires)]
  }))

  const initial_wires = arcs
    .filter(({from, to}) => from.fn_id_or_input == 'input')
    .map(({from, to}) => ({from: from.path, to}))

  return new Dag(nodes, initial_wires)
}


type arity<D> = 
  | { type: 'singleton', data: D }
  | { type: 'pair', fst: arity<D>, snd: arity<D> }

type arity_tmp = 
    { type: 'unknown' }
  | { type: 'singleton' }
  | { type: 'pair', fst: arity_tmp, snd: arity_tmp }

const UNK: arity_tmp = { type: 'unknown' }

function minArity(check: arity_tmp): arity<void> {
  switch (check.type) {
    case 'pair':
      return { 
        type: 'pair', 
        fst: minArity(check.fst), 
        snd: minArity(check.snd) 
      }
  
    case 'singleton':
      return { type: 'singleton', data: undefined }
    
    case 'unknown':
      return { type: 'singleton', data: undefined }

    default:
      throw new Error("unknown arity temp: " + check)
  }
}

function analyzeArity_synth(x: normalized<SF_fn, void>, check: arity_tmp): [norm_no_connections, arity<void>] {
  switch (x.type) {
    case 'call':
      const [annArg, arityArg] = analyzeArity_synth(x.arg, UNK)
      const outArity = minArity(check)
      const fn_arity: { def: SF_fn, inData: arity<void>, outData: arity<void> } = 
        { def: x.fn, inData: arityArg, outData: outArity }
      return [
        {type: 'call', fn: fn_arity, arg: annArg}, 
        outArity
      ]
    
    case 'input': {
      const outArity = minArity(check)
      return [{ type: 'input', data: outArity}, outArity]
    }

    case 'p1': {
      const constraint: arity_tmp = { 
        type: 'pair', 
        fst: check, 
        snd: UNK
      }
      const [ann, arr] = analyzeArity_synth(x.e, constraint)
      if(arr.type == 'pair') {
        return [{type: 'p1', e: ann}, arr.fst]
      } else {
        throw new Error("BUG in arity checker (1)")
      }
    }

    case 'p2': {
      const constraint: arity_tmp = { 
        type: 'pair', 
        fst: UNK, 
        snd: check
      }
      const [ann, arr] = analyzeArity_synth(x.e, constraint)
      if(arr.type == 'pair') {
        return [{type: 'p2', e: ann}, arr.snd]
      } else {
        throw new Error("BUG in arity checker (2)")
      }
    }
    
    case 'pair':
      switch (check.type) {
        case 'pair': {
          const [annFst, arityFst] = analyzeArity_synth(x.fst, check.fst)
          const [annSnd, aritySnd] = analyzeArity_synth(x.snd, check.snd)
          return [
            {type: 'pair', fst: annFst, snd: annSnd}, 
            {type: 'pair', fst: arityFst, snd: aritySnd}
          ]
        }

        case 'singleton': {
          throw new Error('Arity error: term is a pair, but a singleton is expected')
        }

        case 'unknown': {
          const [annFst, arityFst] = analyzeArity_synth(x.fst, UNK)
          const [annSnd, aritySnd] = analyzeArity_synth(x.snd, UNK)
          return [
            {type: 'pair', fst: annFst, snd: annSnd}, 
            {type: 'pair', fst: arityFst, snd: aritySnd}
          ]
        } 

        default:
          throw new Error("Unknown check: " + check)
      }
    
    default:
      throw new Error("Unknown exp: " + x)
  }
}

// function analyzeArity_check(x: normalized<SF_fn>): normalized<{ def: F_fn, in: arity, out: arity }> {

// }




type normalized<F, I> = 
    { type: 'call', fn: F, arg: normalized<F, I> } 
  | { type: 'pair', fst: normalized<F, I>, snd: normalized<F, I> } 
  | { type: 'p1', e: normalized<F, I> } 
  | { type: 'p2', e: normalized<F, I> } 
  | { type: 'input', data: I }

function normalize<A, B>(sf: SF<A, B>): normalized<SF_fn, void> {
  const rv = normalize_rec(new Env(), new SF_app(sf._wrapped, new SF_input))
  return read_out_rv(rv)
}

function unwrap_fn(rv: RuntimeValue): SF_fn {
  if(rv instanceof SF_fn) {
    return rv
  } else {
    throw new Error("Expected SF_fn")
  }
}

// function read_out_rv(rv: RuntimeValue): normalized {
//   if(rv instanceof SF_app) {
//     return { type: 'call', fn: unwrap_fn(rv.fn), arg: read_out_rv_p(rv.arg) }
//   } else {
//     throw new Error("Expected SF_app (1)")
//   }
// }

function read_out_rv(rv: RuntimeValue): normalized<SF_fn, void> {
  if(rv instanceof SF_app) {
    return { type: 'call', fn: unwrap_fn(rv.fn), arg: read_out_rv(rv.arg) }
  } else if(rv instanceof SF_pair) {
    return { type: 'pair', fst: read_out_rv(rv.fst), snd: read_out_rv(rv.snd) }
  } else if(rv instanceof SF_input) {
    return { type: 'input', data: undefined }
  } else if(rv instanceof SF_p1) {
    return { type: 'p1', e: read_out_rv(rv.e) }
  } else if(rv instanceof SF_p2) {
    return { type: 'p2', e: read_out_rv(rv.e) }
  } else {
    console.log(rv)
    throw new Error("Expected SF_app or SF_pair or SF_input")
  }
}

function is_neutral(e: SF_core): boolean {
  return (e instanceof SF_input) || (e instanceof SF_fn)
}


type RuntimeValue = Closure | SF_core

class Closure {
  env: Env
  varName: string
  body: SF_core

  constructor(env: Env, varName: string, body: SF_core) {
    this.env = env
    this.varName = varName
    this.body = body
  }
}

class Env {
  map: Map<string, RuntimeValue>
  constructor() {
    this.map = new Map<string, RuntimeValue>()
  }

  get(name: string): RuntimeValue {
    const v = this.map.get(name)
    if (v === undefined) {
      throw new Error(`Variable ${name} not found`)
    } else {
      return v
    }
  }
  
  push(name: string, value: RuntimeValue): Env {
    const e = new Env()
    e.map = new Map(this.map)
    e.map.set(name, value)
    return e
  }
}

import * as util from "util"


function normalize_rec(env: Env, sf: SF_core): RuntimeValue {

  if (sf instanceof SF_app) {
    const fn = normalize_rec(env, sf.fn)
    const arg = normalize_rec(env, sf.arg)
    if (fn instanceof Closure) {
      return normalize_rec(fn.env.push(fn.varName, arg), fn.body)
    } else if(is_neutral(fn)) {
      return new SF_app(fn, arg)
    } else {
      return new SF_app(fn, arg)
      // throw new Error(`Cannot normalize ${sf}. Function is neither a lambda nor a neutral.`)
    }
  } else if (sf instanceof SF_lambda) {
    return new Closure(env, sf.arg, sf.body)
  } else if (sf instanceof SF_var) {
    return env.get(sf.name)
  } else if (sf instanceof SF_input) {
    return sf
  } else if (sf instanceof SF_pair) {
    return new SF_pair(normalize_rec(env, sf.fst), normalize_rec(env, sf.snd))
  } else if (sf instanceof SF_p1) {

    const p = normalize_rec(env, sf.e)
    if (p instanceof SF_pair) {
      return p.fst
    } else if(is_neutral(p)) {
      return new SF_p1(p)
    } else {
      return new SF_p1(p)

      // console.log("bad sf:")
      // console.log(p)
      // throw new Error(`Cannot normalize (p1) ${sf}. Argument is not a pair nor a neutral.`)
    }
  } else if (sf instanceof SF_p2) {
    const p = normalize_rec(env, sf.e)
    if (p instanceof SF_pair) {
      return p.snd
    } else if(is_neutral(p)) {
      return new SF_p2(p)
    } else {
      return new SF_p2(p)
      // throw new Error(`Cannot normalize (p2) ${sf}. Argument is not a pair nor a neutral.`)
    }
  } else if (sf instanceof SF_fn) {
    return sf
  } else {
    console.log(sf)
    throw new Error('Unrecognized sf')
  }
}


export { 
  SF,
  SF_core,
  SF_lambda,
  SF_app,
  SF_p1,
  SF_p2,
  SF_pair,
  SF_fn,
  SF_var,
  Location, 
  LocationConstraint,
  normalize,
  normalized,
  buildDAG
}

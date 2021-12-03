import { SF, SF_fn, SF_input, SF_app, SF_lambda, SF_core, SF_p1, SF_p2, SF_pair, SF_var } from './sf'
import { Dag, DagFunction, Selector, SymbolicValue, Arity, mapArity } from './dag'

function buildDAG<A, B>(sf: SF<A, B>): Dag<SF_fn> {
  const n = normalize(sf)
  const [xArity, outArity] = analyzeArity_synth(n, UNK)
  const g = evaluateToDAG(xArity)
  return g
}




type norm_no_connections = normalized<{ def: SF_fn, inData: Arity<null>, outData: Arity<null> }, Arity<null>>

function symbolicValues(a_tmp: Arity<null>, fn_id_or_input: number | 'input'): Arity<SymbolicValue> {
  function symbolicInputs_rec(a: Arity<null>, path: Selector[]): Arity<SymbolicValue> {
    switch (a.type) {
      case 'singleton':
        return { type: 'singleton', data: {fn_id_or_input, path: path }}
      case 'pair':
        return { type: 'pair', fst: symbolicInputs_rec(a.fst, [...path, 'fst']), snd: symbolicInputs_rec(a.snd, [...path, 'snd']) }
    }
  }

  return symbolicInputs_rec(a_tmp, [])
}


function checkConsistent(arg: Arity<SymbolicValue>, param: Arity<null>) {
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

function checkArgsSame(args1: Arity<SymbolicValue>, args2: Arity<SymbolicValue>) {
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




function computePathArcs<A>(e_tmp: Arity<A>): {from: A, to: Selector[]}[] {
  function computePathArcs_rec(e: Arity<A>, path: Selector[]): {from: A, to: Selector[]}[] {
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




function evaluateToDAG(e_tmp: norm_no_connections): Dag<SF_fn> {

  const argDatas = new Map<number, Arity<SymbolicValue>>()
  const outputDatas = new Map<number, Arity<SymbolicValue>>()
  const functions = new Map<number, SF_fn>()

  let inputOutputsData: Arity<SymbolicValue> | null = null

  function evaluate(e: norm_no_connections): Arity<SymbolicValue> {
    switch(e.type) {

      case 'call': {
        const { def, inData, outData } = e.fn
        const arg = evaluate(e.arg)
        checkConsistent(arg, inData)

        if(argDatas.has(def.uniqueId)) {
          const otherArgs = argDatas.get(def.uniqueId) as Arity<SymbolicValue>
          checkArgsSame(arg, otherArgs)
        } else {
          argDatas.set(def.uniqueId, arg)
        }

        const outputs = symbolicValues(outData, def.uniqueId)
        if(outputDatas.has(def.uniqueId)) {
          const otherOutputs = outputDatas.get(def.uniqueId) as Arity<SymbolicValue>
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
    return [f_id, mapArity(a, (s) => null)]
  }))


  const nodes = new Map(Array.from(functions.entries()).map(([f_id, def]) => {
    const param_shape = paramShapes.get(f_id) as Arity<null>
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




type arity_tmp = 
    { type: 'unknown' }
  | { type: 'singleton' }
  | { type: 'pair', fst: arity_tmp, snd: arity_tmp }

const UNK: arity_tmp = { type: 'unknown' }

function minArity(check: arity_tmp): Arity<null> {
  switch (check.type) {
    case 'pair':
      return { 
        type: 'pair', 
        fst: minArity(check.fst), 
        snd: minArity(check.snd) 
      }
  
    case 'singleton':
      return { type: 'singleton', data: null }
    
    case 'unknown':
      return { type: 'singleton', data: null }

    default:
      throw new Error("unknown arity temp: " + check)
  }
}

function analyzeArity_synth(x: normalized<SF_fn, null>, check: arity_tmp): [norm_no_connections, Arity<null>] {
  switch (x.type) {
    case 'call':
      const [annArg, arityArg] = analyzeArity_synth(x.arg, UNK)
      const outArity = minArity(check)
      const fn_arity: { def: SF_fn, inData: Arity<null>, outData: Arity<null> } = 
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


type normalized<F, I> = 
    { type: 'call', fn: F, arg: normalized<F, I> } 
  | { type: 'pair', fst: normalized<F, I>, snd: normalized<F, I> } 
  | { type: 'p1', e: normalized<F, I> } 
  | { type: 'p2', e: normalized<F, I> } 
  | { type: 'input', data: I }

function normalize<A, B>(sf: SF<A, B>): normalized<SF_fn, null> {
  const rv = normalize_rec(new Env(), new SF_app(sf._wrapped, new SF_input()))
  return read_out_rv(rv)
}

function unwrap_fn(rv: RuntimeValue): SF_fn {
  if(rv instanceof SF_fn) {
    return rv
  } else {
    throw new Error("Expected SF_fn")
  }
}

function read_out_rv(rv: RuntimeValue): normalized<SF_fn, null> {
  if(rv instanceof SF_app) {
    return { type: 'call', fn: unwrap_fn(rv.fn), arg: read_out_rv(rv.arg) }
  } else if(rv instanceof SF_pair) {
    return { type: 'pair', fst: read_out_rv(rv.fst), snd: read_out_rv(rv.snd) }
  } else if(rv instanceof SF_input) {
    return { type: 'input', data: null }
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
  buildDAG
}
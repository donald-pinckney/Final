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

type normalized = { type: 'call', fn: SF_fn, arg: norm_p }
type norm_p = { type: 'call', fn: SF_fn, arg: norm_p } | { type: 'pair', fst: norm_p, snd: norm_p } | { type: 'input' }

function normalize<A, B>(sf: SF<A, B>): normalized {
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

function read_out_rv(rv: RuntimeValue): normalized {
  if(rv instanceof SF_app) {
    return { type: 'call', fn: unwrap_fn(rv.fn), arg: read_out_rv_p(rv.arg) }
  } else {
    throw new Error("Expected SF_app")
  }
}

function read_out_rv_p(rv: RuntimeValue): norm_p {
  if(rv instanceof SF_app) {
    return { type: 'call', fn: unwrap_fn(rv.fn), arg: read_out_rv_p(rv.arg) }
  } else if(rv instanceof SF_pair) {
    return { type: 'pair', fst: read_out_rv_p(rv.fst), snd: read_out_rv_p(rv.snd) }
  } else if(rv instanceof SF_input) {
    return { type: 'input' }
  } else {
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
      throw new Error(`Cannot normalize ${sf}. Function is neither a lambda nor a neutral.`)
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
      throw new Error(`Cannot normalize ${sf}. Argument is not a pair nor a neutral.`)
    }
  } else if (sf instanceof SF_p2) {
    const p = normalize_rec(env, sf.e)
    if (p instanceof SF_pair) {
      return p.snd
    } else if(is_neutral(p)) {
      return new SF_p1(p)
    } else {
      throw new Error(`Cannot normalize ${sf}. Argument is not a pair nor a neutral.`)
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
  normalize
}

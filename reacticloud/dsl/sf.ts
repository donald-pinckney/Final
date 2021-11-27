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
  SF_input,
  Location, 
  LocationConstraint,
}

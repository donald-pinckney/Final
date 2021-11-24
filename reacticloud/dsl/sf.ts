import { RunnableSF, RunnableSF_core } from "../client/deploy"

type SF_core<A, B> =
  | SF_arr<A, B>
  | SF_then<A, B>
  | SF_first<A, B>

type Location = 
  | "client"
  | "cloud"

type LocationConstraint =
  | "unconstrained"
  | Location


class SF<A, B> {
  _wrapped: SF_core<A, B>
  constructor(w: SF_core<A, B>) {
    this._wrapped = w
  }


  static arr<A, B>(f: (x: A) => B, constraint: LocationConstraint = "unconstrained"): SF<A, B> {
    const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`
    const fAsync = eval(fAsyncStr)
    return SF.arrAsync(f, constraint)
  }

  static arrAsync<A, B>(f: (x: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained"): SF<A, B> {
    return new SF(new SF_arr(f, constraint))
  }

  then<C>(next: SF<B, C>): SF<A, C> {
    return new SF(new SF_then<A, C>(this._wrapped, next._wrapped))
  }

  first<C>(): SF<[A, C], [B, C]> {
    return new SF(new SF_first(this._wrapped))
  }

  second<C>(): SF<[C, A], [C, B]> {
    const swap: <X, Y>(x: [X, Y]) => [Y, X] = <X, Y>(x: [X, Y]) => [x[1], x[0]]

    const swap1: SF<[C, A], [A, C]> = SF.arr(swap)
    const swap2: SF<[B, C], [C, B]> = SF.arr(swap)
    return swap1.then(this.first()).then(swap2)
  }

  with<C, D>(other: SF<C, D>): SF<[A, C], [B, D]> {
    const f = this.first<C>()
    const g = other.second<B>()
    return f.then(g)
  }

  and<C>(other: SF<A, C>): SF<A, [B, C]> {
    const copy: SF<A, [A, A]> = SF.arr(x => [x, x])
    return copy.then(this.with(other))
  }

  lift2<C, D>(op: (lhs: B, rhs: C) => D, other: SF<A, C>): SF<A, D> {
    const op_arr = SF.arr((args: [B, C]) => op(args[0], args[1]))
    return this.and(other).then(op_arr)
  }

  subscribe<C>(f: (x: B) => void): SF<A, void> {
    const subArr = SF.arrAsync<B, void>((xx: B, cont: (r: void) => void) => f(xx), "client")
    return this.then(subArr)
  } 
}

var GLOBAL_UNIQUE_ARR_ID = 0

class SF_arr<A, B> {
  fn: (arg: A, cont: (r: B) => void) => void;
  constraint: LocationConstraint
  uniqueId: number

  constructor(f: (arg: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained") {
    this.fn = f
    this.constraint = constraint
    this.uniqueId = GLOBAL_UNIQUE_ARR_ID++
  }
}

class SF_then<A, B> {
  f: SF_core<A, any>
  g: SF_core<any, B>

  constructor(f: SF_core<A, any>, g: SF_core<any, B>) {
    this.f = f
    this.g = g
  }
}

class SF_first<A, B> {
  // A must = (A', C)
  // B must = (B', C)

  // first_sf: SF_core<A', B'>
  // but we can't write this type, so use any instead
  first_sf: SF_core<any, any>

  constructor(first_sf: SF_core<any, any>) {
    this.first_sf = first_sf
  }
}


function evalSF<A, B>(sf: SF<A, B>): RunnableSF<A, B> {
  return evalSF_core(sf._wrapped)
}

function evalSF_core<A, B>(sf: SF_core<A, B>): RunnableSF_core<A, B> {
  if(sf instanceof SF_arr) {
    return x => {
      return new Promise((resolve, reject) => {
        sf.fn(x, r => {
          resolve(r)
        })
      })
    }
  } else if(sf instanceof SF_then) {
    const f = evalSF_core(sf.f)
    const g = evalSF_core(sf.g)
    return x => {
      const fp = f(x)
      return fp.then(y => g(y))
    }
  } else if(sf instanceof SF_first) {
    // first: RunnableSF<A', B'>
    const first = evalSF_core(sf.first_sf)
    return (ac: any) => {
      // ac: [A', C]
      // return: Promise<[B', C]>

      // first_p: Promise<B'>
      const first_p = first(ac[0])

      // prom: Promise<[B', C]>
      const prom: Promise<B> = first_p.then(b => [b, ac[1]]) as Promise<B>
      return prom
    }
  } else {
    throw new Error("Unknown SF: " + sf)
  }
}

export { SF, SF_core, SF_arr, SF_then, SF_first, Location, LocationConstraint }

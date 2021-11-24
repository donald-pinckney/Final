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

var GLOBAL_UNIQUE_ARR_ID = 0

function getFreshArrId() {
  return GLOBAL_UNIQUE_ARR_ID++
}



function arr<A, B>(f: (x: A) => B, constraint: LocationConstraint = "unconstrained"): SF_core<A, B> {
  if(constraint == "client") {
    const fAsync = (x: A, cont: (r: B) => void) => cont(f(x))
    return arrAsync(fAsync, constraint)
  } else {
    const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`
    const fAsync = eval(fAsyncStr)
    return arrAsync(fAsync, constraint)
  }
}

function arrAsync<A, B>(f: (x: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained"): SF_core<A, B> {
  return new SF_arr(f, constraint)
}

function then<A, B, C>(f: SF_core<A, B>, g: SF_core<B, C>): SF_core<A, C> {
  return new SF_then<A, C>(f.freshCopy(), g.freshCopy())
}

function first<A, B, C>(f: SF_core<A, B>): SF_core<[A, C], [B, C]> {
  return new SF_first(f.freshCopy())
}

function second<A, B, C>(f: SF_core<A, B>): SF_core<[C, A], [C, B]> {
  const swap: <X, Y>(x: [X, Y]) => [Y, X] = <X, Y>(x: [X, Y]) => [x[1], x[0]]

  const swap1: SF_core<[C, A], [A, C]> = arr(swap)
  const swap2: SF_core<[B, C], [C, B]> = arr(swap)
  return then(swap1, then(first(f), swap2))
}

function parallel<A, B, C, D>(f: SF_core<A, B>, g: SF_core<C, D>): SF_core<[A, C], [B, D]> {
  const ff: SF_core<[A, C], [B, C]> = first(f)
  const gg: SF_core<[B, C], [B, D]> = second(g)
  return then(ff, gg)
}

function and<A, B, C>(f: SF_core<A, B>, other: SF_core<A, C>): SF_core<A, [B, C]> {
  const copy: SF_core<A, [A, A]> = arr(x => [x, x])
  return then(copy, parallel(f, other))
}

function lift2<A, B, C, D>(f: SF_core<A, B>, op: (lhs: B, rhs: C) => D, other: SF_core<A, C>): SF_core<A, D> {
  const op_arr = arr((args: [B, C]) => op(args[0], args[1]))
  return then(and(f, other), op_arr)
}

function subscribe<A, B>(f: SF_core<A, B>, subFun: (x: B) => void): SF_core<A, void> {
  const subArr = arrAsync<B, void>((xx: B, cont: (r: void) => void) => subFun(xx), "client")
  return then(f, subArr)
}




class SF_arr<A, B> {
  fn: (arg: A, cont: (r: B) => void) => void;
  constraint: LocationConstraint
  uniqueId: number

  constructor(f: (arg: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained") {
    this.fn = f
    this.constraint = constraint
    this.uniqueId = getFreshArrId()
  }

  freshCopy(): SF_arr<A, B> {
    return new SF_arr(this.fn, this.constraint)
  }
}

class SF_then<A, B> {
  f: SF_core<A, any>
  g: SF_core<any, B>

  constructor(f: SF_core<A, any>, g: SF_core<any, B>) {
    this.f = f
    this.g = g
  }

  freshCopy(): SF_then<A, B> {
    return new SF_then(this.f.freshCopy(), this.g.freshCopy())
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

  freshCopy(): SF_first<A, B> {
    return new SF_first(this.first_sf.freshCopy())
  }
}


// function evalSF<A, B>(sf: SF<A, B>): RunnableSF<A, B> {
//   return evalSF_core(sf._wrapped)
// }

// function evalSF_core<A, B>(sf: SF_core<A, B>): RunnableSF_core<A, B> {
//   if(sf instanceof SF_arr) {
//     return x => {
//       return new Promise((resolve, reject) => {
//         sf.fn(x, r => {
//           resolve(r)
//         })
//       })
//     }
//   } else if(sf instanceof SF_then) {
//     const f = evalSF_core(sf.f)
//     const g = evalSF_core(sf.g)
//     return x => {
//       const fp = f(x)
//       return fp.then(y => g(y))
//     }
//   } else if(sf instanceof SF_first) {
//     // first: RunnableSF<A', B'>
//     const first = evalSF_core(sf.first_sf)
//     return (ac: any) => {
//       // ac: [A', C]
//       // return: Promise<[B', C]>

//       // first_p: Promise<B'>
//       const first_p = first(ac[0])

//       // prom: Promise<[B', C]>
//       const prom: Promise<B> = first_p.then(b => [b, ac[1]]) as Promise<B>
//       return prom
//     }
//   } else {
//     throw new Error("Unknown SF: " + sf)
//   }
// }

export { 
  SF_core, 
  SF_arr, 
  SF_then, 
  SF_first, 
  Location, 
  LocationConstraint,
  arr,
  arrAsync,
  then,
  first,
  second,
  parallel,
  and,
  lift2,
  subscribe
}

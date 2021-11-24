import { RunnableSF, RunnableSF_core } from "../client/deploy"

class SF_core<A, B> {
  freshCopy(): SF_core<A, B> {
    throw new Error("freshCopy not implemented")
  }

  inArity(): number {
    throw new Error("inArity not implemented")
  }

  outArity(): number {
    throw new Error("outArity not implemented")
  }
}

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



function arr<A, B>(f: (x: A) => B, constraint: LocationConstraint = "unconstrained"): SF_core<[A], [B]> {
  if(constraint == "client") {
    const fAsync = (x: A, cont: (r: B) => void) => cont(f(x))
    return arrAsync(fAsync, constraint)
  } else {
    const fAsyncStr = `(_arg, cont) => cont((${f.toString()})(_arg))`
    const fAsync = eval(fAsyncStr)
    return arrAsync(fAsync, constraint)
  }
}

function arrAsync<A, B>(f: (x: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained"): SF_core<[A], [B]> {
  return new SF_arr(f, constraint)
}

function then<A, B, C>(f: SF_core<A, B>, g: SF_core<B, C>): SF_core<A, C> {
  return new SF_then<A, B, C>(f.freshCopy(), g.freshCopy())
}

function first1<A extends Array<any>, B extends Array<any>, C>(f: SF_core<A, B>): SF_core<[...A, C], [...B, C]> {
  const stuff: SF_core<[...A, C], [...B, C]> = new SF_first<A, B, C>(f.freshCopy())
  return stuff
}

function first<A extends Array<any>, B extends Array<any>, C extends Array<any>>(f: SF_core<A, B>, passthrough: number): SF_core<[...A, ...C], [...B, ...C]> {
  let final = f
  for(let i = 0; i < passthrough; i++) {
    final = first1(final)
  }
  return final
}

function second1<A extends Array<any>, B extends Array<any>, C>(f: SF_core<A, B>): SF_core<[C, ...A], [C, ...B]> {
  // extra is at index 0, args are at index [1, f.inArity()]
  // we want to move extra to be at index f.inArity(), and args to be at index [0, f.inArity()-1]
  
  const perm1: Map<number, number> = new Map<number, number>()
  perm1.set(0, f.inArity())
  for(let i = 1; i <= f.inArity(); i++) {
    perm1.set(i, i-1)
  }

  const permArr1 = permute<[C, ...A], [...A, C]>(perm1)
  const ff = first1<A, B, C>(f)
  const swapThenF = then(permArr1, ff)

  // extra is at index f.outArity(), results are at index [0, f.outArity()-1]
  // we want to move extra to be at index 0, and results to be at index [1, f.outArity()]

  const perm2: Map<number, number> = new Map<number, number>()
  perm2.set(f.outArity(), 0)
  for(let i = 0; i <= f.outArity()-1; i++) {
    perm2.set(i, i+1)
  }

  const permArr2 = permute<[...B, C], [C, ...B]>(perm2)

  const final = then(swapThenF, permArr2)
  return final
}

function second<A extends Array<any>, B extends Array<any>, C extends Array<any>>(f: SF_core<A, B>, passthrough: number): SF_core<[...C ,...A], [...C, ...B]> {
  let final = f
  for(let i = 0; i < passthrough; i++) {
    final = second1(final)
  }
  return final
}

function parallel<A extends Array<any>, B extends Array<any>, C extends Array<any>, D extends Array<any>>(f: SF_core<A, B>, g: SF_core<C, D>): SF_core<[...A, ...C], [...B, ...D]> {
  const ff: SF_core<[...A, ...C], [...B, ...C]> = first(f, g.inArity())
  const gg: SF_core<[...B, ...C], [...B, ...D]> = second(g, f.outArity())
  return then(ff, gg)
}

function and<A, B extends Array<any>, C extends Array<any>>(f: SF_core<[A], B>, other: SF_core<[A], C>): SF_core<[A], [...B, ...C]> {
  const copy: SF_core<[A], [[A, A]]> = arr((x: A) => [x, x])
  const theSplit = split<A, A>()
  const par = parallel(f, other)
  return then(copy, then(theSplit, par))
}


function lift2<A, B, C, D>(f: SF_core<[A], [B]>, op: (xy: [B, C]) => D, other: SF_core<[A], [C]>): SF_core<[A], [D]> {
  const theAnd = and(f, other)
  const j = join<B, C>()
  const op_arr = arr(op)
  return then(theAnd, then(j, op_arr))
}

function subscribe<A, B>(f: SF_core<A, [B]>, subFun: (x: B) => void): SF_core<A, [void]> {
  const subArr = arrAsync<B, void>((xx: B, cont: (r: void) => void) => subFun(xx), "client")
  return then(f, subArr)
}



function permute<AS extends Array<any>, BS extends Array<any>>(perm: Map<number, number>): SF_core<AS, BS> {
  return new SF_permute<AS, BS>(perm)
}

function split<A, B>(): SF_core<[[A, B]], [A, B]> {
  return new SF_split<A, B>()
}

function join<A, B>(): SF_core<[A, B], [[A, B]]> {
  return new SF_join<A, B>()
}



class SF_arr<A, B> extends SF_core<[A], [B]> {
  fn: (arg: A, cont: (r: B) => void) => void;
  constraint: LocationConstraint
  uniqueId: number

  constructor(f: (arg: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained") {
    super()
    this.fn = f
    this.constraint = constraint
    this.uniqueId = getFreshArrId()
  }

  freshCopy(): SF_arr<A, B> {
    return new SF_arr(this.fn, this.constraint)
  }

  inArity(): number {
    return 1
  }

  outArity(): number {
    return 1
  }
}

class SF_then<A, B, C> extends SF_core<A, C> {
  f: SF_core<A, B>
  g: SF_core<B, C>

  constructor(f: SF_core<A, B>, g: SF_core<B, C>) {
    super()
    if(f.outArity() != g.inArity()) {
      throw new Error("Arity mismatch")
    }
    this.f = f
    this.g = g
  }

  freshCopy(): SF_core<A, C> {
    return new SF_then(this.f.freshCopy(), this.g.freshCopy())
  }

  inArity(): number {
    return this.f.inArity()
  }

  outArity(): number {
    return this.g.outArity()
  }
}

class SF_first<A extends Array<any>, B extends Array<any>, C> extends SF_core<[...A, C], [...B, C]> {
  first_sf: SF_core<A, B>

  constructor(first_sf: SF_core<A, B>) {
    super()
    this.first_sf = first_sf
  }

  freshCopy(): SF_core<[...A, C], [...B, C]> {
    return new SF_first(this.first_sf.freshCopy())
  }

  inArity(): number {
    return this.first_sf.inArity() + 1
  }

  outArity(): number {
    return this.first_sf.outArity() + 1
  }
}

class SF_permute<A extends Array<any>, B extends Array<any>> extends SF_core<A, B> {
  perm: Map<number, number>
  constructor(perm: Map<number, number>) {
    super()
    this.perm = perm
  }

  freshCopy(): SF_core<A, B> {
    return new SF_permute(this.perm)
  }

  inArity(): number {
    return this.perm.size
  }

  outArity(): number {
    return this.perm.size
  }
}

class SF_split<A, B> extends SF_core<[[A, B]], [A, B]> {
  constructor() {
    super()
  }

  freshCopy(): SF_core<[[A, B]], [A, B]> {
    return new SF_split()
  }

  inArity(): number {
    return 1
  }

  outArity(): number {
    return 2
  }
}


class SF_join<A, B> extends SF_core<[A, B], [[A, B]]> {
  constructor() {
    super()
  }

  freshCopy(): SF_core<[A, B], [[A, B]]> {
    return new SF_join()
  }

  inArity(): number {
    return 2
  }

  outArity(): number {
    return 1
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
  SF_permute,
  SF_split,
  SF_join,
  Location, 
  LocationConstraint,
  arr,
  arrAsync,
  then,
  first1,
  first,
  second1,
  second,
  permute,
  parallel,
  and,
  lift2,
  join,
  split,
  subscribe
}

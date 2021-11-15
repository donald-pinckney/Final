
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

class SF_arr<A, B> {
  private fn: (arg: A, cont: (r: B) => void) => void;

  constructor(f: (arg: A, cont: (r: B) => void) => void, constraint: LocationConstraint = "unconstrained") {
    this.fn = f
  }
}

class SF_then<A, B> {
  private f: SF_core<A, any>
  private g: SF_core<any, B>

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
  private first_sf: SF_core<any, any>

  constructor(first_sf: SF_core<any, any>) {
    this.first_sf = first_sf
  }
}

export { SF, SF_arr, SF_then, SF_first }

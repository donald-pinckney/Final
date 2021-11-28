import { SF, SF_core } from "../dsl/sf"
import { deploy } from "../client/deploy"

import * as util from "util"

const f0 = SF.arr((x: number) => x + 100)
const f1 = SF.arr((x: number) => x + 5)
const f2 = SF.arr((x: number) => x * 2)
const theAnd = f1.and(f2)
const after: SF<[number, number], [number, number]> = SF.arr(([x, y]: [number, number]) => [x + y, x * y])
const f3 = f0.then(theAnd).then(after).then(SF.p1())
// const getFirst = SF.p1()



// const f0: SF<number, [number, number]> = SF.arr((x: number) => [x, x + 1])
// const f3 = f0.then(SF.p1())

// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
// const chain = f3.subscribe(console.log)

// console.log(chain)

// []             (lambda x1 . (lambda x0 . p1 x0) (f0 x1)) i

// [x1 => i]      (lambda x0 . p1 x0) (f0 x1)

// [x1 => i, x0 => f0 i]     p1 x0

deploy("localhost", 3000, f3).then(runnable => {
  runnable(42)
})


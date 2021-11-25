import { SF, SF_core } from "../dsl/sf"
import { deploy } from "../client/deploy"

import * as util from "util"

const f1 = SF.arr((x: number) => x + 5)
const f2 = SF.arr((x: number) => x * 2)
const theAnd = f1.and(f2)
const after = SF.arr(([x, y]: [number, number]) => x + y)
const f3 = theAnd.then(after)


// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
const chain = f3.subscribe(console.log)

// console.log(chain)


deploy(chain).then(runnable => {
  runnable(42)
})


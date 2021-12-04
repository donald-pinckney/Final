import { SF, SF_core } from "../../dsl/sf"
import { deploy } from "../../client/deploy"

import * as util from "util"

const int1 = SF.arr((x: string) => parseInt(x))
const int2 = SF.arr((x: string) => parseInt(x))
const adder = SF.arr(([x, y]: [number, number]) => x + y)
const stringOut = SF.arr((x: number) => x.toString())

const final_sf = int1.parallel(int2)
  .then(adder)
  .then(stringOut)
  .subscribe(answer => {
    console.log(answer)
  })
  
const cliArgs = process.argv.slice(2)
if(cliArgs.length != 2) {
  console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`)
  process.exit(1)
}
const address = cliArgs[0]
const port = parseInt(cliArgs[1])


deploy(address, port, final_sf).then(runnable => {
  runnable(['3', '4'])
})


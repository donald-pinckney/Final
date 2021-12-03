import { SF, SF_core } from "../../dsl/sf"
import { deploy } from "../../client/deploy"

import * as util from "util"

const f0 = SF.arr((x: number) => x + 100, 'client')
const f1 = SF.arr((x: number) => x * 5, 'client')
const f2 = SF.arr((x: number) => x - 2, 'client')
const final_sf = f0.then(f1).then(f2).subscribe(output => console.log('Output: ' + output))

const cliArgs = process.argv.slice(2)
if(cliArgs.length != 2) {
  console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`)
  process.exit(1)
}
const address = cliArgs[0]
const port = parseInt(cliArgs[1])


deploy(address, port, final_sf).then(runnable => {
  runnable(42)
})


import { SF, SF_core } from "../../dsl/sf"
import { deploy } from "../../client/deploy"

import * as util from "util"

const f0 = SF.arr((x: number) => x + 100)

const f1: SF<number, number> = SF.arrAsync((x: number, done) => {
  const answer = x * 5
  setTimeout(() => {
    done(answer)
  }, 5000);
})

const f2: SF<number, string> = SF.arrAsync((x: number, done) => {
  const answer = x.toString()
  setTimeout(() => {
    done(answer)
  }, 5000);
})


const final_sf = f0
  .then(f1.lift2(([x, y]) => `x=${x}, y=${y}`, f2))
  .subscribe(output => console.log('Output: ' + output))


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


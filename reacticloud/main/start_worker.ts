import { Worker } from "../cloud/worker";

const cliArgs = process.argv.slice(2)
if(cliArgs.length != 2) {
  console.log(`Usage: node out/main/start_worker.js [orchestrator address] [orchestrator port]`)
  process.exit(1)
}
const address = cliArgs[0]
const port = parseInt(cliArgs[1])
const worker = new Worker(address, port)

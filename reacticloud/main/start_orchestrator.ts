import { Orchestrator } from "../cloud/orchestrator";


const cliArgs = process.argv.slice(2)
if(cliArgs.length != 1) {
  console.log(`Usage: node out/main/start_orchestrator.js [listening port]`)
  process.exit(1)
}
const port = parseInt(cliArgs[0])

const orchestrator = new Orchestrator()
orchestrator.listen(port)
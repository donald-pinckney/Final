import { SF } from "../dsl/lib"


type DeployedSF<A, B> = (x: A, done: (r: B) => void) => void

function deploy<A, B>(f: SF<A, B>, deploy_ok: (d: DeployedSF<A, B>) => void): void {
  const deployed = (x: A, cont: (r: B) => void) => {
    cont(1234 as any) 
  }
  
  deploy_ok(deployed)
}

export { deploy, DeployedSF }



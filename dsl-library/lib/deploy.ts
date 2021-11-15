import { SF } from "./sf"



function deploy<A, B>(f: SF<A, B>): (x: A, cont: (r: B) => void) => void  {
  const deployed = (x: A, cont: (r: B) => void) => {
    cont(1234 as any) 
  }
  return deployed
}

export { deploy }



import { SF_core, 
  SF_arr, 
  SF_then, 
  SF_first, 
  Location, 
  LocationConstraint,
  arr,
  arrAsync,
  then,
  first,
  second,
  parallel,
  and,
  lift2,
  subscribe, 
  deploy, 
  RunnableSF 
} from "../client/lib"


const f1: SF_core<number, number> = arr((x: number) => x + 5)
const f2: SF_core<number, number> = arr((x: number) => x * 2)
const f3 = then(and(f1, f2), arr(([x, y]: [number, number]) => x + y))


// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
const chain = subscribe(f3, console.log)

deploy(chain).then(runnable => {
  runnable(42)
})


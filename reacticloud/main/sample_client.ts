import { 
  SF_core, 
  SF_arr, 
  SF_then, 
  SF_first, 
  SF_permute,
  SF_split,
  SF_join,
  Location, 
  LocationConstraint,
  arr,
  arrAsync,
  then,
  first1,
  first,
  second1,
  second,
  permute,
  parallel,
  and,
  lift2,
  join,
  split,
  subscribe, 
  deploy, 
  RunnableSF 
} from "../client/lib"


const f1 = arr((x: number) => x + 5)
const f2 = arr((x: number) => x * 2)
const both = and(f1, f2)
const j = join<number, number>()
const after = arr(([x, y]: [number, number]) => x + y)

const f3 = then(both, then(j, after))


// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
const chain = subscribe(f3, console.log)

deploy(chain).then(runnable => {
  runnable([42])
})


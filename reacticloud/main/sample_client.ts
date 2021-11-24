import { SF, deploy, RunnableSF } from "../client/lib"

const f1: SF<number, number> = SF.arr((x: number) => x + 5)
const f2: SF<number, number> = SF.arr((x: number) => x * 2)
const f3 = f1.and(f2).then(SF.arr(([x, y]: [number, number]) => x + y))


// const f2 = SF.arr((x: number) => x.toString())
// const arr_log = SF.arr(x => console.log(x))
const chain = f3.subscribe(console.log)

deploy(chain).then(runnable => {
  runnable(42)
})


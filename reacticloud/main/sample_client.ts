import { SF, deploy, RunnableSF } from "../client/lib"

const f1: SF<number, number> = SF.arr((x: number) => x + 5)
const f2 = SF.arr((x: number) => x.toString())
const arr_log = SF.arr(console.log)
const chain = f1.then(f2).subscribe(console.log)

deploy(chain).then(runnable => {
  runnable(42)
})


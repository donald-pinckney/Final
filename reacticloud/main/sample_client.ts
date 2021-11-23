import { SF, deploy, RunnableSF } from "../client/lib"

const f1: SF<number, number> = SF.arr((x: number) => x + 5)
const f2 = SF.arr((x: number) => x.toString())
const both = f1.then(f2)

deploy(both).then(runnable => {
  runnable(42).then(r => {
    console.log(r)
  })
})


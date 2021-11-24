// import { SF, deploy, RunnableSF } from "../client/lib"

// function runExamples() {
//   const f11: SF<number, number> = SF.arr((x: number) => x + 5)
//   const f2 = SF.arr((x: number) => x.toString())


//   const f3 = SF.arr((x: string) => x.toString())

//   const g1 = f11.then(f2)
//   // const g2 = f11.then(f3)


//   const q = f2.first<boolean>()

//   const combine = SF.arr((x: [string, boolean]) => x[1])

//   const all = q.then(combine)


//   console.log("hi!")
//   // const d = deploy(g1, d => {
//   //   d(4, (r) => console.log(r))
//   // })

  
// }



// const f_add5 = SF.arr((x: number) => x + 5)
// const f_str = SF.arr((x: number) => x.toString())
// const f_both = f_add5.then(f_str)


// export { runExamples }
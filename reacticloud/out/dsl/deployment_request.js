"use strict";
// import { normalized } from "./sf"
Object.defineProperty(exports, "__esModule", { value: true });
// function deploymentRequestForSF(e: normalized): request<string> {
//   throw new Error("TODO")
//   // const req_fn: request_fn<string> = 
//   //   e.fn.constraint == 'client' ?
//   //   { constraint: 'client', uniqueId: e.fn.uniqueId } :
//   //   { constraint: e.fn.constraint, uniqueId: e.fn.uniqueId, fn: e.fn.fn.toString() }
//   // return { 
//   //   type: 'call', 
//   //   fn: req_fn, 
//   //   arg: deploymentRequestForSF_rec(e.arg)
//   // }
// }
// function deploymentRequestForSF_rec(e: normalized): request_p<string> {
//   if(e.type == 'call') {
//     const req_fn: request_fn<string> = 
//       e.fn.constraint == 'client' ?
//       { constraint: 'client', uniqueId: e.fn.uniqueId } :
//       { constraint: e.fn.constraint, uniqueId: e.fn.uniqueId, fn: e.fn.fn.toString() }
//     return { type: 'call', fn: req_fn, arg: deploymentRequestForSF_rec(e.arg) }
//   } else if(e.type == "pair") {
//     return { type: 'pair', fst: deploymentRequestForSF_rec(e.fst), snd: deploymentRequestForSF_rec(e.snd) }
//   } else if(e.type == "input") {
//     return { type: 'input' }
//   } else {
//     throw new Error(`Error: unknown type: ${e}`)
//   }
// }
function deserialize(serialized) {
    throw new Error('todo');
    // if(serialized.type == "arr") {
    //   let constraintAndCode: ConstraintAndFn<A, B> =
    //     serialized.constraint.constraint == "client" ?
    //     { constraint: "client" } :
    //     { fn: eval(serialized.constraint.fn_src), constraint: serialized.constraint.constraint }
    //   return new SF_deployment_request_arr(serialized.uniqueId, constraintAndCode)
    // } else if(serialized.type == "then") {
    //   return new SF_deployment_request_then(deserialize(serialized.f), deserialize(serialized.g))
    // } else if(serialized.type == "first") {
    //   return new SF_deployment_request_first(deserialize(serialized.first_sf))
    // } else {
    //   throw new Error(`Error: unknown serialized type: ${serialized}`)
    // }
}
//# sourceMappingURL=deployment_request.js.map
import { SF, SF_core } from "../../dsl/sf"
import { deploy } from "../../client/deploy"
import { parse as parse_csv } from 'csv-parse/sync'
// import fetch from 'node-fetch'

const fetch = require('node-fetch')

const plot = require('../plot_helper.js')

import * as util from "util"

const cliArgs = process.argv.slice(2)
if(cliArgs.length != 2) {
  console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`)
  process.exit(1)
}
const address = cliArgs[0]
const port = parseInt(cliArgs[1])




const getCSVStr = SF.arrAsync((url: string, done: (r: string) => void) => {
  fetch(url).then((response: Response) => response.text()).then((textBody: string) => done(textBody))
}, 'cloud')

const csvParse = SF.arr((csv: string) => parse_csv(csv, {columns: true, skip_empty_lines: true}) as any[], 'client')

const extractColumns = SF.arr(([data, [x_col, y_col]]: [any[], [string, string]]) => {
  const xs = data.map((record: any) => {
    return record[x_col] as number
  })
  const ys = data.map((record: any) => {
    return record[y_col] as number
  })
  const pair: [number[], number[]] = [xs, ys]
  return pair
}, 'client')

const makePlot = SF.arrAsync(([[xs, ys], [x_name, y_name]]: [[number[], number[]], [string, string]], done: (r: string) => void) => {
  plot([2, 3, 4], [3, 5, 2], 'X axis', 'Y axis', 400, 400, (buffer: string) => {
    done(buffer)
  })
}, 'client')

const final_sf = getCSVStr
  .then(csvParse)
  .first<[string, string]>()
  .then(extractColumns.and(SF.p2()))
  .then(makePlot)
  .subscribe(imageData => {
    console.log(imageData)
  })


deploy(address, port, final_sf).then(runnable => {
  runnable(
    ['https://gist.githubusercontent.com/donald-pinckney/6bf75b5ec7ac8a24cfd1dd9f2ac839af/raw/7efc3ada1fea6395b79b580f544c916421af11a3/cali.csv', 
    ['HouseAge', 'AveOccup']])
})


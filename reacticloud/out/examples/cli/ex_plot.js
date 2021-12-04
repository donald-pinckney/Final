"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sf_1 = require("../../dsl/sf");
const deploy_1 = require("../../client/deploy");
const sync_1 = require("csv-parse/sync");
// import fetch from 'node-fetch'
const fetch = require('node-fetch');
const plot = require('../plot_helper.js');
const cliArgs = process.argv.slice(2);
if (cliArgs.length != 2) {
    console.log(`Usage: node out/[this path].js [orchestrator address] [orchestrator port]`);
    process.exit(1);
}
const address = cliArgs[0];
const port = parseInt(cliArgs[1]);
const getCSVStr = sf_1.SF.arrAsync((url, done) => {
    fetch(url).then((response) => response.text()).then((textBody) => done(textBody));
}, 'cloud');
const csvParse = sf_1.SF.arr((csv) => (0, sync_1.parse)(csv, { columns: true, skip_empty_lines: true }), 'client');
const extractColumns = sf_1.SF.arr(([data, [x_col, y_col]]) => {
    const xs = data.map((record) => {
        return record[x_col];
    });
    const ys = data.map((record) => {
        return record[y_col];
    });
    const pair = [xs, ys];
    return pair;
}, 'client');
const makePlot = sf_1.SF.arrAsync(([[xs, ys], [x_name, y_name]], done) => {
    plot([2, 3, 4], [3, 5, 2], 'X axis', 'Y axis', 400, 400, (buffer) => {
        done(buffer);
    });
}, 'client');
const final_sf = getCSVStr
    .then(csvParse)
    .first()
    .then(extractColumns.and(sf_1.SF.p2()))
    .then(makePlot)
    .subscribe(imageData => {
    console.log(imageData);
});
(0, deploy_1.deploy)(address, port, final_sf).then(runnable => {
    runnable(['https://gist.githubusercontent.com/donald-pinckney/6bf75b5ec7ac8a24cfd1dd9f2ac839af/raw/7efc3ada1fea6395b79b580f544c916421af11a3/cali.csv',
        ['HouseAge', 'AveOccup']]);
});
//# sourceMappingURL=ex_plot.js.map
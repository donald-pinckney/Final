// import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
// import { ChartConfiguration } from 'chart.js';

// import * as fs from 'fs'

function makePlotCloud(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done, chartjs_node) {
	const dataPoints = data_x.map((x, i) => {
		const y = data_y[i]
		return {x, y}
	})

	
	const ChartJSNodeCanvas = chartjs_node.ChartJSNodeCanvas


	const configuration = {
		data: {
			datasets: [{
				label: 'Label',
				backgroundColor: 'rgb(255, 99, 132)',
				data: dataPoints
			}]
		},
		type: "scatter",
		options: {
			devicePixelRatio: 1,
			scales: {
				x: {
					title: {
						display: true,
						text: x_name,
					}
				},
				y: {
					title: {
						display: true,
						text: y_name,
					}
				}
			},
			plugins: {
				legend: {
					display: false,
				}
			}
		}
	}

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: plotWidth, height: plotHeight, chartCallback: chartCallback });

	chartJSNodeCanvas.renderToDataURL(configuration).then(buffer => done(buffer))
}


function makePlotBrowser(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done) {	
	const canvas = document.createElement('canvas');
	canvas.width = plotWidth;
	canvas.height = plotHeight;

	canvas.style.display = 'none'
	document.body.appendChild(canvas)

	// Get the drawing context
	const ctx = canvas.getContext('2d');

	let finished_draw = false


	const dataPoints = data_x.map((x, i) => {
		const y = data_y[i]
		return {x, y}
	})

	const myLine = new plotjs.Chart(ctx, {
		data: {
			datasets: [{
				label: 'Label',
				backgroundColor: 'rgb(255, 99, 132)',
				data: dataPoints
			}]
		},
		type: "scatter",
		options: {
			devicePixelRatio: 1,
			animation: {
				duration: 0,
				onComplete: function() {
					if(finished_draw == false) { // this.width == plotWidth && 
						finished_draw = true
						const url = this.toBase64Image();
						// const url = this.toBase64Image();
						document.body.removeChild(canvas)
						done(url)
					}
				}
			},
			scales: {
				x: {
					title: {
						display: true,
						text: x_name,
					}
				},
				y: {
					title: {
						display: true,
						text: y_name,
					}
				}
			},
			plugins: {
				legend: {
					display: false,
				}
			}
		}
	});

	myLine.resize(plotWidth, plotHeight)
}


function makePlot(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done) {
	if(typeof window === 'undefined') {
		const chartjs_node = require('chartjs-node-canvas')
		makePlotCloud(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done, chartjs_node)
	} else {
		makePlotBrowser(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done)
	}
}

module.exports = makePlot

// import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
// import { ChartConfiguration } from 'chart.js';

// import * as fs from 'fs'

function makePlotCloud(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done, chartjs_node) {
	const dataPoints = data_x.map((x, i) => {
		const y = data_y[i]
		return {x, y}
	})

	
	const ChartJSNodeCanvas = chartjs_node.ChartJSNodeCanvas

	// const configuration = {
	// 	type: 'bar',
	// 	data: {
	// 		labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
	// 		datasets: [{
	// 			label: '# of Votes',
	// 			data: [12, 19, 3, 5, 2, 3],
	// 			backgroundColor: [
	// 				'rgba(255, 99, 132, 0.2)',
	// 				'rgba(54, 162, 235, 0.2)',
	// 				'rgba(255, 206, 86, 0.2)',
	// 				'rgba(75, 192, 192, 0.2)',
	// 				'rgba(153, 102, 255, 0.2)',
	// 				'rgba(255, 159, 64, 0.2)'
	// 			],
	// 			borderColor: [
	// 				'rgba(255,99,132,1)',
	// 				'rgba(54, 162, 235, 1)',
	// 				'rgba(255, 206, 86, 1)',
	// 				'rgba(75, 192, 192, 1)',
	// 				'rgba(153, 102, 255, 1)',
	// 				'rgba(255, 159, 64, 1)'
	// 			],
	// 			borderWidth: 1
	// 		}]
	// 	},
	// 	options: {
	// 	},
	// 	plugins: [{
	// 		id: 'background-colour',
	// 		beforeDraw: (chart) => {
	// 			const ctx = chart.ctx;
	// 			ctx.save();
	// 			ctx.fillStyle = 'white';
	// 			ctx.fillRect(0, 0, width, height);
	// 			ctx.restore();
	// 		}
	// 	}]
	// };

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
			animation: {
				duration: 0,
				onComplete: function() {
					if(this.width == plotWidth && finished_draw == false) {
						finished_draw = true
						const url = this.toBase64Image();
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
	try {
		const chartjs_node = require('chartjs-node-canvas')
		makePlotCloud(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done, chartjs_node)
	} catch (err) {
		makePlotBrowser(data_x, data_y, x_name, y_name, plotWidth, plotHeight, done)
	}
}

module.exports = makePlot

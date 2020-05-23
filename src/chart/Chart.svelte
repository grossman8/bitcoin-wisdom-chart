<!-- <svelte:options tag="wisdom-chart"></svelte:options> -->

<script>
  import { onMount } from 'svelte'
  import { TimeSeriesChart } from './timeseries.js'
  import { DrawingsLayer } from './drawings.js'
  import { LiveChart } from './live_chart.js'
  import * as d3 from 'd3'

  let chart,
    drawings,
    live_chart;

  export const setData = (series) => {
    chart.setData(series)
    chart.draw({x: 0})
  }

  export const addTrade = (...args) => {
    live_chart.addTrade.apply(live_chart, args)
  }

  export const draw = () => {
    chart.draw({x: 0 })
  }

  onMount(async () => {
    chart  = new TimeSeriesChart(window, d3.select('#scatter-container'), {
      width: 1000,
      height: 800,
      zoom_levels: [2, 4, 5, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
      zoom_level: 3
    })
    drawings = new DrawingsLayer(chart)
    live_chart = new LiveChart(chart)
  })

</script>

<div id="scatter-container"></div>


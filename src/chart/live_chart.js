import throttle from 'lodash-es/throttle'

export class LiveChart {
  constructor(chart){
    this.chart = chart

    this.chart.on('setdata', () => {
      this.setCandleCloseInterval()
    })

    this.candle_close_interval;
    this.setup_interval_timeout;
    this.candle_timeframe = 0

    this.throttled_redraw = throttle(()=>{
      this.chart.redraw()
    }, 500)

  }

  setCandleCloseInterval() {
    clearInterval(this.candle_close_interval)
    clearTimeout(this.setup_interval_timeout)
    let t = new Date().getTime()

    this.candle_timeframe = this.chart.data_interval

    let subsecond = this.candle_timeframe - (t % this.candle_timeframe)

    console.log('setCandleCloseInterval', this.candle_timeframe, subsecond)

    this.setup_interval_timeout = setTimeout(() => {
      console.log('SETTING ITERVAL',  this.candle_timeframe)
      this.candle_close_interval = setInterval(this.closeCandle.bind(this), this.candle_timeframe * 1000)
      this.closeCandle()
    }, subsecond + 1000)
  }

  addTrade(price, vol, time, type) {
    // console.log('live-chart... trade', price, vol, new Date(time), type)
    let lastIdx = this.chart.series['time'].length - 1
    let lastTime = this.chart.series['time'][lastIdx]
    let barEndTime = (lastTime + this.candle_timeframe)-1
    if (time >= barEndTime){
      console.log('NEW BAR', time, barEndTime)
      this.chart.series['time'].push(barEndTime+1)
      this.chart.series['open'].push(price)
      this.chart.series['close'].push(price)
      this.chart.series['high'].push(price)
      this.chart.series['low'].push(price)
      this.chart.series['vol'].push(vol)
    } else {
      this.chart.series['close'][lastIdx] = price
      this.chart.series['high'][lastIdx] = Math.max(price, this.chart.series['high'][lastIdx])
      this.chart.series['low'][lastIdx] = Math.min(price, this.chart.series['low'][lastIdx])
      this.chart.series['vol'][lastIdx] = vol + this.chart.series['vol'][lastIdx]
    }
    this.redraw()
  }

  redraw(){
    this.throttled_redraw()
  }

  closeCandle() {
    console.log('=============================================Closing candle!================================')
    let lastIdx = this.chart.series['time'].length - 1
    this.addTrade(this.chart.series['close'][lastIdx], 0, Date.now()/1000, 'tick')
  }
}


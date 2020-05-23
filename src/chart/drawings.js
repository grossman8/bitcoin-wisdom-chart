import throttle from 'lodash-es/throttle'
import * as d3 from 'd3'
import { drawLineNoAliasing, drawCursor } from './timeseries'
// drawRayNoAliasing(ctx, sx, sy, tx, ty)

export class DrawingsLayer {
  constructor(chart){
    this.chart = chart
    this.drawings = []

    this.p1
    this.p2
    this.cursor

    this.chart.on('resize', (d) => {
      d3.select(this.$drawings)
      .attr('width', d.width)
      .attr('height', d.height)
    })

    this.$drawings = chart.$elem.append('canvas')
        .attr('width', chart.width)
        .attr('height', chart.height)
        .attr('class', 'canvas-drawings').node();

    this.ctx = this.$drawings.getContext('2d')

    chart.on('candlehover', (candle) => {
      // console.log('candle hover', candle.candle, candle.cursor_point)
      this.cursor = candle.cursor_point
      this.draw({x:this.chart.x_shift})
    })

    chart.on('addline', points => {
      this.drawings.push(points)
      console.log('Add Line', JSON.stringify(points))
      this.draw({x:this.chart.x_shift})
      chart.off('candlehover', onMove)
      this.p1 = this.p2 = null
    })

    chart.on('removeline', () => {
      let remove_this = this.drawings.pop()
      console.log('Removing last line', remove_this, this.drawings.length)
      this.draw({x:this.chart.x_shift})
    })

    const onMove = ({ cursor_point }) => {
      //console.log('moving---', candle)
      this.p2 = cursor_point
      this.draw({x:this.chart.x_shift})
    }

    chart.on('startdrawing', p1 => {
      this.p1 = p1
      this.draw({x:this.chart.x_shift})
      chart.on('candlehover', onMove)
    })

    chart.on('canceldrawing', () => {
      this.p1 = this.p2 = null
      console.log('cancel')
    })

    chart.on('draw', (x) => {
      this.draw(x)
    })
  }

  draw(transform){
    if (this.chart.series_len == 0) return

    this.ctx.clearRect(0, 0, this.chart.width, this.chart.height);

    let bar_width = this.chart.getZoom()
    let line_width = 0.66
    let offset = transform.x * this.chart.getZoom()
    let line_length = this.chart.getZoom() * this.chart.width

    this.drawings.forEach(d => {
      let [p1_price, p1_time] = d.p1,
        [p2_price, p2_time] = d.p2;
      this.draw_line(p1_price, p1_time, p2_price, p2_time, line_width, line_length)
    })


    if (this.cursor) {
      this.ctx.beginPath();

      let [candle_price, time, index, cursor_price ] = this.cursor
      let lineWidth = 1
      if (this.p1) {
        this.ctx.fillStyle = 'lime'
        lineWidth = 2
      } else {
        this.ctx.fillStyle = 'white'
        lineWidth = 1
      }
      let xx = this.chart.xScale2(index),
          yy = this.chart.yScale(candle_price);

      drawCursor(this.ctx, xx, yy, 4, lineWidth)

      let textOffsety = cursor_price > candle_price ? yy - 4 : yy + 10,
          txtOffsetx = xx + 8

      this.ctx.fillText(String(candle_price), txtOffsetx, textOffsety)
    }

    if (this.p1 && this.p2) {
      let [p1_price, p1_time] = this.p1,
        [p2_price, p2_time] = this.p2;

      if (!p2_price){
        let [ candle_price, time, index, cursor_price ] = this.cursor
        console.log('NO p2', this.cursor, p1_price, p1_time)
        this.draw_line(p1_price, p1_time, cursor_price, time, line_width, line_length)
      } else {
        this.draw_line(p1_price, p1_time, p2_price, p2_time, line_width, line_length)
      }
    }
  }

  draw_line(p1_price, p1_time, p2_price, p2_time, line_width, line_length) {
      if (!p1_price) return
      this.ctx.beginPath();

      let c0 = this.chart.getCandleAt(0),
        c1 = this.chart.getCandleAt(1),
        cLast = this.chart.getCandleAt(-1);

      let t_step = c1['time'] - c0['time'],
        bar_cnt = Math.ceil(this.chart.width/this.chart.getZoom()),
        end_time = (bar_cnt * t_step) + c0.time;

      let x1_t = 0,
        x2_t = bar_cnt;

      let p_diff = 0
      if (p1_time != p2_time) {
        p_diff = (p2_price - p1_price) / (p1_time - p2_time);
        p2_price = p1_price
      } else {
        if (p2_price != p1_price) {
          // vertical line
          if (p1_time >= c0['time'] && p1_time <= cLast['time']){
            p1_price = this.chart.data_min
            p2_price = this.chart.data_max
            let cIdx = (p1_time - c0['time']) / t_step
            x1_t = x2_t = cIdx
          } else {
            // not visible
            return
          }
        } else {
          // horizontal line!
          p2_price = p1_price
          p_diff = 0
        }
      }

      let p1_time_diff = p1_time - c0.time,
        end_time_diff = p1_time - end_time;

      let y1_p = (p_diff * p1_time_diff) + p1_price,
        y2_p = (p_diff * end_time_diff) + p2_price;

      let last_idx = this.chart.vseries['time'].length

      let x1 = this.chart.xScale2(x1_t),
          x2 = this.chart.xScale2(x2_t),
          y1 = this.chart.yScale(y1_p),
          y2 = this.chart.yScale(y2_p);

      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = 'red'

      this.ctx.moveTo(x1,y1)
      this.ctx.lineTo(x2,y2)
      this.ctx.stroke()

  }
}

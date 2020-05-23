import throttle from 'lodash-es/throttle'
import * as d3 from 'd3'
import EventEmitter3 from  'eventemitter3'

export class TimeSeriesChart extends EventEmitter3 {
  constructor(window, elem, options){
    super()
    this.$window = window
    this.$elem = elem
    // copy options to this
    Object.keys(options).forEach(k => {
      this[k] = options[k]
    })
    this.x_shift = 0

    // percent of price action to add as min/max bugffer
    this.yScalePadding = 0.10

    this.$canvasChart = this.$elem.append('canvas')
        .attr('class', 'canvas-plot').node();

    let eee = this.$elem.node()
    this.resizeChart(eee.clientHeight, eee.clientWidth-2)

    this.ctx = this.$canvasChart.getContext('2d')

    this.series = {};
    this.vseries = {};
    ['open','high','low','close','vol','time'].forEach(k => {
      this.series[k] = []
      this.vseries[k] = []
    })

    this.xScale = (x) => x
    this.yScale = (y) => y
    this.priceScale = (y) => y
    this.series_len = 0
    this.data_interval = 0
    this.attachEvents()
  }


  setData(series) {
    this.x_shift = 0
    this.series = series
    this.series_len = series['time'].length

    this.data_min = d3.min(series['low']),
    this.data_max = d3.max(series['high']);

    this.data_interval = Math.abs(series['time'][0] - series['time'][1])

    this.yScale = this.getd3YScale().domain([this.data_min, this.data_max]).range([this.height, 0]);
    this.priceScale = this.getd3YScale().domain([this.height, 0]).range([this.data_min, this.data_max]);

    this.emit('setdata')
  }

  resizeChart(height, width) {
    this.height = height
    this.width = width
    d3.select(this.$canvasChart)
      .attr('width', this.width)
      .attr('height', this.height)
    this.emit('resize', {height: this.height, width: this.width})
  }

  setViewable(start, count) {
    Object.keys(this.series).forEach(k => {
      this.vseries[k] = this.series[k].slice(start).slice(0, count)
    })
    let min = 99999999, max=0;
    this.vseries['low'].forEach((l, i) => {
      min = Math.min(l, min)
      max = Math.max(this.vseries['high'][i], max)
    })

    let padding = (max - min) * this.yScalePadding
    min -= padding
    max += padding

    this.data_min = min
    this.data_max = max

    this.yScale = this.getd3YScale().domain([this.data_min, this.data_max]).range([this.height, 0]);
    this.priceScale = this.getd3YScale().domain([this.height, 0]).range([this.data_min, this.data_max])
  }

  getd3YScale(){
    // TODO: support LOG scale!
    // Line projections need to be modified to handle this
    // right now they are linear
    return d3.scaleLinear()
  }

  attachEvents(){

    let start_offset = 0,
      click_down = false,
      moved = false,
      trackline = false,
      diff,
      tl1,
      tl2;


    this.$window.addEventListener('resize', (e) => {
        let elem = this.$elem.node()
        this.resizeChart(elem.clientHeight, elem.clientWidth-2)
        this.draw({ x: this.x_shift });
    }, 100)

    this.$canvasChart.addEventListener('wheel', ({deltaY}) => {
        if (deltaY < 0) {
          this.zoom_level = Math.min(this.zoom_levels.length-1, this.zoom_level+1)
        } else {
          this.zoom_level = Math.max(this.zoom_level-1, 0)
        }
        if (this.x_shift<0) {
          this.x_shift = 0
        }
        this.draw({ x: this.x_shift });
    })



    this.$window.addEventListener('mouseup', (e) => {
      if (e.button == 0){ // left click
        if (click_down){
          this.x_shift = this.x_shift + diff
          this.draw({
            x: this.x_shift
          });
        }
        if (moved == false && trackline == false && click_down == true) {
          trackline = true;
          tl1 = this.getCursorPrice(e)
          this.emit('startdrawing', tl1)
        } else if(tl1 && tl2) {
          trackline = false
          this.emit('addline', {
            p1: tl1,
            p2: tl2
          })
          tl2 = tl1 = null
        }
        click_down = false
        diff = 0
      } else if (e.button == 2) {

      }
    })

    this.$canvasChart.addEventListener('mousedown', (e) => {
      if (e.button == 0){ // left click
        start_offset = e.offsetX
        click_down = true;
        moved = false
        diff = 0
        if (trackline == true) {
          tl2 = this.getCursorPrice(e)
        }
      } else if(e.button == 2){ // right click
        if (trackline) {
          trackline = false
          tl1 = null
          this.emit('canceldrawing')
        } else {
          this.emit('removeline')
        }
      }
    })

    this.$canvasChart.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    })

    this.$canvasChart.addEventListener('mousemove', throttle((e) => {
      if (click_down) {
        moved = true
        diff = start_offset - e.offsetX
        this.draw({
          x: this.x_shift + diff
        });
      }

      let idx = this.getCandleIdxFromCursor(e)
      this.emit('candlehover', {
        candle: this.getCandleAt(idx),
        cursor_point: this.getCursorPrice(e),
        event: e
      })

    }, 30))

    this.$window.addEventListener('keydown',(e) => {
      let xscaler = this.getZoom()
      if (e.keyCode == 39) { // left
        this.draw({
          x: ++this.x_shift * xscaler
        });
      } else if (e.keyCode == 37) {  // right
        this.draw({
          x: --this.x_shift * xscaler
        });
      }
      else if (e.keyCode == 38) {  // zoom in
        this.zoom_level = Math.min(this.zoom_levels.length-1, this.zoom_level+1)
        this.draw({
          x: this.x_shift * xscaler
        });
      }
      else if (e.keyCode == 40) { // zoom out
        this.zoom_level = Math.max(this.zoom_level-1, 0)
        this.draw({
          x: this.x_shift
        });
      }
    })
  }

  redraw() {
    this.draw({ x: this.x_shift });
  }


  draw(transform) {

    this.ctx.clearRect(0, 0, this.width, this.height)

    let bar_width = this.getZoom()
    let r = this.width % bar_width
    if (r == 0){
      r = bar_width
    }

    // x scroll shift amount
    const shift_r = transform.x - (Math.ceil(transform.x / bar_width) * bar_width)
    this.xScale2 = (xx) => {
      return (((xx * bar_width) - bar_width/2) + r) - shift_r
    }

    let viewable_bar_cnt = Math.ceil(this.width / bar_width),
      x_transform = Math.ceil(transform.x/bar_width),
      start = Math.max(0,this.series_len-viewable_bar_cnt+x_transform);

    this.setViewable(start, viewable_bar_cnt)

    let viewable_cnt = this.vseries['low'].length

    for (let i = 0; i <= viewable_cnt; i++) {
      this.ctx.beginPath();

      let px = this.xScale2(i)

      if (typeof this.vseries['high'][i] === 'undefined') continue;

      let high = this.yScale(this.vseries['high'][i]),
        low = this.yScale(this.vseries['low'][i]),
        open = this.yScale(this.vseries['open'][i]),
        close = this.yScale(this.vseries['close'][i]);

      let primary_color = this.getBodyColor(open, close),
        secondary_color = this.getBorderColor(open, close);

      drawCandle2(this.ctx, px, high, low, open, close, bar_width, primary_color, secondary_color)
    }
    this.emit('draw', transform)
  }

  getBodyColor(open, close){
    if (open > close ) {
      return '#6c6'
    } else if (open < close) {
      return '#c00'
    }
  }

  getBorderColor(open, close){
    if (open > close ) {
      return 'lime'
    } else if (open < close) {
      return 'red'
    }
  }

  getZoom(){
    return this.zoom_levels[this.zoom_level]
  }

  getCandleIdxFromCursor({offsetX}){
    if (this.series_len == 0) return
    let bar_width = this.getZoom(),
      r = mod(this.width, bar_width),
      shift_r = mod(this.x_shift, bar_width),
      viewable_bar_cnt = this.width / bar_width,
      half_bar = bar_width/2,
      cursor_pct = offsetX/this.width,
      cursor_bar = Math.ceil(cursor_pct * viewable_bar_cnt);

    let diff = Math.abs(this.xScale2(cursor_bar) - offsetX)
    while (diff > half_bar && cursor_bar != 0){
      diff = Math.abs(this.xScale2(--cursor_bar) - offsetX)
    }

    return Math.max(cursor_bar, 0)
  }

  getCandleAt(idx){
    let out = {}
    if (idx < 0){
      let len = this.vseries['time'].length
      idx = len + idx
    }
    Object.keys(this.vseries).forEach(k =>{
      out[k] = this.vseries[k][idx]
    })
    return out
  }

  getCursorPrice(e){
    let cursor_price = Number(this.priceScale(e.offsetY).toFixed(2)),
      idx = this.getCandleIdxFromCursor(e);

    let c = this.getCandleAt(idx)
    // if we found a candle
    if (c['time']){
      let mid = (c['open'] + c['close'])/2
      if (cursor_price > mid) {
        return [c['high'], c['time'], idx, cursor_price]
      } else {
        return [c['low'], c['time'], idx, cursor_price]
      }

    } else {
      // chart is shifted and cursor is beyond the timeseries, estimate it
      let t_diff = this.data_interval

      let last_idx = this.vseries['time'].length - 1,
        index_diff = idx - last_idx

      let c1 = this.getCandleAt(-1);
      let cursor_time = c1['time'] + (index_diff * t_diff)
      return [cursor_price, cursor_time, idx, cursor_price]
    }
  }
}


// some helper functions
// finds the distance between points
function DBP(x1,y1,x2,y2) {
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

// finds the angle of (x,y) on a plane from the origin
function getAngle(x,y) { return Math.atan(y/(x==0?0.01:x))+(x<0?Math.PI:0); }

export function drawLineNoAliasing(ctx, sx, sy, tx, ty, w=1) {
  var dist = DBP(sx,sy,tx,ty); // length of line
  var ang = getAngle(tx-sx,ty-sy); // angle of line

  for(var i=0;i<dist;i++) {
      // for each point along the line
      ctx.fillRect(Math.round(sx + Math.cos(ang)*i), // round for perfect pixels
                   Math.round(sy + Math.sin(ang)*i), // thus no aliasing
                   w,w); // fill in one pixel, 1x1
  }
}

export function drawRayNoAliasing(ctx, sx, sy, tx, ty, w, size) {
  var dist = DBP(sx,sy,tx,ty); // length of line
  var ang = getAngle(tx-sx,ty-sy); // angle of line

  let pp = Math.abs(Math.cos(ang)) * -1

  let total = size

  let i = (pp * total)
  let d = (1-pp * total)

  // console.log('FROM', i, d, Math.abs(i) + d, ang, pp,  Math.cos(ang), Math.sin(ang))

  for (;i<d;i++) {
      ctx.fillRect(Math.round(sx + Math.cos(ang)*i), // round for perfect pixels
                   Math.round(sy + Math.sin(ang)*i), // thus no aliasing
                   w,w); // fill in one pixel, 1x1
  }
}

export function drawRayNoAliasing2(ctx, sx, sy, tx, ty) {
  var ang = getAngle(tx-sx,ty-sy); // angle of line
  ctx.beginPath();
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, tx);
  ctx.stroke();
}

export function drawCandle(ctx, x, high, low, open, close, width, primary_color, secondary_color) {

  width /= 2
  width = width - 0.5

  ctx.fillStyle = primary_color
  if (width>=2){
    drawLineNoAliasing(ctx, x-1, high, x-1, Math.min(open, close))
    drawLineNoAliasing(ctx, x-1, low, x-1, Math.max(open, close))
  } else {
    drawLineNoAliasing(ctx, x-1, low, x-1, high)
  }
  // drawLineNoAliasing(ctx, x+width, open, x+width, close)
  // drawLineNoAliasing(ctx, x-width, open, x-width, close)
  // drawLineNoAliasing(ctx, x-width, open, x+width, open)
  // drawLineNoAliasing(ctx, x-width, close, x+width, close)
  ctx.lineWidth = 1
  if (width>=2){
    if (close != open){
      // FILL
      // tx.fillRect(x, y, width, height);
      if (open < close) {
        ctx.fillStyle = primary_color
        ctx.fillRect(x-width, Math.min(close, open), width*2, Math.abs(open - close));
      }

      // OPEN BODY
      ctx.fillStyle = secondary_color
      drawLineNoAliasing(ctx, x+width-1, open, x+width-1, close)
      drawLineNoAliasing(ctx, x-width, open, x-width, close)
      drawLineNoAliasing(ctx, x-width, open, x+width, open)
      drawLineNoAliasing(ctx, x-width, close, x+width, close)

    } else {
      ctx.fillStyle = primary_color
      drawLineNoAliasing(ctx, x-(width/2), close, x+(width/2), close)
    }
  }
}


export function drawCandle2(ctx, x, high, low, open, close, width, primary_color, secondary_color) {
  width /= 2
  width = width - 0.5

  ctx.fillStyle = primary_color
  if (width>=1){
    drawLineNoAliasing(ctx, x, high, x, Math.min(open, close))
    drawLineNoAliasing(ctx, x, low, x, Math.max(open, close))
  } else {
    drawLineNoAliasing(ctx, x, low, x, high)
  }
  ctx.lineWidth = 1

  if (width>=1.5){
    width = Math.round((width - 0.5) * 10)/10
    if (close != open){
      // FILL
      // tx.fillRect(x, y, width, height);
      if (open < close) {
        ctx.fillStyle = primary_color
        ctx.fillRect(x-width, Math.min(close, open), width*2, Math.abs(open - close));
      }

      // OPEN BODY
      ctx.fillStyle = secondary_color
      drawLineNoAliasing(ctx, x+width-1, open, x+width-1, close)
      drawLineNoAliasing(ctx, x-width, open, x-width, close)
      drawLineNoAliasing(ctx, x-width, open, x+width, open)
      drawLineNoAliasing(ctx, x-width, close, x+width, close)

    } else {
      ctx.fillStyle = primary_color
      drawLineNoAliasing(ctx, x-width-1, close, x+width, close)
      //drawLineNoAliasing(ctx, x-(width/2), close, x+(width/2), close)
    }
  }
}


export function drawCursor(ctx, x, y, size, width) {
  drawLineNoAliasing(ctx, x+size, y, x-size-1, y,width)
  drawLineNoAliasing(ctx, x, y-size, x, y+size+1, width)
}

function mod (a, b) {
  // Calculate
  // return a - (Math.ceil(a / b) * b)
  return ((a % b) + b) % b;
}

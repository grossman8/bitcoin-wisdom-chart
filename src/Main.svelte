<script>

  import { onMount } from 'svelte'
  import { getSeries, getTrades } from './lib/exchange'
  import BitcoinWisdomChart from './chart/Chart.svelte'

  let current_sym = document.location.search.split('=')[1] || 'bitmex:XBTUSD'
  const symbols = [
    'bitmex:XBTUSD',
    'coinbasepro:BTCUSD',
    'coinbasepro:ETHUSD'
  ]

  const DATA_LIMIT = 2000

  let tf;
  let series;
  let chart;
  let unsub_trade;
  let selectedScale;

  const setSymbol = async (sym) => {
    current_sym = sym
    series = await getSeries(current_sym, tf, DATA_LIMIT)
    chart.setData(series)
    chart.draw({x: 0})

    subscribeToTrades()
  }

  const subscribeToTrades = () => {
    if (unsub_trade) unsub_trade()
    unsub_trade = getTrades(current_sym).subscribe(handleTrade)
  }

  const handleTrade = (trades) => {
    if (chart){
      trades.forEach(trade => {
        trade.date = Math.round(trade.date)
        chart.addTrade(trade.price, trade.amount, trade.date, trade.side)
      });
    }
  }

  const changeTimeFrame = async (e) => {
    tf = e.target.textContent
    series = await getSeries(current_sym, tf, DATA_LIMIT)
    chart.setData(series)
    chart.draw()
  }

  const changeScale = (e) => {
    console.log(e.target.selectedIndex)
    let selectedScale = scales[e.target.selectedIndex]
    console.log('SET SCALE!', selectedScale)
  }

  onMount(async () => {
    console.log('onMount', chart)
    let series = await getSeries(current_sym, tf, DATA_LIMIT)
    chart.setData(series)
    chart.draw()
    subscribeToTrades()
  })

  const timeframes = ['3d','12h','1h','30m','5m', '1m']
  const scales = ['linear','log','percent']

</script>

<main>
  <div>
    <span class="markets select-one">
      {#each symbols as sym}
        <span class={sym === current_sym ? 'active':''} on:click={()=> setSymbol(sym)}>{sym.replace(':',' ')}</span>
      {/each}
    </span>
    <span on:click={changeTimeFrame} class="time-frames select-one">
      {#each timeframes as item}
        <span class={item === tf ? 'active':''}>{item}</span>
      {/each}
    </span>
    <select on:change={changeScale} class="chart-scales select-one">
       {#each scales as item}
        <option selected={item === selectedScale ? 'selected':''}>{item}</option>
      {/each}
    </select>
  </div>
  <BitcoinWisdomChart bind:this={chart}></BitcoinWisdomChart>

</main>


import { createConnection } from './socket'
import { readable } from 'svelte/store';
import { getConfig } from './config.js'

const settings = getConfig()

export const getTrades = (symbol) => {
  return readable([], function start(set){
    connection.emit('global', {
      'action': 'subscribe',
      'channel': 'trades:'+ symbol
    })
    connection.on('trades:'+ symbol, (trade) => {
      set(trade)
    })
    return function stop(){
      connection.emit('global', {
        'action': 'unsubscribe',
        'channel': 'trades:'+ symbol
      })
      connection.off('trades:'+ symbol, start)
    }
  })
}

export const getOrderbook = (symbol) => {
  console.log('getOrderbook', 'orderbook_v2:' + symbol)
  const orderbook = readable({updates:[], last_quote: {bidPrice:0,askPrice:0}}, function start(set){
    connection.emit('global', {
      'action': 'subscribe',
      'channel': 'orderbook_v2:'+ symbol
    })
    connection.exec('orderbook_v2_snapshot', {
      symbol: symbol
    }).then(ob => {
      console.log('', symbol,  ob.length)
      set({ updates: ob })
    })
    connection.on('orderbook_v2:'+ symbol, (ob) => {
      set(ob)
    })
    return function stop(){
      connection.emit('global', {
        'action': 'unsubscribe',
        'channel': 'orderbook_v2:'+ symbol
      })
      connection.off('orderbook_v2:'+ symbol, start)
    }
  })
  return orderbook
}

export const getSeries = (symbol, tf='5m', cnt=50) => {
  let [exchange, sym] = symbol.split(':')
  let url = `http://${settings.webservice_host}/api/v1/timeseries?exchange=${exchange}&symbol=${sym}&count=${cnt}&interval=${tf}&jwt=${settings.jwt}`
  return fetch(url, {mode: 'cors'})
  .then(r => {
    return r.json()
  })
}

const connection = createConnection((conn)=>{
  console.log('OK, subscribing!!')
})

export const getConnection = () => {
  return connection
}

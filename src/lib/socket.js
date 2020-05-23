import io from 'socket.io-client';
import { getConfig } from './config.js'

const settings = getConfig()

const web_socket_url = `${settings.websocket_host}?jwt=${settings.jwt}`

export const createConnection = (onConnect) => {
  const connection = io(web_socket_url);
  connection.on('connect', function() {
    if (connection != null) {
      console.log(connection.id + ' websocket connected @ ' + web_socket_url.split('?')[0])
      if (onConnect) {
        onConnect(connection)
      }
    }
  })
  connection.on('disconnect', function() {
    console.log('websocket disconected')
  })
  connection.on('error', function(err) {
    console.log('socket io error', err)
  })
  connection.on('reconnect', function(err) {
    console.log('socket io reconnect', err)
  })
  connection.on('reconnect_attempt', function(err) {
    console.log('socket io reconnect_attempt', err)
  })
  connection.on('reconnecting', function(err) {
    console.log('socket io reconnecting', err)
  })
  connection.on('ping', function(err) {
    connection.emit('pong')
  })
  connection.on('pong', function(err) {
    // console.log("socket io pong", err)
  })
  connection.on('auth', (a,b)=>{
    // returned when 401s occur
    console.log('autg?', a,b)
  })

  connection['exec'] = async function(method, payload, options, callback) {
    const callback_id = `cb.${method}.${Math.floor(Math.random() * 99999999)}`
    if (typeof options === 'function') {
      callback = options
      options = {timeout: 60 * 1000}
    }
    // TODO: timeout should be on the client, not on the server.. ?
    connection.emit('user', {
      callback_id: callback_id,
      action: method,
      payload: payload,
      ...options
    })
    return new Promise(function(resolve, reject) {
      connection.once(callback_id, function(response) {
        if (response.error && !callback) {
          console.log('websocket.reject!', response)
          reject(response)
        } else if (response.payload) {
          resolve(response.payload)
        } else {
          resolve(response)
        }
        if (typeof callback === 'function') {
          callback(response.error, response.payload || response)
        }
      })
    })
  }

  return connection
}

import io from 'socket.io-client';
import { getConfig } from './config.js'

const settings = getConfig()
const web_socket_url = `${settings.websocket_host}?jwt=${settings.jwt}`

export const createConnection = (onConnect) => {
  const connection = io(web_socket_url);
  connection.on('connect', function() {
    if (connection != null) {
      console.log(connection.id + ' websocket connected @ ' + web_socket_url.split('?')[0])
      if (onConnect) onConnect(connection)
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
  return connection
}

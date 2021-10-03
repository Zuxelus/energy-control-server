'use strict';

const fs = require('fs');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const config = require('./config');

const index = fs.readFileSync('./index.html', 'utf8');
const server = http.createServer((request, res) => {
  const queryObject = url.parse(request.url, true).query;
  if (!queryObject.token || !queryObject.id) {
    res.writeHead(400);
    res.end();
  } else if (queryObject.token != config.token) {
    res.writeHead(401);
    res.end();
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html'});
    res.end(index.replace('HOST', config.host).replace('PORT', config.port).replace('TOKEN', config.token).replace('CLIENTID', queryObject.id));
  }
});

function heartbeat() {
  this.isAlive = true;
}

server.listen(config.port, () => {
  if (config.writeLog)
    console.log('Listen port ' + config.port);
});

const ws = new WebSocket.Server({ server });

ws.on('connection', (connection, request, client) => {
  const ip = request.socket.remoteAddress;
  if (config.writeLog)
    console.log('Connected ' + ip);
  const queryObject = url.parse(request.url, true).query;
  if (!queryObject.token || queryObject.token != config.token || !queryObject.id) {
    if (config.writeLog)
      console.log('Unauthorized socket from' + ip);
    request.socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    request.socket.destroy();
  } else {
    connection.id = queryObject.id;
    connection.on('pong', heartbeat);
    connection.on('message', (message) => {
      /*if (config.writeLog)
        console.log('Received message ' + message + ' from user ' + connection.id);*/
      const jObject = JSON.parse(message);
      ws.clients.forEach((client) => {
        if (client.readyState == WebSocket.OPEN && jObject.id == client.id)
          client.send(message, { binary: false });
      });
    });
    connection.on('close', () => {
      if (config.writeLog)
        console.log('Disconnected ' + ip);
    });
  }
});

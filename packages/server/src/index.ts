/**
 * Server bootstrap. Starts HTTP + Socket.io, attaches the net gateway (validated intents
 * → RoomManager), listens, logs.
 */
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@blendquest/shared';
import { loadConfig } from './config.js';
import { attachGateway } from './net/gateway.js';

const config = loadConfig();

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'blendquest-server' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

const manager = attachGateway(io);
manager.start(config.tickHz);

httpServer.listen(config.port, () => {
  console.log(`[blendquest] room server listening on :${config.port}`);
  console.log(`[blendquest] CORS origin: ${config.corsOrigin}, tick: ${config.tickHz}Hz`);
});

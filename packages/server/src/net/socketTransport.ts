/**
 * Socket.io implementation of the Transport interface. The ONLY place (besides the
 * gateway) where Socket.io types touch the server — keeps the Colyseus swap localized.
 */
import type { Server } from 'socket.io';
import type { Transport } from '../rooms/transport.js';

export function createSocketTransport(io: Server): Transport {
  return {
    toRoom(code, event, payload) {
      io.to(code).emit(event, payload);
    },
    toSocket(socketId, event, payload) {
      io.to(socketId).emit(event, payload);
    },
    join(socketId, code) {
      io.sockets.sockets.get(socketId)?.join(code);
    },
    leave(socketId, code) {
      io.sockets.sockets.get(socketId)?.leave(code);
    },
  };
}

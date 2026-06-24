/**
 * Net gateway — maps raw Socket.io events to VALIDATED intents and routes them to the
 * RoomManager (TECH_DESIGN §5.4). Every inbound payload is zod-validated here before the
 * engine sees it (F18). Invalid payloads are answered with a structured error, never a crash.
 */
import type { Server, Socket } from 'socket.io';
import {
  ClientEvent,
  ErrorCode,
  ServerEvent,
  createRoomSchema,
  firePaintballSchema,
  joinRoomSchema,
  moveSchema,
  paintCommitSchema,
  setPoseSchema,
  startGameSchema,
  validate,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@blendquest/shared';
import { RoomManager } from '../rooms/RoomManager.js';
import { createSocketTransport } from './socketTransport.js';

export function attachGateway(io: Server<ClientToServerEvents, ServerToClientEvents>): RoomManager {
  const transport = createSocketTransport(io as unknown as Server);
  const manager = new RoomManager({ transport });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const sendError = (code: string, message: string): void => {
      socket.emit(ServerEvent.ErrorMsg, { code, message });
    };

    socket.on(ClientEvent.CreateRoom, (raw) => {
      const r = validate(createRoomSchema, raw);
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.createRoom(socket.id, r.value.name);
    });

    socket.on(ClientEvent.JoinRoom, (raw) => {
      const r = validate(joinRoomSchema, raw);
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.joinRoom(socket.id, r.value.code, r.value.name);
    });

    socket.on(ClientEvent.StartGame, (raw) => {
      const r = validate(startGameSchema, raw ?? {});
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.startGame(socket.id);
    });

    socket.on(ClientEvent.Move, (raw) => {
      const r = validate(moveSchema, raw);
      if (!r.ok) return; // drop invalid movement silently (don't error-flood the client)
      manager.move(socket.id, r.value.pos, r.value.rotation);
    });

    socket.on(ClientEvent.SetPose, (raw) => {
      const r = validate(setPoseSchema, raw);
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.setPose(socket.id, r.value.pose);
    });

    socket.on(ClientEvent.PaintCommit, (raw) => {
      const r = validate(paintCommitSchema, raw);
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.paintCommit(socket.id, r.value.blob, r.value.version);
    });

    socket.on(ClientEvent.FirePaintball, (raw) => {
      const r = validate(firePaintballSchema, raw);
      if (!r.ok) return sendError(ErrorCode.InvalidPayload, r.error);
      manager.firePaintball(socket.id, r.value.targetPos);
    });

    socket.on(ClientEvent.LeaveRoom, () => {
      manager.leave(socket.id);
    });

    socket.on('disconnect', () => {
      manager.leave(socket.id);
    });
  });

  return manager;
}

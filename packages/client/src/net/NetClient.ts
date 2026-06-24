/**
 * Thin Socket.io client wrapper (TECH_DESIGN §5.6). All transport specifics live here so
 * the rest of the client talks in typed intents/events, not socket strings.
 */
import { io, type Socket } from 'socket.io-client';
import {
  ClientEvent,
  type ClientToServerEvents,
  type FirePaintballPayload,
  type MovePayload,
  type PaintCommitPayload,
  type ServerToClientEvents,
  type SetPosePayload,
} from '@blendquest/shared';

const DEFAULT_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export type ServerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class NetClient {
  readonly socket: ServerSocket;

  constructor(url: string = DEFAULT_URL) {
    this.socket = io(url, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }

  get id(): string {
    return this.socket.id ?? '';
  }

  onConnect(handler: () => void): void {
    this.socket.on('connect', handler);
  }

  onDisconnect(handler: (reason: string) => void): void {
    this.socket.on('disconnect', handler);
  }

  createRoom(name: string): void {
    this.socket.emit(ClientEvent.CreateRoom, { name });
  }

  joinRoom(code: string, name: string): void {
    this.socket.emit(ClientEvent.JoinRoom, { code, name });
  }

  startGame(): void {
    this.socket.emit(ClientEvent.StartGame, {});
  }

  move(payload: MovePayload): void {
    this.socket.emit(ClientEvent.Move, payload);
  }

  setPose(payload: SetPosePayload): void {
    this.socket.emit(ClientEvent.SetPose, payload);
  }

  paintCommit(payload: PaintCommitPayload): void {
    this.socket.emit(ClientEvent.PaintCommit, payload);
  }

  firePaintball(payload: FirePaintballPayload): void {
    this.socket.emit(ClientEvent.FirePaintball, payload);
  }

  leaveRoom(): void {
    this.socket.emit(ClientEvent.LeaveRoom, {});
  }
}

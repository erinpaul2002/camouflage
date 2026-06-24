/**
 * Transport abstraction so the RoomManager never imports Socket.io directly
 * (keeps the Colyseus swap localized, and makes the manager unit-testable).
 */
export interface Transport {
  /** Emit an event to every socket joined to `code`. */
  toRoom(code: string, event: string, payload: unknown): void;
  /** Emit an event to a single socket. */
  toSocket(socketId: string, event: string, payload: unknown): void;
  /** Associate a socket with a room (Socket.io room membership). */
  join(socketId: string, code: string): void;
  /** Remove a socket's room association. */
  leave(socketId: string, code: string): void;
}

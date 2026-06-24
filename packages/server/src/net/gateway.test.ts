/**
 * End-to-end net integration (TECH_DESIGN §12): a real Socket.io server + clients drive
 * create → join → start across the wire, covering gateway validation + RoomManager + transport.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io as Client, type Socket } from 'socket.io-client';
import { ClientEvent, ErrorCode, ServerEvent } from '@blendquest/shared';
import { attachGateway } from './gateway.js';

let httpServer: HttpServer;
let ioServer: Server;
let port: number;

beforeAll(async () => {
  httpServer = createServer();
  ioServer = new Server(httpServer, { cors: { origin: '*' } });
  attachGateway(ioServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as { port: number }).port;
});

afterAll(() => {
  ioServer.close();
  httpServer.close();
});

function connect(): Socket {
  return Client(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
}

function once<T = unknown>(socket: Socket, event: string, timeout = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('gateway integration', () => {
  it('create → join → start over the wire (F1/F2/F3)', async () => {
    const host = connect();
    await once(host, 'connect');
    host.emit(ClientEvent.CreateRoom, { name: 'Host' });
    const joined = await once<{ snapshot: { code: string }; youId: string }>(host, ServerEvent.RoomJoined);
    const code = joined.snapshot.code;
    expect(code).toHaveLength(5);

    const p1 = connect();
    const p2 = connect();
    await Promise.all([once(p1, 'connect'), once(p2, 'connect')]);
    p1.emit(ClientEvent.JoinRoom, { code, name: 'Ant' });
    p2.emit(ClientEvent.JoinRoom, { code, name: 'Bee' });
    await Promise.all([once(p1, ServerEvent.RoomJoined), once(p2, ServerEvent.RoomJoined)]);

    // Host starts → everyone gets a phase_changed to role_reveal with one seeker.
    const phaseP = once<{ phase: string }>(p1, ServerEvent.PhaseChanged);
    const snapP = once<{ players: Record<string, { role: string | null }> }>(p1, ServerEvent.Snapshot);
    host.emit(ClientEvent.StartGame, {});
    const phase = await phaseP;
    const snap = await snapP;
    expect(phase.phase).toBe('role_reveal');
    const roles = Object.values(snap.players).map((p) => p.role);
    expect(roles.filter((r) => r === 'seeker')).toHaveLength(1);

    host.close();
    p1.close();
    p2.close();
  });

  it('rejects an invalid room code with a structured error (F18)', async () => {
    const c = connect();
    await once(c, 'connect');
    c.emit(ClientEvent.JoinRoom, { code: 'zz', name: 'X' }); // too short → InvalidPayload
    const err = await once<{ code: string }>(c, ServerEvent.ErrorMsg);
    expect(err.code).toBe(ErrorCode.InvalidPayload);
    c.close();
  });

  it('blocks a non-host from starting (F2)', async () => {
    const host = connect();
    await once(host, 'connect');
    host.emit(ClientEvent.CreateRoom, { name: 'Host' });
    const joined = await once<{ snapshot: { code: string } }>(host, ServerEvent.RoomJoined);
    const code = joined.snapshot.code;

    const p1 = connect();
    await once(p1, 'connect');
    p1.emit(ClientEvent.JoinRoom, { code, name: 'Ant' });
    await once(p1, ServerEvent.RoomJoined);

    p1.emit(ClientEvent.StartGame, {});
    const err = await once<{ code: string }>(p1, ServerEvent.ErrorMsg);
    expect(err.code).toBe(ErrorCode.NotHost);

    host.close();
    p1.close();
  });
});

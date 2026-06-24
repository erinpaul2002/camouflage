import Phaser from 'phaser';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  HIDER_PREP_SPEED,
  HIDER_SEEK_SPEED,
  PAINTBALL_COOLDOWN_MS,
  SEEKER_MOVE_SPEED,
  ServerEvent,
  type PaintUpdatePayload,
  type PaintballFiredPayload,
  type Phase,
  type Player,
  type PlayerFoundPayload,
  type RoomState,
  type Role,
  type Vec2,
} from '@blendquest/shared';
import { Palette } from '../theme.js';
import type { GameStore } from '../store/GameStore.js';
import type { NetClient } from '../net/NetClient.js';
import type { PaintSession } from '../paint/PaintSession.js';
import { toDataUrl } from '../paint/stroke.js';
import { CharacterSprite } from '../entities/CharacterSprite.js';
import { drawEnvironment } from '../environments/index.js';
import { TargetPractice } from './TargetPractice.js';
import { audio } from '../audio/audio.js';
import { moveInput } from '../input/inputState.js';

const SEND_INTERVAL_MS = 66; // ~15 Hz move intents
const LERP = 0.25;
const LOCAL_PAINT_KEY = 'paint-local';

function speedFor(role: Role | null, phase: Phase): number {
  if (phase === 'prep') return role === 'seeker' ? SEEKER_MOVE_SPEED : HIDER_PREP_SPEED;
  if (phase === 'seek') return role === 'seeker' ? SEEKER_MOVE_SPEED : HIDER_SEEK_SPEED;
  return 0;
}

/**
 * The gameplay world (prep/seek/round_end): renders every player's character with their
 * painted texture, drives the local player with client-side prediction + throttled move
 * intents, interpolates remotes, shows the seeker's target practice during prep, and reveals
 * everyone at round end.
 */
export class WorldScene extends Phaser.Scene {
  private store!: GameStore;
  private net!: NetClient;
  private paint!: PaintSession;
  private sprites = new Map<string, CharacterSprite>();
  private paintKeys = new Map<string, string>();
  private practice!: TargetPractice;

  private localPos: Vec2 = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };
  private localRot = 0;
  private lastSendAt = 0;
  private lastPhase: Phase | null = null;
  private lastEnv = '';
  private lastPaintVersion = -1;
  private localTexReady = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Vec2 | null = null;
  private pointerWorld: Vec2 = { x: 0, y: 0 };
  private reticle!: Phaser.GameObjects.Graphics;
  private lastFireAt = 0;

  constructor() {
    super('World');
  }

  create(): void {
    this.store = this.game.registry.get('store') as GameStore;
    this.net = this.game.registry.get('net') as NetClient;
    this.paint = this.game.registry.get('paint') as PaintSession;
    this.sprites.clear();
    this.paintKeys.clear();
    this.practice = new TargetPractice(this);
    this.lastPhase = null;
    this.lastEnv = '';
    this.localTexReady = false;
    this.lastPaintVersion = -1;

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;

    this.reticle = this.add.graphics().setDepth(60);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerWorld = { x: p.worldX, y: p.worldY };
      if (p.isDown && !this.practice.active) this.pointerTarget = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', () => (this.pointerTarget = null));

    const onPaint = (p: PaintUpdatePayload): void => this.applyRemotePaint(p);
    const onFired = (p: PaintballFiredPayload): void => this.animateFired(p);
    const onFound = (p: PlayerFoundPayload): void => this.popFound(p.targetId);
    this.net.socket.on(ServerEvent.PaintUpdate, onPaint);
    this.net.socket.on(ServerEvent.PaintballFired, onFired);
    this.net.socket.on(ServerEvent.PlayerFound, onFound);
    this.events.once('shutdown', () => {
      this.net.socket.off(ServerEvent.PaintUpdate, onPaint);
      this.net.socket.off(ServerEvent.PaintballFired, onFired);
      this.net.socket.off(ServerEvent.PlayerFound, onFound);
    });

    const room = this.store.getState().room;
    if (room) this.seedLocal(room);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.practice.active) {
      this.practice.fire(p.worldX, p.worldY);
      return;
    }
    const state = this.store.getState();
    const you = state.room?.players[state.youId];
    if (state.room?.phase === 'seek' && you?.role === 'seeker') {
      this.tryFire(p.worldX, p.worldY);
      return;
    }
    this.pointerTarget = { x: p.worldX, y: p.worldY };
  }

  private tryFire(x: number, y: number): void {
    const now = performance.now();
    if (now - this.lastFireAt < PAINTBALL_COOLDOWN_MS) return;
    this.lastFireAt = now;
    this.net.firePaintball({ targetPos: { x: Math.round(x), y: Math.round(y) } });
  }

  private seedLocal(room: RoomState): void {
    const you = room.players[this.store.getState().youId];
    if (you) {
      this.localPos = { ...you.pos };
      this.localRot = you.rotation;
    }
  }

  override update(_time: number, deltaMs: number): void {
    const state = this.store.getState();
    const room = state.room;
    if (!room || room.phase === 'lobby' || room.phase === 'role_reveal') return;

    if (room.environmentId !== this.lastEnv) {
      this.lastEnv = room.environmentId;
      drawEnvironment(this, room.environmentId);
    }
    if (room.phase !== this.lastPhase) {
      if (room.phase === 'prep') this.seedLocal(room);
      this.lastPhase = room.phase;
      this.pointerTarget = null;
    }

    const you = room.players[state.youId];
    const seekerPrep = you?.role === 'seeker' && room.phase === 'prep';

    if (seekerPrep) {
      this.reticle.clear();
      this.practice.start();
      for (const s of this.sprites.values()) s.setVisible(false);
      this.practice.update(deltaMs);
      return;
    }
    if (this.practice.active) {
      this.practice.stop();
      for (const s of this.sprites.values()) s.setVisible(true);
    }

    this.syncSprites(room, state.youId);
    this.refreshLocalPaint(state.youId, you);

    if (you && (room.phase === 'prep' || room.phase === 'seek')) {
      this.driveLocal(you, room.phase, deltaMs);
    }
    this.interpolateRemotes(room, state.youId);
    this.drawReticle(room.phase, you);
  }

  private drawReticle(phase: Phase, you: Player | undefined): void {
    this.reticle.clear();
    if (phase !== 'seek' || you?.role !== 'seeker') return;
    const ready = performance.now() - this.lastFireAt >= PAINTBALL_COOLDOWN_MS;
    const color = ready ? 0x7cff6b : 0x888899;
    const { x, y } = this.pointerWorld;
    this.reticle.lineStyle(3, color, 0.9);
    this.reticle.strokeCircle(x, y, 16);
    this.reticle.lineBetween(x - 24, y, x - 8, y);
    this.reticle.lineBetween(x + 8, y, x + 24, y);
    this.reticle.lineBetween(x, y - 24, x, y - 8);
    this.reticle.lineBetween(x, y + 8, x, y + 24);
  }

  private animateFired(p: PaintballFiredPayload): void {
    audio.sfx('fire');
    const colorNum = Phaser.Display.Color.HexStringToColor(p.color).color;
    const youId = this.store.getState().youId;
    const shooter = p.byId === youId ? this.sprites.get(youId) : this.sprites.get(p.byId);
    const from = shooter ? { x: shooter.x, y: shooter.y } : p.targetPos;

    const ball = this.add.circle(from.x, from.y, 9, colorNum).setDepth(55);
    this.tweens.add({
      targets: ball,
      x: p.targetPos.x,
      y: p.targetPos.y,
      duration: 170,
      ease: 'Quad.in',
      onComplete: () => {
        ball.destroy();
        this.splat(p.targetPos.x, p.targetPos.y, colorNum);
      },
    });
  }

  private splat(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(54);
    g.fillStyle(color, 0.85);
    g.fillCircle(x, y, 16);
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 16;
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + Math.random() * 5);
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 2200, ease: 'Quad.in', onComplete: () => g.destroy() });
  }

  private popFound(targetId: string): void {
    audio.sfx('hit');
    const sprite = this.sprites.get(targetId);
    if (!sprite) return;
    this.tweens.add({
      targets: sprite,
      scaleX: { from: sprite.scaleX * 1.25, to: sprite.scaleX },
      scaleY: { from: 1.25, to: 1 },
      duration: 320,
      ease: 'Back.out',
    });
  }

  private refreshLocalPaint(youId: string, you: Player | undefined): void {
    if (!you || you.role !== 'hider') return;
    if (!this.localTexReady) {
      if (!this.textures.exists(LOCAL_PAINT_KEY)) {
        this.textures.addCanvas(LOCAL_PAINT_KEY, this.paint.buffer.canvas);
      }
      this.localTexReady = true;
      this.paintKeys.set(youId, LOCAL_PAINT_KEY);
    }
    if (this.paint.buffer.version !== this.lastPaintVersion) {
      this.lastPaintVersion = this.paint.buffer.version;
      const tex = this.textures.get(LOCAL_PAINT_KEY);
      (tex as Phaser.Textures.CanvasTexture).refresh?.();
    }
  }

  private applyRemotePaint(p: PaintUpdatePayload): void {
    const key = `paint-${p.playerId}-${p.version}`;
    this.paintKeys.set(p.playerId, key);
    if (this.textures.exists(key)) return;
    this.textures.addBase64(key, toDataUrl(p.blob));
  }

  private driveLocal(you: Player, phase: Phase, deltaMs: number): void {
    const speed = speedFor(you.role, phase);
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    const usingKeys = dx !== 0 || dy !== 0;
    if (!usingKeys && moveInput.active) {
      dx = moveInput.x;
      dy = moveInput.y;
    } else if (!usingKeys && this.pointerTarget) {
      const tx = this.pointerTarget.x - this.localPos.x;
      const ty = this.pointerTarget.y - this.localPos.y;
      const d = Math.hypot(tx, ty);
      if (d > 4) {
        dx = tx / d;
        dy = ty / d;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      const step = (speed * deltaMs) / 1000;
      this.localPos.x = Phaser.Math.Clamp(this.localPos.x + (dx / len) * step, 0, BOARD_WIDTH);
      this.localPos.y = Phaser.Math.Clamp(this.localPos.y + (dy / len) * step, 0, BOARD_HEIGHT);
      this.localRot = Math.atan2(dy, dx);
    }

    const sprite = this.sprites.get(you.id);
    if (sprite) sprite.setPosition(this.localPos.x, this.localPos.y);

    const now = performance.now();
    if (now - this.lastSendAt >= SEND_INTERVAL_MS) {
      this.lastSendAt = now;
      this.net.move({
        pos: { x: Math.round(this.localPos.x), y: Math.round(this.localPos.y) },
        rotation: this.localRot,
      });
    }
  }

  private interpolateRemotes(room: RoomState, youId: string): void {
    for (const [id, sprite] of this.sprites) {
      if (id === youId) continue;
      const p = room.players[id];
      if (!p) continue;
      sprite.x = Phaser.Math.Linear(sprite.x, p.pos.x, LERP);
      sprite.y = Phaser.Math.Linear(sprite.y, p.pos.y, LERP);
    }
  }

  private syncSprites(room: RoomState, youId: string): void {
    const seen = new Set<string>();
    for (const p of Object.values(room.players)) {
      seen.add(p.id);
      let sprite = this.sprites.get(p.id);
      if (!sprite) {
        sprite = new CharacterSprite(this, p.pos.x, p.pos.y, p.name);
        this.sprites.set(p.id, sprite);
      }
      const isYou = p.id === youId;
      sprite.setVisible(true);
      sprite.setRing(this.ringColor(p.role, isYou), isYou);
      sprite.setPose(p.pose);
      sprite.setFound(p.found);
      sprite.setLabelVisible(room.phase !== 'seek' || isYou);

      const key = this.paintKeys.get(p.id);
      if (key && this.textures.exists(key)) sprite.setPaintTexture(key);
    }
    for (const [id, sprite] of this.sprites) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }

  private ringColor(role: Role | null, you: boolean): number | null {
    if (you) return role === 'seeker' ? Palette.seeker : Palette.hider;
    return null;
  }
}

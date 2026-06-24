/**
 * Synthesized audio (ADR-008): SFX from short oscillator/noise envelopes and an upbeat
 * pentatonic music loop, all via the Web Audio API — zero audio files. Exposed as a module
 * singleton. The context resumes on the first user gesture (browser autoplay policy).
 */
const MUTE_KEY = 'bq.muted';

type Sfx = 'fire' | 'hit' | 'brush' | 'start' | 'end' | 'click';

// Upbeat C major pentatonic loop (Hz). 16 eighth-note steps; null = rest.
const MELODY: (number | null)[] = [
  523, null, 659, 784, 587, null, 784, 659, 523, null, 659, 784, 880, 784, 659, 587,
];
const BASS: (number | null)[] = [131, null, null, null, 165, null, null, null, 147, null, null, null, 131, null, 165, null];
const BPM = 116;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = localStorage.getItem(MUTE_KEY) === '1';
  private musicOn = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    return this.ctx;
  }

  /** Call on a user gesture to satisfy autoplay policy. */
  resume(): void {
    const ctx = this.ensure();
    void ctx?.resume();
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, dest: GainNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(gain, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env);
    env.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, gain: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    env.connect(this.sfxGain);
    src.start(start);
  }

  sfx(name: Sfx): void {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const g = this.sfxGain;
    switch (name) {
      case 'fire':
        this.tone(620, t, 0.14, 'square', 0.5, g);
        this.tone(220, t + 0.02, 0.16, 'square', 0.35, g);
        break;
      case 'hit':
        this.noise(t, 0.18, 0.5);
        this.tone(140, t, 0.22, 'sawtooth', 0.4, g);
        break;
      case 'brush':
        this.tone(280 + Math.random() * 80, t, 0.05, 'triangle', 0.18, g);
        break;
      case 'start':
        [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.09, 0.18, 'triangle', 0.4, g));
        break;
      case 'end':
        [784, 659, 523, 392].forEach((f, i) => this.tone(f, t + i * 0.1, 0.22, 'sine', 0.4, g));
        break;
      case 'click':
        this.tone(660, t, 0.06, 'square', 0.3, g);
        break;
    }
  }

  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicOn) return;
    this.musicOn = true;
    this.nextTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 30);
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.musicGain) return;
    const eighth = 60 / BPM / 2;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const i = this.step % MELODY.length;
      const mel = MELODY[i];
      const bass = BASS[i];
      if (mel) this.tone(mel, this.nextTime, eighth * 0.9, 'triangle', 0.5, this.musicGain);
      if (bass) this.tone(bass, this.nextTime, eighth * 1.6, 'sine', 0.6, this.musicGain);
      this.nextTime += eighth;
      this.step++;
    }
  }
}

export const audio = new AudioEngine();

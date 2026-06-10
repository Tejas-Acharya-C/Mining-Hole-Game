import type { Particle, ParticleKind } from '../types';

// ── Object pool for zero-allocation particles ─────────────────────────────────

const POOL_SIZE = 400;

export class ParticleManager {
  private pool: Particle[];

  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, (): Particle => ({
      active: false,
      kind: 'dirt',
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      color: '#fff',
      size: 4,
      gravity: 200,
      fade: 1.5,
    }));
  }

  /** Acquire a free slot from the pool. Returns null if pool is exhausted. */
  private acquire(): Particle | null {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  emit(opts: {
    kind: ParticleKind;
    x: number; y: number;
    color: string;
    count?: number;
    speedMin?: number; speedMax?: number;
    sizeMin?: number; sizeMax?: number;
    gravity?: number;
    fade?: number;
    lifeMin?: number; lifeMax?: number;
    spreadAngle?: number; // radians, default full circle
    baseAngle?: number;
  }): void {
    const count      = opts.count      ?? 6;
    const speedMin   = opts.speedMin   ?? 1;
    const speedMax   = opts.speedMax   ?? 3;
    const sizeMin    = opts.sizeMin    ?? 2;
    const sizeMax    = opts.sizeMax    ?? 5;
    const gravity    = opts.gravity    ?? 180;
    const fade       = opts.fade       ?? 1.8;
    const lifeMin    = opts.lifeMin    ?? 0.6;
    const lifeMax    = opts.lifeMax    ?? 1.0;
    const spread     = opts.spreadAngle ?? Math.PI * 2;
    const base       = opts.baseAngle   ?? 0;

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      const angle = base - spread / 2 + Math.random() * spread;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const life  = lifeMin  + Math.random() * (lifeMax - lifeMin);

      p.active  = true;
      p.kind    = opts.kind;
      p.x       = opts.x + (Math.random() - 0.5) * 4;
      p.y       = opts.y + (Math.random() - 0.5) * 4;
      p.vx      = Math.cos(angle) * speed;
      p.vy      = Math.sin(angle) * speed - 1.5;
      p.life    = life;
      p.maxLife = life;
      p.color   = opts.color;
      p.size    = sizeMin + Math.random() * (sizeMax - sizeMin);
      p.gravity = gravity;
      p.fade    = fade;
    }
  }

  /** Emit sparkle burst — for gems. Count scaled by quality. */
  emitSparkle(x: number, y: number, color: string, quality: 'low'|'medium'|'high' = 'medium'): void {
    const count = quality === 'low' ? 4 : quality === 'high' ? 12 : 8;
    this.emit({ kind: 'spark', x, y, color, count, speedMin: 2, speedMax: 4,
      sizeMin: 2, sizeMax: 4, gravity: 60, fade: 2.5 });
  }

  /** Emit dig debris. Count scaled by quality. */
  emitDigDebris(x: number, y: number, color: string, hard: boolean, quality: 'low'|'medium'|'high' = 'medium'): void {
    const base = quality === 'low' ? 2 : quality === 'high' ? 10 : (hard ? 8 : 4);
    this.emit({ kind: 'dirt', x, y, color, count: base,
      speedMin: 1.5, speedMax: hard ? 4 : 2.5,
      gravity: 250, fade: 2.0, lifeMin: 0.4, lifeMax: 0.8 });
  }

  /** Emit treasure glow burst. */
  emitTreasure(x: number, y: number): void {
    this.emit({ kind: 'treasure', x, y, color: '#ffd700', count: 10,
      speedMin: 1, speedMax: 3, sizeMin: 3, sizeMax: 7,
      gravity: -20, fade: 1.2, lifeMin: 0.8, lifeMax: 1.2 });
  }

  /** Tick all active particles */
  tick(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.vy   += p.gravity * dt;
      p.x    += p.vx * 60 * dt;
      p.y    += p.vy * dt;
      p.life -= p.fade * dt;
      if (p.life <= 0) { p.active = false; }
    }
  }

  /** Iterate active particles for rendering */
  forEach(cb: (p: Particle) => void): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (this.pool[i].active) cb(this.pool[i]);
    }
  }

  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < POOL_SIZE; i++) if (this.pool[i].active) n++;
    return n;
  }
}

// Procedural Web Audio API engine with pooled oscillators and layered music.

interface ToneOpts {
  type: OscillatorType;
  freq: number;
  endFreq?: number;
  duration: number;
  volume: number;
  attack?: number;
  decay?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  // Ambient oscillator for depth music layers
  private ambientOsc: OscillatorNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private currentDepthLayer = -1;

  private enabled = true;
  private musicEnabled = true;
  private volume = 0.5;
  private musicVolume = 0.3;

  private initCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.05;
      this.ambientGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? v : 0, this.masterGain.context.currentTime, 0.05);
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? v : 0, this.musicGain.context.currentTime, 0.05);
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.setVolume(this.volume);
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    this.setMusicVolume(this.musicVolume);
  }

  private tone(opts: ToneOpts): void {
    if (!this.enabled) return;
    const c = this.initCtx();
    const g = c.createGain();
    g.connect(this.sfxGain!);
    const osc = c.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, c.currentTime);
    if (opts.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(opts.endFreq, c.currentTime + opts.duration);
    }
    osc.connect(g);
    const attack = opts.attack ?? 0.005;
    const decay  = opts.decay  ?? opts.duration;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(opts.volume, c.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + decay);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + opts.duration + 0.05);
  }

  private noise(duration: number, vol: number, cutoff = 800): void {
    if (!this.enabled) return;
    const c = this.initCtx();
    const bufSize = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain!);
    src.start();
  }

  // ── Sound effects ──────────────────────────────────────────────────────────

  dig(hardness: number): void {
    const freq = Math.max(80, 200 - hardness * 10);
    this.noise(0.08, 0.25 + hardness * 0.015, 280 + freq);
    this.tone({ type: 'square', freq, endFreq: freq * 0.55, duration: 0.06, volume: 0.06 });
  }

  break(rarity = 0): void {
    this.noise(0.14, 0.45 + rarity * 0.05, 550 + rarity * 80);
    this.tone({ type: 'sawtooth', freq: 200 + rarity * 40, endFreq: 70, duration: 0.14, volume: 0.08 + rarity * 0.02 });
  }

  pickup(rarity = 0): void {
    const base = 700 + rarity * 150;
    this.tone({ type: 'sine', freq: base, duration: 0.1, volume: 0.15, attack: 0.01 });
    this.tone({ type: 'sine', freq: base * 1.25, duration: 0.08, volume: 0.10, attack: 0.01 });
    if (rarity >= 3) {
      // Epic/legendary shimmer
      setTimeout(() => this.tone({ type: 'triangle', freq: base * 1.5, duration: 0.15, volume: 0.12 }), 80);
    }
  }

  sell(total: number): void {
    const notes = total > 1000 ? [523, 659, 784, 1047, 1318] : [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'sine', freq: f, duration: 0.12, volume: 0.16, attack: 0.01 }), i * 55));
  }

  upgrade(): void {
    [440, 554, 659, 880, 1100].forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'triangle', freq: f, duration: 0.18, volume: 0.18, attack: 0.02 }), i * 65));
  }

  step(): void {
    this.noise(0.035, 0.06, 160);
  }

  lowEnergy(): void {
    this.tone({ type: 'sine', freq: 200, endFreq: 140, duration: 0.28, volume: 0.18 });
  }

  achievement(): void {
    [523, 659, 784, 1047, 1318].forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'sine', freq: f, duration: 0.22, volume: 0.20, attack: 0.01 }), i * 75));
  }

  secret(): void {
    this.tone({ type: 'sine', freq: 110, endFreq: 880, duration: 1.5, volume: 0.22, attack: 0.3 });
    setTimeout(() => this.tone({ type: 'triangle', freq: 440, endFreq: 220, duration: 1.0, volume: 0.12 }), 500);
  }

  win(): void {
    [523, 659, 784, 659, 784, 1047, 1047, 1318].forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'triangle', freq: f, duration: 0.3, volume: 0.22, attack: 0.02 }), i * 140));
  }

  menuClick(): void {
    this.tone({ type: 'sine', freq: 640, duration: 0.05, volume: 0.10, attack: 0.004 });
  }

  teleport(): void {
    this.tone({ type: 'sine', freq: 2000, endFreq: 200, duration: 0.4, volume: 0.2, attack: 0.01 });
    this.noise(0.15, 0.2, 1200);
  }

  criticalHit(): void {
    this.tone({ type: 'square', freq: 400, endFreq: 800, duration: 0.08, volume: 0.12 });
    this.noise(0.06, 0.15, 1500);
  }

  questComplete(): void {
    [660, 880, 1100, 880, 1320].forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'triangle', freq: f, duration: 0.25, volume: 0.22, attack: 0.01 }), i * 90));
  }

  biomeEnter(biomeId: string): void {
    const freqMap: Record<string, number> = {
      crystal_cavern: 330, fossil_zone: 220, lava_zone: 150, void_realm: 80, secret_chamber: 440,
    };
    const freq = freqMap[biomeId] ?? 0;
    if (!freq) return;
    this.tone({ type: 'sine', freq, endFreq: freq * 1.5, duration: 1.2, volume: 0.14, attack: 0.3 });
  }

  // ── Ambient depth music layers ─────────────────────────────────────────────

  updateDepthMusic(depth: number): void {
    if (!this.musicEnabled) return;
    // Layers: 0=surface (silent), 1=shallow, 2=mid, 3=deep, 4=void
    const layer = depth < 20 ? 0 : depth < 50 ? 1 : depth < 100 ? 2 : 3;
    if (layer === this.currentDepthLayer) return;
    this.currentDepthLayer = layer;

    const c = this.initCtx();
    const freqs = [0, 55, 45, 35];
    const freq = freqs[layer];
    if (freq === 0) {
      if (this.ambientGainNode) {
        this.ambientGainNode.gain.setTargetAtTime(0, c.currentTime, 0.5);
      }
      return;
    }

    // Fade out old
    if (this.ambientGainNode) this.ambientGainNode.gain.setTargetAtTime(0, c.currentTime, 0.8);
    if (this.ambientOsc) { try { this.ambientOsc.stop(c.currentTime + 1); } catch { /* ignore */ } }

    // Fade in new
    setTimeout(() => {
      if (!this.musicEnabled) return;
      const c2 = this.initCtx();
      const gain = c2.createGain();
      gain.gain.setValueAtTime(0, c2.currentTime);
      gain.gain.setTargetAtTime(0.04 + layer * 0.01, c2.currentTime, 1.0);
      gain.connect(this.ambientGain!);
      const osc = c2.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      this.ambientOsc = osc;
      this.ambientGainNode = gain;
    }, 900);
  }

  stopAmbient(): void {
    if (this.ambientOsc) {
      try { this.ambientOsc.stop(); } catch { /* ignore */ }
      this.ambientOsc = null;
    }
  }
}

// Singleton
export const audioManager = new AudioManager();

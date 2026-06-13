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

  // Ambient oscillators for depth music layers
  private ambientOscs: OscillatorNode[] = [];
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

  dig(hardness: number, shovelLv = 0): void {
    const baseFreq = Math.max(70, 200 - hardness * 12 - shovelLv * 8);
    const volume = 0.22 + hardness * 0.02 + shovelLv * 0.01;
    const duration = 0.07 + shovelLv * 0.008;
    
    // Noise component representing dirt/stone cracking
    this.noise(duration + 0.02, volume, 260 + baseFreq + shovelLv * 25);
    
    // Tone component: early shovel is simple, high level gets low-frequency resonance
    if (shovelLv >= 5) {
      // Heavy machinery power thud
      this.tone({
        type: 'sawtooth',
        freq: baseFreq,
        endFreq: baseFreq * 0.4,
        duration: duration,
        volume: volume * 0.25,
        attack: 0.005,
        decay: duration
      });
      // Sub-harmonic for weight
      this.tone({
        type: 'sine',
        freq: baseFreq * 0.5,
        endFreq: baseFreq * 0.2,
        duration: duration * 1.2,
        volume: volume * 0.35,
        attack: 0.01,
        decay: duration * 1.2
      });
    } else {
      // Standard metal shovel swing sound
      this.tone({
        type: 'square',
        freq: baseFreq,
        endFreq: baseFreq * 0.5,
        duration: duration,
        volume: volume * 0.15,
        attack: 0.005
      });
    }
  }

  break(rarity = 0, shovelLv = 0): void {
    const duration = 0.15 + rarity * 0.02;
    const vol = 0.40 + rarity * 0.05 + shovelLv * 0.015;
    
    this.noise(duration, vol, 500 + rarity * 85 + shovelLv * 30);
    
    if (shovelLv >= 5) {
      // Heavier block shattering sound
      this.tone({ type: 'sawtooth', freq: 150 + rarity * 30, endFreq: 40, duration: duration, volume: 0.12 + rarity * 0.02 });
      this.tone({ type: 'sine', freq: 80 + rarity * 15, endFreq: 20, duration: duration * 1.3, volume: 0.15 });
    } else {
      this.tone({ type: 'sawtooth', freq: 200 + rarity * 40, endFreq: 70, duration: duration, volume: 0.08 + rarity * 0.02 });
    }
  }

  pickup(rarity = 0): void {
    const base = 700 + rarity * 120;
    // Layered chime sweep
    this.tone({ type: 'sine', freq: base, duration: 0.12, volume: 0.15, attack: 0.01 });
    setTimeout(() => this.tone({ type: 'sine', freq: base * 1.25, duration: 0.10, volume: 0.10, attack: 0.01 }), 35);
    setTimeout(() => this.tone({ type: 'sine', freq: base * 1.5, duration: 0.08, volume: 0.08, attack: 0.01 }), 70);
    
    if (rarity >= 3) {
      // Epic/legendary glitter chord
      [1.8, 2.0, 2.4].forEach((mult, idx) => {
        setTimeout(() => {
          this.tone({ type: 'triangle', freq: base * mult, duration: 0.22, volume: 0.12, attack: 0.015 });
        }, 100 + idx * 45);
      });
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
    // Beautiful clean arpeggio with retro synth filter feel
    const notes = [523, 659, 784, 1047, 1318, 1568];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.tone({ type: 'triangle', freq: f, duration: 0.25, volume: 0.16, attack: 0.02 });
      }, i * 65);
    });
    // Add a satisfying low sub accent chord
    setTimeout(() => {
      this.tone({ type: 'sine', freq: 261.6, duration: 0.45, volume: 0.20, attack: 0.05 });
      this.tone({ type: 'sine', freq: 329.6, duration: 0.45, volume: 0.15, attack: 0.05 });
    }, 120);
  }

  secret(): void {
    this.tone({ type: 'sine', freq: 110, endFreq: 880, duration: 1.5, volume: 0.22, attack: 0.3 });
    setTimeout(() => this.tone({ type: 'triangle', freq: 440, endFreq: 220, duration: 1.0, volume: 0.12 }), 500);
  }

  win(): void {
    // Triumphant chord progression
    const chords = [
      [261.6, 329.6, 392.0, 523.3], // C major
      [349.2, 440.0, 523.3, 698.5], // F major
      [392.0, 493.9, 587.3, 784.0], // G major
      [523.3, 659.3, 784.0, 1046.5] // C major oct
    ];
    chords.forEach((chord, step) => {
      setTimeout(() => {
        chord.forEach((freq, idx) => {
          setTimeout(() => {
            this.tone({ type: 'triangle', freq, duration: 0.6, volume: 0.12, attack: 0.04 });
            this.tone({ type: 'sine', freq: freq * 2, duration: 0.45, volume: 0.06, attack: 0.03 });
          }, idx * 45);
        });
      }, step * 400);
    });
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

  discovery(): void {
    // Majestic layered synth stinger for discovery moments
    const notes = [293.7, 349.2, 440.0, 587.3, 698.5, 880.0]; // Dm minor 7th scale
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.tone({ type: 'triangle', freq: f, duration: 0.35, volume: 0.14, attack: 0.03 });
        this.tone({ type: 'sine', freq: f * 1.5, duration: 0.28, volume: 0.08, attack: 0.02 });
      }, i * 85);
    });
    setTimeout(() => this.noise(0.25, 0.06, 350), 500);
  }

  eventTrigger(kind: string): void {
    const freqs: Record<string, number[]> = {
      treasure_vault:      [523, 784, 1047, 1568],
      crystal_bloom:       [440, 660, 880, 1320],
      lost_cache:          [523, 659, 784],
      energy_surge:        [880, 1100, 1320],
      ore_vein_rich:       [330, 440, 550, 660],
      fossil_discovery:    [220, 330, 440],
      cave_echo:           [200, 260, 300],
      ancient_inscription: [350, 440, 550, 700, 880],
    };
    const notes = freqs[kind] ?? [523, 659, 784];
    notes.forEach((f, i) => setTimeout(() =>
      this.tone({ type: 'triangle', freq: f, duration: 0.22, volume: 0.18, attack: 0.01 }), i * 80));
  }

  combo(level: number): void {
    const freq = 400 + level * 40;
    this.tone({ type: 'square', freq, endFreq: freq * 1.5, duration: 0.1, volume: 0.14 });
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
    // Layers:
    // 0 = Surface (depth < 10)
    // 1 = Shallow (10 <= depth < 30)
    // 2 = Mid depth (30 <= depth < 75)
    // 3 = Ancient Facility (75 <= depth < 95)
    // 4 = World Core (95 <= depth < 110)
    // 5 = Reality Fracture (depth >= 110)
    let layer = 0;
    if (depth >= 10 && depth < 30) layer = 1;
    else if (depth >= 30 && depth < 75) layer = 2;
    else if (depth >= 75 && depth < 95) layer = 3;
    else if (depth >= 95 && depth < 110) layer = 4;
    else if (depth >= 110) layer = 5;

    if (layer === this.currentDepthLayer) return;
    this.currentDepthLayer = layer;

    const c = this.initCtx();
    
    // Fade out old
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.setTargetAtTime(0, c.currentTime, 0.5);
    }
    if (this.ambientOscs) {
      this.ambientOscs.forEach(o => {
        try { o.stop(c.currentTime + 0.6); } catch { /* ignore */ }
      });
      this.ambientOscs = [];
    }

    if (layer === 0) return;

    // Fade in new
    setTimeout(() => {
      if (!this.musicEnabled || this.currentDepthLayer !== layer) return;
      const c2 = this.initCtx();
      const gain = c2.createGain();
      gain.gain.setValueAtTime(0, c2.currentTime);
      gain.gain.setTargetAtTime(0.04 + layer * 0.008, c2.currentTime, 1.2);
      gain.connect(this.ambientGain!);
      this.ambientGainNode = gain;

      const oscs: OscillatorNode[] = [];

      if (layer === 1) {
        const o1 = c2.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = 55;
        o1.connect(gain);
        o1.start();
        oscs.push(o1);
      } else if (layer === 2) {
        const o1 = c2.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = 45;
        o1.connect(gain);
        o1.start();
        oscs.push(o1);

        const o2 = c2.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = 90;
        const g2 = c2.createGain();
        g2.gain.value = 0.25;
        o2.connect(g2);
        g2.connect(gain);
        o2.start();
        oscs.push(o2);
      } else if (layer === 3) {
        const o1 = c2.createOscillator();
        o1.type = 'triangle';
        o1.frequency.value = 38;
        o1.connect(gain);
        o1.start();
        oscs.push(o1);

        const o2 = c2.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = 114;
        const g2 = c2.createGain();
        g2.gain.value = 0.4;
        o2.connect(g2);
        g2.connect(gain);
        o2.start();
        oscs.push(o2);
      } else if (layer === 4) {
        const o1 = c2.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = 33;
        o1.connect(gain);
        o1.start();
        oscs.push(o1);

        const o2 = c2.createOscillator();
        o2.type = 'sawtooth';
        o2.frequency.value = 66;
        const filt = c2.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 120;
        const g2 = c2.createGain();
        g2.gain.value = 0.15;
        o2.connect(filt);
        filt.connect(g2);
        g2.connect(gain);
        o2.start();
        oscs.push(o2);
      } else if (layer === 5) {
        const o1 = c2.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = 28;
        o1.connect(gain);
        o1.start();
        oscs.push(o1);

        const o2 = c2.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = 42;
        const lfo = c2.createOscillator();
        lfo.frequency.value = 0.25;
        const lfoGain = c2.createGain();
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain);
        
        const g2 = c2.createGain();
        g2.gain.value = 0.2;
        lfoGain.connect(g2.gain);
        o2.connect(g2);
        g2.connect(gain);
        
        lfo.start();
        o2.start();
        oscs.push(o2);
        oscs.push(lfo);
      }

      this.ambientOscs = oscs;
    }, 900);
  }

  stopAmbient(): void {
    if (this.ambientOscs) {
      this.ambientOscs.forEach(o => {
        try { o.stop(); } catch { /* ignore */ }
      });
      this.ambientOscs = [];
    }
  }
}

// Singleton
export const audioManager = new AudioManager();

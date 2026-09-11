import { DrumInstrumentId } from "./types";

class DrumSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Pre-generate 1 second of white noise for cymbals/snare
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  public playSound(instrumentId?: DrumInstrumentId | "unmapped", velocity: number = 100) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Rescale velocity to gain [0.15 .. 1.0]
    const velGain = Math.max(0.2, Math.min(1.0, velocity / 115));
    const now = ctx.currentTime;

    switch (instrumentId) {
      case "kick":
        this.playKick(ctx, now, velGain);
        break;
      case "snare":
        this.playSnare(ctx, now, velGain);
        break;
      case "hihat":
        this.playHiHat(ctx, now, velGain);
        break;
      case "tom1":
        this.playTom(ctx, now, 220, 110, 0.28, velGain);
        break;
      case "tom2":
        this.playTom(ctx, now, 160, 85, 0.32, velGain);
        break;
      case "tom3":
        this.playTom(ctx, now, 110, 60, 0.38, velGain);
        break;
      case "crash":
        this.playCrash(ctx, now, velGain);
        break;
      case "splash":
        this.playSplash(ctx, now, velGain);
        break;
      case "ride":
        this.playRide(ctx, now, velGain);
        break;
      default:
        // Default unmapped hit blip
        this.playUnmapped(ctx, now, velGain);
        break;
    }
  }

  private playKick(ctx: AudioContext, now: number, gainMultiplier: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Pitch envelope: fast drop from 145Hz down to 42Hz
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

    // Gain envelope
    gain.gain.setValueAtTime(1.1 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    // Subtle click for kick transient
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "triangle";
    click.frequency.setValueAtTime(400, now);
    click.frequency.exponentialRampToValueAtTime(40, now + 0.02);
    clickGain.gain.setValueAtTime(0.4 * gainMultiplier, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.03);
  }

  private playSnare(ctx: AudioContext, now: number, gainMultiplier: number) {
    // Body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);

    oscGain.gain.setValueAtTime(0.7 * gainMultiplier, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Snare wires (noise)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1000, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85 * gainMultiplier, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.23);
  }

  private playHiHat(ctx: AudioContext, now: number, gainMultiplier: number) {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(8000, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.08);
  }

  private playTom(
    ctx: AudioContext,
    now: number,
    startFreq: number,
    endFreq: number,
    decaySec: number,
    gainMultiplier: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + decaySec * 0.4);

    gain.gain.setValueAtTime(0.9 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + decaySec + 0.02);
  }

  private playCrash(ctx: AudioContext, now: number, gainMultiplier: number) {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(4500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.75 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.9);
  }

  private playSplash(ctx: AudioContext, now: number, gainMultiplier: number) {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(6500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.42);
  }

  private playRide(ctx: AudioContext, now: number, gainMultiplier: number) {
    // Bell ping
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(950, now);
    bellGain.gain.setValueAtTime(0.4 * gainMultiplier, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now);
    bell.stop(now + 0.42);

    // Cymbal wash
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6000, now);

    const washGain = ctx.createGain();
    washGain.gain.setValueAtTime(0.45 * gainMultiplier, now);
    washGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noiseSource.connect(filter);
    filter.connect(washGain);
    washGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.58);
  }

  private playUnmapped(ctx: AudioContext, now: number, gainMultiplier: number) {
    // Sharp wooden click for unmapped MIDI notes
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

    gain.gain.setValueAtTime(0.5 * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

export const drumSoundEngine = new DrumSoundEngine();

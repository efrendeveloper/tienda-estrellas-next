import { DrumInstrumentId } from "./types";
import {
  saveSampleToStorage,
  loadAllSamplesFromStorage,
  deleteSampleFromStorage,
  clearAllSamplesFromStorage,
} from "./sampleStorage";

export interface CustomSampleInfo {
  hasCustom: boolean;
  name?: string;
}

class DrumSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGainNode: GainNode | null = null;
  private drumsVolume: number = 1.0;

  // Custom audio buffers per instrument
  private sampleBuffers: Partial<Record<DrumInstrumentId, AudioBuffer>> = {};
  private sampleNames: Partial<Record<DrumInstrumentId, string>> = {};
  private isStorageInitialized: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(this.drumsVolume, this.ctx.currentTime);
        this.masterGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Pre-generate 1 second of white noise for cymbals/snare procedural synth
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

  // Initialize stored samples from IndexedDB (call on app mount)
  public async initStoredSamples(): Promise<void> {
    if (this.isStorageInitialized || typeof window === "undefined") return;
    this.isStorageInitialized = true;

    try {
      const stored = await loadAllSamplesFromStorage();
      if (!stored || stored.length === 0) return;

      const ctx = this.getContext();
      if (!ctx) return;

      for (const item of stored) {
        try {
          const audioBuffer = await ctx.decodeAudioData(item.buffer.slice(0));
          this.sampleBuffers[item.laneId] = audioBuffer;
          this.sampleNames[item.laneId] = item.fileName;
        } catch (err) {
          console.warn(`No se pudo decodificar sample guardado para ${item.laneId}:`, err);
        }
      }
    } catch (err) {
      console.warn("Error cargando samples desde almacenamiento:", err);
    }
  }

  // Set master volume for drum hits (0.0 to 1.5/2.0)
  public setDrumsVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(2.0, volume));
    this.drumsVolume = clamped;
    const ctx = this.getContext();
    if (ctx && this.masterGainNode) {
      this.masterGainNode.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGainNode.gain.setValueAtTime(clamped, ctx.currentTime);
    }
  }

  public getDrumsVolume(): number {
    return this.drumsVolume;
  }

  // Load sample from File (.wav, .mp3, .m4v, .m4a, etc.)
  public async loadSampleFromFile(
    laneId: DrumInstrumentId,
    file: File
  ): Promise<{ success: boolean; error?: string }> {
    const ctx = this.getContext();
    if (!ctx) return { success: false, error: "AudioContext no disponible" };

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Keep a clean copy for IndexedDB because decodeAudioData can detach the ArrayBuffer
      const storageCopy = arrayBuffer.slice(0);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      this.sampleBuffers[laneId] = audioBuffer;
      this.sampleNames[laneId] = file.name;

      // Save to IndexedDB
      await saveSampleToStorage(laneId, file.name, storageCopy);

      return { success: true };
    } catch (err: any) {
      console.error(`Error decodificando sample para ${laneId}:`, err);
      return {
        success: false,
        error:
          "No se pudo decodificar el archivo de audio. Verifica que sea un formato válido (.wav, .mp3, .m4a, .m4v).",
      };
    }
  }

  // Remove custom sample from a pad and revert to procedural synth
  public async removeSample(laneId: DrumInstrumentId): Promise<void> {
    delete this.sampleBuffers[laneId];
    delete this.sampleNames[laneId];
    await deleteSampleFromStorage(laneId);
  }

  // Clear all custom samples
  public async clearAllSamples(): Promise<void> {
    this.sampleBuffers = {};
    this.sampleNames = {};
    await clearAllSamplesFromStorage();
  }

  // Sample info queries
  public getSampleInfo(laneId: DrumInstrumentId): CustomSampleInfo {
    const hasCustom = !!this.sampleBuffers[laneId];
    return {
      hasCustom,
      name: this.sampleNames[laneId],
    };
  }

  public getAllSampleInfo(): Record<DrumInstrumentId, CustomSampleInfo> {
    const lanes: DrumInstrumentId[] = [
      "hihat",
      "kick",
      "snare",
      "tom1",
      "tom2",
      "tom3",
      "ride",
      "crash",
      "splash",
    ];
    const result = {} as Record<DrumInstrumentId, CustomSampleInfo>;
    lanes.forEach((lane) => {
      result[lane] = this.getSampleInfo(lane);
    });
    return result;
  }

  // Main sound trigger
  public playSound(instrumentId?: DrumInstrumentId | "unmapped", velocity: number = 100) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Rescale velocity to gain [0.2 .. 1.0]
    const velGain = Math.max(0.2, Math.min(1.0, velocity / 115));
    const now = ctx.currentTime;

    // If there is a custom sample loaded for this instrument, play it with zero latency
    if (instrumentId && instrumentId !== "unmapped" && this.sampleBuffers[instrumentId]) {
      this.playCustomSample(ctx, this.sampleBuffers[instrumentId]!, now, velGain);
      return;
    }

    // Otherwise, fallback to high-quality procedural synthesizer
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

  private connectToMaster(node: AudioNode, ctx: AudioContext) {
    if (this.masterGainNode) {
      node.connect(this.masterGainNode);
    } else {
      node.connect(ctx.destination);
    }
  }

  // Custom Sample Playback
  private playCustomSample(
    ctx: AudioContext,
    buffer: AudioBuffer,
    now: number,
    gainMultiplier: number
  ) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    // Slightly boosted punch for drum samples
    gain.gain.setValueAtTime(1.15 * gainMultiplier, now);

    source.connect(gain);
    this.connectToMaster(gain, ctx);

    source.start(now);
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
    this.connectToMaster(gain, ctx);

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
    this.connectToMaster(clickGain, ctx);
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
    this.connectToMaster(oscGain, ctx);
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
    this.connectToMaster(noiseGain, ctx);

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
    this.connectToMaster(gain, ctx);

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
    this.connectToMaster(gain, ctx);

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
    this.connectToMaster(gain, ctx);

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
    this.connectToMaster(gain, ctx);

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
    this.connectToMaster(bellGain, ctx);
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
    this.connectToMaster(washGain, ctx);

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
    this.connectToMaster(gain, ctx);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

export const drumSoundEngine = new DrumSoundEngine();

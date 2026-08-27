import { DrumInstrumentId, DrumNote, SongChart } from "./types";

export function generateSampleSynthAudio(
  notes: DrumNote[],
  duration: number
): string {
  if (typeof window === "undefined") return "";

  const sampleRate = 44100;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate,
  });

  const buffer = ctx.createBuffer(2, Math.ceil(sampleRate * duration), sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Render drum synthesizers into offline audio buffer
  notes.forEach((note) => {
    const startSample = Math.floor(note.time * sampleRate);
    if (startSample >= buffer.length) return;

    if (note.laneId === "kick") {
      // Punchy Sine Kick
      const kickLen = Math.floor(sampleRate * 0.25);
      for (let i = 0; i < kickLen && startSample + i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = 130 * Math.exp(-t * 28) + 40;
        const env = Math.exp(-t * 12);
        const val = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    } else if (note.laneId === "snare") {
      // Noise + Tone Snare
      const snareLen = Math.floor(sampleRate * 0.2);
      for (let i = 0; i < snareLen && startSample + i < buffer.length; i++) {
        const t = i / sampleRate;
        const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 20);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18);
        const val = (tone * 0.4 + noise * 0.6) * 0.7;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    } else if (note.laneId === "hihat") {
      // High Pass Noise Hi-Hat
      const hatLen = Math.floor(sampleRate * 0.08);
      for (let i = 0; i < hatLen && startSample + i < buffer.length; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40);
        left[startSample + i] += noise * 0.4;
        right[startSample + i] += noise * 0.4;
      }
    } else if (
      note.laneId === "tom1" ||
      note.laneId === "tom2" ||
      note.laneId === "tom3"
    ) {
      const startFreq =
        note.laneId === "tom1" ? 220 : note.laneId === "tom2" ? 160 : 110;
      const tomLen = Math.floor(sampleRate * 0.3);
      for (let i = 0; i < tomLen && startSample + i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = startFreq * Math.exp(-t * 10);
        const env = Math.exp(-t * 8);
        const val = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    } else {
      // Cymbals (Ride, Crash, Splash)
      const cymLen = Math.floor(
        sampleRate * (note.laneId === "crash" ? 0.8 : note.laneId === "splash" ? 0.4 : 0.6)
      );
      for (let i = 0; i < cymLen && startSample + i < buffer.length; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 6);
        const ring = Math.sin(2 * Math.PI * 8000 * t) * Math.exp(-t * 8);
        const val = (noise * 0.5 + ring * 0.5) * 0.4;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    }
  });

  // Convert buffer to WAV Data URL
  return bufferToWaveUrl(buffer);
}

function bufferToWaveUrl(abuffer: AudioBuffer): string {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const out = new Uint8Array(length);
  const view = new DataView(out.buffer);
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  writeString("RIFF");
  setUint32(length - 8);
  writeString("WAVE");
  writeString("fmt ");
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString("data");
  setUint32(length - pos - 4);

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (offset < abuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  const blob = new Blob([out], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

// Generate classic Rock Beat chart (120 BPM)
function createRockChart(): SongChart {
  const bpm = 120;
  const beatSec = 60 / bpm;
  const totalBeats = 64; // 16 measures
  const notes: DrumNote[] = [];
  let idCount = 1;

  for (let b = 0; b < totalBeats; b++) {
    const t = 1.0 + b * beatSec;
    const sub = b % 4;

    // Hi-hat on eighth notes
    notes.push({ id: `n_${idCount++}`, laneId: "hihat", time: t });
    notes.push({ id: `n_${idCount++}`, laneId: "hihat", time: t + beatSec / 2 });

    // Kick on 1 and 3
    if (sub === 0 || sub === 2) {
      notes.push({ id: `n_${idCount++}`, laneId: "kick", time: t });
    }

    // Snare on 2 and 4
    if (sub === 1 || sub === 3) {
      notes.push({ id: `n_${idCount++}`, laneId: "snare", time: t });
    }

    // Crash cymbal at start of measure 1 and 9
    if (b === 0 || b === 32) {
      notes.push({ id: `n_${idCount++}`, laneId: "crash", time: t });
    }

    // Tom fill at measure 8 and 16
    if (b === 28 || b === 60) {
      notes.push({ id: `n_${idCount++}`, laneId: "tom1", time: t });
      notes.push({ id: `n_${idCount++}`, laneId: "tom2", time: t + beatSec / 4 });
      notes.push({ id: `n_${idCount++}`, laneId: "tom3", time: t + (beatSec * 2) / 4 });
      notes.push({ id: `n_${idCount++}`, laneId: "snare", time: t + (beatSec * 3) / 4 });
    }
  }

  const duration = 1.0 + totalBeats * beatSec + 2.0;

  return {
    id: "preset_rock_120",
    title: "Rock Beat Classic",
    artist: "Efrendrums Academy",
    bpm: 120,
    duration,
    notes,
    createdAt: Date.now(),
  };
}

// Generate Funk Groove chart (105 BPM)
function createFunkChart(): SongChart {
  const bpm = 105;
  const beatSec = 60 / bpm;
  const totalBeats = 64;
  const notes: DrumNote[] = [];
  let idCount = 1;

  for (let b = 0; b < totalBeats; b++) {
    const t = 1.0 + b * beatSec;
    const sub = b % 4;

    // Ride / Hihat
    notes.push({ id: `fn_${idCount++}`, laneId: "ride", time: t });
    notes.push({ id: `fn_${idCount++}`, laneId: "hihat", time: t + beatSec / 2 });

    // Syncopated Kick
    if (sub === 0 || sub === 2.5) {
      notes.push({ id: `fn_${idCount++}`, laneId: "kick", time: t });
    }

    // Snare + Ghost notes
    if (sub === 1 || sub === 3) {
      notes.push({ id: `fn_${idCount++}`, laneId: "snare", time: t });
    }
    if (sub === 1.5) {
      notes.push({ id: `fn_${idCount++}`, laneId: "splash", time: t + beatSec / 2 });
    }
  }

  const duration = 1.0 + totalBeats * beatSec + 2.0;

  return {
    id: "preset_funk_105",
    title: "Funky E-Drum Groove",
    artist: "Efrendrums Academy",
    bpm: 105,
    duration,
    notes,
    createdAt: Date.now(),
  };
}

export const SAMPLE_PRESETS: SongChart[] = [createRockChart(), createFunkChart()];

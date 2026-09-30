import { DrumInstrumentId } from "./types";

export interface DrumSampleOption {
  id: string; // filename e.g. "HIHAT_01_86_01.WAV"
  name: string; // display label
  path: string; // URL path e.g. "/sound/HIHATS/HIHAT_01_86_01.WAV"
  category: "HIHATS" | "KICKS" | "SNARES" | "TOMS";
}

// All available Hi-Hat samples from public/sound/HIHATS
export const HIHAT_SAMPLES: DrumSampleOption[] = [
  "HIHAT_01_86_01.WAV",
  "HIHAT_02_86_02.WAV",
  "HIHAT_03_86_03.WAV",
  "HIHAT_04_86_04.WAV",
  "HIHAT_05_86_05.WAV",
  "HIHAT_06_86_06.WAV",
  "HIHAT_07_86_07.WAV",
  "HIHAT_08_86_08.WAV",
  "HIHAT_09_86_09.WAV",
  "HIHAT_10_86_10.WAV",
  "HIHAT_11_86_11.WAV",
  "HIHAT_12_86_12.WAV",
  "HIHAT_13_86_13.WAV",
  "HIHAT_14_86_14.WAV",
  "HIHAT_15_86_15.WAV",
  "HIHAT_16_86_16.WAV",
  "HIHAT_17_86_17.WAV",
  "HIHAT_18_86_18.WAV",
  "HIHAT_19_86_19.WAV",
  "HIHAT_20_86_20.WAV",
  "HIHAT_21_86_21.WAV",
  "HIHAT_22_86_22_.WAV",
  "HIHAT_23_86_23.WAV",
  "HIHAT_24_86_24.WAV",
  "HIHAT_25_86_25.WAV",
].map((file) => ({
  id: file,
  name: file,
  path: `/sound/HIHATS/${file}`,
  category: "HIHATS",
}));

// All available Kick samples from public/sound/KICKS
export const KICK_SAMPLES: DrumSampleOption[] = [
  "KICK_01_81_01.WAV",
  "KICK_02_81_02.WAV",
  "KICK_03_81_03.WAV",
  "KICK_04_81_04.WAV",
].map((file) => ({
  id: file,
  name: file,
  path: `/sound/KICKS/${file}`,
  category: "KICKS",
}));

// All available Snare samples from public/sound/SNARE_DRUM_A
export const SNARE_SAMPLES: DrumSampleOption[] = [
  "SNARE_A_01_82_01.WAV",
  "SNARE_A_03_82_03.WAV",
  "SNARE_A_04_82_04.WAV",
  "SNARE_A_05_82_05.WAV",
  "SNARE_A_06_82_06.WAV",
  "SNARE_A_07_82_07.WAV",
  "SNARE_A_08_82_08.WAV",
  "SNARE_A_09_82_09.WAV",
  "SNARE_A_10_82_10.WAV",
  "SNARE_A_11_82_11_.WAV",
  "SNARE_A_12_82_12.WAV",
  "SNARE_A_13_82_13.WAV",
  "SNARE_A_14_82_14.WAV",
  "SNARE_A_15_82_15.WAV",
  "SNARE_A_16_82_16.WAV",
  "SNARE_A_17_82_17.WAV",
  "SNARE_A_18_82_18.WAV",
  "SNARE_A_19_82_19.WAV",
  "SNARE_A_20_82_20.WAV",
  "SNARE_A_21_82_21.WAV",
  "SNARE_A_22_82_22.WAV",
  "SNARE_A_23_82_23.WAV",
  "SNARE_A_24_82_24.WAV",
  "SNARE_A_25_82_25.WAV",
  "SNARE_A_26_82_26.WAV",
  "SNARE_A_27_82_27.WAV",
  "SNARE_A_28_82_28.WAV",
  "SNARE_A_29_82_29.WAV",
  "SNARE_A_30_82_30.WAV",
  "SNARE_A_31_82_31.WAV",
  "SNARE_A_32_82_32.WAV",
  "SNARE_A_33_82_33.WAV",
].map((file) => ({
  id: file,
  name: file,
  path: `/sound/SNARE_DRUM_A/${file}`,
  category: "SNARES",
}));

// All available Tom samples from public/sound/toms
export const TOM_SAMPLES: DrumSampleOption[] = [
  {
    id: "rack-tom-drum-hit.wav",
    name: "rack-tom-drum-hit.wav (Tom 1 Rack)",
    path: "/sound/toms/rack-tom-drum-hit.wav",
    category: "TOMS",
  },
  {
    id: "floor-tom-drum-hit.wav",
    name: "floor-tom-drum-hit.wav (Tom 2 Floor)",
    path: "/sound/toms/floor-tom-drum-hit.wav",
    category: "TOMS",
  },
  {
    id: "dry-floor-tom-drum-hit.wav",
    name: "dry-floor-tom-drum-hit.wav (Tom 3 Dry Floor)",
    path: "/sound/toms/dry-floor-tom-drum-hit.wav",
    category: "TOMS",
  },
];

// Default sample assignments requested by user
export const DEFAULT_LANE_SAMPLES: Partial<Record<DrumInstrumentId, DrumSampleOption>> = {
  hihat: {
    id: "HIHAT_01_86_01.WAV",
    name: "HIHAT_01_86_01.WAV",
    path: "/sound/HIHATS/HIHAT_01_86_01.WAV",
    category: "HIHATS",
  },
  kick: {
    id: "KICK_01_81_01.WAV",
    name: "KICK_01_81_01.WAV",
    path: "/sound/KICKS/KICK_01_81_01.WAV",
    category: "KICKS",
  },
  snare: {
    id: "SNARE_A_01_82_01.WAV",
    name: "SNARE_A_01_82_01.WAV",
    path: "/sound/SNARE_DRUM_A/SNARE_A_01_82_01.WAV",
    category: "SNARES",
  },
  tom1: {
    id: "rack-tom-drum-hit.wav",
    name: "rack-tom-drum-hit.wav",
    path: "/sound/toms/rack-tom-drum-hit.wav",
    category: "TOMS",
  },
  tom2: {
    id: "floor-tom-drum-hit.wav",
    name: "floor-tom-drum-hit.wav",
    path: "/sound/toms/floor-tom-drum-hit.wav",
    category: "TOMS",
  },
  tom3: {
    id: "dry-floor-tom-drum-hit.wav",
    name: "dry-floor-tom-drum-hit.wav",
    path: "/sound/toms/dry-floor-tom-drum-hit.wav",
    category: "TOMS",
  },
};

/**
 * Returns the list of sound options for a given lane.
 * If the lane has a built-in library (hihat, kick, snare, toms), returns those options.
 */
export function getAvailableSamplesForLane(laneId: DrumInstrumentId): DrumSampleOption[] {
  switch (laneId) {
    case "hihat":
      return HIHAT_SAMPLES;
    case "kick":
      return KICK_SAMPLES;
    case "snare":
      return SNARE_SAMPLES;
    case "tom1":
    case "tom2":
    case "tom3":
      return TOM_SAMPLES;
    default:
      return [];
  }
}

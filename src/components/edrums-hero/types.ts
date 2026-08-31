export type DrumInstrumentId =
  | "hihat"
  | "kick"
  | "snare"
  | "tom1"
  | "tom2"
  | "tom3"
  | "ride"
  | "crash"
  | "splash";

export interface DrumLaneConfig {
  id: DrumInstrumentId;
  name: string;
  shortLabel: string;
  key: string; // Keyboard key (lowercase)
  defaultMidiNote: number;
  color: string; // Hex color for glow
  accentColor: string;
  shape: "circle" | "star" | "diamond" | "cross";
}

export interface DrumNote {
  id: string;
  laneId: DrumInstrumentId;
  time: number; // in seconds
  hit?: boolean;
  missed?: boolean;
}

export interface SongChart {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  audioUrl?: string; // object URL or data URL
  notes: DrumNote[];
  createdAt: number;
}

export type MidiMapping = Record<DrumInstrumentId, number>;

export const DEFAULT_DRUM_LANES: DrumLaneConfig[] = [
  {
    id: "hihat",
    name: "Hi-Hat",
    shortLabel: "HH",
    key: "h",
    defaultMidiNote: 42, // Closed Hi-Hat
    color: "#00f0ff", // Bright Cyan
    accentColor: "#00a2ff",
    shape: "star",
  },
  {
    id: "kick",
    name: "Bombo",
    shortLabel: "BD",
    key: "a",
    defaultMidiNote: 36, // Bass Drum 1
    color: "#ff0077", // Neon Pink/Purple
    accentColor: "#d90057",
    shape: "circle",
  },
  {
    id: "snare",
    name: "Tarola",
    shortLabel: "SD",
    key: "s",
    defaultMidiNote: 38, // Acoustic Snare
    color: "#00ff66", // Electric Lime Green
    accentColor: "#00cc52",
    shape: "cross",
  },
  {
    id: "tom1",
    name: "Tom 1",
    shortLabel: "T1",
    key: "j",
    defaultMidiNote: 48, // High Tom
    color: "#ffaa00", // Bright Orange
    accentColor: "#d98e00",
    shape: "circle",
  },
  {
    id: "tom2",
    name: "Tom 2",
    shortLabel: "T2",
    key: "k",
    defaultMidiNote: 45, // Low-Mid Tom
    color: "#00aaff", // Vibrant Blue
    accentColor: "#0077cc",
    shape: "circle",
  },
  {
    id: "tom3",
    name: "Tom 3",
    shortLabel: "T3",
    key: "l",
    defaultMidiNote: 43, // High Floor Tom
    color: "#a855f7", // Deep Purple
    accentColor: "#7e22ce",
    shape: "circle",
  },
  {
    id: "ride",
    name: "Ride",
    shortLabel: "RD",
    key: "r",
    defaultMidiNote: 51, // Ride Cymbal 1
    color: "#ec4899", // Magenta / Pink
    accentColor: "#be185d",
    shape: "star",
  },
  {
    id: "crash",
    name: "Crash",
    shortLabel: "CR",
    key: "t",
    defaultMidiNote: 49, // Crash Cymbal 1
    color: "#ffcc00", // Golden Yellow
    accentColor: "#d9ab00",
    shape: "diamond",
  },
  {
    id: "splash",
    name: "Splash",
    shortLabel: "SP",
    key: "y",
    defaultMidiNote: 55, // Splash Cymbal
    color: "#38bdf8", // Sky Blue
    accentColor: "#0284c7",
    shape: "diamond",
  },
];

export const DEFAULT_MIDI_MAPPING: MidiMapping = {
  hihat: 42,
  kick: 36,
  snare: 38,
  tom1: 48,
  tom2: 45,
  tom3: 43,
  ride: 51,
  crash: 49,
  splash: 55,
};

export type StageId = "concert-arena" | "cyber-portal" | "electro-dj" | "vintage-rock";

export interface StageConfig {
  id: StageId;
  name: string;
  shortDesc: string;
  icon: string;
  primaryColor: string;
  sparkColors: string[];
}

export const STAGES: StageConfig[] = [
  {
    id: "concert-arena",
    name: "🏟️ Estadio Concierto (Pirotecnia Fría)",
    shortDesc: "Escenario de estadio con luces LED, altavoces, focos y cañones de pirotecnia fría",
    icon: "🏟️",
    primaryColor: "#00f0ff",
    sparkColors: ["#ffffff", "#fff7d1", "#ffcc00", "#ffaa00", "#ff7700"],
  },
  {
    id: "cyber-portal",
    name: "🌌 Portal Cyberpunk Sci-Fi",
    shortDesc: "Escenario futurista con túnel de energía neón, turbinas e hiperespacio",
    icon: "🌌",
    primaryColor: "#a855f7",
    sparkColors: ["#ffffff", "#e2f8ff", "#00f0ff", "#a855f7", "#38bdf8"],
  },
  {
    id: "electro-dj",
    name: "🎧 DJ Electro Festival",
    shortDesc: "Escenario de festival con ecualizadores gigantes, estrobos y luces láser",
    icon: "🎧",
    primaryColor: "#ff0077",
    sparkColors: ["#ffffff", "#ff0077", "#a855f7", "#00ff66", "#ffcc00"],
  },
  {
    id: "vintage-rock",
    name: "🎸 Rock & Roll Vintage Hall",
    shortDesc: "Escenario clásico con luces de tungsteno cálidas y fuego dorado",
    icon: "🎸",
    primaryColor: "#ffaa00",
    sparkColors: ["#ffffff", "#ffe066", "#ffd700", "#ffaa00", "#d97706"],
  },
];


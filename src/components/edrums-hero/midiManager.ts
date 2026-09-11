import { DrumInstrumentId, MidiMapping } from "./types";

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state?: string;
}

export interface RawMidiEvent {
  noteNumber: number;
  velocity: number;
  channel: number;
  command: number;
  deviceName: string;
  timestamp: number;
  isNoteOn: boolean;
  laneId?: DrumInstrumentId;
}

export type MidiNoteListener = (
  noteNumber: number,
  velocity: number,
  laneId?: DrumInstrumentId,
  rawInfo?: { channel: number; deviceName: string }
) => void;

export type RawMidiListener = (event: RawMidiEvent) => void;
export type DeviceChangeListener = (devices: MidiDevice[]) => void;

class MidiManager {
  private midiAccess: any | null = null;
  private isSupported: boolean = false;
  private listeners: Set<MidiNoteListener> = new Set();
  private rawListeners: Set<RawMidiListener> = new Set();
  private deviceListeners: Set<DeviceChangeListener> = new Set();

  private mapping: MidiMapping = {
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

  constructor() {
    this.loadSavedMapping();
  }

  public setMapping(newMapping: MidiMapping) {
    this.mapping = { ...newMapping };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("edrums_midi_mapping", JSON.stringify(this.mapping));
      } catch (e) {
        console.warn("Could not save MIDI mapping to LocalStorage", e);
      }
    }
  }

  public getMapping(): MidiMapping {
    return { ...this.mapping };
  }

  private loadSavedMapping() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("edrums_midi_mapping");
        if (saved) {
          const parsed = JSON.parse(saved);
          this.mapping = { ...this.mapping, ...parsed };
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public async initialize(): Promise<{ supported: boolean; devices: MidiDevice[]; error?: string }> {
    if (typeof window === "undefined" || !("requestMIDIAccess" in navigator)) {
      this.isSupported = false;
      return { supported: false, devices: [], error: "Web MIDI API no está disponible en este navegador." };
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      this.isSupported = true;
      this.attachInputs();

      this.midiAccess.onstatechange = () => {
        this.attachInputs();
        const devices = this.getDevices();
        this.deviceListeners.forEach((listener) => listener(devices));
      };

      const devices = this.getDevices();
      return {
        supported: true,
        devices,
      };
    } catch (err: any) {
      console.warn("Web MIDI access denied or unavailable", err);
      this.isSupported = false;
      return {
        supported: false,
        devices: [],
        error: err?.message || "Acceso a Web MIDI denegado por el usuario o navegador.",
      };
    }
  }

  public getDevices(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const devices: MidiDevice[] = [];
    try {
      const inputs = this.midiAccess.inputs.values();
      for (const input of inputs) {
        devices.push({
          id: input.id,
          name: input.name || `Dispositivo MIDI ${input.id}`,
          manufacturer: input.manufacturer || "Genérico",
          state: input.state || "connected",
        });
      }
    } catch (e) {
      console.error("Error reading MIDI devices", e);
    }
    return devices;
  }

  public attachInputs() {
    if (!this.midiAccess) return;
    try {
      const inputs = this.midiAccess.inputs.values();
      for (const input of inputs) {
        // Ensure input port is explicitly opened for Windows USB drivers
        if (input.state === "connected" && typeof input.open === "function") {
          input.open().catch(() => {});
        }
        input.onmidimessage = (event: any) => {
          this.handleMidiMessage(event, input.name || "Batería USB");
        };
      }
    } catch (e) {
      console.error("Error attaching MIDI inputs", e);
    }
  }

  private handleMidiMessage(event: any, deviceName: string) {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0];
    const command = status >> 4;
    const channel = (status & 0x0f) + 1;
    const noteNumber = data[1];
    const velocity = data.length > 2 ? data[2] : 64;

    const isNoteOn = (command === 9 || (status & 0xf0) === 0x90) && velocity > 0;

    let matchedLaneId: DrumInstrumentId | undefined = undefined;
    for (const [laneId, mappedNote] of Object.entries(this.mapping)) {
      if (mappedNote === noteNumber) {
        matchedLaneId = laneId as DrumInstrumentId;
        break;
      }
    }

    const rawEvent: RawMidiEvent = {
      noteNumber,
      velocity,
      channel,
      command,
      deviceName,
      timestamp: Date.now(),
      isNoteOn,
      laneId: matchedLaneId,
    };

    // Emit to raw telemetry listeners (for modal live monitor)
    this.rawListeners.forEach((listener) => listener(rawEvent));

    // Emit note hit if it's Note-On
    if (isNoteOn) {
      this.listeners.forEach((listener) =>
        listener(noteNumber, velocity, matchedLaneId, { channel, deviceName })
      );
    }
  }

  public addListener(listener: MidiNoteListener) {
    this.listeners.add(listener);
  }

  public removeListener(listener: MidiNoteListener) {
    this.listeners.delete(listener);
  }

  public addRawListener(listener: RawMidiListener) {
    this.rawListeners.add(listener);
  }

  public removeRawListener(listener: RawMidiListener) {
    this.rawListeners.delete(listener);
  }

  public addDeviceListener(listener: DeviceChangeListener) {
    this.deviceListeners.add(listener);
  }

  public removeDeviceListener(listener: DeviceChangeListener) {
    this.deviceListeners.delete(listener);
  }
}

export const midiManager = new MidiManager();

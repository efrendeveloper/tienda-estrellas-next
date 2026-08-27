import { DrumInstrumentId, MidiMapping } from "./types";

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export type MidiNoteListener = (
  noteNumber: number,
  velocity: number,
  laneId?: DrumInstrumentId
) => void;

class MidiManager {
  private midiAccess: any | null = null;
  private isSupported: boolean = false;
  private listeners: Set<MidiNoteListener> = new Set();
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
          this.mapping = { ...this.mapping, ...JSON.parse(saved) };
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public async initialize(): Promise<{ supported: boolean; devices: MidiDevice[] }> {
    if (typeof window === "undefined" || !("requestMIDIAccess" in navigator)) {
      this.isSupported = false;
      return { supported: false, devices: [] };
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      this.isSupported = true;
      this.attachInputs();

      this.midiAccess.onstatechange = () => {
        this.attachInputs();
      };

      return {
        supported: true,
        devices: this.getDevices(),
      };
    } catch (err) {
      console.warn("Web MIDI access denied or unavailable", err);
      this.isSupported = false;
      return { supported: false, devices: [] };
    }
  }

  public getDevices(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const devices: MidiDevice[] = [];
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      devices.push({
        id: input.id,
        name: input.name || `MIDI Device ${input.id}`,
        manufacturer: input.manufacturer || "Desconocido",
      });
    }
    return devices;
  }

  private attachInputs() {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const command = status >> 4;
    const noteNumber = data[1];
    const velocity = data[2];

    // Command 9 = Note On (or command 8 with velocity 0 = Note Off)
    if (command === 9 && velocity > 0) {
      let matchedLaneId: DrumInstrumentId | undefined = undefined;
      for (const [laneId, mappedNote] of Object.entries(this.mapping)) {
        if (mappedNote === noteNumber) {
          matchedLaneId = laneId as DrumInstrumentId;
          break;
        }
      }

      this.listeners.forEach((listener) => listener(noteNumber, velocity, matchedLaneId));
    }
  }

  public addListener(listener: MidiNoteListener) {
    this.listeners.add(listener);
  }

  public removeListener(listener: MidiNoteListener) {
    this.listeners.delete(listener);
  }
}

export const midiManager = new MidiManager();

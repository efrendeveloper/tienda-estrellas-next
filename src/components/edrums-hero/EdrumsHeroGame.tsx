"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DEFAULT_DRUM_LANES,
  DEFAULT_MIDI_MAPPING,
  DrumInstrumentId,
  DrumNote,
  MidiMapping,
  SongChart,
  StageId,
  STAGES,
} from "./types";
import { DrumHighwayCanvas } from "./DrumHighwayCanvas";
import { midiManager, MidiDevice } from "./midiManager";
import { SAMPLE_PRESETS, generateSampleSynthAudio } from "./sampleBeats";
import { createSupabaseClient } from "@/lib/supabase";
import type { Alumno } from "@/types";

export function EdrumsHeroGame() {
  // Mode: "play" | "map"
  const [mode, setMode] = useState<"play" | "map">("play");
  const [selectedStageId, setSelectedStageId] = useState<StageId>("concert-arena");

  // Alumnos & Database State
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [loadingAlumnos, setLoadingAlumnos] = useState(true);
  const [hasDeductedKey, setHasDeductedKey] = useState(false);
  const [endGameReward, setEndGameReward] = useState<{
    item: "cube_yellow" | "luna" | "pow" | null;
    title: string;
    message: string;
    image: string | null;
  } | null>(null);

  // Audio State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioName, setAudioName] = useState<string>("Rock Beat Classic (Sample)");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Active Song Chart
  const [activeChart, setActiveChart] = useState<SongChart>(SAMPLE_PRESETS[0]);
  const [notes, setNotes] = useState<DrumNote[]>(SAMPLE_PRESETS[0].notes);

  // Gameplay State
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitsCount, setHitsCount] = useState({ perfect: 0, great: 0, good: 0, miss: 0 });
  const [lastFeedback, setLastFeedback] = useState<{
    text: string;
    color: string;
    time: number;
  } | null>(null);

  // Active Hit Indicators for visual pad flash
  const [activeHits, setActiveHits] = useState<Record<DrumInstrumentId, number>>({
    hihat: 0,
    kick: 0,
    snare: 0,
    tom1: 0,
    tom2: 0,
    tom3: 0,
    ride: 0,
    crash: 0,
    splash: 0,
  });

  // Web MIDI State
  const [midiSupported, setMidiSupported] = useState(false);
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [midiMapping, setMidiMapping] = useState<MidiMapping>(DEFAULT_MIDI_MAPPING);
  const [midiModalOpen, setMidiModalOpen] = useState(false);
  const [learningLane, setLearningLane] = useState<DrumInstrumentId | null>(null);

  // Game Summary Modal
  const [showSummary, setShowSummary] = useState(false);

  // Initialize Sample Audio or load user audio
  useEffect(() => {
    if (activeChart && !activeChart.audioUrl) {
      // Generate synthetic audio for sample preset
      const generated = generateSampleSynthAudio(activeChart.notes, activeChart.duration);
      setAudioUrl(generated);
    } else if (activeChart?.audioUrl) {
      setAudioUrl(activeChart.audioUrl);
    }
  }, [activeChart]);

  // Fetch alumnos from Supabase
  const fetchAlumnos = useCallback(async () => {
    setLoadingAlumnos(true);
    const client = createSupabaseClient();
    if (!client) {
      setLoadingAlumnos(false);
      return;
    }
    const { data, error } = await client
      .from("alumnos")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar alumnos:", error);
      setLoadingAlumnos(false);
      return;
    }

    if (data) {
      const list: Alumno[] = data.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        monedas: r.monedas ?? 0,
        estrellas: r.estrellas ?? 0,
        maxiestrellas: r.maxiestrellas ?? 0,
        ultraestrellas: r.ultraestrellas ?? 0,
        hongos: r.hongos ?? 0,
        item_box: r.item_box ?? 0,
        luna: r.luna ?? 0,
        pow: r.pow ?? 0,
        cerezas: r.cerezas ?? 0,
        hongo_gold: r.hongo_gold ?? 0,
        key: r.key ?? 0,
        rayo: r.rayo ?? 0,
        red_coin: r.red_coin ?? 0,
        cube_yellow: r.cube_yellow ?? 0,
        created_at: r.created_at,
      }));
      setAlumnos(list);
      setSelectedAlumnoId((prev) => prev || (list.length > 0 ? list[0].id : null));
    }
    setLoadingAlumnos(false);
  }, []);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  const selectedAlumno = alumnos.find((a) => a.id === selectedAlumnoId) || null;

  // Process game completion and assign rewards
  const processGameCompletion = useCallback(async () => {
    setIsPlaying(false);
    if (mode !== "play") return;

    setShowSummary(true);

    const totalHit = hitsCount.perfect + hitsCount.great + hitsCount.good;
    const totalNotes = notes.length;
    const acc = totalNotes > 0 ? Math.round((totalHit / (totalHit + hitsCount.miss || 1)) * 100) : 0;

    let rewardItem: "cube_yellow" | "luna" | "pow" | null = null;
    let rewardTitle = "";
    let rewardMessage = "";
    let rewardImage: string | null = null;

    if (totalHit <= 1 || acc < 15) {
      // No presionó nada o casi nada
      rewardItem = null;
      rewardTitle = "¡Inténtalo de nuevo!";
      rewardMessage = "No lograste aciertos suficientes en esta canción.";
      rewardImage = null;
    } else if (acc >= 85) {
      // Excelente
      rewardItem = "cube_yellow";
      rewardTitle = "¡Excelente Calificación!";
      rewardMessage = "¡Gran desempeño y precisión! Has ganado 1 Cubo Amarillo (cube_yellow).";
      rewardImage = "/image/cube_yellow.png";
    } else if (acc >= 60) {
      // Bien sin tantos errores
      rewardItem = "luna";
      rewardTitle = "¡Muy Buen Trabajo!";
      rewardMessage = "¡Buen ritmo sin tantos errores! Has ganado 1 Luna (luna).";
      rewardImage = "/image/luna.png";
    } else {
      // Asertividad muy baja (15% - 59%)
      rewardItem = "pow";
      rewardTitle = "Nivel de Asertividad Bajo";
      rewardMessage = "Has obtenido 1 POW (pow). ¡Sigue practicando para mejorar!";
      rewardImage = "/image/pow.png";
    }

    setEndGameReward({
      item: rewardItem,
      title: rewardTitle,
      message: rewardMessage,
      image: rewardImage,
    });

    if (rewardItem && selectedAlumno) {
      const client = createSupabaseClient();
      if (client) {
        const currentVal = (selectedAlumno as any)[rewardItem] || 0;
        const newVal = currentVal + 1;
        const { error } = await client
          .from("alumnos")
          .update({ [rewardItem]: newVal })
          .eq("id", selectedAlumno.id);

        if (!error) {
          setAlumnos((prev) =>
            prev.map((a) => (a.id === selectedAlumno.id ? { ...a, [rewardItem]: newVal } : a))
          );
        } else {
          console.error("Error al actualizar la recompensa en Supabase:", error);
        }
      }
    }
  }, [mode, selectedAlumno, hitsCount, notes.length]);

  const processGameCompletionRef = useRef(processGameCompletion);
  useEffect(() => {
    processGameCompletionRef.current = processGameCompletion;
  }, [processGameCompletion]);

  // Audio event listeners & sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedData = () => setDuration(audio.duration || activeChart.duration || 30);
    const onEnded = () => {
      if (processGameCompletionRef.current) {
        processGameCompletionRef.current();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("ended", onEnded);
    };
  }, [activeChart]);

  // Initialize Web MIDI
  useEffect(() => {
    void (async () => {
      const res = await midiManager.initialize();
      setMidiSupported(res.supported);
      setMidiDevices(res.devices);
      setMidiMapping(midiManager.getMapping());
    })();
  }, []);

  // Handle Drum Hit (Keyboard or MIDI)
  const triggerDrumHit = useCallback(
    (laneId: DrumInstrumentId) => {
      const hitTime = Date.now();
      setActiveHits((prev) => ({ ...prev, [laneId]: hitTime }));

      const curAudioTime = audioRef.current ? audioRef.current.currentTime : currentTime;

      // MODE 1: MANUAL CHART CREATOR
      if (mode === "map") {
        if (!isPlaying) return;
        const newNote: DrumNote = {
          id: `mapped_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          laneId,
          time: Number(curAudioTime.toFixed(3)),
        };
        setNotes((prev) => [...prev, newNote].sort((a, b) => a.time - b.time));
        return;
      }

      // MODE 2: PLAYGAME HIT DETECTION
      if (mode === "play" && isPlaying) {
        // Find nearest unhit note in this lane
        const windowSec = 0.16; // ±160ms hit window
        let bestMatchIndex = -1;
        let minDiff = Infinity;

        notes.forEach((n, idx) => {
          if (n.laneId === laneId && !n.hit && !n.missed) {
            const diff = Math.abs(n.time - curAudioTime);
            if (diff < windowSec && diff < minDiff) {
              minDiff = diff;
              bestMatchIndex = idx;
            }
          }
        });

        if (bestMatchIndex !== -1) {
          const diffMs = minDiff * 1000;
          let pts = 0;
          let feedbackText = "GOOD!";
          let feedbackColor = "#00ff66";
          let hitType: "perfect" | "great" | "good" = "good";

          if (diffMs <= 45) {
            pts = 100;
            feedbackText = "PERFECT!";
            feedbackColor = "#00f0ff";
            hitType = "perfect";
          } else if (diffMs <= 90) {
            pts = 50;
            feedbackText = "GREAT!";
            feedbackColor = "#ffcc00";
            hitType = "great";
          } else {
            pts = 25;
            hitType = "good";
          }

          setNotes((prev) =>
            prev.map((n, idx) => (idx === bestMatchIndex ? { ...n, hit: true } : n))
          );

          setCombo((c) => {
            const newC = c + 1;
            setMaxCombo((m) => Math.max(m, newC));
            return newC;
          });

          const currentMult = Math.min(4, Math.floor(combo / 10) + 1);
          setScore((s) => s + pts * currentMult);
          setHitsCount((h) => ({ ...h, [hitType]: h[hitType] + 1 }));
          setLastFeedback({ text: feedbackText, color: feedbackColor, time: Date.now() });
        }
      }
    },
    [mode, isPlaying, currentTime, notes, combo]
  );

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const matchedLane = DEFAULT_DRUM_LANES.find((l) => l.key === key);
      if (matchedLane) {
        e.preventDefault();
        triggerDrumHit(matchedLane.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerDrumHit]);

  // Web MIDI Listener
  useEffect(() => {
    const handleMidiNote = (
      noteNumber: number,
      _velocity: number,
      laneId?: DrumInstrumentId
    ) => {
      // If currently learning a MIDI note for a specific lane:
      if (learningLane) {
        const newMap = { ...midiMapping, [learningLane]: noteNumber };
        setMidiMapping(newMap);
        midiManager.setMapping(newMap);
        setLearningLane(null);
        return;
      }

      if (laneId) {
        triggerDrumHit(laneId);
      }
    };

    midiManager.addListener(handleMidiNote);
    return () => midiManager.removeListener(handleMidiNote);
  }, [learningLane, midiMapping, triggerDrumHit]);

  // Check Missed Notes during Play mode
  useEffect(() => {
    if (mode !== "play" || !isPlaying) return;

    notes.forEach((n, idx) => {
      if (!n.hit && !n.missed && currentTime - n.time > 0.18) {
        setNotes((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, missed: true } : item))
        );
        setCombo(0);
        setHitsCount((h) => ({ ...h, miss: h.miss + 1 }));
        setLastFeedback({ text: "MISS!", color: "#ff0055", time: Date.now() });
      }
    });
  }, [currentTime, isPlaying, mode, notes]);

  // Controls Handlers
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Validar requerimiento de alumno y llave (key) en Modo Juego
      if (mode === "play") {
        if (!selectedAlumno) {
          alert("Por favor selecciona un alumno para poder jugar.");
          return;
        }
        if (selectedAlumno.key < 1) {
          alert(`El alumno ${selectedAlumno.nombre} no tiene ítems de "key" (llaves). Se requiere al menos 1 llave para jugar.`);
          return;
        }

        // Descontar 1 llave si no ha sido descontada para esta ronda
        if (!hasDeductedKey) {
          const client = createSupabaseClient();
          if (client) {
            const newKey = selectedAlumno.key - 1;
            const { error } = await client
              .from("alumnos")
              .update({ key: newKey })
              .eq("id", selectedAlumno.id);

            if (error) {
              console.error("Error al descontar llave:", error);
              alert("Ocurrió un error al intentar descontar la llave del alumno.");
              return;
            }

            setAlumnos((prev) =>
              prev.map((a) => (a.id === selectedAlumno.id ? { ...a, key: newKey } : a))
            );
            setHasDeductedKey(true);
          }
        }
      }

      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    // Reset note status
    setNotes((prev) => prev.map((n) => ({ ...n, hit: false, missed: false })));
    setScore(0);
    setCombo(0);
    setHitsCount({ perfect: 0, great: 0, good: 0, miss: 0 });
    setHasDeductedKey(false);
    setEndGameReward(null);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  // Upload MP3 File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioName(file.name);
    handleStop();

    // Create a blank chart for mapping
    const newChart: SongChart = {
      id: `user_chart_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Usuario",
      bpm: 120,
      duration: 180,
      audioUrl: url,
      notes: [],
      createdAt: Date.now(),
    };
    setActiveChart(newChart);
    setNotes([]);
    setMode("map");
  };

  // Export Mapped Chart JSON
  const exportChartJson = () => {
    const exportData = {
      title: activeChart.title,
      artist: activeChart.artist,
      bpm: activeChart.bpm,
      duration,
      notes: notes.map((n) => ({ laneId: n.laneId, time: n.time })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChart.title.replaceAll(" ", "_")}_chart.json`;
    a.click();
  };

  // Import Mapped Chart JSON
  const handleImportChart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (Array.isArray(json.notes)) {
          const importedNotes: DrumNote[] = json.notes.map(
            (n: any, idx: number) => ({
              id: `imp_${idx}_${Date.now()}`,
              laneId: n.laneId,
              time: Number(n.time),
            })
          );
          setNotes(importedNotes);
          alert(`¡Mapeo cargado con éxito! Total notas: ${importedNotes.length}`);
        }
      } catch (err) {
        alert("Error al parsear el archivo JSON de mapeo");
      }
    };
    reader.readAsText(file);
  };

  // Stats calculation
  const totalNotesCount = notes.length;
  const totalHit = hitsCount.perfect + hitsCount.great + hitsCount.good;
  const accuracy =
    totalNotesCount > 0
      ? Math.round((totalHit / (totalHit + hitsCount.miss || 1)) * 100)
      : 100;

  const currentMultiplier = Math.min(4, Math.floor(combo / 10) + 1);

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 text-white font-sans">
      <audio ref={audioRef} src={audioUrl || undefined} />

      {/* Top Header / Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827]/90 p-3 sm:p-4 rounded-2xl border border-cyan-500/20 backdrop-blur mb-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold tracking-wide text-cyan-300">
              Edrums-Hero Studio
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Pista activa: <span className="text-gray-200 font-semibold">{audioName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("play");
                handleStop();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === "play"
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎮 Modo Juego
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("map");
                handleStop();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === "map"
                  ? "bg-pink-500 text-white shadow-[0_0_12px_rgba(255,0,119,0.6)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎙️ Mapeador Manual
            </button>
          </div>

          {/* MIDI Settings Button */}
          <button
            type="button"
            onClick={() => setMidiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition-all"
          >
            🥁 Batería MIDI {midiSupported ? "🟢" : "⚪"}
          </button>

          {/* Upload MP3 */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold cursor-pointer shadow-md transition-all">
            📁 Cargar MP3
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Student Selector Checklist Section */}
      {mode === "play" && (
        <div className="mb-4 p-4 rounded-2xl bg-[#111827]/90 border border-cyan-500/30 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥁</span>
              <div>
                <h3 className="text-sm font-bold text-cyan-300">
                  Seleccionar Alumno para la Partida
                </h3>
                <p className="text-[11px] text-gray-400">
                  Se requiere al menos <span className="text-yellow-400 font-semibold">1 Llave (Key 🔑)</span> para poder jugar.
                </p>
              </div>
            </div>

            {selectedAlumno && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs">
                <span className="text-gray-300">Jugador:</span>
                <span className="font-bold text-cyan-300">{selectedAlumno.nombre}</span>
                <span className="flex items-center gap-1 font-bold text-yellow-400 bg-black/40 px-2 py-0.5 rounded-md border border-yellow-500/30">
                  🔑 {selectedAlumno.key} {selectedAlumno.key === 1 ? "llave" : "llaves"}
                </span>
              </div>
            )}
          </div>

          {loadingAlumnos ? (
            <div className="p-4 text-center text-xs text-cyan-400 animate-pulse">
              Cargando lista de alumnos...
            </div>
          ) : alumnos.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-400 bg-gray-900/50 rounded-xl">
              No hay alumnos registrados en el sistema.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
              {alumnos.map((alumno) => {
                const isSelected = selectedAlumnoId === alumno.id;
                const hasKey = alumno.key >= 1;
                return (
                  <button
                    key={alumno.id}
                    type="button"
                    onClick={() => {
                      if (!isPlaying) {
                        setSelectedAlumnoId(alumno.id);
                        setHasDeductedKey(false);
                      }
                    }}
                    disabled={isPlaying}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? hasKey
                          ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                          : "bg-red-950/60 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                        : "bg-gray-900/60 border-white/10 hover:border-gray-600 hover:bg-gray-800/60"
                    } ${!hasKey ? "opacity-75" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="radio"
                        name="alumno_select"
                        checked={isSelected}
                        onChange={() => {
                          if (!isPlaying) {
                            setSelectedAlumnoId(alumno.id);
                            setHasDeductedKey(false);
                          }
                        }}
                        className="accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-200 truncate flex-1">
                        {alumno.nombre}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-white/10 text-[10px]">
                      <span className="flex items-center gap-1 font-semibold text-yellow-300">
                        🔑 {alumno.key}
                      </span>
                      {hasKey ? (
                        <span className="text-green-400 font-bold">Disponible</span>
                      ) : (
                        <span className="text-red-400 font-bold">Sin llaves</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedAlumno && selectedAlumno.key < 1 && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center gap-2 text-xs text-red-200">
              <span>⚠️</span>
              <span>
                <strong>{selectedAlumno.nombre}</strong> no tiene llaves (<strong>key 🔑</strong>). Se requiere al menos 1 llave para jugar. Adquiérela en la tienda de estrellas o selecciona otro alumno.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stage Selection Bar */}
      <div className="mb-4 p-4 rounded-2xl bg-[#111827]/90 border border-cyan-500/30 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <div>
              <h3 className="text-sm font-bold text-cyan-300">
                Seleccionar Escenario de Concierto
              </h3>
              <p className="text-[11px] text-gray-400">
                Elige la atmósfera y los efectos visuales para tu interpretación. ¡Al hacer combo se activará la pirotecnia fría!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {STAGES.map((stg) => {
            const isSelected = selectedStageId === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setSelectedStageId(stg.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-cyan-950/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-[1.02]"
                    : "bg-gray-900/60 border-white/10 hover:border-gray-600 hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{stg.icon}</span>
                  <span className="text-xs font-bold text-gray-100 line-clamp-1">
                    {stg.name}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-snug">
                  {stg.shortDesc}
                </p>
                <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Chispas:</span>
                  <div className="flex items-center gap-1">
                    {stg.sparkColors.slice(0, 3).map((col, idx) => (
                      <span
                        key={idx}
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3D Canvas Highway */}
      <DrumHighwayCanvas
        notes={notes}
        currentTime={currentTime}
        audioRef={audioRef}
        activeHits={activeHits}
        combo={combo}
        score={score}
        multiplier={currentMultiplier}
        lastFeedback={lastFeedback}
        speedMultiplier={playbackRate}
        stageId={selectedStageId}
      />

      {/* Audio Playback & Song Selection Controls Bar */}
      <div className="mt-4 bg-[#111827]/90 p-4 rounded-2xl border border-white/10 flex flex-col gap-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Transport Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              disabled={mode === "play" && (!selectedAlumno || selectedAlumno.key < 1)}
              className={`h-10 px-5 rounded-xl font-extrabold text-sm flex items-center justify-center transition-all ${
                mode === "play" && (!selectedAlumno || selectedAlumno.key < 1)
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              }`}
            >
              {isPlaying ? "⏸️ PAUSA" : "▶️ REPRODUCIR"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="h-10 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-all"
            >
              ⏹️ REINICIAR
            </button>
          </div>

          {/* Time Seek slider */}
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-300 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) audioRef.current.currentTime = val;
              }}
              className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-xs font-mono text-gray-400 w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback speed selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Velocidad:</span>
            {[0.5, 0.75, 1.0].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 rounded-md text-xs font-bold ${
                  playbackRate === rate
                    ? "bg-cyan-500 text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Sample Presets Selection */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
          <span className="text-gray-400 font-semibold">Canciones de prueba:</span>
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActiveChart(preset);
                setNotes(preset.notes);
                setAudioName(preset.title);
                handleStop();
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                activeChart.id === preset.id
                  ? "border-cyan-400 bg-cyan-950/60 text-cyan-200"
                  : "border-white/10 bg-gray-900/60 text-gray-300 hover:border-gray-600"
              }`}
            >
              🎵 {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* MANUAL CHART CREATOR TOOLBAR (Visible in 'map' mode) */}
      {mode === "map" && (
        <div className="mt-4 bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-indigo-950/40 p-4 rounded-2xl border border-pink-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-pink-300 flex items-center gap-2">
                🎙️ Grabador y Mapeador Manual en Tiempo Real
              </h3>
              <p className="text-xs text-gray-300">
                Presiona las teclas o golpea tu batería MIDI mientras suena la música para
                capturar los golpes. Total notas grabadas:{" "}
                <span className="font-bold text-pink-400">{notes.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotes([])}
                className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-200 text-xs font-bold"
              >
                🗑️ Limpiar Todo
              </button>
              <button
                type="button"
                onClick={() => setNotes((prev) => prev.slice(0, -1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold"
              >
                ↩️ Borrar última nota
              </button>
              <button
                type="button"
                onClick={exportChartJson}
                className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md"
              >
                💾 Exportar Mapeo JSON
              </button>
              <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer shadow-md">
                📥 Importar JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportChart}
                />
              </label>
            </div>
          </div>

          {/* Keyboard Keys mapping reference guide */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 mt-2 pt-3 border-t border-pink-500/20">
            {DEFAULT_DRUM_LANES.map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => triggerDrumHit(lane.id)}
                className="flex flex-col items-center p-2 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 active:scale-95 transition-all text-center"
                style={{ borderColor: lane.color }}
              >
                <span className="text-[10px] text-gray-400">{lane.name}</span>
                <span
                  className="text-base font-extrabold my-0.5"
                  style={{ color: lane.color }}
                >
                  [{lane.key.toUpperCase()}]
                </span>
                <span className="text-[9px] text-gray-400">MIDI: {midiMapping[lane.id]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WEB MIDI CONFIGURATION MODAL */}
      {midiModalOpen && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-[#0f172a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
              <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                🥁 Configuración de Batería Electrónica (MIDI)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMidiModalOpen(false);
                  setLearningLane(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-200">Estado de Web MIDI:</span>
                  <p className="text-gray-400 mt-0.5">
                    {midiSupported
                      ? "API Web MIDI activa en tu navegador"
                      : "API no detectada o no soportada en este navegador"}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    midiSupported
                      ? "bg-green-500/20 text-green-300 border border-green-500/40"
                      : "bg-red-500/20 text-red-300 border border-red-500/40"
                  }`}
                >
                  {midiSupported ? "CONECTADO" : "NO DISPONIBLE"}
                </span>
              </div>

              {/* Connected Devices */}
              <div>
                <h4 className="font-bold text-gray-300 mb-1">Dispositivos MIDI detectados:</h4>
                {midiDevices.length > 0 ? (
                  <ul className="space-y-1">
                    {midiDevices.map((dev) => (
                      <li
                        key={dev.id}
                        className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200"
                      >
                        🎵 {dev.name} ({dev.manufacturer})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-3 rounded-lg bg-gray-900 text-gray-400 italic">
                    Conecta tu batería electrónica por USB/MIDI. Si acabas de conectarla, cierra
                    y vuelve a abrir esta ventana.
                  </p>
                )}
              </div>

              {/* MIDI Mapping Learn Table */}
              <div>
                <h4 className="font-bold text-gray-300 mb-2">Mapeo de Pads (MIDI Learn):</h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {DEFAULT_DRUM_LANES.map((lane) => {
                    const isLearning = learningLane === lane.id;
                    return (
                      <div
                        key={lane.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: lane.color }}
                          />
                          <span className="font-bold text-gray-200">{lane.name}</span>
                          <span className="text-gray-400">[{lane.key.toUpperCase()}]</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-300">
                            Nota: {midiMapping[lane.id]}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLearningLane(isLearning ? null : lane.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                              isLearning
                                ? "bg-amber-500 text-black animate-pulse"
                                : "bg-cyan-600 hover:bg-cyan-500 text-black"
                            }`}
                          >
                            {isLearning ? "¡Golpea tu pad ahora!" : "Mapear"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME SUMMARY MODAL */}
      {showSummary && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#0f172a] p-6 text-center shadow-2xl">
            <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 uppercase tracking-widest mb-2">
              ¡CANCIÓN TERMINADA!
            </h3>
            <p className="text-xs text-gray-400 mb-4">{audioName}</p>

            <div className="my-4 p-4 rounded-xl bg-black/50 border border-cyan-500/30 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Puntaje Total:</span>
                <span className="font-extrabold text-cyan-300">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Combo:</span>
                <span className="font-extrabold text-amber-400">{maxCombo}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Precisión:</span>
                <span className="font-extrabold text-green-400">{accuracy}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] pt-2 border-t border-white/10 text-center">
                <div className="p-1 rounded bg-cyan-950/40 text-cyan-300">
                  <div className="font-bold">{hitsCount.perfect}</div>
                  <div className="text-[9px] text-gray-400">PERFECT</div>
                </div>
                <div className="p-1 rounded bg-amber-950/40 text-amber-300">
                  <div className="font-bold">{hitsCount.great}</div>
                  <div className="text-[9px] text-gray-400">GREAT</div>
                </div>
                <div className="p-1 rounded bg-green-950/40 text-green-300">
                  <div className="font-bold">{hitsCount.good}</div>
                  <div className="text-[9px] text-gray-400">GOOD</div>
                </div>
                <div className="p-1 rounded bg-red-950/40 text-red-300">
                  <div className="font-bold">{hitsCount.miss}</div>
                  <div className="text-[9px] text-gray-400">MISS</div>
                </div>
              </div>
            </div>

            {/* Recompensa del Alumno */}
            {endGameReward && (
              <div className="my-4 p-4 rounded-xl bg-gradient-to-b from-gray-900 to-black border border-cyan-500/40 text-center shadow-inner">
                {selectedAlumno && (
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                    Alumno: <span className="text-cyan-300 font-bold">{selectedAlumno.nombre}</span>
                  </p>
                )}

                {endGameReward.item ? (
                  <div className="flex flex-col items-center gap-2">
                    {endGameReward.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={endGameReward.image}
                        alt={endGameReward.title}
                        className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] animate-bounce"
                      />
                    )}
                    <h4 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-cyan-300">
                      {endGameReward.title}
                    </h4>
                    <p className="text-xs text-gray-200 leading-relaxed font-medium">
                      {endGameReward.message}
                    </p>
                    <span className="mt-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 text-[11px] font-bold">
                      +1 {endGameReward.item} agregado al inventario
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <span className="text-3xl animate-pulse">🔄</span>
                    <h4 className="text-lg font-extrabold text-amber-400 tracking-wider">
                      {endGameReward.title}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {endGameReward.message}
                    </p>
                    <span className="text-[10px] text-gray-500 italic">
                      (No se otorgó ningún ítem en este intento)
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSummary(false);
                handleStop();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-lg transition-all"
            >
              PLAY AGAIN / VOLVER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

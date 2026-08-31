"use client";

import React, { useEffect, useRef } from "react";
import { DEFAULT_DRUM_LANES, DrumInstrumentId, DrumNote, StageId, STAGES } from "./types";

interface DrumHighwayCanvasProps {
  notes: DrumNote[];
  currentTime: number;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  activeHits: Record<DrumInstrumentId, number>; // timestamp of last hit per lane for animation
  combo: number;
  score: number;
  multiplier: number;
  lastFeedback: { text: string; color: string; time: number } | null;
  speedMultiplier?: number;
  stageId?: StageId;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface ColdSparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  length: number;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
}

export const DrumHighwayCanvas: React.FC<DrumHighwayCanvasProps> = ({
  notes,
  currentTime,
  audioRef,
  activeHits,
  combo,
  score,
  multiplier,
  lastFeedback,
  speedMultiplier = 1.0,
  stageId = "concert-arena",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const coldSparksRef = useRef<ColdSparkParticle[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // High precision time tracker for 60FPS buttery-smooth note motion
  const timeStateRef = useRef<{
    lastAudioTime: number;
    lastPerfTime: number;
    interpolatedTime: number;
  }>({
    lastAudioTime: 0,
    lastPerfTime: 0,
    interpolatedTime: 0,
  });

  // Active Stage Config
  const stageConfig = STAGES.find((s) => s.id === stageId) || STAGES[0];

  // Spawn hit particles
  useEffect(() => {
    Object.entries(activeHits).forEach(([laneId, hitTime]) => {
      if (Date.now() - hitTime < 100) {
        const laneIndex = DEFAULT_DRUM_LANES.findIndex((l) => l.id === laneId);
        if (laneIndex !== -1 && canvasRef.current) {
          const canvas = canvasRef.current;
          const targetY = canvas.height * 0.86;
          const numLanes = DEFAULT_DRUM_LANES.length;
          const laneWidthAtBottom = (canvas.width * 0.82) / numLanes;
          const startX = canvas.width * 0.09;
          const hitX = startX + (laneIndex + 0.5) * laneWidthAtBottom;
          const laneColor = DEFAULT_DRUM_LANES[laneIndex].color;

          // Cap hit explosion particles (max 14 per hit for high performance)
          if (particlesRef.current.length < 50) {
            for (let i = 0; i < 12; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 5;
              particlesRef.current.push({
                x: hitX,
                y: targetY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.2,
                color: laneColor,
                size: 2 + Math.random() * 3,
                life: 1,
                maxLife: 15 + Math.random() * 10,
              });
            }
          }

          // Trigger extra pyrotechnic bursts on hit if combo >= 3
          if (combo >= 3 && coldSparksRef.current.length < 70) {
            const sparkColors = stageConfig.sparkColors;
            const leftCannonX = canvas.width * 0.08;
            const rightCannonX = canvas.width * 0.92;
            const cannonY = canvas.height * 0.82;

            [leftCannonX, rightCannonX].forEach((cx, idx) => {
              const baseVx = idx === 0 ? 1.2 : -1.2;
              const count = Math.min(12, 4 + Math.floor(combo / 3));
              for (let k = 0; k < count; k++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                const speed = 7 + Math.random() * 8;
                const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];

                coldSparksRef.current.push({
                  x: cx + (Math.random() - 0.5) * 12,
                  y: cannonY,
                  vx: Math.cos(angle) * speed + baseVx,
                  vy: Math.sin(angle) * speed,
                  color,
                  size: 2 + Math.random() * 2.5,
                  life: 1,
                  maxLife: 20 + Math.random() * 15,
                  length: 6 + Math.random() * 8,
                });
              }
            });
          }
        }
      }
    });
  }, [activeHits, combo, stageConfig.sparkColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeOffset = 0;

    const render = (nowPerf: number) => {
      timeOffset += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      // -------------------------------------------------------------
      // ULTRA-SMOOTH TIME INTERPOLATION (60 FPS Note Motion Sync)
      // -------------------------------------------------------------
      let activeTime = currentTime;
      const audio = audioRef?.current;
      const tState = timeStateRef.current;

      if (audio && !audio.paused && audio.duration) {
        const curAudioTime = audio.currentTime;
        if (tState.lastAudioTime !== curAudioTime) {
          tState.lastAudioTime = curAudioTime;
          tState.lastPerfTime = nowPerf;
          tState.interpolatedTime = curAudioTime;
        } else {
          const deltaSec = (nowPerf - tState.lastPerfTime) / 1000;
          tState.interpolatedTime = curAudioTime + deltaSec * (audio.playbackRate || 1.0);
        }
        activeTime = tState.interpolatedTime;
      } else {
        // Fallback for chart creator / pause
        activeTime = currentTime;
      }

      // Vanishing horizon coordinates
      const vpX = width / 2;
      const vpY = height * 0.28;
      const targetY = height * 0.86;
      const horizonScale = 0.14;
      const numLanes = DEFAULT_DRUM_LANES.length;

      // -------------------------------------------------------------
      // CONTINUOUS COLD SPARK FOUNTAINS (Lightweight 60FPS particles)
      // -------------------------------------------------------------
      if (combo >= 5 && coldSparksRef.current.length < 80) {
        const leftCannonX = width * 0.08;
        const rightCannonX = width * 0.92;
        const cannonY = height * 0.83;
        const sparkColors = stageConfig.sparkColors;
        const sparksPerFrame = Math.min(4, 1 + Math.floor(combo / 10));

        [leftCannonX, rightCannonX].forEach((cx, idx) => {
          const isLeft = idx === 0;
          for (let s = 0; s < sparksPerFrame; s++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4 + (isLeft ? 0.12 : -0.12);
            const speed = 6 + Math.random() * 8;
            const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];

            coldSparksRef.current.push({
              x: cx + (Math.random() - 0.5) * 10,
              y: cannonY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color,
              size: 2 + Math.random() * 2,
              life: 1,
              maxLife: 18 + Math.random() * 16,
              length: 5 + Math.random() * 8,
            });
          }
        });
      }

      // -------------------------------------------------------------
      // FLOATING CONFETTI PARTICLES
      // -------------------------------------------------------------
      if (combo >= 10 && confettiRef.current.length < 30 && Math.random() < 0.25) {
        const confettiColors = ["#00f0ff", "#ff0077", "#ffcc00", "#00ff66", "#a855f7", "#ffffff"];
        confettiRef.current.push({
          x: Math.random() * width,
          y: -10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 1.2 + Math.random() * 2.0,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          w: 5 + Math.random() * 6,
          h: 3 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          life: 1,
          maxLife: 120 + Math.random() * 50,
        });
      }

      // -------------------------------------------------------------
      // STAGE RENDERING ENGINES
      // -------------------------------------------------------------
      if (stageId === "concert-arena") {
        // Dark Concert Stadium
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#02040a");
        bgGrad.addColorStop(0.4, "#080e1e");
        bgGrad.addColorStop(0.8, "#050914");
        bgGrad.addColorStop(1, "#020307");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Roof light haze
        ctx.save();
        const roofGrad = ctx.createLinearGradient(0, 0, 0, height * 0.28);
        roofGrad.addColorStop(0, "rgba(0, 240, 255, 0.12)");
        roofGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = roofGrad;
        ctx.fillRect(0, 0, width, height * 0.28);

        // Crowd dots
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        for (let c = 0; c < 45; c++) {
          const cx = (c * 27.4) % width;
          const cy = height * 0.25 + ((c * 19.1) % (height * 0.12));
          ctx.fillRect(cx, cy, 2, 2);
        }
        ctx.restore();

        // Moving Overhead Concert Spotlights (No shadowBlur for fast performance)
        const spotlightCount = 4;
        for (let sp = 0; sp < spotlightCount; sp++) {
          const originX = width * (0.2 + sp * 0.2);
          const originY = height * 0.02;
          const sweepAngle = Math.sin(timeOffset * 1.2 + sp * 1.5) * 0.35;
          const beamWidth = width * 0.06;
          const targetBeamX = originX + Math.sin(sweepAngle) * height * 0.7;
          const targetBeamY = height * 0.9;

          ctx.save();
          const beamGrad = ctx.createLinearGradient(originX, originY, targetBeamX, targetBeamY);
          const spotColors = [
            "rgba(0, 240, 255, 0.15)",
            "rgba(0, 162, 255, 0.15)",
            "rgba(255, 0, 119, 0.15)",
            "rgba(255, 204, 0, 0.15)",
          ];
          const colorTheme = spotColors[sp % spotColors.length];
          beamGrad.addColorStop(0, colorTheme);
          beamGrad.addColorStop(0.7, colorTheme.replace("0.15)", "0.06)"));
          beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(originX - 4, originY);
          ctx.lineTo(originX + 4, originY);
          ctx.lineTo(targetBeamX + beamWidth, targetBeamY);
          ctx.lineTo(targetBeamX - beamWidth, targetBeamY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Side LED Matrix Light Towers
        const towerWidth = width * 0.055;
        const towerHeight = height * 0.62;
        const towerY = height * 0.11;

        [width * 0.02, width * 0.925].forEach((tx, isRightIdx) => {
          ctx.save();
          ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
          ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.fillRect(tx, towerY, towerWidth, towerHeight);
          ctx.strokeRect(tx, towerY, towerWidth, towerHeight);

          const rows = 10;
          const cols = 2;
          const blockW = (towerWidth - 6) / cols;
          const blockH = (towerHeight - 12) / rows;
          const ledColors = ["#ff0055", "#00f0ff", "#ffcc00", "#00ff66", "#0088ff"];

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const bx = tx + 3 + c * blockW;
              const by = towerY + 6 + r * blockH;
              const colorIdx = (r + c + Math.floor(timeOffset * 4 + isRightIdx)) % ledColors.length;
              const isActive = (r + Math.floor(timeOffset * 5)) % 3 !== 0;

              ctx.fillStyle = isActive ? ledColors[colorIdx] : "rgba(25, 35, 55, 0.5)";
              ctx.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);
            }
          }
          ctx.restore();
        });

        // Speaker Stacks
        const leftSpeakerX = width * 0.14;
        const rightSpeakerX = width * 0.86;
        const speakerY = height * 0.25;

        [leftSpeakerX, rightSpeakerX].forEach((sx) => {
          ctx.save();
          ctx.fillStyle = "rgba(12, 16, 26, 0.9)";
          ctx.strokeStyle = "rgba(255, 204, 0, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.fillRect(sx - 16, speakerY, 32, 110);
          ctx.strokeRect(sx - 16, speakerY, 32, 110);

          for (let spk = 0; spk < 3; spk++) {
            const cy = speakerY + 20 + spk * 35;
            ctx.fillStyle = "#050810";
            ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(sx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "rgba(255, 204, 0, 0.8)";
            ctx.beginPath();
            ctx.arc(sx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      } else if (stageId === "cyber-portal") {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        for (let i = 0; i < 30; i++) {
          const sx = (i * 137.5 + timeOffset * 5) % width;
          const sy = (i * 91.3) % (height * 0.4);
          ctx.fillRect(sx, sy, 2, 2);
        }

        const portalRadius = width * 0.18;
        const gradientPortal = ctx.createRadialGradient(vpX, vpY, 5, vpX, vpY, portalRadius * 1.5);
        gradientPortal.addColorStop(0, "rgba(0, 240, 255, 0.9)");
        gradientPortal.addColorStop(0.4, "rgba(10, 30, 80, 0.8)");
        gradientPortal.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.save();
        ctx.fillStyle = gradientPortal;
        ctx.beginPath();
        ctx.arc(vpX, vpY, portalRadius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(vpX, vpY, portalRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (stageId === "electro-dj") {
        ctx.fillStyle = "#0a0314";
        ctx.fillRect(0, 0, width, height);

        const eqCols = 8;
        const eqW = width * 0.016;
        for (let i = 0; i < eqCols; i++) {
          const eqH = (Math.sin(timeOffset * 8 + i) * 0.4 + 0.5) * (height * 0.32);
          const leftX = width * 0.03 + i * (eqW + 5);
          const rightX = width * 0.97 - i * (eqW + 5) - eqW;

          [leftX, rightX].forEach((ex) => {
            ctx.save();
            const eqGrad = ctx.createLinearGradient(ex, height * 0.5, ex, height * 0.5 - eqH);
            eqGrad.addColorStop(0, "#ff0077");
            eqGrad.addColorStop(0.5, "#a855f7");
            eqGrad.addColorStop(1, "#00f0ff");
            ctx.fillStyle = eqGrad;
            ctx.fillRect(ex, height * 0.5 - eqH, eqW, eqH);
            ctx.restore();
          });
        }
      } else {
        ctx.fillStyle = "#120804";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        const warmGlow = ctx.createRadialGradient(vpX, 0, 10, vpX, 0, width * 0.5);
        warmGlow.addColorStop(0, "rgba(255, 170, 0, 0.35)");
        warmGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = warmGlow;
        ctx.fillRect(0, 0, width, height * 0.5);
        ctx.restore();
      }

      // -------------------------------------------------------------
      // HIGHWAY TRACK SURFACE (3D Perspective)
      // -------------------------------------------------------------
      const highwayTopW = width * 0.18;
      const highwayBottomW = width * 0.84;
      const highwayTopX = vpX - highwayTopW / 2;
      const highwayBottomX = vpX - highwayBottomW / 2;

      const trackGrad = ctx.createLinearGradient(0, vpY, 0, height);
      trackGrad.addColorStop(0, "rgba(10, 25, 45, 0.9)");
      trackGrad.addColorStop(0.5, "rgba(5, 18, 35, 0.95)");
      trackGrad.addColorStop(1, "rgba(2, 8, 20, 0.98)");

      ctx.fillStyle = trackGrad;
      ctx.beginPath();
      ctx.moveTo(highwayTopX, vpY);
      ctx.lineTo(highwayTopX + highwayTopW, vpY);
      ctx.lineTo(highwayBottomX + highwayBottomW, targetY + 70);
      ctx.lineTo(highwayBottomX, targetY + 70);
      ctx.closePath();
      ctx.fill();

      // Highway Neon Borders
      ctx.save();
      ctx.strokeStyle = stageConfig.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(highwayTopX, vpY);
      ctx.lineTo(highwayBottomX, targetY + 70);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(highwayTopX + highwayTopW, vpY);
      ctx.lineTo(highwayBottomX + highwayBottomW, targetY + 70);
      ctx.stroke();
      ctx.restore();

      // Horizontal perspective grid lines
      const numGridLines = 10;
      const gridSpeed = (activeTime * 1.5 * speedMultiplier) % 1;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.22)";
      ctx.lineWidth = 1.5;

      for (let i = 0; i < numGridLines; i++) {
        const prog = ((i + gridSpeed) / numGridLines) % 1;
        const lineY = vpY + (targetY - vpY) * Math.pow(prog, 1.2);
        const curScale = horizonScale + (1 - horizonScale) * prog;
        const curW = highwayBottomW * curScale;
        const curX = vpX - curW / 2;

        ctx.beginPath();
        ctx.moveTo(curX, lineY);
        ctx.lineTo(curX + curW, lineY);
        ctx.stroke();
      }

      // Drum Instrument Lanes Dividers
      for (let i = 0; i <= numLanes; i++) {
        const tRatio = i / numLanes;
        const topX = highwayTopX + highwayTopW * tRatio;
        const bottomX = highwayBottomX + highwayBottomW * tRatio;

        ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
        ctx.lineWidth = i === 0 || i === numLanes ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(topX, vpY);
        ctx.lineTo(bottomX, targetY + 70);
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // STAGE FLOOR GLOW
      // -------------------------------------------------------------
      ctx.save();
      const stageFloorY = targetY + 25;
      const floorGrad = ctx.createRadialGradient(
        vpX,
        stageFloorY,
        10,
        vpX,
        stageFloorY,
        width * 0.4
      );
      floorGrad.addColorStop(0, "rgba(0, 240, 255, 0.2)");
      floorGrad.addColorStop(0.5, "rgba(0, 255, 102, 0.1)");
      floorGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.ellipse(vpX, stageFloorY, width * 0.4, height * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(vpX, stageFloorY, width * 0.36, height * 0.09, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Cold Spark Cannon Outlets
      const leftCannonX = width * 0.08;
      const rightCannonX = width * 0.92;
      const cannonY = height * 0.83;

      [leftCannonX, rightCannonX].forEach((cx) => {
        ctx.save();
        ctx.fillStyle = "#0b1220";
        ctx.strokeStyle = combo >= 5 ? "#ffaa00" : "rgba(0, 240, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.fillRect(cx - 15, cannonY - 10, 30, 20);
        ctx.strokeRect(cx - 15, cannonY - 10, 30, 20);

        ctx.fillStyle = combo >= 5 ? "#ffffff" : "#ffaa00";
        ctx.fillRect(cx - 5, cannonY - 14, 10, 5);

        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚡PYRO", cx, cannonY + 4);
        ctx.restore();
      });

      // -------------------------------------------------------------
      // TARGET STRIKE LINE & DRUM PADS AT BOTTOM
      // -------------------------------------------------------------
      ctx.save();
      ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(highwayBottomX - 10, targetY);
      ctx.lineTo(highwayBottomX + highwayBottomW + 10, targetY);
      ctx.stroke();
      ctx.restore();

      const noteTravelTime = 1.9 / speedMultiplier;

      DEFAULT_DRUM_LANES.forEach((lane, i) => {
        const laneW = highwayBottomW / numLanes;
        const targetX = highwayBottomX + (i + 0.5) * laneW;
        const isHitActive = Date.now() - (activeHits[lane.id] || 0) < 160;
        const padRadius = Math.min(laneW * 0.44, 26);

        ctx.save();
        ctx.translate(targetX, targetY);

        if (isHitActive) {
          ctx.fillStyle = lane.color;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(0, 0, padRadius * 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = isHitActive ? "#ffffff" : "#0d1b2a";
        ctx.strokeStyle = isHitActive ? "#ffffff" : lane.color;
        ctx.lineWidth = isHitActive ? 3.5 : 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, padRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = lane.color;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;

        if (lane.shape === "star") {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const rotS = (s * Math.PI * 2) / 5 - Math.PI / 2;
            const rOuter = padRadius * 0.55;
            const rInner = padRadius * 0.25;
            const sx = Math.cos(rotS) * rOuter;
            const sy = Math.sin(rotS) * rOuter;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);

            const rotInner = rotS + Math.PI / 5;
            ctx.lineTo(Math.cos(rotInner) * rInner, Math.sin(rotInner) * rInner);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (lane.shape === "cross") {
          const size = padRadius * 0.45;
          ctx.beginPath();
          ctx.moveTo(-size, 0);
          ctx.lineTo(size, 0);
          ctx.moveTo(0, -size);
          ctx.lineTo(0, size);
          ctx.stroke();
        } else if (lane.shape === "diamond") {
          const size = padRadius * 0.5;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, 0);
          ctx.moveTo(0, size);
          ctx.lineTo(-size, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, padRadius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = isHitActive ? "#ffffff" : lane.color;
        ctx.textAlign = "center";
        ctx.fillText(lane.key.toUpperCase(), 0, padRadius + 14);

        ctx.font = "9px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillText(lane.shortLabel, 0, padRadius + 25);

        ctx.restore();
      });

      // -------------------------------------------------------------
      // FALLING DRUM NOTES (UTRA-FLUID 60FPS WITH MOTION TAILS)
      // -------------------------------------------------------------
      notes.forEach((note) => {
        if (note.hit || note.missed) return;

        const timeDiff = note.time - activeTime;
        if (timeDiff > noteTravelTime || timeDiff < -0.25) return;

        // Linear progression from horizon (0.0) to target line (1.0)
        const progress = 1.0 - timeDiff / noteTravelTime;
        if (progress < -0.05 || progress > 1.15) return;

        const laneIndex = DEFAULT_DRUM_LANES.findIndex((l) => l.id === note.laneId);
        if (laneIndex === -1) return;

        const laneConfig = DEFAULT_DRUM_LANES[laneIndex];

        // Smooth perspective math with linear progression for constant speed feeling
        const curScale = horizonScale + (1 - horizonScale) * Math.pow(progress, 1.1);
        const curY = vpY + (targetY - vpY) * Math.pow(progress, 1.1);

        const laneWTop = highwayTopW / numLanes;
        const laneWBottom = highwayBottomW / numLanes;
        const noteXTop = highwayTopX + (laneIndex + 0.5) * laneWTop;
        const noteXBottom = highwayBottomX + (laneIndex + 0.5) * laneWBottom;

        const noteX = noteXTop + (noteXBottom - noteXTop) * progress;
        const noteRadius = Math.max(7, 25 * curScale);

        // Calculate tail origin towards horizon for smooth motion trail
        const tailLength = Math.max(12, 35 * curScale);
        const prevProg = Math.max(0, progress - 0.08);
        const prevY = vpY + (targetY - vpY) * Math.pow(prevProg, 1.1);
        const prevX = noteXTop + (noteXBottom - noteXTop) * prevProg;

        ctx.save();

        // Motion Tail (Meteor trail effect making timing crystal clear)
        const tailGrad = ctx.createLinearGradient(noteX, curY, prevX, prevY);
        tailGrad.addColorStop(0, laneConfig.color);
        tailGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = noteRadius * 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(noteX, curY);
        ctx.lineTo(prevX, prevY);
        ctx.stroke();

        // Outer Glow Ring (Fast 2-pass drawing instead of shadowBlur)
        ctx.fillStyle = laneConfig.color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(noteX, curY, noteRadius * 1.35, 0, Math.PI * 2);
        ctx.fill();

        // Note Core Circle
        ctx.globalAlpha = 1.0;
        const noteGrad = ctx.createRadialGradient(
          noteX - noteRadius * 0.2,
          curY - noteRadius * 0.2,
          1,
          noteX,
          curY,
          noteRadius
        );
        noteGrad.addColorStop(0, "#ffffff");
        noteGrad.addColorStop(0.5, laneConfig.color);
        noteGrad.addColorStop(1, laneConfig.accentColor);

        ctx.fillStyle = noteGrad;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1.5, 2.5 * curScale);

        ctx.beginPath();
        ctx.arc(noteX, curY, noteRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner shape icon inside note
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(noteX, curY, noteRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // -------------------------------------------------------------
      // HIT PARTICLES (HIGH SPEED NO-SHADOW RENDER)
      // -------------------------------------------------------------
      const validParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        if (alpha > 0) {
          validParticles.push(p);

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      particlesRef.current = validParticles;

      // -------------------------------------------------------------
      // COLD SPARK PARTICLES (PIROTECNIA FRÍA - HIGH SPEED 60FPS)
      // -------------------------------------------------------------
      const validSparks: ColdSparkParticle[] = [];
      coldSparksRef.current.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.28;
        sp.life++;

        const alpha = 1 - sp.life / sp.maxLife;
        if (alpha > 0 && sp.y <= height + 20) {
          validSparks.push(sp);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = sp.color;
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = sp.size;

          // Spark Streak line
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(sp.x - sp.vx * 1.4, sp.y - sp.vy * 1.4);
          ctx.stroke();

          // Spark bright core head
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      coldSparksRef.current = validSparks;

      // -------------------------------------------------------------
      // CONFETTI PARTICLES
      // -------------------------------------------------------------
      const validConfetti: ConfettiParticle[] = [];
      confettiRef.current.forEach((c) => {
        c.x += c.vx + Math.sin(timeOffset * 3 + c.y * 0.05) * 0.7;
        c.y += c.vy;
        c.rotation += c.rotSpeed;
        c.life++;

        const alpha = 1 - c.life / c.maxLife;
        if (alpha > 0 && c.y <= height + 20) {
          validConfetti.push(c);

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rotation);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
          ctx.restore();
        }
      });
      confettiRef.current = validConfetti;

      // -------------------------------------------------------------
      // OVERLAY HUD
      // -------------------------------------------------------------
      ctx.save();
      // Score Panel
      ctx.fillStyle = "rgba(10, 20, 40, 0.75)";
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(15, 15, 180, 70, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "10px sans-serif";
      ctx.fillText("PUNTAJE", 30, 35);

      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(score.toLocaleString(), 30, 65);

      // Combo Panel
      if (combo > 1) {
        ctx.fillStyle = "rgba(10, 20, 40, 0.85)";
        ctx.strokeStyle = combo >= 5 ? "#ffaa00" : "rgba(255, 204, 0, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(width - 195, 15, 180, 75, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${combo}x COMBO 🔥`, width - 25, 48);

        if (multiplier > 1) {
          ctx.fillStyle = "#ffaa00";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(`MULTIPLICADOR ${multiplier}X!`, width - 25, 68);
        }

        if (combo >= 5) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText("⚡ PIROTECNIA FRÍA ACTIVA ⚡", width - 25, 82);
        }
      }

      // Hits Feedback (PERFECT / GREAT / GOOD / MISS)
      if (lastFeedback && Date.now() - lastFeedback.time < 800) {
        const elapsed = (Date.now() - lastFeedback.time) / 800;
        const textY = targetY - 40 - elapsed * 30;
        const alpha = 1 - elapsed;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = lastFeedback.color;
        ctx.fillText(lastFeedback.text, vpX, textY);
        ctx.restore();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    notes,
    currentTime,
    audioRef,
    activeHits,
    combo,
    score,
    multiplier,
    lastFeedback,
    speedMultiplier,
    stageId,
    stageConfig,
  ]);

  // Responsive canvas resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const parent = canvasRef.current.parentElement;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight || 580;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.2)] bg-black">
      <div className="absolute top-3 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] uppercase select-none">
          D R U M S &nbsp; H E R O
        </h1>
        <span className="text-[10px] font-bold tracking-wider text-cyan-300/80 bg-black/60 px-3 py-0.5 rounded-full border border-cyan-500/30 uppercase mt-0.5">
          {stageConfig.name}
        </span>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

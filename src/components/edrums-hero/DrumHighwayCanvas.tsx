"use client";

import React, { useEffect, useRef } from "react";
import { DEFAULT_DRUM_LANES, DrumInstrumentId, DrumNote } from "./types";

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // High precision time tracker to eliminate HTML5 audio timeupdate stutter
  const lastAudioTickRef = useRef<{ audioTime: number; perfTime: number }>({
    audioTime: 0,
    perfTime: 0,
  });

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

          for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            particlesRef.current.push({
              x: hitX,
              y: targetY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1.5,
              color: laneColor,
              size: 2 + Math.random() * 4,
              life: 1,
              maxLife: 20 + Math.random() * 15,
            });
          }
        }
      }
    });
  }, [activeHits]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeOffset = 0;

    const render = () => {
      timeOffset += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      // Calculate ultra-smooth high-precision audio timestamp
      let activeTime = currentTime;
      const audio = audioRef?.current;
      if (audio && !audio.paused && audio.duration) {
        const now = performance.now();
        if (lastAudioTickRef.current.audioTime !== audio.currentTime) {
          lastAudioTickRef.current = {
            audioTime: audio.currentTime,
            perfTime: now,
          };
        }
        const deltaSec = (now - lastAudioTickRef.current.perfTime) / 1000;
        activeTime = audio.currentTime + deltaSec * (audio.playbackRate || 1.0);
      }

      // 1. Clear background & draw Starry Space Void
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, width, height);

      // Stars background
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5 + timeOffset * 5) % width;
        const sy = (i * 91.3) % (height * 0.4);
        const sSize = (i % 3) + 1;
        ctx.fillRect(sx, sy, sSize, sSize);
      }

      // 2. Vanishing horizon coordinates
      const vpX = width / 2;
      const vpY = height * 0.28;
      const targetY = height * 0.86;
      const horizonScale = 0.12;

      // 3. Draw Outer Portal Archway & Sci-Fi Structure (Matches image)
      const portalRadius = width * 0.18;
      const gradientPortal = ctx.createRadialGradient(
        vpX,
        vpY,
        5,
        vpX,
        vpY,
        portalRadius * 1.5
      );
      gradientPortal.addColorStop(0, "rgba(0, 240, 255, 0.9)");
      gradientPortal.addColorStop(0.4, "rgba(10, 30, 80, 0.8)");
      gradientPortal.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.fillStyle = gradientPortal;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Portal Neon Rings
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalRadius * 0.8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vpX, vpY, portalRadius * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Sci-Fi Arch Frame around portal
      ctx.save();
      ctx.strokeStyle = "#00a2ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(vpX - width * 0.35, vpY + height * 0.1);
      ctx.lineTo(vpX - width * 0.25, vpY - height * 0.12);
      ctx.lineTo(vpX + width * 0.25, vpY - height * 0.12);
      ctx.lineTo(vpX + width * 0.35, vpY + height * 0.1);
      ctx.stroke();
      ctx.restore();

      // 4. Highway Track Surface (3D Trapezoid)
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
      ctx.strokeStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 15;
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

      // Horizontal perspective grid lines (moving smoothly towards player)
      const numGridLines = 10;
      const gridSpeed = (activeTime * 1.5 * speedMultiplier) % 1;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 1.5;

      for (let i = 0; i < numGridLines; i++) {
        const prog = ((i + gridSpeed) / numGridLines) % 1;
        const lineY = vpY + (targetY - vpY) * Math.pow(prog, 1.25);
        const curScale = horizonScale + (1 - horizonScale) * prog;
        const curW = highwayBottomW * curScale;
        const curX = vpX - curW / 2;

        ctx.beginPath();
        ctx.moveTo(curX, lineY);
        ctx.lineTo(curX + curW, lineY);
        ctx.stroke();
      }

      // 5. Drum Instrument Lanes
      const numLanes = DEFAULT_DRUM_LANES.length;
      const laneCoords: { topX: number; bottomX: number; color: string }[] = [];

      for (let i = 0; i <= numLanes; i++) {
        const tRatio = i / numLanes;
        const topX = highwayTopX + highwayTopW * tRatio;
        const bottomX = highwayBottomX + highwayBottomW * tRatio;

        if (i < numLanes) {
          laneCoords.push({
            topX,
            bottomX,
            color: DEFAULT_DRUM_LANES[i].color,
          });
        }

        // Vertical lane divider line
        ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
        ctx.lineWidth = i === 0 || i === numLanes ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(topX, vpY);
        ctx.lineTo(bottomX, targetY + 70);
        ctx.stroke();
      }

      // 6. Side Turbines / Energy Flares
      const sideTurbineY = height * 0.62;
      const leftTurbineX = highwayBottomX - width * 0.08;
      const rightTurbineX = highwayBottomX + highwayBottomW + width * 0.08;

      [leftTurbineX, rightTurbineX].forEach((tx, idx) => {
        ctx.save();
        const isLeft = idx === 0;
        const turbineGrad = ctx.createRadialGradient(tx, sideTurbineY, 5, tx, sideTurbineY, 45);
        turbineGrad.addColorStop(0, "rgba(255, 170, 0, 0.9)");
        turbineGrad.addColorStop(0.6, "rgba(255, 60, 0, 0.5)");
        turbineGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = turbineGrad;
        ctx.beginPath();
        ctx.arc(tx, sideTurbineY, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tx, sideTurbineY, 28, 0, Math.PI * 2);
        ctx.stroke();

        const rot = timeOffset * (isLeft ? 2 : -2);
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(rot) * 25, sideTurbineY + Math.sin(rot) * 25);
        ctx.lineTo(tx - Math.cos(rot) * 25, sideTurbineY - Math.sin(rot) * 25);
        ctx.moveTo(
          tx + Math.cos(rot + Math.PI / 2) * 25,
          sideTurbineY + Math.sin(rot + Math.PI / 2) * 25
        );
        ctx.lineTo(
          tx - Math.cos(rot + Math.PI / 2) * 25,
          sideTurbineY - Math.sin(rot + Math.PI / 2) * 25
        );
        ctx.stroke();
        ctx.restore();
      });

      // 7. Target Strike Line at Bottom
      ctx.save();
      ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(highwayBottomX - 10, targetY);
      ctx.lineTo(highwayBottomX + highwayBottomW + 10, targetY);
      ctx.stroke();
      ctx.restore();

      // 8. Target Drum Pad Icons at Bottom (9 Lanes)
      const noteTravelTime = 2.0 / speedMultiplier; // Seconds from horizon to target

      DEFAULT_DRUM_LANES.forEach((lane, i) => {
        const laneW = highwayBottomW / numLanes;
        const targetX = highwayBottomX + (i + 0.5) * laneW;
        const isHitActive = Date.now() - (activeHits[lane.id] || 0) < 160;

        const padRadius = Math.min(laneW * 0.44, 26);

        ctx.save();
        ctx.translate(targetX, targetY);

        if (isHitActive) {
          const hitGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, padRadius * 2);
          hitGlow.addColorStop(0, lane.color);
          hitGlow.addColorStop(0.7, "rgba(255, 255, 255, 0.8)");
          hitGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = hitGlow;
          ctx.beginPath();
          ctx.arc(0, 0, padRadius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isHitActive ? "#ffffff" : "#0d1b2a";
        ctx.strokeStyle = isHitActive ? "#ffffff" : lane.color;
        ctx.shadowColor = lane.color;
        ctx.shadowBlur = isHitActive ? 25 : 10;
        ctx.lineWidth = isHitActive ? 4 : 2.5;

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

      // 9. Render Falling Notes with Ultra-Smooth Motion
      notes.forEach((note) => {
        if (note.hit || note.missed) return;

        const timeDiff = note.time - activeTime;
        // Visible time window
        if (timeDiff > noteTravelTime || timeDiff < -0.2) return;

        // Progress: 0.0 (horizon) -> 1.0 (targetY line)
        const progress = 1.0 - timeDiff / noteTravelTime;
        if (progress < 0 || progress > 1.15) return;

        const laneIndex = DEFAULT_DRUM_LANES.findIndex((l) => l.id === note.laneId);
        if (laneIndex === -1) return;

        const laneConfig = DEFAULT_DRUM_LANES[laneIndex];

        // Smooth 3D perspective calculation
        const curScale = horizonScale + (1 - horizonScale) * progress;
        const curY = vpY + (targetY - vpY) * Math.pow(progress, 1.25);

        const laneWTop = highwayTopW / numLanes;
        const laneWBottom = highwayBottomW / numLanes;
        const noteXTop = highwayTopX + (laneIndex + 0.5) * laneWTop;
        const noteXBottom = highwayBottomX + (laneIndex + 0.5) * laneWBottom;

        const noteX = noteXTop + (noteXBottom - noteXTop) * progress;
        const noteRadius = Math.max(6, 26 * curScale);

        ctx.save();
        ctx.translate(noteX, curY);

        ctx.shadowColor = laneConfig.color;
        ctx.shadowBlur = 15 * curScale;

        const noteGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, noteRadius);
        noteGrad.addColorStop(0, "#ffffff");
        noteGrad.addColorStop(0.5, laneConfig.color);
        noteGrad.addColorStop(1, laneConfig.accentColor);

        ctx.fillStyle = noteGrad;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, 2 * curScale);

        ctx.beginPath();
        ctx.arc(0, 0, noteRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      });

      // 10. Render Hit Particles
      particlesRef.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) {
          particlesRef.current.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 11. Overlay HUD
      ctx.save();
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

      if (combo > 1) {
        ctx.fillStyle = "rgba(10, 20, 40, 0.75)";
        ctx.strokeStyle = "rgba(255, 204, 0, 0.5)";
        ctx.beginPath();
        ctx.roundRect(width - 175, 15, 160, 70, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${combo}x COMBO`, width - 30, 48);

        if (multiplier > 1) {
          ctx.fillStyle = "#ffaa00";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(`MULTIPLICADOR ${multiplier}X!`, width - 30, 68);
        }
      }

      if (lastFeedback && Date.now() - lastFeedback.time < 800) {
        const elapsed = (Date.now() - lastFeedback.time) / 800;
        const textY = targetY - 40 - elapsed * 30;
        const alpha = 1 - elapsed;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = lastFeedback.color;
        ctx.shadowColor = lastFeedback.color;
        ctx.shadowBlur = 20;
        ctx.fillText(lastFeedback.text, vpX, textY);
        ctx.restore();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

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
  ]);

  // Responsive canvas resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const parent = canvasRef.current.parentElement;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight || 560;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.2)] bg-black">
      <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] uppercase select-none">
          D R U M S &nbsp; H E R O
        </h1>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PowCoinGameModalProps = {
  timeSeconds?: number;
  playerImageSrc: string;
  coinImageSrc: string;
  onCoinCollected?: () => void;
  onComplete: (coinsCollected: number) => Promise<void> | void;
  onRequestClose: () => void;
};

type Rect = { x: number; y: number; w: number; h: number };
function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function PowCoinGameModal({
  timeSeconds = 15,
  playerImageSrc,
  coinImageSrc,
  onCoinCollected,
  onComplete,
  onRequestClose,
}: PowCoinGameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const mountedRef = useRef(true);

  const pressedRef = useRef({
    left: false,
    right: false,
    jump: false,
  });
  /** Tecla de salto físicamente abajo (no se limpia al consumir el salto). Sirve para el jump-cut. */
  const jumpKeyHeldRef = useRef(false);

  const [timeLeftMs, setTimeLeftMs] = useState(timeSeconds * 1000);
  const [score, setScore] = useState(0);
  const [coinsCount, setCoinsCount] = useState(0);
  const [crystalsCount, setCrystalsCount] = useState(0);
  const [powerUpsCount, setPowerUpsCount] = useState(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "summary" | "updating">("ready");
  const [centerGain, setCenterGain] = useState<{ id: number; text: string } | null>(null);
  const [isBoostActive, setIsBoostActive] = useState(false);

  const scoreRef = useRef(0);
  const countsRef = useRef({ coins: 0, crystals: 0, powerUps: 0 });
  const gameStateRef = useRef({
    started: false,
    startAt: 0,
    endAt: 0,
  });
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const musicFadeRef = useRef<number | null>(null);
  const gainIdRef = useRef(0);
  const centerGainTimerRef = useRef<number | null>(null);
  const boostActiveRef = useRef(false);

  const requestCanvasResize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  const pushCenterGain = useCallback((text: string) => {
    gainIdRef.current += 1;
    setCenterGain({ id: gainIdRef.current, text });
    if (centerGainTimerRef.current) window.clearTimeout(centerGainTimerRef.current);
    centerGainTimerRef.current = window.setTimeout(() => setCenterGain(null), 650);
  }, []);

  const stopBackgroundMusic = useCallback((withFade: boolean) => {
    if (musicFadeRef.current) {
      window.clearInterval(musicFadeRef.current);
      musicFadeRef.current = null;
    }
    const bgm = bgMusicRef.current;
    if (!bgm) return;
    if (!withFade) {
      bgm.pause();
      bgm.currentTime = 0;
      bgm.volume = 0.35;
      bgMusicRef.current = null;
      return;
    }
    musicFadeRef.current = window.setInterval(() => {
      if (!bgMusicRef.current) return;
      const next = Math.max(0, bgMusicRef.current.volume - 0.04);
      bgMusicRef.current.volume = next;
      if (next <= 0.02) {
        if (musicFadeRef.current) {
          window.clearInterval(musicFadeRef.current);
          musicFadeRef.current = null;
        }
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
        bgMusicRef.current.volume = 0.35;
        bgMusicRef.current = null;
      }
    }, 60);
  }, []);

  const startBackgroundMusic = useCallback(() => {
    stopBackgroundMusic(false);
    const bgm = new Audio("/sound/pow_game_start.mp3");
    bgm.preload = "auto";
    bgm.loop = true;
    bgm.volume = 0.35;
    bgMusicRef.current = bgm;
    void bgm.play().catch(() => {});
  }, [stopBackgroundMusic]);

  const finishToSummary = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopBackgroundMusic(true);
    setPhase("summary");
    setIsBoostActive(false);
  }, [stopBackgroundMusic]);

  const closeGame = useCallback(
    async (save: boolean) => {
      if (phase === "updating") return;
      setPhase("updating");
      try {
        if (save) {
          await onComplete(scoreRef.current);
        }
      } finally {
        stopBackgroundMusic(true);
        if (mountedRef.current) onRequestClose();
      }
    },
    [onComplete, onRequestClose, phase, stopBackgroundMusic]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (centerGainTimerRef.current) window.clearTimeout(centerGainTimerRef.current);
      stopBackgroundMusic(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [stopBackgroundMusic]);

  useEffect(() => {
    let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onKeyUp: ((e: KeyboardEvent) => void) | null = null;
    let cleanupResize = false;
    let onPointerDown: ((e: PointerEvent) => void) | null = null;

    const run = async () => {
      requestCanvasResize();
      window.addEventListener("resize", requestCanvasResize);
      cleanupResize = true;

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
          img.src = src;
        });

      let playerImg: HTMLImageElement | null = null;
      let coinImg: HTMLImageElement | null = null;
      let blockImg: HTMLImageElement | null = null;
      try {
        [playerImg, coinImg, blockImg] = await Promise.all([
          loadImage(playerImageSrc),
          loadImage(coinImageSrc),
          loadImage("/image/block_.png"),
        ]);
      } catch {
        // Si faltan assets, evitamos romper la UI.
      }
      const coinSound = new Audio("/sound/coin_collect.mp3");
      coinSound.preload = "auto";
      coinSoundRef.current = coinSound;
      const canvas = canvasRef.current;
      const wrap = canvasWrapRef.current;
      if (!canvas || !wrap) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = wrap.getBoundingClientRect();
      const worldW = Math.max(320, Math.floor(rect.width));
      const worldH = Math.max(240, Math.floor(rect.height));

      // Coord. en "pixels CSS". El canvas puede estar escalado por dpr, por eso usamos escala.
      const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const groundY = worldH - 26;
      const playerSize = Math.min(52, Math.max(40, worldW / 10));
      const coinSize = Math.min(30, Math.max(20, worldW / 16));

      const worldPaddingX = 10;

      const player = {
        x: worldW / 2 - playerSize / 2,
        y: groundY - playerSize,
        vx: 0,
        vy: 0,
        w: playerSize,
        h: playerSize,
        onGround: true,
      };
      const powerUpUntil = { value: 0 };
      const jumpBufferUntil = { value: 0 };
      const coyoteUntil = { value: 0 };
      const jumpCutWindowUntil = { value: 0 };
      const jumpNeedsRelease = { value: false };
      const flyingRewards: Array<{
        x: number;
        y: number;
        toX: number;
        toY: number;
        born: number;
        durationMs: number;
      }> = [];

      const platforms: Rect[] = [
        { x: 0, y: groundY, w: worldW, h: 30 },
        { x: 24, y: groundY - 58, w: Math.max(80, worldW * 0.22), h: 14 },
        { x: worldW * 0.34, y: groundY - 145, w: Math.max(90, worldW * 0.2), h: 14 },
        { x: worldW * 0.62, y: groundY - 220, w: Math.max(88, worldW * 0.2), h: 14 },
        { x: worldW * 0.42, y: groundY - 290, w: Math.max(86, worldW * 0.18), h: 14 },
        { x: worldW * 0.16, y: groundY - 355, w: Math.max(80, worldW * 0.18), h: 14 },
      ];
      const flagRect: Rect = {
        x: Math.max(16, worldW * 0.14),
        y: groundY - 405,
        w: 34,
        h: 54,
      };

      const coins: Array<{
        id: string;
        x: number;
        y: number;
        vy: number;
      }> = [];
      const specialCrystal = {
        active: false,
        x: 0,
        y: -60,
        vy: 150,
        size: Math.min(34, Math.max(24, worldW / 15)),
      };
      const powerUp = {
        active: false,
        x: 0,
        y: 0,
        size: Math.min(36, Math.max(24, worldW / 14)),
      };

      const bg = () => {
        const g = ctx.createLinearGradient(0, 0, 0, worldH);
        g.addColorStop(0, "#48b6ff");
        g.addColorStop(0.46, "#2388dd");
        g.addColorStop(1, "#0b2a58");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, worldW, worldH);

        // Bandas diagonales suaves para sensación arcade.
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = "#c9ecff";
        ctx.lineWidth = 14;
        for (let i = -worldH; i < worldW + worldH; i += 56) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i - worldH * 0.7, worldH);
          ctx.stroke();
        }
        ctx.restore();

        // Nubes decorativas.
        const clouds = [
          { x: worldW * 0.15, y: worldH * 0.14, s: 0.9 },
          { x: worldW * 0.62, y: worldH * 0.1, s: 1.1 },
          { x: worldW * 0.84, y: worldH * 0.2, s: 0.75 },
        ];
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        for (const c of clouds) {
          const r = 18 * c.s;
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          ctx.arc(c.x + r * 0.9, c.y + 2, r * 0.85, 0, Math.PI * 2);
          ctx.arc(c.x - r * 0.9, c.y + 2, r * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      const drawWorld = () => {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(0, groundY, worldW, 2);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(0, groundY + 2, worldW, 6);

        for (let i = 1; i < platforms.length; i += 1) {
          const p = platforms[i];
          if (blockImg) {
            const tile = 24;
            for (let y = p.y; y < p.y + p.h; y += tile) {
              for (let x = p.x; x < p.x + p.w; x += tile) {
                ctx.drawImage(blockImg, x, y, tile, tile);
              }
            }
          } else {
            ctx.fillStyle = "rgba(169, 91, 29, 0.95)";
            ctx.fillRect(p.x, p.y, p.w, p.h);
          }

          // Borde brillante tipo bloque clásico.
          ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
          ctx.fillRect(p.x, p.y, p.w, 2);
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
          ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
        }

        // Monedas decorativas en el fondo.
        ctx.save();
        ctx.strokeStyle = "rgba(255, 234, 130, 0.55)";
        ctx.lineWidth = 2;
        const decoCoins = [
          { x: worldW * 0.2, y: worldH * 0.34 },
          { x: worldW * 0.48, y: worldH * 0.28 },
          { x: worldW * 0.72, y: worldH * 0.4 },
          { x: worldW * 0.88, y: worldH * 0.3 },
        ];
        for (const dc of decoCoins) {
          ctx.beginPath();
          ctx.arc(dc.x, dc.y, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(dc.x, dc.y - 5);
          ctx.lineTo(dc.x, dc.y + 5);
          ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = "#d9d9d9";
        ctx.fillRect(flagRect.x + 4, flagRect.y - 8, 4, flagRect.h + 10);
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.moveTo(flagRect.x + 8, flagRect.y - 6);
        ctx.lineTo(flagRect.x + 32, flagRect.y + 2);
        ctx.lineTo(flagRect.x + 8, flagRect.y + 12);
        ctx.closePath();
        ctx.fill();
      };
      const drawPlayer = (isPoweredUp: boolean) => {
        if (playerImg) {
          ctx.save();
          if (isPoweredUp) {
            ctx.filter = "hue-rotate(150deg) saturate(1.8)";
            ctx.shadowColor = "rgba(255,0,255,0.75)";
            ctx.shadowBlur = 14;
          }
          ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
          ctx.restore();
          return;
        }
        ctx.fillStyle = isPoweredUp ? "rgba(255, 85, 236, 0.95)" : "rgba(30, 235, 255, 0.95)";
        ctx.fillRect(player.x, player.y, player.w, player.h);
      };
      const drawCrystal = () => {
        const x = specialCrystal.x;
        const y = specialCrystal.y;
        const s = specialCrystal.size;
        ctx.save();
        ctx.shadowColor = "rgba(36, 221, 255, 0.7)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#6ee7ff";
        ctx.beginPath();
        ctx.moveTo(x + s * 0.5, y);
        ctx.lineTo(x + s, y + s * 0.45);
        ctx.lineTo(x + s * 0.5, y + s);
        ctx.lineTo(x, y + s * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      const drawPowerUp = () => {
        const x = powerUp.x;
        const y = powerUp.y;
        const s = powerUp.size;
        ctx.save();
        ctx.fillStyle = "#c026d3";
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = "#f0abfc";
        ctx.fillRect(x + s * 0.42, y + s * 0.16, s * 0.16, s * 0.68);
        ctx.fillRect(x + s * 0.16, y + s * 0.42, s * 0.68, s * 0.16);
        ctx.restore();
      };
      const drawStartOverlay = () => {
        const btn = {
          x: worldW / 2 - 95,
          y: Math.max(35, worldH * 0.15),
          w: 190,
          h: 58,
        };
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, worldW, worldH);
        const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        btnGradient.addColorStop(0, "#35d564");
        btnGradient.addColorStop(1, "#15803d");
        ctx.fillStyle = btnGradient;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x + 1, btn.y + 1, btn.w - 2, btn.h - 2);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("INICIAR", btn.x + 56, btn.y + 36);
      };
      const drawFlyingRewards = (now: number) => {
        for (let i = flyingRewards.length - 1; i >= 0; i -= 1) {
          const f = flyingRewards[i];
          const p = Math.min(1, (now - f.born) / f.durationMs);
          const eased = 1 - (1 - p) * (1 - p);
          const x = f.x + (f.toX - f.x) * eased;
          const y = f.y + (f.toY - f.y) * eased;
          const alpha = 1 - p;
          ctx.save();
          ctx.globalAlpha = alpha;
          if (coinImg) {
            const s = coinSize * (1 - p * 0.35);
            ctx.drawImage(coinImg, x - s / 2, y - s / 2, s, s);
          }
          ctx.restore();
          if (p >= 1) flyingRewards.splice(i, 1);
        }
      };

      const durationMs = timeSeconds * 1000;

      const spawnEveryMs = 500;
      const maxCoins = 60;
      const specialCrystalSpawnMs = 2200;
      const powerUpSpawnMs = 4600;
      let spawnAcc = 0;
      let crystalAcc = 0;
      let powerAcc = 0;
      let lastHud = 0;
      const pressed = pressedRef.current;

      const step = (now: number) => {
        const dt = Math.min(0.04, Math.max(0.001, (now - (step as unknown as { lastNow: number }).lastNow) / 1000));
        (step as unknown as { lastNow: number }).lastNow = now;

        const remainingMs = gameStateRef.current.started
          ? Math.max(0, gameStateRef.current.endAt - now)
          : durationMs;
        const remainingSeconds = remainingMs / 1000;
        const isPoweredUp = now < powerUpUntil.value;
        if (boostActiveRef.current !== isPoweredUp) {
          boostActiveRef.current = isPoweredUp;
          setIsBoostActive(isPoweredUp);
        }

        if (!gameStateRef.current.started) {
          setTimeLeftMs(durationMs);
          bg();
          drawWorld();
          drawPlayer(isPoweredUp);
          drawStartOverlay();
          rafRef.current = requestAnimationFrame(step);
          return;
        }

        spawnAcc += dt * 1000;
        while (spawnAcc >= spawnEveryMs && remainingMs > 0 && coins.length < maxCoins) {
          spawnAcc -= spawnEveryMs;
          const x = worldPaddingX + Math.random() * (worldW - worldPaddingX * 2 - coinSize);
          const vy = 110 + Math.random() * 120;
          coins.push({
            id: `${Math.random().toString(16).slice(2)}`,
            x,
            y: -coinSize - 10,
            vy,
          });
        }

        crystalAcc += dt * 1000;
        if (!specialCrystal.active && crystalAcc >= specialCrystalSpawnMs && remainingMs > 0) {
          crystalAcc = 0;
          specialCrystal.active = true;
          specialCrystal.x =
            worldPaddingX + Math.random() * (worldW - worldPaddingX * 2 - specialCrystal.size);
          specialCrystal.y = -specialCrystal.size;
          specialCrystal.vy = 140 + Math.random() * 90;
        }

        powerAcc += dt * 1000;
        if (!powerUp.active && powerAcc >= powerUpSpawnMs && remainingMs > 0) {
          powerAcc = 0;
          powerUp.active = true;
          const p = platforms[Math.floor(Math.random() * Math.max(1, platforms.length - 1)) + 1];
          powerUp.x = p.x + Math.random() * Math.max(2, p.w - powerUp.size);
          powerUp.y = p.y - powerUp.size;
        }

        // HUD: throttle cada ~100ms
        if (now - lastHud > 100 || remainingMs <= 0) {
          lastHud = now;
          setTimeLeftMs(remainingMs);
        }

        // Update player movement
        const accelX = player.onGround ? 1500 : 980;
        const maxSpeedX = isPoweredUp ? 380 : 260;
        const jumpStrength = isPoweredUp ? -740 : -420;
        const moveDir = (pressed.left ? -1 : 0) + (pressed.right ? 1 : 0);

        // Movimiento horizontal con aceleración (se siente más "Mario-like").
        if (moveDir !== 0) {
          player.vx += moveDir * accelX * dt;
        } else {
          // Fricción más suave en aire para conservar inercia.
          const friction = player.onGround ? 6.5 : 1.6;
          player.vx *= 1 - friction * dt;
        }
        player.vx = Math.max(-maxSpeedX, Math.min(maxSpeedX, player.vx));
        player.x += player.vx * dt;

        if (player.onGround) {
          coyoteUntil.value = now + 110;
        }

        // Jump con "buffer" y coyote-time para mayor fluidez.
        const canJump = (player.onGround || now < coyoteUntil.value) && !jumpNeedsRelease.value;
        const jumpOnce = pressed.jump && now < jumpBufferUntil.value && canJump;
        if (jumpOnce) {
          player.vy = jumpStrength;
          player.onGround = false;
          coyoteUntil.value = 0;
          jumpBufferUntil.value = 0;
          jumpCutWindowUntil.value = now + 220;
          jumpNeedsRelease.value = true;
        }

        // Gravedad
        // Jump-cut solo cuando suelta la tecla de salto (no usar pressed.jump: se limpiaba al saltar y mataba el impulso).
        if (!jumpKeyHeldRef.current && now < jumpCutWindowUntil.value && player.vy < -120) {
          player.vy *= 0.88;
        }
        player.vy += 920 * dt;
        player.y += player.vy * dt;

        player.onGround = false;
        for (const p of platforms) {
          const wasAbove = player.y + player.h - player.vy * dt <= p.y + 1;
          const overlapX = player.x + player.w > p.x && player.x < p.x + p.w;
          const touchingTop = player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 8;
          if (player.vy >= 0 && wasAbove && overlapX && touchingTop) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.onGround = true;
            break;
          }
        }

        // Bordes
        player.x = Math.max(worldPaddingX, Math.min(worldW - worldPaddingX - player.w, player.x));

        // Update coins + collisions
        const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };

        for (let i = coins.length - 1; i >= 0; i -= 1) {
          const c = coins[i];
          c.y += c.vy * dt;

          if (c.y > worldH + 60) {
            coins.splice(i, 1);
            continue;
          }

          const coinRect: Rect = { x: c.x, y: c.y, w: coinSize, h: coinSize };
          if (rectsOverlap(playerRect, coinRect)) {
            coins.splice(i, 1);
            const next = scoreRef.current + 1;
            scoreRef.current = next;
            setScore(next);
            countsRef.current.coins += 1;
            setCoinsCount(countsRef.current.coins);
            onCoinCollected?.();
            pushCenterGain("+1");
            flyingRewards.push({
              x: c.x + coinSize / 2,
              y: c.y + coinSize / 2,
              toX: worldW - 72,
              toY: 26,
              born: now,
              durationMs: 480,
            });
            if (coinSoundRef.current) {
              const sfx = coinSoundRef.current.cloneNode(true) as HTMLAudioElement;
              sfx.volume = 0.42;
              void sfx.play().catch(() => {});
            }
          }
        }

        if (specialCrystal.active) {
          specialCrystal.y += specialCrystal.vy * dt;
          if (specialCrystal.y > worldH + 60) specialCrystal.active = false;
          const crystalRect: Rect = {
            x: specialCrystal.x,
            y: specialCrystal.y,
            w: specialCrystal.size,
            h: specialCrystal.size,
          };
          if (rectsOverlap(playerRect, crystalRect)) {
            specialCrystal.active = false;
            const next = scoreRef.current + 10;
            scoreRef.current = next;
            setScore(next);
            countsRef.current.crystals += 1;
            setCrystalsCount(countsRef.current.crystals);
            pushCenterGain("+10");
            flyingRewards.push({
              x: specialCrystal.x + specialCrystal.size / 2,
              y: specialCrystal.y + specialCrystal.size / 2,
              toX: worldW - 72,
              toY: 26,
              born: now,
              durationMs: 560,
            });
          }
        }

        if (powerUp.active) {
          const pRect: Rect = { x: powerUp.x, y: powerUp.y, w: powerUp.size, h: powerUp.size };
          if (rectsOverlap(playerRect, pRect)) {
            powerUp.active = false;
            powerUpUntil.value = now + 3000;
            countsRef.current.powerUps += 1;
            setPowerUpsCount(countsRef.current.powerUps);
            pushCenterGain("POWER UP!");
          }
        }

        if (rectsOverlap(playerRect, flagRect)) {
          const next = scoreRef.current + 5;
          scoreRef.current = next;
          setScore(next);
          pushCenterGain("+5");
          finishToSummary();
          return;
        }

        // Draw
        bg();
        drawWorld();

        // Piso
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(0, groundY, worldW, 2);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(0, groundY + 2, worldW, 6);

        // Coins
        if (coinImg) {
          for (const c of coins) {
            ctx.drawImage(coinImg, c.x, c.y, coinSize, coinSize);
          }
        } else {
          // fallback: círculos
          ctx.fillStyle = "rgba(255, 214, 90, 0.95)";
          for (const c of coins) {
            ctx.beginPath();
            ctx.arc(c.x + coinSize / 2, c.y + coinSize / 2, coinSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (specialCrystal.active) {
          drawCrystal();
        }
        if (powerUp.active) {
          drawPowerUp();
        }
        drawFlyingRewards(now);
        drawPlayer(isPoweredUp);

        if (remainingSeconds <= 0) {
          finishToSummary();
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      // Eventos teclado
      onKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        const isJump = k === "arrowup" || k === "w" || e.code === "Space";
        if (["arrowleft", "arrowright", "arrowup"].includes(k) || ["a", "d", "w"].includes(k) || e.code === "Space") {
          e.preventDefault();
        }
        if (k === "arrowleft" || k === "a") pressed.left = true;
        if (k === "arrowright" || k === "d") pressed.right = true;
        if (isJump) {
          jumpKeyHeldRef.current = true;
          pressed.jump = true;
          jumpBufferUntil.value = performance.now() + 140;
        }
      };
      onKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        const isJump = k === "arrowup" || k === "w" || e.code === "Space";
        if (k === "arrowleft" || k === "a") pressed.left = false;
        if (k === "arrowright" || k === "d") pressed.right = false;
        if (isJump) {
          jumpKeyHeldRef.current = false;
          pressed.jump = false;
          jumpNeedsRelease.value = false;
        }
      };

      window.addEventListener("keydown", onKeyDown, { passive: false });
      window.addEventListener("keyup", onKeyUp);

      onPointerDown = (e: PointerEvent) => {
        if (gameStateRef.current.started || phase !== "ready") return;
        const c = canvasRef.current;
        if (!c) return;
        const r = c.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const btn = {
          x: worldW / 2 - 95,
          y: Math.max(35, worldH * 0.15),
          w: 190,
          h: 58,
        };
        if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
          gameStateRef.current.started = true;
          gameStateRef.current.startAt = performance.now();
          gameStateRef.current.endAt = gameStateRef.current.startAt + durationMs;
          setPhase("playing");
          startBackgroundMusic();
        }
      };
      window.addEventListener("pointerdown", onPointerDown);

      const initial = performance.now();
      (step as unknown as { lastNow: number }).lastNow = initial;
      rafRef.current = requestAnimationFrame(step);
    };

    void run();

    return () => {
      jumpKeyHeldRef.current = false;
      if (cleanupResize) window.removeEventListener("resize", requestCanvasResize);
      if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
      if (onKeyUp) window.removeEventListener("keyup", onKeyUp);
      if (onPointerDown) window.removeEventListener("pointerdown", onPointerDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [finishToSummary, onCoinCollected, playerImageSrc, coinImageSrc, pushCenterGain, requestCanvasResize, startBackgroundMusic, timeSeconds]);

  // Botón finalizar manual
  const finalizeNow = useCallback(() => {
    if (phase !== "playing") return;
    finishToSummary();
  }, [finishToSummary, phase]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Juego POW"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-[#0b3d91] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="min-w-[160px]">
            <h2 className="text-xs text-white/95">POW: recolecta monedas en 15s</h2>
            <p className="text-[10px] text-white/70">Controles: `← →` o `A/D`, salto con `↑` o `Espacio`.</p>
          </div>
          <div className="flex items-center gap-2 text-white">
            <div className="rounded-xl border border-cyan-200/20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 text-[11px] shadow-lg shadow-cyan-900/20">
              Tiempo {Math.max(0, Math.ceil((timeLeftMs || 0) / 100) / 10).toFixed(1)}s
            </div>
            <div className="rounded-xl border border-yellow-200/25 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-4 py-2 text-[11px] shadow-lg shadow-orange-950/20">
              SCORE {score}
            </div>
            <div className="rounded-xl border border-emerald-200/20 bg-emerald-500/20 px-3 py-2 text-[10px]">Cristal +10</div>
            <div className={`rounded-xl border px-3 py-2 text-[10px] ${isBoostActive ? "border-fuchsia-200/40 bg-fuchsia-500/30" : "border-fuchsia-200/20 bg-fuchsia-500/20"}`}>
              PowerUp {isBoostActive ? "Activo" : "3s"}
            </div>
          </div>
        </div>

        <div ref={canvasWrapRef} className="relative w-full h-[420px] sm:h-[480px] rounded-xl overflow-hidden border border-white/10 bg-black/10">
          <canvas ref={canvasRef} className="block w-full h-full" />

          {centerGain && (
            <div
              key={centerGain.id}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="rounded-full border border-yellow-300/50 bg-yellow-400/20 px-6 py-3 text-3xl font-black text-yellow-200 drop-shadow-[0_0_14px_rgba(250,204,21,0.7)]">
                {centerGain.text}
              </div>
            </div>
          )}

          {phase === "summary" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
              <div className="text-center text-white">
                <div className="rounded-2xl border border-white/20 bg-[#03143dcc] px-6 py-6 shadow-2xl">
                  <div className="text-3xl font-black text-yellow-300">Tiempo terminado</div>
                  <div className="mt-3 text-xl">Score final: {score}</div>
                  <div className="mt-4 space-y-1 text-sm text-white/90">
                    <div>Monedas: {coinsCount}</div>
                    <div>Cristales especiales: {crystalsCount}</div>
                    <div>PowerUps recogidos: {powerUpsCount}</div>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void closeGame(true)}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                    >
                      Guardar y cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => void closeGame(false)}
                      className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === "updating" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="rounded-xl bg-black/60 px-4 py-3 text-sm text-white">Guardando resultado...</div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={finalizeNow}
            disabled={phase !== "playing"}
            className="rounded-lg bg-gradient-to-r from-[#1ecbe1] to-[#005cff] py-2 px-4 text-[11px] text-white hover:opacity-90 disabled:opacity-50"
          >
            {phase === "playing" ? "Finalizar" : "No disponible"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (phase === "playing") finalizeNow();
              else void closeGame(false);
            }}
            disabled={phase === "updating"}
            className="rounded-lg bg-white/15 px-3 py-2 text-[11px] text-white hover:bg-white/25 disabled:opacity-50"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}


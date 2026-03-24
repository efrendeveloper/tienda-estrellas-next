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

  const endedRef = useRef(false);
  const mountedRef = useRef(true);

  const pressedRef = useRef({
    left: false,
    right: false,
    jump: false,
  });

  const [timeLeftMs, setTimeLeftMs] = useState(timeSeconds * 1000);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [phase, setPhase] = useState<"playing" | "updating">("playing");

  const coinsCollectedRef = useRef(0);

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

  const endGame = useCallback(
    async (finalCollected: number) => {
      if (endedRef.current) return;
      endedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setPhase("updating");
      try {
        await onComplete(finalCollected);
      } finally {
        if (mountedRef.current) onRequestClose();
      }
    },
    [onComplete, onRequestClose]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  useEffect(() => {
    let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onKeyUp: ((e: KeyboardEvent) => void) | null = null;
    let cleanupResize = false;

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
      try {
        [playerImg, coinImg] = await Promise.all([loadImage(playerImageSrc), loadImage(coinImageSrc)]);
      } catch {
        // Si faltan assets, evitamos romper la UI.
      }

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

      const coins: Array<{
        id: string;
        x: number;
        y: number;
        vy: number;
      }> = [];

      const bg = () => {
        const g = ctx.createLinearGradient(0, 0, 0, worldH);
        g.addColorStop(0, "rgba(17, 92, 184, 0.65)");
        g.addColorStop(0.65, "rgba(7, 18, 44, 0.85)");
        g.addColorStop(1, "rgba(0, 0, 0, 0.95)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, worldW, worldH);
      };

      bg();
      const startNow = performance.now();
      const durationMs = timeSeconds * 1000;
      const endAt = startNow + durationMs;

      const spawnEveryMs = 500;
      const maxCoins = 60;
      let spawnAcc = 0;
      let lastHud = 0;
      const pressed = pressedRef.current;

      const step = (now: number) => {
        const dt = Math.min(0.04, Math.max(0.001, (now - (step as unknown as { lastNow: number }).lastNow) / 1000));
        (step as unknown as { lastNow: number }).lastNow = now;

        const remainingMs = Math.max(0, endAt - now);
        const remainingSeconds = remainingMs / 1000;

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

        // HUD: throttle cada ~100ms
        if (now - lastHud > 100 || remainingMs <= 0) {
          lastHud = now;
          setTimeLeftMs(remainingMs);
        }

        // Update player movement
        const accelX = 1300;
        const maxSpeedX = 260;
        const moveDir = (pressed.left ? -1 : 0) + (pressed.right ? 1 : 0);

        // Movimiento horizontal con aceleración (se siente más "Mario-like").
        if (moveDir !== 0) {
          player.vx += moveDir * accelX * dt;
        } else {
          // Fricción
          player.vx *= 1 - 6.5 * dt;
        }
        player.vx = Math.max(-maxSpeedX, Math.min(maxSpeedX, player.vx));
        player.x += player.vx * dt;

        // Jump
        const wantJump = pressed.jump;
        const jumpOnce = wantJump && player.onGround;
        if (jumpOnce) {
          player.vy = -460;
          player.onGround = false;
          pressed.jump = false; // consume "solo una pulsación"
        }

        // Gravedad
        player.vy += 980 * dt;
        player.y += player.vy * dt;

        if (player.y + player.h >= groundY) {
          player.y = groundY - player.h;
          player.vy = 0;
          player.onGround = true;
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
            const next = coinsCollectedRef.current + 1;
            coinsCollectedRef.current = next;
            setCoinsCollected(next);
            onCoinCollected?.();
          }
        }

        // Draw
        bg();

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

        // Player
        if (playerImg) {
          ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
        } else {
          ctx.fillStyle = "rgba(30, 235, 255, 0.95)";
          ctx.fillRect(player.x, player.y, player.w, player.h);
        }

        if (remainingSeconds <= 0) {
          endGame(coinsCollectedRef.current);
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      // Eventos teclado
      onKeyDown = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (["arrowleft", "arrowright", "arrowup", " "].includes(k) || ["a", "d", "w"].includes(k)) {
          e.preventDefault();
        }
        if (k === "arrowleft" || k === "a") pressed.left = true;
        if (k === "arrowright" || k === "d") pressed.right = true;
        if (k === "arrowup" || k === " " || k === "w") pressed.jump = true;
      };
      onKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") pressed.left = false;
        if (k === "arrowright" || k === "d") pressed.right = false;
        if (k === "arrowup" || k === " " || k === "w") pressed.jump = false;
      };

      window.addEventListener("keydown", onKeyDown, { passive: false });
      window.addEventListener("keyup", onKeyUp);

      const initial = performance.now();
      (step as unknown as { lastNow: number }).lastNow = initial;
      rafRef.current = requestAnimationFrame(step);
    };

    void run();

    return () => {
      if (cleanupResize) window.removeEventListener("resize", requestCanvasResize);
      if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
      if (onKeyUp) window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [endGame, onCoinCollected, playerImageSrc, coinImageSrc, requestCanvasResize, timeSeconds]);

  // Botón finalizar manual
  const finalizeNow = useCallback(() => {
    if (phase !== "playing") return;
    void endGame(coinsCollectedRef.current);
  }, [endGame, phase]);

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
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-lg bg-white/10 px-3 py-1 text-[11px]">
              Tiempo: {Math.max(0, Math.ceil((timeLeftMs || 0) / 100) / 10).toFixed(1)}s
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-1 text-[11px]">
              Monedas: {coinsCollected}
            </div>
          </div>
        </div>

        <div ref={canvasWrapRef} className="relative w-full h-[420px] sm:h-[480px] rounded-xl overflow-hidden border border-white/10 bg-black/10">
          <canvas ref={canvasRef} className="block w-full h-full" />

          {phase !== "playing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-center text-white">
                <div className="text-sm">Procesando monedas...</div>
                <div className="text-[10px] text-white/70 mt-1">Un momento</div>
              </div>
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
            {phase === "playing" ? "Finalizar" : "Actualizando..."}
          </button>
          <button
            type="button"
            onClick={() => {
              if (phase === "playing") finalizeNow();
              else onRequestClose();
            }}
            disabled={phase !== "playing"}
            className="rounded-lg bg-white/15 px-3 py-2 text-[11px] text-white hover:bg-white/25 disabled:opacity-50"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}


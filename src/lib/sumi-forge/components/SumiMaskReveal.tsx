import React, { useEffect, useRef, useState } from 'react';
import {
  createSeededRandom,
  sampleCubicCurve,
  samplePolarArc,
  sampleQuadraticCurve,
  samplesToSpine,
} from '../math';
import {
  drawFloatingSakuraPetal,
  drawSakuraBlossom,
  drawSumiKasureRibbon,
  drawTarashikomiWashBlob,
} from '../techniques';
import { MaskChoreography } from '../types';

export interface SumiMaskRevealProps {
  /** URL da imagem a ser pintada/revelada com a máscara de pinceladas (padrão: obra do Monte Fuji e Sakura) */
  src?: string;
  /** Texto alternativo para acessibilidade */
  alt?: string;
  /** Coreografia das pinceladas que revelam a imagem */
  choreography?: MaskChoreography;
  /** Duração total da animação de pintura em segundos */
  duration?: number;
  /** Quantidade de cerdas de bambu por pincelada (Técnica #03) */
  bristleCount?: number;
  /** Intensidade de falha de pincel seco Kasure (0.0 a 0.85) */
  dryBrushGap?: number;
  /** Semente determinística Mulberry32 */
  seed?: number;
  /** Se verdadeiro, exibe os acentos vivos de tinta úmida e pétalas sobre a imagem revelada */
  showLiveInkAccents?: boolean;
  /** Modo Raio-X para visualizar apenas a máscara de pinceladas pura */
  maskOnlyPreview?: boolean;
  /** Progresso controlado externamente (0.0 a 1.0). Se omitido, anima automaticamente */
  progress?: number;
  /** Chave de gatilho para reiniciar a pintura do zero */
  replayTrigger?: number;
  /** Permite ao usuário pintar/revelar ainda mais com o mouse ou caneta */
  interactiveBrush?: boolean;
  /** Classe CSS do container */
  className?: string;
}

/**
 * Componente <SumiMaskReveal />
 * Realiza a pintura animada de qualquer imagem passada via prop `src` combinando máscara de pinceladas
 * Multi-Cerdas Kasure, Aguada Tarashikomi e Canvas Composite (`destination-in`), com cache offscreen
 * para manter 60/120 FPS cravados.
 */
export const SumiMaskReveal: React.FC<SumiMaskRevealProps> = ({
  src = '/assets/aistudio/image_8f7809d3.png',
  alt = 'Pintura Sumi-e revelada por máscara caligráfica',
  choreography = 'fuji_masterpiece',
  duration = 3.4,
  bristleCount = 26,
  dryBrushGap = 0.28,
  seed = 8472,
  showLiveInkAccents = true,
  maskOnlyPreview = false,
  progress: controlledProgress,
  replayTrigger = 0,
  interactiveBrush = true,
  className = '',
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cacheKeyRef = useRef<string>('');
  const isVisibleRef = useRef<boolean>(true);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const userStrokesRef = useRef<{ x: number; y: number; pressure: number }[][]>([]);
  const activeStrokeRef = useRef<{ x: number; y: number; pressure: number }[] | null>(null);
  const strokeVersionRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    cacheKeyRef.current = '';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      cacheKeyRef.current = '';
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageError(true);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    userStrokesRef.current = [];
    strokeVersionRef.current++;
    cacheKeyRef.current = '';
  }, [replayTrigger, choreography, seed, src]);

  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { rootMargin: '80px 0px', threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    if (!compositeCacheRef.current) {
      compositeCacheRef.current = document.createElement('canvas');
    }
    const maskCanvas = maskCanvasRef.current;
    const compositeCache = compositeCacheRef.current;
    let animId = 0;
    let cachedRect = canvas.getBoundingClientRect();

    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        cachedRect = entries[0].contentRect as DOMRect;
        cacheKeyRef.current = '';
      }
    });
    ro.observe(canvas);

    const renderFrame = (now: number) => {
      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const dpr = Math.min(1.75, window.devicePixelRatio || 1);
      const w = Math.max(240, Math.floor(cachedRect.width || canvas.clientWidth || 500));
      const h = Math.max(160, Math.floor(cachedRect.height || canvas.clientHeight || 320));

      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        maskCanvas.width = targetW;
        maskCanvas.height = targetH;
        compositeCache.width = targetW;
        compositeCache.height = targetH;
        cacheKeyRef.current = '';
      }

      const ctx = canvas.getContext('2d');
      const mCtx = maskCanvas.getContext('2d');
      const cCtx = compositeCache.getContext('2d');
      if (!ctx || !mCtx || !cCtx) return;

      const elapsed = (now - startTimeRef.current) / 1000;
      const autoProg =
        choreography === 'interactive_brush'
          ? 0.18
          : Math.min(1, elapsed / Math.max(0.4, duration));
      const prog = controlledProgress !== undefined ? controlledProgress : autoProg;
      const quantProg = prog >= 0.998 ? 1 : Math.round(prog * 90) / 90;
      const scale = Math.min(w / 1000, h / 600);

      const currentCacheKey = `${targetW}x${targetH}:${choreography}:${quantProg}:${bristleCount}:${dryBrushGap}:${seed}:${maskOnlyPreview}:${imageLoaded}:${strokeVersionRef.current}`;

      if (cacheKeyRef.current !== currentCacheKey) {
        // 1. Constrói a Máscara de Pinceladas Sumi-e Kasure + Aguada Tarashikomi no maskCanvas
        mCtx.save();
        mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mCtx.clearRect(0, 0, w, h);

        if (choreography === 'fuji_masterpiece') {
          const sunP = Math.min(1, quantProg * 2.2);
          if (sunP > 0.01) {
            drawTarashikomiWashBlob(
              mCtx,
              w * 0.79,
              h * 0.28,
              w * 0.22 * sunP,
              w * 0.22 * sunP,
              0,
              '#000000',
              '#000000',
              1.0,
              seed + 11
            );
          }

          const fujiStrokes = [
            { x0: w * 0.74, y0: h * 0.45, x1: w * 0.34, y1: h * 0.85, w: 145 * scale, start: 0.08, end: 0.55 },
            { x0: w * 0.73, y0: h * 0.46, x1: w * 0.98, y1: h * 0.82, w: 140 * scale, start: 0.14, end: 0.62 },
            { x0: w * 0.42, y0: h * 0.84, x1: w * 0.96, y1: h * 0.88, w: 165 * scale, start: 0.22, end: 0.72 },
          ];
          fujiStrokes.forEach((st, idx) => {
            const localP = Math.max(0, Math.min(1, (quantProg - st.start) / (st.end - st.start)));
            if (localP <= 0.01) return;
            const sp = sampleQuadraticCurve(
              { x: st.x0, y: st.y0 },
              { x: (st.x0 + st.x1) * 0.5, y: (st.y0 + st.y1) * 0.5 - 24 * scale },
              { x: st.x1, y: st.y1 },
              48,
              0.15,
              seed + 100 + idx * 19
            );
            drawSumiKasureRibbon(mCtx, {
              spine: sp,
              maxWidth: st.w,
              bristleCount,
              dryBrushGap: dryBrushGap * 0.75,
              taperStart: 0.25,
              taperEnd: 0.45,
              color: '#000000',
              alpha: 1,
              headReach: localP,
              seed: seed + 120 + idx * 19,
            });
          });

          const sakuraStrokes = [
            {
              p0: { x: 0, y: h * 0.72 },
              p1: { x: w * 0.16, y: h * 0.42 },
              p2: { x: w * 0.32, y: h * 0.2 },
              p3: { x: w * 0.56, y: h * 0.04 },
              w: 195 * scale,
              start: 0.18,
              end: 0.76,
            },
            {
              p0: { x: w * 0.08, y: h * 0.48 },
              p1: { x: w * 0.28, y: h * 0.46 },
              p2: { x: w * 0.46, y: h * 0.62 },
              p3: { x: w * 0.66, y: h * 0.75 },
              w: 175 * scale,
              start: 0.28,
              end: 0.85,
            },
            {
              p0: { x: w * 0.04, y: h * 0.45 },
              p1: { x: w * 0.12, y: h * 0.24 },
              p2: { x: w * 0.28, y: h * 0.12 },
              p3: { x: w * 0.64, y: h * 0.22 },
              w: 180 * scale,
              start: 0.34,
              end: 0.9,
            },
          ];

          sakuraStrokes.forEach((st, idx) => {
            const localP = Math.max(0, Math.min(1, (quantProg - st.start) / (st.end - st.start)));
            if (localP <= 0.01) return;
            const sp = sampleCubicCurve(st.p0, st.p1, st.p2, st.p3, 52, 0.2, seed + 200 + idx * 29);
            drawSumiKasureRibbon(mCtx, {
              spine: sp,
              maxWidth: st.w,
              bristleCount,
              dryBrushGap: dryBrushGap * 0.65,
              taperStart: 0.15,
              taperEnd: 0.35,
              color: '#000000',
              alpha: 1,
              headReach: localP,
              seed: seed + 220 + idx * 29,
            });
          });

          if (quantProg > 0.55) {
            const fillP = (quantProg - 0.55) / 0.45;
            drawTarashikomiWashBlob(
              mCtx,
              w * 0.5,
              h * 0.5,
              w * 0.72 * fillP,
              h * 0.72 * fillP,
              0,
              '#000000',
              '#000000',
              Math.min(1, fillP * 1.35),
              seed + 555
            );
          }
        } else if (choreography === 'katana_slashes') {
          const slashCount = 6;
          for (let s = 0; s < slashCount; s++) {
            const start = s * 0.11;
            const localP = Math.max(0, Math.min(1, (quantProg - start) / 0.45));
            if (localP <= 0.01) continue;
            const y0 = h * (0.12 + (s / (slashCount - 1)) * 0.78);
            const y1 = h * (0.08 + ((slashCount - 1 - s) / (slashCount - 1)) * 0.84);
            const isEven = s % 2 === 0;
            const sp = sampleQuadraticCurve(
              { x: isEven ? -w * 0.05 : w * 1.05, y: y0 },
              { x: w * 0.5, y: (y0 + y1) * 0.5 + (isEven ? -45 : 45) * scale },
              { x: isEven ? w * 1.05 : -w * 0.05, y: y1 },
              52,
              0.18,
              seed + s * 37
            );
            drawSumiKasureRibbon(mCtx, {
              spine: sp,
              maxWidth: 165 * scale,
              bristleCount,
              dryBrushGap,
              taperStart: 0.2,
              taperEnd: 0.35,
              color: '#000000',
              alpha: 1,
              headReach: localP,
              seed: seed + s * 73,
            });
          }
        } else if (choreography === 'enso_spiral') {
          const maxR = Math.hypot(w, h) * 0.56;
          const loops = 3;
          for (let l = 0; l < loops; l++) {
            const localP = Math.max(0, Math.min(1, (quantProg - l * 0.15) / 0.65));
            if (localP <= 0.01) continue;
            const r = maxR * ((l + 0.6) / loops);
            const sp = samplePolarArc(
              w * 0.5,
              h * 0.5,
              r,
              r * 0.82,
              -Math.PI * 0.85 + l * 1.2,
              Math.PI * 1.35 + l * 1.2,
              0,
              0.15,
              68,
              0.15,
              seed + l * 59
            );
            drawSumiKasureRibbon(mCtx, {
              spine: sp,
              maxWidth: 190 * scale,
              bristleCount,
              dryBrushGap,
              taperStart: 0.25,
              taperEnd: 0.4,
              color: '#000000',
              alpha: 1,
              headReach: localP,
              seed: seed + l * 97,
            });
          }
        } else if (choreography === 'hokusai_tide') {
          const waveRows = 5;
          for (let r = 0; r < waveRows; r++) {
            const localP = Math.max(0, Math.min(1, (quantProg - r * 0.1) / 0.55));
            if (localP <= 0.01) continue;
            const baseY = h * (0.15 + (r / (waveRows - 1)) * 0.72);
            const sp = sampleCubicCurve(
              { x: -w * 0.05, y: baseY + 30 * scale },
              { x: w * 0.32, y: baseY - 75 * scale },
              { x: w * 0.68, y: baseY + 75 * scale },
              { x: w * 1.05, y: baseY - 25 * scale },
              56,
              0.2,
              seed + r * 43
            );
            drawSumiKasureRibbon(mCtx, {
              spine: sp,
              maxWidth: 175 * scale,
              bristleCount,
              dryBrushGap,
              taperStart: 0.15,
              taperEnd: 0.25,
              color: '#000000',
              alpha: 1,
              headReach: localP,
              hookWaves: 4,
              seed: seed + r * 83,
            });
          }
        }

        const allUserStrokes = activeStrokeRef.current
          ? [...userStrokesRef.current, activeStrokeRef.current]
          : userStrokesRef.current;

        allUserStrokes.forEach((pts, sIdx) => {
          if (pts.length < 2) return;
          const spine = samplesToSpine(pts, 0.1, seed + sIdx * 17);
          const avgPressure = pts.reduce((acc, p) => acc + p.pressure, 0) / pts.length;
          drawSumiKasureRibbon(mCtx, {
            spine,
            maxWidth: 95 * scale * (0.65 + avgPressure * 0.85),
            bristleCount: Math.max(12, Math.floor(bristleCount * 0.8)),
            dryBrushGap: dryBrushGap * 0.8,
            taperStart: 0.25,
            taperEnd: 0.55,
            color: '#000000',
            alpha: 1,
            seed: seed + 900 + sIdx * 23,
          });
        });

        mCtx.restore();

        // 2. Compõe a imagem recortada no compositeCache
        cCtx.save();
        cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cCtx.clearRect(0, 0, w, h);

        if (maskOnlyPreview) {
          cCtx.drawImage(maskCanvas, 0, 0, w, h);
        } else if (imageLoaded && imageRef.current && !imageError) {
          const img = imageRef.current;
          const imgRatio = img.width / Math.max(1, img.height);
          const canvasRatio = w / h;
          let drawW = w;
          let drawH = h;
          let drawX = 0;
          let drawY = 0;

          if (canvasRatio > imgRatio) {
            drawW = w;
            drawH = w / imgRatio;
            drawY = (h - drawH) * 0.5;
          } else {
            drawH = h;
            drawW = h * imgRatio;
            drawX = (w - drawW) * 0.5;
          }

          cCtx.drawImage(img, drawX, drawY, drawW, drawH);
          cCtx.globalCompositeOperation = 'destination-in';
          cCtx.drawImage(maskCanvas, 0, 0, w, h);
          cCtx.globalCompositeOperation = 'source-over';
        } else {
          cCtx.drawImage(maskCanvas, 0, 0, w, h);
        }

        cCtx.restore();
        cacheKeyRef.current = currentCacheKey;
      }

      // 3. Desenha o compositeCache no canvas principal (< 0.1ms) + pétalas vivas opcionais
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(compositeCache, 0, 0, w, h);

      if (showLiveInkAccents && !maskOnlyPreview && prog > 0.2) {
        const rand = createSeededRandom(seed + 777);
        const livePetals = 14;
        for (let p = 0; p < livePetals; p++) {
          const bx = rand() * w * 0.72;
          const by = rand() * h * 0.78;
          const speed = 16 + rand() * 22;
          const px =
            (bx + elapsed * speed * 1.2 + Math.sin(elapsed * 1.5 + p) * 16 * scale) % (w * 0.96);
          const py =
            (by + elapsed * speed * 0.55 + Math.cos(elapsed * 1.2 + p) * 12 * scale) % (h * 0.9);

          if (p % 5 === 0) {
            drawSakuraBlossom(
              ctx,
              px,
              py,
              (6.5 + (p % 3) * 2) * scale,
              elapsed * 0.9 + p,
              '#C8232C',
              '#FFF5F5',
              '#141413',
              0.85 * Math.min(1, (prog - 0.2) * 2),
              seed + p * 31
            );
          } else {
            drawFloatingSakuraPetal(
              ctx,
              px,
              py,
              (5 + (p % 4) * 2) * scale,
              elapsed * 1.8 + p,
              0.4 + 0.55 * Math.abs(Math.sin(elapsed * 2.2 + p)),
              '#C8232C',
              0.88 * Math.min(1, (prog - 0.2) * 2)
            );
          }
        }
      }

      ctx.restore();

      const needsMoreFrames =
        prog < 1 || (showLiveInkAccents && !maskOnlyPreview) || activeStrokeRef.current !== null;
      if (needsMoreFrames) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [
    imageLoaded,
    imageError,
    choreography,
    duration,
    bristleCount,
    dryBrushGap,
    seed,
    showLiveInkAccents,
    maskOnlyPreview,
    controlledProgress,
    replayTrigger,
  ]);

  const triggerManualRedraw = () => {
    strokeVersionRef.current++;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactiveBrush) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.75;
    activeStrokeRef.current = [
      {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure,
      },
    ];
    triggerManualRedraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactiveBrush || !activeStrokeRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = activeStrokeRef.current[activeStrokeRef.current.length - 1];
    const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    if (dist < 4) return;
    const velocityPressure = Math.max(0.25, Math.min(1, 1 - dist / 65));
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : velocityPressure;
    activeStrokeRef.current.push({ x, y, pressure });
    triggerManualRedraw();
  };

  const handlePointerUp = () => {
    if (activeStrokeRef.current && activeStrokeRef.current.length >= 2) {
      userStrokesRef.current.push(activeStrokeRef.current);
    }
    activeStrokeRef.current = null;
    triggerManualRedraw();
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      aria-label={alt}
    >
      <canvas
        ref={displayCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`block w-full h-full ${interactiveBrush ? 'cursor-crosshair' : ''}`}
      />
    </div>
  );
};

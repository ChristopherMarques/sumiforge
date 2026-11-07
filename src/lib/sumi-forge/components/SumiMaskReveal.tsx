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
  /** Permite ao usuário pintar/revelar ainda mais com o dedo, mouse ou caneta */
  interactiveBrush?: boolean;
  /** Exibe controles rápidos flutuantes para pintar com o dedo no mobile/desktop */
  showTouchControls?: boolean;
  /** Classe CSS do container */
  className?: string;
}

interface TouchPoint {
  x: number;
  y: number;
  pressure: number;
}

/**
 * Componente <SumiMaskReveal />
 * Realiza a pintura animada de qualquer imagem passada via prop `src` combinando máscara de pinceladas
 * Multi-Cerdas Kasure, Aguada Tarashikomi e Canvas Composite (`destination-in`), com cache offscreen
 * e suporte completo a pintura por toque no mobile (arrastar ou tocar para revelar).
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
  showTouchControls = true,
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

  // Modo de pintura livre com o dedo/mouse ("scratch & paint from zero")
  const [manualScratchMode, setManualScratchMode] = useState<boolean>(
    choreography === 'interactive_brush'
  );
  const [userStrokeCount, setUserStrokeCount] = useState<number>(0);

  const userStrokesRef = useRef<TouchPoint[][]>([]);
  const activeStrokeRef = useRef<TouchPoint[] | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const strokeVersionRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    setManualScratchMode(choreography === 'interactive_brush');
  }, [choreography]);

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
    setUserStrokeCount(0);
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
      const w = Math.max(220, Math.floor(cachedRect.width || canvas.clientWidth || 500));
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
      const isInteractiveOnly = manualScratchMode || choreography === 'interactive_brush';
      const autoProg = isInteractiveOnly
        ? 0.16
        : Math.min(1, elapsed / Math.max(0.4, duration));
      const prog = controlledProgress !== undefined ? controlledProgress : autoProg;
      const quantProg = prog >= 0.998 ? 1 : Math.round(prog * 90) / 90;
      // Escala amigável para mobile: garante que pinceladas no celular tenham largura generosa
      const scale = Math.max(0.52, Math.min(w / 920, h / 560));

      const currentCacheKey = `${targetW}x${targetH}:${choreography}:${isInteractiveOnly}:${quantProg}:${bristleCount}:${dryBrushGap}:${seed}:${maskOnlyPreview}:${imageLoaded}:${strokeVersionRef.current}`;

      if (cacheKeyRef.current !== currentCacheKey) {
        // 1. Constrói a Máscara de Pinceladas Sumi-e Kasure + Aguada Tarashikomi no maskCanvas
        mCtx.save();
        mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mCtx.clearRect(0, 0, w, h);

        if (isInteractiveOnly) {
          // No modo interativo/mobile de pintar com o dedo, cria apenas uma sutil mancha inicial
          // caso o usuário ainda não tenha tocado na tela, convidando-o a revelar o restante
          if (userStrokesRef.current.length === 0 && !activeStrokeRef.current) {
            drawTarashikomiWashBlob(
              mCtx,
              w * 0.5,
              h * 0.48,
              w * 0.14,
              h * 0.14,
              0,
              '#000000',
              '#000000',
              0.85,
              seed + 19
            );
          }
        } else if (choreography === 'fuji_masterpiece') {
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
          if (pts.length === 0) return;
          // Se foi um toque único no mobile (1 ponto), cria um golpe de pincel + mancha Tarashikomi
          const effectivePts =
            pts.length === 1
              ? [
                  { x: pts[0].x - 28 * scale, y: pts[0].y + 10 * scale, pressure: 0.85 },
                  { x: pts[0].x, y: pts[0].y, pressure: 0.95 },
                  { x: pts[0].x + 32 * scale, y: pts[0].y - 12 * scale, pressure: 0.75 },
                ]
              : pts;

          const spine = samplesToSpine(effectivePts, 0.1, seed + sIdx * 17);
          const avgPressure =
            effectivePts.reduce((acc, p) => acc + p.pressure, 0) / effectivePts.length;

          // Mancha de base úmida no início do toque para facilitar a revelação no celular
          drawTarashikomiWashBlob(
            mCtx,
            effectivePts[0].x,
            effectivePts[0].y,
            46 * scale,
            38 * scale,
            sIdx * 0.7,
            '#000000',
            '#000000',
            0.95,
            seed + 800 + sIdx * 19
          );

          drawSumiKasureRibbon(mCtx, {
            spine,
            maxWidth: 122 * scale * (0.75 + avgPressure * 0.85),
            bristleCount: Math.max(14, Math.floor(bristleCount * 0.85)),
            dryBrushGap: dryBrushGap * 0.65,
            taperStart: 0.18,
            taperEnd: 0.38,
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

          // No modo de pintura manual, desenha uma silhueta Washi bem suave (12%) por baixo
          // para guiar o dedo do usuário ao revelar a pintura no mobile
          if (isInteractiveOnly) {
            cCtx.globalCompositeOperation = 'destination-over';
            cCtx.globalAlpha = 0.12;
            cCtx.drawImage(img, drawX, drawY, drawW, drawH);
            cCtx.globalAlpha = 1;
            cCtx.globalCompositeOperation = 'source-over';
          }
        } else {
          cCtx.drawImage(maskCanvas, 0, 0, w, h);
        }

        cCtx.restore();
        cacheKeyRef.current = currentCacheKey;
      }

      // 3. Desenha o compositeCache no canvas principal + acentos vivos das pinceladas do usuário
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(compositeCache, 0, 0, w, h);

      // Desenha flores de Sakura sutis ao longo dos traços feitos pelo dedo/mouse do usuário
      // para dar resposta visual imediata mesmo quando a área já estava revelada
      if (!maskOnlyPreview) {
        const allUserStrokes = activeStrokeRef.current
          ? [...userStrokesRef.current, activeStrokeRef.current]
          : userStrokesRef.current;

        allUserStrokes.forEach((pts, sIdx) => {
          if (pts.length === 0) return;
          for (let i = 0; i < pts.length; i += 4) {
            const pt = pts[i];
            drawSakuraBlossom(
              ctx,
              pt.x + Math.sin(sIdx + i) * 8 * scale,
              pt.y + Math.cos(sIdx + i) * 8 * scale,
              (6.5 + (i % 3) * 2) * scale,
              (sIdx + i) * 0.7,
              '#C8232C',
              '#FFF5F5',
              '#141413',
              0.78,
              seed + 1400 + sIdx * 31 + i
            );
          }
        });

        // Indicador visual tátil enquanto o dedo/cursor desliza pela tela
        if (lastPointerPosRef.current.active && activeStrokeRef.current) {
          ctx.beginPath();
          ctx.arc(
            lastPointerPosRef.current.x,
            lastPointerPosRef.current.y,
            24 * scale,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = 'rgba(200, 35, 44, 0.55)';
          ctx.lineWidth = 1.75;
          ctx.stroke();
        }
      }

      if (showLiveInkAccents && !maskOnlyPreview && prog > 0.15) {
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
              0.85 * Math.min(1, (prog - 0.15) * 2),
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
              0.88 * Math.min(1, (prog - 0.15) * 2)
            );
          }
        }
      }

      ctx.restore();

      const needsMoreFrames =
        prog < 1 ||
        (showLiveInkAccents && !maskOnlyPreview) ||
        activeStrokeRef.current !== null;
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
    manualScratchMode,
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
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignora caso o dispositivo não suporte pointer capture
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.82;
    lastPointerPosRef.current = { x, y, active: true };
    activeStrokeRef.current = [{ x, y, pressure }];
    triggerManualRedraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactiveBrush || !activeStrokeRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPointerPosRef.current = { x, y, active: true };
    const prev = activeStrokeRef.current[activeStrokeRef.current.length - 1];
    const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    if (dist < 3) return;
    const velocityPressure = Math.max(0.35, Math.min(1, 1 - dist / 68));
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : velocityPressure;
    activeStrokeRef.current.push({ x, y, pressure });
    triggerManualRedraw();
  };

  const handlePointerUp = () => {
    lastPointerPosRef.current.active = false;
    if (activeStrokeRef.current && activeStrokeRef.current.length >= 1) {
      const pts = activeStrokeRef.current;
      // Se foi um toque rápido de 1 ponto no celular, sintetiza um golpe caligráfico completo
      if (pts.length === 1) {
        const p = pts[0];
        userStrokesRef.current.push([
          { x: p.x - 26, y: p.y + 10, pressure: 0.85 },
          { x: p.x, y: p.y, pressure: 0.95 },
          { x: p.x + 28, y: p.y - 10, pressure: 0.78 },
        ]);
      } else {
        userStrokesRef.current.push(pts);
      }
      setUserStrokeCount(userStrokesRef.current.length);
    }
    activeStrokeRef.current = null;
    triggerManualRedraw();
  };

  const handleStartScratchPaint = (e: React.MouseEvent) => {
    e.stopPropagation();
    userStrokesRef.current = [];
    setUserStrokeCount(0);
    setManualScratchMode(true);
    triggerManualRedraw();
  };

  const handleReplayFull = (e: React.MouseEvent) => {
    e.stopPropagation();
    userStrokesRef.current = [];
    setUserStrokeCount(0);
    setManualScratchMode(false);
    startTimeRef.current = performance.now();
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
        style={{ touchAction: interactiveBrush ? 'none' : 'auto' }}
        className={`block w-full h-full ${
          interactiveBrush ? 'cursor-crosshair touch-none' : ''
        }`}
      />

      {interactiveBrush && showTouchControls && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F4EC]/90 backdrop-blur-md border border-[#11100E]/20 text-[11px] font-medium text-[#11100E] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#C8232C] shrink-0" />
            <span>
              {manualScratchMode
                ? userStrokeCount === 0
                  ? 'Arraste o dedo ou toque na tela para revelar a pintura'
                  : `${userStrokeCount} ${userStrokeCount === 1 ? 'pincelada aplicada' : 'pinceladas aplicadas'}`
                : 'Toque ou arraste na tela para pintar'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleStartScratchPaint}
              className={`px-2.5 py-1 rounded-[3px] text-[11px] font-medium border transition-colors cursor-pointer ${
                manualScratchMode
                  ? 'bg-[#C8232C] text-[#FAF7F0] border-[#11100E]'
                  : 'bg-[#F8F4EC]/92 text-[#11100E] border-[#11100E]/60 hover:bg-[#11100E] hover:text-[#FAF7F0]'
              }`}
            >
              {manualScratchMode ? 'Limpar & Pintar do Zero' : 'Pintar do Zero (Toque)'}
            </button>

            {manualScratchMode && (
              <button
                type="button"
                onClick={handleReplayFull}
                className="px-2.5 py-1 rounded-[3px] text-[11px] font-medium bg-[#11100E] text-[#FAF7F0] border border-[#11100E] hover:bg-[#272420] transition-colors cursor-pointer"
              >
                Auto-Revelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

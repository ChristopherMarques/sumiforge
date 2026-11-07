import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_VFX_CONFIG } from '../presets';
import { createSeededRandom, samplesToSpine } from '../math';
import {
  drawFlamePetalTongue,
  drawHokusaiWaveCrest,
  drawSakuraBlossom,
  drawSumiKasureRibbon,
  drawTarashikomiWashBlob,
  drawUkiyoeCloudScrollVolute,
} from '../techniques';
import {
  BrushPointSample,
  InteractiveBrushType,
  RecordedBrushStroke,
  SumiColors,
  VFXConfig,
} from '../types';

export interface SumiBrushCanvasProps {
  /** Tipo de pincel selecionado */
  activeBrush?: InteractiveBrushType;
  /** Paleta de cores atual */
  colors?: SumiColors;
  /** Multiplicador de espessura do pincel (0.4 a 2.5) */
  strokeThickness?: number;
  /** Quantidade de cerdas de bambu (6 a 40) */
  bristleCount?: number;
  /** Intensidade de falha de pincel seco Kasure (0.0 a 0.85) */
  dryBrushGap?: number;
  /** Camada onde os novos traços serão gravados */
  activeLayer?: 'background' | 'midground' | 'foreground';
  /** Opacidade individual de cada camada */
  layerOpacities?: {
    background: number;
    midground: number;
    foreground: number;
  };
  /** Exibe o guia translúcido da obra Monte Fuji & Sakura ao fundo */
  showReferenceGuide?: boolean;
  /** Callback de telemetria de pressão e velocidade em tempo real */
  onTelemetryChange?: (telemetry: {
    pressure: number;
    velocity: number;
    strokeCount: number;
    isReplaying: boolean;
  }) => void;
  /** Referência imperativa para ações externas (replay, limpar, desfazer, exportar PNG) */
  actionsRef?: React.MutableRefObject<{
    replayStrokes: () => void;
    undoStroke: () => void;
    clearCanvas: () => void;
    loadFujiPresetStrokes: () => void;
    exportPng: () => void;
  } | null>;
  className?: string;
}

const DEFAULT_COLORS: SumiColors = {
  inkPrimary: '#141413',
  energySecondary: '#C8232C',
  coreGlow: '#FFF5F5',
  sporeAccent: '#4A4742',
};

/**
 * Traços iniciais responsivos inspirados na obra do Monte Fuji e Sakura
 * Adaptam-se proporcionalmente à largura (w) e altura (h) do canvas em celulares, tablets e desktops
 */
function buildStarterFujiStrokes(
  colors: SumiColors,
  w = 880,
  h = 460
): RecordedBrushStroke[] {
  const sx = (x: number) => (x / 880) * w;
  const sy = (y: number) => (y / 460) * h;
  const scale = Math.max(0.55, Math.min(w / 820, h / 440));

  return [
    {
      id: 'preset-sun-wash',
      brushType: 'tarashikomi_wash',
      layerId: 'background',
      colors: { ...colors },
      thickness: 3.4 * scale,
      bristleCount: 22,
      dryBrushGap: 0.2,
      seed: 1011,
      points: [
        { x: sx(640), y: sy(130), pressure: 0.9, velocity: 0.12, timestamp: 0 },
        { x: sx(690), y: sy(125), pressure: 0.95, velocity: 0.1, timestamp: 40 },
        { x: sx(740), y: sy(140), pressure: 0.9, velocity: 0.12, timestamp: 80 },
      ],
    },
    {
      id: 'preset-fuji-left',
      brushType: 'sumi_kasure',
      layerId: 'midground',
      colors: { ...colors },
      thickness: 1.15 * scale,
      bristleCount: 28,
      dryBrushGap: 0.35,
      seed: 2022,
      points: [
        { x: sx(625), y: sy(185), pressure: 0.85, velocity: 0.2, timestamp: 100 },
        { x: sx(540), y: sy(245), pressure: 0.72, velocity: 0.35, timestamp: 160 },
        { x: sx(440), y: sy(305), pressure: 0.55, velocity: 0.5, timestamp: 220 },
        { x: sx(330), y: sy(345), pressure: 0.3, velocity: 0.75, timestamp: 280 },
      ],
    },
    {
      id: 'preset-fuji-right',
      brushType: 'sumi_kasure',
      layerId: 'midground',
      colors: { ...colors },
      thickness: 1.1 * scale,
      bristleCount: 26,
      dryBrushGap: 0.38,
      seed: 3033,
      points: [
        { x: sx(648), y: sy(185), pressure: 0.85, velocity: 0.2, timestamp: 300 },
        { x: sx(720), y: sy(250), pressure: 0.68, velocity: 0.42, timestamp: 360 },
        { x: sx(815), y: sy(325), pressure: 0.4, velocity: 0.68, timestamp: 420 },
      ],
    },
    {
      id: 'preset-sakura-branch-main',
      brushType: 'sakura_branch',
      layerId: 'foreground',
      colors: { ...colors },
      thickness: 1.2 * scale,
      bristleCount: 24,
      dryBrushGap: 0.28,
      seed: 4044,
      points: [
        { x: sx(35), y: sy(330), pressure: 0.95, velocity: 0.15, timestamp: 450 },
        { x: sx(135), y: sy(240), pressure: 0.82, velocity: 0.28, timestamp: 520 },
        { x: sx(235), y: sy(165), pressure: 0.68, velocity: 0.38, timestamp: 590 },
        { x: sx(345), y: sy(115), pressure: 0.52, velocity: 0.52, timestamp: 660 },
        { x: sx(460), y: sy(78), pressure: 0.35, velocity: 0.7, timestamp: 730 },
      ],
    },
    {
      id: 'preset-sakura-branch-lower',
      brushType: 'sakura_branch',
      layerId: 'foreground',
      colors: { ...colors },
      thickness: 0.95 * scale,
      bristleCount: 20,
      dryBrushGap: 0.32,
      seed: 5055,
      points: [
        { x: sx(125), y: sy(245), pressure: 0.78, velocity: 0.24, timestamp: 760 },
        { x: sx(235), y: sy(255), pressure: 0.65, velocity: 0.36, timestamp: 820 },
        { x: sx(345), y: sy(285), pressure: 0.5, velocity: 0.48, timestamp: 880 },
        { x: sx(455), y: sy(315), pressure: 0.32, velocity: 0.65, timestamp: 940 },
      ],
    },
  ];
}

/**
 * Renderiza um único traço gravado até o alcance `headReach` (0.0 a 1.0)
 */
function renderSingleRecordedStroke(
  ctx: CanvasRenderingContext2D,
  stroke: RecordedBrushStroke,
  headReach = 1.0
) {
  if (stroke.points.length < 2 || headReach <= 0.01) return;

  const spine = samplesToSpine(stroke.points, 0.14, stroke.seed);
  const avgPressure =
    stroke.points.reduce((acc, pt) => acc + pt.pressure, 0) / stroke.points.length;
  const effectiveWidth = 32 * stroke.thickness * (0.45 + avgPressure * 0.85);
  const { inkPrimary, energySecondary, coreGlow, sporeAccent } = stroke.colors;

  const mockConfig: VFXConfig = {
    ...DEFAULT_VFX_CONFIG,
    colors: stroke.colors,
    seed: stroke.seed,
  };

  if (stroke.brushType === 'tarashikomi_wash') {
    const step = Math.max(1, Math.floor(spine.length / 7));
    const maxIdx = Math.max(1, Math.floor(spine.length * headReach));
    for (let i = 0; i < maxIdx; i += step) {
      const pt = spine[i];
      const ang = Math.atan2(-pt.nx, pt.ny);
      drawTarashikomiWashBlob(
        ctx,
        pt.x,
        pt.y,
        effectiveWidth * 0.95 * (0.6 + avgPressure * 0.6),
        effectiveWidth * 0.82 * (0.6 + avgPressure * 0.6),
        ang,
        energySecondary,
        inkPrimary,
        0.52,
        stroke.seed + i * 19
      );
    }
    return;
  }

  if (stroke.brushType === 'sumi_kasure') {
    const midPt = spine[Math.floor(spine.length * 0.45)];
    const startAngle = Math.atan2(-spine[0].nx, spine[0].ny);
    drawTarashikomiWashBlob(
      ctx,
      midPt.x,
      midPt.y,
      effectiveWidth * 1.3,
      effectiveWidth * 0.7,
      startAngle,
      sporeAccent,
      inkPrimary,
      0.16 * headReach,
      stroke.seed + 7
    );

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: effectiveWidth,
      bristleCount: stroke.bristleCount,
      dryBrushGap: stroke.dryBrushGap,
      taperStart: 0.22,
      taperEnd: 0.58,
      color: inkPrimary,
      alpha: 0.95,
      headReach,
      seed: stroke.seed,
    });
    return;
  }

  if (stroke.brushType === 'sakura_branch') {
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: effectiveWidth * 0.82,
      bristleCount: stroke.bristleCount,
      dryBrushGap: stroke.dryBrushGap * 0.9,
      taperStart: 0.15,
      taperEnd: 0.65,
      color: inkPrimary,
      alpha: 0.96,
      headReach,
      seed: stroke.seed,
    });

    const rand = createSeededRandom(stroke.seed + 333);
    const maxIdx = Math.floor(spine.length * headReach);
    for (let i = 2; i < maxIdx; i += 3) {
      if (rand() < 0.22) continue;
      const pt = spine[i];
      const offsetNorm = (rand() - 0.48) * effectiveWidth * 1.15;
      const bx = pt.x + pt.nx * offsetNorm;
      const by = pt.y + pt.ny * offsetNorm;
      const bRadius = (6.5 + rand() * 8.5) * (0.7 + avgPressure * 0.5);

      if (rand() > 0.55) {
        drawTarashikomiWashBlob(
          ctx,
          bx,
          by,
          bRadius * 1.45,
          bRadius * 1.35,
          rand() * Math.PI,
          energySecondary,
          inkPrimary,
          0.24,
          stroke.seed + i * 41
        );
      }

      drawSakuraBlossom(
        ctx,
        bx,
        by,
        bRadius,
        rand() * Math.PI * 2,
        energySecondary,
        coreGlow,
        inkPrimary,
        0.94,
        stroke.seed + i * 29
      );
    }
    return;
  }

  if (stroke.brushType === 'hokusai_wave') {
    const activeSpine = spine.slice(0, Math.max(6, Math.floor(spine.length * headReach)));
    drawHokusaiWaveCrest(
      ctx,
      null,
      activeSpine,
      effectiveWidth * 1.35,
      1,
      6,
      mockConfig,
      1.0,
      0.95,
      stroke.seed
    );
    return;
  }

  if (stroke.brushType === 'suibokuga_flame') {
    const p0 = spine[0];
    const p1 = spine[Math.floor(spine.length * 0.33 * headReach)] || p0;
    const p2 = spine[Math.floor(spine.length * 0.66 * headReach)] || p1;
    const p3 = spine[Math.max(1, Math.floor((spine.length - 1) * headReach))] || p2;
    drawFlamePetalTongue(ctx, null, mockConfig, 1.0, {
      rootX: p0.x,
      rootY: p0.y,
      ctrl1X: p1.x,
      ctrl1Y: p1.y,
      ctrl2X: p2.x,
      ctrl2Y: p2.y,
      tipX: p3.x,
      tipY: p3.y,
      maxBellyWidth: effectiveWidth * 1.4,
      striationCount: 5,
      alpha: 0.94,
      seed: stroke.seed,
    });
    return;
  }

  if (stroke.brushType === 'kumo_cloud') {
    const p0 = spine[0];
    const pEnd = spine[Math.max(1, Math.floor((spine.length - 1) * headReach))] || p0;
    drawUkiyoeCloudScrollVolute(ctx, null, mockConfig, 1.0, {
      startX: p0.x,
      startY: p0.y,
      endX: pEnd.x,
      endY: pEnd.y,
      maxThickness: effectiveWidth * 1.25,
      lobeCount: 3,
      alpha: 0.92,
      seed: stroke.seed,
    });
  }
}

export const SumiBrushCanvas: React.FC<SumiBrushCanvasProps> = ({
  activeBrush = 'sakura_branch',
  colors = DEFAULT_COLORS,
  strokeThickness = 1.25,
  bristleCount = 26,
  dryBrushGap = 0.32,
  activeLayer = 'foreground',
  layerOpacities = { background: 1, midground: 1, foreground: 1 },
  showReferenceGuide = true,
  onTelemetryChange,
  actionsRef,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedCacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedCacheValidRef = useRef<boolean>(false);
  const refImageRef = useRef<HTMLImageElement | null>(null);
  const [refImageLoaded, setRefImageLoaded] = useState(false);

  const strokesRef = useRef<RecordedBrushStroke[]>([]);
  const starterInitializedRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<RecordedBrushStroke | null>(null);
  const currentPointsRef = useRef<BrushPointSample[]>([]);
  const replayStateRef = useRef<{ active: boolean; startTime: number; duration: number }>({
    active: false,
    startTime: 0,
    duration: 2600,
  });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      refImageRef.current = img;
      completedCacheValidRef.current = false;
      setRefImageLoaded(true);
    };
    img.src = '/assets/aistudio/image_8f7809d3.png';
  }, []);

  const invalidateCompletedCache = useCallback(() => {
    completedCacheValidRef.current = false;
  }, []);

  const renderBaseAndCompletedStrokes = useCallback(
    (targetCtx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      targetCtx.save();
      targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      targetCtx.clearRect(0, 0, w, h);

      // 1. Papel Washi fibras sutis
      targetCtx.fillStyle = '#F4F1EA';
      targetCtx.fillRect(0, 0, w, h);

      // 2. Guia translúcido da obra Monte Fuji & Sakura
      if (showReferenceGuide && refImageLoaded && refImageRef.current) {
        targetCtx.save();
        targetCtx.globalAlpha = 0.14;
        const img = refImageRef.current;
        const imgRatio = img.width / Math.max(1, img.height);
        const cRatio = w / h;
        let dw = w;
        let dh = h;
        let dx = 0;
        let dy = 0;
        if (cRatio > imgRatio) {
          dw = w;
          dh = w / imgRatio;
          dy = (h - dh) * 0.5;
        } else {
          dh = h;
          dw = h * imgRatio;
          dx = (w - dw) * 0.5;
        }
        targetCtx.drawImage(img, dx, dy, dw, dh);
        targetCtx.restore();
      }

      const layersOrder: ('background' | 'midground' | 'foreground')[] = [
        'background',
        'midground',
        'foreground',
      ];

      layersOrder.forEach((layerName) => {
        const layerAlpha = layerOpacities[layerName] ?? 1;
        if (layerAlpha <= 0.01) return;

        targetCtx.save();
        targetCtx.globalAlpha = layerAlpha;

        strokesRef.current.forEach((st) => {
          if (st.layerId !== layerName) return;
          renderSingleRecordedStroke(targetCtx, st, 1.0);
        });

        targetCtx.restore();
      });

      targetCtx.restore();
    },
    [layerOpacities, refImageLoaded, showReferenceGuide]
  );

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const w = Math.max(240, canvas.clientWidth || 640);
    const h = Math.max(180, canvas.clientHeight || 420);

    // Inicializa os traços responsivos na primeira medição real do canvas
    if (!starterInitializedRef.current && w > 0 && h > 0) {
      strokesRef.current = buildStarterFujiStrokes(colors, w, h);
      starterInitializedRef.current = true;
      completedCacheValidRef.current = false;
    }

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      completedCacheValidRef.current = false;
    }

    if (!completedCacheCanvasRef.current) {
      completedCacheCanvasRef.current = document.createElement('canvas');
    }
    const cacheCanvas = completedCacheCanvasRef.current;
    if (cacheCanvas.width !== canvas.width || cacheCanvas.height !== canvas.height) {
      cacheCanvas.width = canvas.width;
      cacheCanvas.height = canvas.height;
      completedCacheValidRef.current = false;
    }

    const ctx = canvas.getContext('2d');
    const cacheCtx = cacheCanvas.getContext('2d');
    if (!ctx || !cacheCtx) return;

    const now = performance.now();
    const isReplaying = replayStateRef.current.active;
    const replayProg = isReplaying
      ? Math.min(1, (now - replayStateRef.current.startTime) / replayStateRef.current.duration)
      : 1;

    if (isReplaying) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, w, h);

      const layersOrder: ('background' | 'midground' | 'foreground')[] = [
        'background',
        'midground',
        'foreground',
      ];
      const totalStrokes = Math.max(1, strokesRef.current.length);

      layersOrder.forEach((layerName) => {
        const layerAlpha = layerOpacities[layerName] ?? 1;
        if (layerAlpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = layerAlpha;

        strokesRef.current.forEach((st, idx) => {
          if (st.layerId !== layerName) return;
          const stStart = idx / totalStrokes;
          const stEnd = (idx + 1) / totalStrokes;
          const reach = Math.max(0, Math.min(1, (replayProg - stStart) / (stEnd - stStart)));
          renderSingleRecordedStroke(ctx, st, reach);
        });

        ctx.restore();
      });

      ctx.restore();
      return;
    }

    // Usa o cache offscreen para os traços já finalizados (mantém 60/120 FPS ao arrastar o dedo no mobile)
    if (!completedCacheValidRef.current) {
      renderBaseAndCompletedStrokes(cacheCtx, w, h, dpr);
      completedCacheValidRef.current = true;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(cacheCanvas, 0, 0, w, h);

    if (activeStrokeRef.current) {
      const layerAlpha = layerOpacities[activeStrokeRef.current.layerId] ?? 1;
      ctx.globalAlpha = layerAlpha;
      renderSingleRecordedStroke(ctx, activeStrokeRef.current, 1.0);
    }

    ctx.restore();
  }, [colors, layerOpacities, renderBaseAndCompletedStrokes]);

  useEffect(() => {
    invalidateCompletedCache();
    renderAll();
  }, [
    invalidateCompletedCache,
    renderAll,
    layerOpacities,
    showReferenceGuide,
    refImageLoaded,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      invalidateCompletedCache();
      renderAll();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [invalidateCompletedCache, renderAll]);

  const startReplay = useCallback(() => {
    replayStateRef.current = {
      active: true,
      startTime: performance.now(),
      duration: Math.max(1400, strokesRef.current.length * 420),
    };

    const step = () => {
      if (!replayStateRef.current.active) return;
      const elapsed = performance.now() - replayStateRef.current.startTime;
      renderAll();
      if (elapsed < replayStateRef.current.duration) {
        requestAnimationFrame(step);
      } else {
        replayStateRef.current.active = false;
        invalidateCompletedCache();
        renderAll();
        onTelemetryChange?.({
          pressure: 0,
          velocity: 0,
          strokeCount: strokesRef.current.length,
          isReplaying: false,
        });
      }
    };
    onTelemetryChange?.({
      pressure: 0.75,
      velocity: 0.5,
      strokeCount: strokesRef.current.length,
      isReplaying: true,
    });
    requestAnimationFrame(step);
  }, [invalidateCompletedCache, onTelemetryChange, renderAll]);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      replayStrokes: startReplay,
      undoStroke: () => {
        strokesRef.current = strokesRef.current.slice(0, -1);
        invalidateCompletedCache();
        renderAll();
        onTelemetryChange?.({
          pressure: 0,
          velocity: 0,
          strokeCount: strokesRef.current.length,
          isReplaying: false,
        });
      },
      clearCanvas: () => {
        strokesRef.current = [];
        invalidateCompletedCache();
        renderAll();
        onTelemetryChange?.({
          pressure: 0,
          velocity: 0,
          strokeCount: 0,
          isReplaying: false,
        });
      },
      loadFujiPresetStrokes: () => {
        const canvas = canvasRef.current;
        const w = Math.max(260, canvas?.clientWidth || 880);
        const h = Math.max(200, canvas?.clientHeight || 460);
        strokesRef.current = buildStarterFujiStrokes(colors, w, h);
        invalidateCompletedCache();
        startReplay();
      },
      exportPng: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `sumi-forge-painting-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      },
    };
  }, [actionsRef, colors, invalidateCompletedCache, onTelemetryChange, renderAll, startReplay]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignora em navegadores que não suportam pointer capture
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.72;
    const now = performance.now();

    currentPointsRef.current = [{ x, y, pressure, velocity: 0.15, timestamp: now }];
    activeStrokeRef.current = {
      id: `stroke-${Date.now()}`,
      brushType: activeBrush,
      layerId: activeLayer,
      colors: { ...colors },
      thickness: strokeThickness,
      bristleCount,
      dryBrushGap,
      seed: Math.floor(Math.random() * 90000) + 1000,
      points: currentPointsRef.current,
    };

    onTelemetryChange?.({
      pressure,
      velocity: 0.15,
      strokeCount: strokesRef.current.length + 1,
      isReplaying: false,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();

    const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
    const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    if (dist < 3.0) return;

    const dt = Math.max(1, now - (prev?.timestamp || now - 16));
    const velocity = Math.min(1, dist / dt / 2.2);
    const simulatedPressure = Math.max(0.22, Math.min(1, 0.94 - velocity * 0.62));
    const hardwarePressure =
      e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : simulatedPressure;

    currentPointsRef.current.push({
      x,
      y,
      pressure: hardwarePressure,
      velocity,
      timestamp: now,
    });
    activeStrokeRef.current.points = currentPointsRef.current;

    renderAll();
    onTelemetryChange?.({
      pressure: hardwarePressure,
      velocity,
      strokeCount: strokesRef.current.length + 1,
      isReplaying: false,
    });
  };

  const handlePointerUp = () => {
    if (!activeStrokeRef.current) return;
    // Suporte a toque simples no celular: se o usuário apenas tocou 1 ponto na tela,
    // sintetiza um gesto curto para estampar a flor de Sakura, mancha Tarashikomi ou pincelada
    if (currentPointsRef.current.length === 1) {
      const p0 = currentPointsRef.current[0];
      currentPointsRef.current.push(
        {
          x: p0.x + 18,
          y: p0.y - 8,
          pressure: p0.pressure * 0.95,
          velocity: 0.18,
          timestamp: p0.timestamp + 16,
        },
        {
          x: p0.x + 36,
          y: p0.y - 14,
          pressure: p0.pressure * 0.75,
          velocity: 0.25,
          timestamp: p0.timestamp + 32,
        }
      );
      activeStrokeRef.current.points = currentPointsRef.current;
    }

    if (currentPointsRef.current.length >= 2) {
      strokesRef.current.push(activeStrokeRef.current);
      invalidateCompletedCache();
    }
    activeStrokeRef.current = null;
    currentPointsRef.current = [];
    renderAll();
    onTelemetryChange?.({
      pressure: 0,
      velocity: 0,
      strokeCount: strokesRef.current.length,
      isReplaying: false,
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className={`block w-full h-full cursor-crosshair touch-none select-none ${className}`}
    />
  );
};

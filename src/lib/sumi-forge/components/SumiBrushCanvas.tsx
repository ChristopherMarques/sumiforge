import React, { useCallback, useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { createSeededRandom, samplesToSpine } from '../math';
import { DEFAULT_VFX_CONFIG } from '../presets';
import {
  drawFacetedRoughCrystal,
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
} from '../types';

export interface SumiBrushCanvasProps {
  /** Tipo de pincel japonês ativo */
  activeBrush: InteractiveBrushType;
  /** Paleta de 3 canais ativa */
  colors: SumiColors;
  /** Espessura base da pincelada (0.4 a 2.5) */
  strokeThickness?: number;
  /** Quantidade de cerdas de bambu (8 a 40) */
  bristleCount?: number;
  /** Falha de pincel seco Kasure (0.0 a 0.85) */
  dryBrushGap?: number;
  /** Camada de destino para novos traços */
  activeLayer?: 'background' | 'midground' | 'foreground';
  /** Intensidade/opacidade individual de cada camada (0.0 a 1.5) */
  layerOpacities?: {
    background: number;
    midground: number;
    foreground: number;
  };
  /** Semente determinística */
  seed?: number;
  /** Exibe a imagem do Monte Fuji e Sakura como guia translúcido de decalque */
  showReferenceGuide?: boolean;
  /** Callback disparado sempre que a contagem de traços ou pressão atual muda */
  onTelemetryChange?: (info: {
    pressure: number;
    velocity: number;
    strokeCount: number;
    isReplaying: boolean;
  }) => void;
  /** Ref imperativa para disparar Replay Animado, Undo, Clear ou Exportar PNG */
  actionsRef?: React.MutableRefObject<{
    replayStrokes: () => void;
    undoStroke: () => void;
    clearCanvas: () => void;
    loadFujiPresetStrokes: () => void;
    exportPng: () => void;
  } | null>;
  className?: string;
}

/**
 * Componente <SumiBrushCanvas /> — Atelier de pintura interativa com suporte a pressão real de caneta
 * (`PointerEvent.pressure`) e pressão cinética inferida pela velocidade do mouse, controle de 3 camadas
 * e Replay Animado com cinética Sakuga.
 */
export const SumiBrushCanvas: React.FC<SumiBrushCanvasProps> = ({
  activeBrush,
  colors,
  strokeThickness = 1.2,
  bristleCount = 24,
  dryBrushGap = 0.32,
  activeLayer = 'midground',
  layerOpacities = { background: 1.0, midground: 1.0, foreground: 1.0 },
  seed = 8472,
  showReferenceGuide = false,
  onTelemetryChange,
  actionsRef,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<RecordedBrushStroke[]>([]);
  const currentPointsRef = useRef<BrushPointSample[]>([]);
  const isDrawingRef = useRef(false);
  const [replayState, setReplayState] = useState<{ active: boolean; progress: number }>({
    active: false,
    progress: 1,
  });
  const guideImgRef = useRef<HTMLImageElement | null>(null);

  // Carrega a imagem de referência para modo decalque opcional
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/aistudio/image_8f7809d3.png';
    img.onload = () => {
      guideImgRef.current = img;
    };
  }, []);

  const buildStarterFujiStrokes = useCallback((): RecordedBrushStroke[] => {
    return [
      {
        id: 'starter-sun',
        brushType: 'tarashikomi_wash',
        layerId: 'background',
        colors: {
          inkPrimary: '#141413',
          energySecondary: '#C8232C',
          coreGlow: '#FFF5F5',
          sporeAccent: '#E11D48',
        },
        thickness: 1.6,
        bristleCount: 20,
        dryBrushGap: 0.25,
        seed: seed + 11,
        points: [
          { x: 680, y: 145, pressure: 0.95, velocity: 0.1, timestamp: 0 },
          { x: 735, y: 155, pressure: 0.9, velocity: 0.15, timestamp: 40 },
        ],
      },
      {
        id: 'starter-fuji-left',
        brushType: 'sumi_kasure',
        layerId: 'midground',
        colors: {
          inkPrimary: '#141413',
          energySecondary: '#4A5559',
          coreGlow: '#FAF8F5',
          sporeAccent: '#141413',
        },
        thickness: 1.35,
        bristleCount: 26,
        dryBrushGap: 0.38,
        seed: seed + 33,
        points: [
          { x: 640, y: 245, pressure: 0.92, velocity: 0.2, timestamp: 0 },
          { x: 560, y: 315, pressure: 0.75, velocity: 0.45, timestamp: 30 },
          { x: 450, y: 375, pressure: 0.55, velocity: 0.7, timestamp: 60 },
          { x: 330, y: 410, pressure: 0.25, velocity: 0.9, timestamp: 90 },
        ],
      },
      {
        id: 'starter-fuji-right',
        brushType: 'sumi_kasure',
        layerId: 'midground',
        colors: {
          inkPrimary: '#141413',
          energySecondary: '#4A5559',
          coreGlow: '#FAF8F5',
          sporeAccent: '#141413',
        },
        thickness: 1.25,
        bristleCount: 24,
        dryBrushGap: 0.42,
        seed: seed + 57,
        points: [
          { x: 675, y: 245, pressure: 0.9, velocity: 0.2, timestamp: 0 },
          { x: 755, y: 320, pressure: 0.7, velocity: 0.5, timestamp: 30 },
          { x: 855, y: 385, pressure: 0.35, velocity: 0.85, timestamp: 60 },
        ],
      },
      {
        id: 'starter-sakura-branch',
        brushType: 'sakura_branch',
        layerId: 'foreground',
        colors: {
          inkPrimary: '#141413',
          energySecondary: '#C8232C',
          coreGlow: '#FFF5F5',
          sporeAccent: '#E11D48',
        },
        thickness: 1.45,
        bristleCount: 28,
        dryBrushGap: 0.3,
        seed: seed + 89,
        points: [
          { x: 40, y: 345, pressure: 0.98, velocity: 0.1, timestamp: 0 },
          { x: 165, y: 240, pressure: 0.86, velocity: 0.25, timestamp: 30 },
          { x: 295, y: 155, pressure: 0.68, velocity: 0.45, timestamp: 60 },
          { x: 445, y: 75, pressure: 0.35, velocity: 0.8, timestamp: 90 },
        ],
      },
    ];
  }, [seed]);

  // Inicializa com traços demonstrativos na primeira montagem
  useEffect(() => {
    if (strokesRef.current.length === 0) {
      strokesRef.current = buildStarterFujiStrokes();
    }
  }, [buildStarterFujiStrokes]);

  const drawSingleRecordedStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      rc: ReturnType<typeof rough.canvas> | null,
      stroke: RecordedBrushStroke,
      headReach = 1.0,
      alphaMultiplier = 1.0
    ) => {
      const pts = stroke.points;
      if (pts.length < 2 || alphaMultiplier <= 0.01) return;

      const spine = samplesToSpine(pts, 0.14, stroke.seed);
      if (spine.length < 2) return;

      const avgPressure =
        pts.reduce((sum, p) => sum + p.pressure, 0) / Math.max(1, pts.length);
      const baseWidth = 22 * stroke.thickness * (0.55 + avgPressure * 0.75);
      const vfxCfg = {
        ...DEFAULT_VFX_CONFIG,
        colors: stroke.colors,
        seed: stroke.seed,
      };

      ctx.save();
      ctx.globalAlpha = Math.min(1, alphaMultiplier);

      if (stroke.brushType === 'sumi_kasure') {
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: baseWidth,
          bristleCount: stroke.bristleCount,
          dryBrushGap: stroke.dryBrushGap,
          taperStart: 0.25,
          taperEnd: 0.92,
          color: stroke.colors.inkPrimary,
          alpha: alphaMultiplier,
          headReach,
          roundHeadCap: true,
          seed: stroke.seed,
        });
      } else if (stroke.brushType === 'sakura_branch') {
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: baseWidth * 1.15,
          bristleCount: stroke.bristleCount,
          dryBrushGap: stroke.dryBrushGap,
          taperStart: 0.15,
          taperEnd: 0.95,
          color: stroke.colors.inkPrimary,
          alpha: alphaMultiplier,
          headReach,
          roundHeadCap: true,
          seed: stroke.seed,
        });

        const rand = createSeededRandom(stroke.seed + 55);
        const blossomCount = Math.max(4, Math.floor(spine.length / 4));
        for (let b = 0; b < blossomCount; b++) {
          const tPos = (b + 0.5) / blossomCount;
          if (tPos > headReach) continue;
          const pt = spine[Math.min(spine.length - 1, Math.floor(tPos * (spine.length - 1)))];
          const offset = (rand() - 0.45) * baseWidth * 1.1;
          drawSakuraBlossom(
            ctx,
            pt.x + pt.nx * offset,
            pt.y + pt.ny * offset,
            (8 + rand() * 8) * stroke.thickness,
            b * 0.8,
            stroke.colors.energySecondary,
            stroke.colors.coreGlow,
            stroke.colors.inkPrimary,
            alphaMultiplier * 0.96,
            stroke.seed + b * 29
          );
        }
      } else if (stroke.brushType === 'hokusai_wave') {
        const sliced = spine.filter((p) => p.t <= headReach);
        if (sliced.length >= 6) {
          drawHokusaiWaveCrest(
            ctx,
            rc,
            sliced.map((p, i, arr) => ({ ...p, t: i / Math.max(1, arr.length - 1) })),
            baseWidth * 1.35,
            1,
            5,
            vfxCfg,
            1.1,
            alphaMultiplier,
            stroke.seed
          );
        }
      } else if (stroke.brushType === 'suibokuga_flame') {
        const p0 = spine[0];
        const pMid1 = spine[Math.floor(spine.length * 0.33)];
        const pMid2 = spine[Math.floor(spine.length * 0.66)];
        const pEnd = spine[Math.min(spine.length - 1, Math.floor(headReach * (spine.length - 1)))];
        drawFlamePetalTongue(ctx, rc, vfxCfg, 1.1, {
          rootX: p0.x,
          rootY: p0.y,
          ctrl1X: pMid1.x + pMid1.nx * 18,
          ctrl1Y: pMid1.y + pMid1.ny * 18,
          ctrl2X: pMid2.x - pMid2.nx * 18,
          ctrl2Y: pMid2.y - pMid2.ny * 18,
          tipX: pEnd.x,
          tipY: pEnd.y,
          maxBellyWidth: baseWidth * 1.4,
          striationCount: 6,
          alpha: alphaMultiplier,
          seed: stroke.seed,
        });
      } else if (stroke.brushType === 'kumo_cloud') {
        const p0 = spine[0];
        const pEnd = spine[Math.min(spine.length - 1, Math.floor(headReach * (spine.length - 1)))];
        drawUkiyoeCloudScrollVolute(ctx, rc, vfxCfg, 1.1, {
          startX: p0.x,
          startY: p0.y,
          endX: pEnd.x,
          endY: pEnd.y,
          maxThickness: baseWidth * 1.5,
          lobeCount: 3,
          flip: 1,
          alpha: alphaMultiplier,
          seed: stroke.seed,
        });
      } else if (stroke.brushType === 'tarashikomi_wash') {
        const step = Math.max(1, Math.floor(spine.length / 5));
        for (let i = 0; i < spine.length; i += step) {
          const pt = spine[i];
          if (pt.t > headReach) break;
          drawTarashikomiWashBlob(
            ctx,
            pt.x,
            pt.y,
            baseWidth * 2.1,
            baseWidth * 1.85,
            pt.t * Math.PI,
            stroke.colors.coreGlow,
            stroke.colors.energySecondary,
            alphaMultiplier * 0.72,
            stroke.seed + i * 13
          );
        }
      } else if (stroke.brushType === 'rough_crystal') {
        const p0 = spine[0];
        const pEnd = spine[Math.min(spine.length - 1, Math.floor(headReach * (spine.length - 1)))];
        const dx = pEnd.x - p0.x;
        const dy = pEnd.y - p0.y;
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        drawFacetedRoughCrystal(
          ctx,
          rc,
          p0.x,
          p0.y,
          ang,
          len,
          baseWidth * 1.1,
          vfxCfg,
          1.1,
          stroke.seed
        );
      }

      ctx.restore();
    },
    []
  );

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Guia translúcido opcional da pintura de referência
    if (showReferenceGuide && guideImgRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.drawImage(guideImgRef.current, 0, 0, w, h);
      ctx.restore();
    }

    let rc: ReturnType<typeof rough.canvas> | null = null;
    try {
      rc = rough.canvas(canvas);
    } catch {
      rc = null;
    }

    const allStrokes = strokesRef.current;
    const totalCount = allStrokes.length;
    const orderedLayers: ('background' | 'midground' | 'foreground')[] = [
      'background',
      'midground',
      'foreground',
    ];

    orderedLayers.forEach((layerKey) => {
      const layerAlpha = layerOpacities[layerKey] ?? 1.0;
      if (layerAlpha <= 0.01) return;

      allStrokes.forEach((st, idx) => {
        if (st.layerId !== layerKey) return;
        let reach = 1.0;
        if (replayState.active && totalCount > 0) {
          const strokeStart = idx / totalCount;
          const strokeEnd = (idx + 1) / totalCount;
          reach = Math.max(
            0,
            Math.min(1, (replayState.progress - strokeStart) / Math.max(0.01, strokeEnd - strokeStart))
          );
        }
        if (reach > 0.01) {
          drawSingleRecordedStroke(ctx, rc, st, reach, layerAlpha);
        }
      });
    });

    // Traço sendo desenhado neste instante
    if (isDrawingRef.current && currentPointsRef.current.length >= 2) {
      drawSingleRecordedStroke(
        ctx,
        rc,
        {
          id: 'live-stroke',
          brushType: activeBrush,
          points: currentPointsRef.current,
          colors,
          thickness: strokeThickness,
          bristleCount,
          dryBrushGap,
          seed: seed + strokesRef.current.length * 41,
          layerId: activeLayer,
        },
        1.0,
        layerOpacities[activeLayer] ?? 1.0
      );
    }

    ctx.restore();
  }, [
    activeBrush,
    activeLayer,
    bristleCount,
    colors,
    drawSingleRecordedStroke,
    dryBrushGap,
    layerOpacities,
    replayState,
    seed,
    showReferenceGuide,
    strokeThickness,
  ]);

  useEffect(() => {
    renderAll();
  }, [renderAll]);

  // Loop de Replay Animado
  useEffect(() => {
    if (!replayState.active) return;
    let animId = 0;
    const start = performance.now();
    const durationMs = Math.max(1600, strokesRef.current.length * 480);

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setReplayState({ active: p < 1, progress: p });
      onTelemetryChange?.({
        pressure: 0.75,
        velocity: 0.4,
        strokeCount: strokesRef.current.length,
        isReplaying: p < 1,
      });
      if (p < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [replayState.active, onTelemetryChange]);

  // Expõe ações imperativas para a barra de ferramentas do Playground
  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      replayStrokes: () => {
        setReplayState({ active: true, progress: 0 });
      },
      undoStroke: () => {
        strokesRef.current = strokesRef.current.slice(0, -1);
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
        renderAll();
        onTelemetryChange?.({
          pressure: 0,
          velocity: 0,
          strokeCount: 0,
          isReplaying: false,
        });
      },
      loadFujiPresetStrokes: () => {
        strokesRef.current = buildStarterFujiStrokes();
        setReplayState({ active: true, progress: 0 });
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
  }, [actionsRef, buildStarterFujiStrokes, onTelemetryChange, renderAll]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.82;
    isDrawingRef.current = true;
    currentPointsRef.current = [
      {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure,
        velocity: 0,
        timestamp: performance.now(),
      },
    ];
    onTelemetryChange?.({
      pressure,
      velocity: 0,
      strokeCount: strokesRef.current.length,
      isReplaying: false,
    });
    renderAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
    const now = performance.now();
    const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    if (dist < 2.5) return;

    const dt = Math.max(1, now - (prev?.timestamp ?? now));
    const velocity = Math.min(1, dist / dt / 1.8);
    // Quando o hardware não informa pressão variável (mouse padrão envia 0.5), simula pressão caligráfica pela velocidade
    const inferredPressure = Math.max(0.18, Math.min(1, 0.95 - velocity * 0.68));
    const pressure =
      e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : inferredPressure;

    currentPointsRef.current.push({
      x,
      y,
      pressure,
      velocity,
      timestamp: now,
    });

    onTelemetryChange?.({
      pressure,
      velocity,
      strokeCount: strokesRef.current.length,
      isReplaying: false,
    });
    renderAll();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPointsRef.current.length >= 2) {
      strokesRef.current.push({
        id: `stroke-${Date.now()}-${strokesRef.current.length}`,
        brushType: activeBrush,
        points: [...currentPointsRef.current],
        colors: { ...colors },
        thickness: strokeThickness,
        bristleCount,
        dryBrushGap,
        seed: seed + strokesRef.current.length * 41,
        layerId: activeLayer,
      });
    }
    currentPointsRef.current = [];
    onTelemetryChange?.({
      pressure: 0,
      velocity: 0,
      strokeCount: strokesRef.current.length,
      isReplaying: false,
    });
    renderAll();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`block w-full h-full touch-none cursor-crosshair select-none ${className}`}
    />
  );
};

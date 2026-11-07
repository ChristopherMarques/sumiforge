import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';
import {
  createSeededRandom,
  mixHex,
  rgbaStr,
  sampleCubicCurve,
  samplePolarArc,
  sampleQuadraticCurve,
} from '../math';
import { DEFAULT_VFX_CONFIG, MAGIC_SCHOOLS } from '../presets';
import {
  drawCalligraphicKoiCarp,
  drawCornerSakuraBranch,
  drawFloatingSakuraPetal,
  drawHokusaiWaveCrest,
  drawSumiKasureRibbon,
  drawTarashikomiWashBlob,
  drawUkiyoeCloudBank,
} from '../techniques';
import { SchoolId } from '../types';

export type SectionPaintingTheme =
  | 'header_single_stroke'
  | 'sakura_katana_canopy'
  | 'koi_river_rapids'
  | 'misty_mountains_sakura'
  | 'enso_imperial_seal';

export interface SumiSectionPainterProps {
  /** Cena artística japonesa pintada pelo pacote */
  theme: SectionPaintingTheme;
  /** Progresso de pintura controlado pelo scroll GSAP ou animação (0.0 a 1.0) */
  scrollProgress?: number;
  /** Referência mutável opcional para atualizar progresso sem re-renderizar o React */
  scrollProgressRef?: React.MutableRefObject<number>;
  /** Paleta cromática ativa */
  school?: SchoolId;
  /** Semente determinística */
  seed?: number;
  /** Movimento orgânico contínuo (vento, água, nado das carpas) */
  ambientMotion?: boolean;
  className?: string;
}

/**
 * Componente <SumiSectionPainter />
 * Pinta cenas completas de pergaminho japonês sincronizadas com o scroll.
 * Utiliza cache em canvas offscreen e IntersectionObserver para manter 60/120 FPS com uso mínimo de CPU.
 */
export const SumiSectionPainter: React.FC<SumiSectionPainterProps> = ({
  theme,
  scrollProgress = 1,
  scrollProgressRef,
  school = 'fuji_sakura',
  seed = 8472,
  ambientMotion = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticKeyRef = useRef<string>('');
  const isVisibleRef = useRef<boolean>(true);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    if (theme === 'header_single_stroke') {
      isVisibleRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { rootMargin: '120px 0px', threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!staticCanvasRef.current) {
      staticCanvasRef.current = document.createElement('canvas');
    }
    const staticCanvas = staticCanvasRef.current;
    let animId = 0;
    let cachedRect = canvas.getBoundingClientRect();

    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        cachedRect = entries[0].contentRect as DOMRect;
        staticKeyRef.current = '';
      }
    });
    ro.observe(canvas);

    const drawStaticLayer = (
      sCtx: CanvasRenderingContext2D,
      sCanvas: HTMLCanvasElement,
      w: number,
      h: number,
      dpr: number,
      reach: number
    ) => {
      sCtx.save();
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sCtx.clearRect(0, 0, w, h);

      if (reach <= 0.005) {
        sCtx.restore();
        return;
      }

      const isCompact = w < 640;
      const scale = Math.min(w / (isCompact ? 760 : 1280), Math.max(0.62, h / 520));
      const schoolColors = MAGIC_SCHOOLS[school]?.colors ?? MAGIC_SCHOOLS.fuji_sakura.colors;
      const vfxConfig = {
        ...DEFAULT_VFX_CONFIG,
        school,
        colors: schoolColors,
        seed,
      };

      let rc: ReturnType<typeof rough.canvas> | null = null;
      try {
        rc = rough.canvas(sCanvas);
      } catch {
        rc = null;
      }

      if (theme === 'header_single_stroke') {
        const drawW = (w + 48) * reach;

        sCtx.save();
        sCtx.beginPath();
        sCtx.moveTo(-24, 0);
        sCtx.lineTo(drawW, 0);
        sCtx.quadraticCurveTo(drawW - 12, h * 0.62, Math.max(-24, drawW - 36), h - 4);
        sCtx.bezierCurveTo(drawW * 0.68, h - 1, drawW * 0.32, h - 6, -24, h - 3);
        sCtx.closePath();

        const washiGrad = sCtx.createLinearGradient(0, 0, 0, h);
        washiGrad.addColorStop(0.0, 'rgba(245, 240, 230, 0.97)');
        washiGrad.addColorStop(0.78, 'rgba(239, 232, 219, 0.95)');
        washiGrad.addColorStop(1.0, 'rgba(230, 221, 206, 0.88)');
        sCtx.fillStyle = washiGrad;
        sCtx.fill();
        sCtx.restore();

        const parchmentSpine = sampleCubicCurve(
          { x: -20, y: h * 0.5 },
          { x: w * 0.34, y: h * 0.46 },
          { x: w * 0.68, y: h * 0.54 },
          { x: w + 28, y: h * 0.49 },
          60,
          0.03,
          seed + 7
        );

        drawSumiKasureRibbon(sCtx, {
          spine: parchmentSpine,
          maxWidth: h * 1.15,
          bristleCount: 18,
          dryBrushGap: 0.25,
          taperStart: 0.04,
          taperEnd: 0.14,
          color: '#E5DCCB',
          alpha: 0.45,
          headReach: reach,
          roundHeadCap: true,
          seed: seed + 13,
        });

        const borderSpine = sampleCubicCurve(
          { x: -16, y: h - 4.5 },
          { x: w * 0.35, y: h - 6.5 },
          { x: w * 0.7, y: h - 3.0 },
          { x: w + 20, y: h - 5.0 },
          64,
          0.04,
          seed + 19
        );

        drawSumiKasureRibbon(sCtx, {
          spine: borderSpine,
          maxWidth: 5.5,
          bristleCount: 10,
          dryBrushGap: 0.28,
          taperStart: 0.08,
          taperEnd: 0.65,
          color: '#4A453E',
          alpha: 0.34,
          headReach: reach,
          roundHeadCap: true,
          seed: seed + 23,
        });

        drawSumiKasureRibbon(sCtx, {
          spine: borderSpine,
          maxWidth: 3.2,
          bristleCount: 7,
          dryBrushGap: 0.22,
          taperStart: 0.12,
          taperEnd: 0.78,
          color: '#C8232C',
          offsetNormal: 1.5,
          alpha: 0.72,
          headReach: Math.max(0, reach - 0.04),
          roundHeadCap: true,
          seed: seed + 29,
        });

        if (reach > 0.65) {
          const petalAlpha = Math.min(0.85, (reach - 0.65) * 2.5);
          drawFloatingSakuraPetal(sCtx, w * 0.88, h - 7, 5.5, 0.4, 0.7, '#C8232C', petalAlpha);
          drawFloatingSakuraPetal(sCtx, w * 0.91, h - 4, 4.2, 1.2, 0.55, '#E11D48', petalAlpha);
        }
      } else if (theme === 'sakura_katana_canopy') {
        drawTarashikomiWashBlob(
          sCtx,
          w * 0.84,
          h * 0.18,
          w * 0.15 * reach,
          w * 0.15 * reach,
          0,
          '#FFF5F5',
          '#C8232C',
          0.2,
          seed + 19
        );

        drawCornerSakuraBranch(
          sCtx,
          w + 18,
          h * 0.14,
          w * (isCompact ? 0.56 : 0.65),
          h * 0.04,
          -1,
          Math.max(16, 26 * scale),
          reach,
          0,
          schoolColors.inkPrimary,
          schoolColors.energySecondary,
          schoolColors.coreGlow,
          seed + 101
        );

        drawCornerSakuraBranch(
          sCtx,
          -18,
          h * 0.94,
          w * (isCompact ? 0.36 : 0.28),
          h * 0.81,
          1,
          Math.max(15, 24 * scale),
          reach,
          1.5,
          schoolColors.inkPrimary,
          schoolColors.energySecondary,
          schoolColors.coreGlow,
          seed + 149
        );
      } else if (theme === 'koi_river_rapids') {
        const hokusaiColors = MAGIC_SCHOOLS.calligraphy_tide.colors;
        const hokusaiCfg = { ...vfxConfig, colors: hokusaiColors };

        const riverSpine = sampleCubicCurve(
          { x: -w * 0.05, y: h * 0.82 },
          { x: w * 0.34, y: h * 0.14 },
          { x: w * 0.66, y: h * 0.88 },
          { x: w * 1.05, y: h * 0.22 },
          72,
          0.1,
          seed + 211
        );

        drawSumiKasureRibbon(sCtx, {
          spine: riverSpine,
          maxWidth: Math.max(95, 185 * scale),
          bristleCount: 22,
          dryBrushGap: 0.38,
          taperStart: 0.15,
          taperEnd: 0.15,
          color: '#38BDF8',
          alpha: 0.22 * reach,
          headReach: reach,
          hookWaves: 3,
          roundHeadCap: false,
          seed: seed + 223,
        });

        drawSumiKasureRibbon(sCtx, {
          spine: riverSpine,
          maxWidth: Math.max(42, 82 * scale),
          bristleCount: 14,
          dryBrushGap: 0.44,
          taperStart: 0.15,
          taperEnd: 0.25,
          color: '#081C2E',
          offsetNormal: 18 * scale,
          alpha: 0.24 * reach,
          headReach: reach,
          roundHeadCap: false,
          seed: seed + 229,
        });

        const leftWaveSpine = sampleCubicCurve(
          { x: -w * 0.03, y: h * 0.92 },
          { x: w * 0.11, y: h * 0.78 },
          { x: w * 0.16, y: h * 0.38 },
          { x: w * 0.27, y: h * 0.2 },
          52,
          0.14,
          seed + 241
        ).filter((pt) => pt.t <= reach);

        if (leftWaveSpine.length >= 8) {
          drawHokusaiWaveCrest(
            sCtx,
            rc,
            leftWaveSpine.map((p, i, arr) => ({ ...p, t: i / Math.max(1, arr.length - 1) })),
            Math.max(34, 66 * scale),
            1,
            6,
            hokusaiCfg,
            Math.max(0.85, scale * 1.1),
            0.68,
            seed + 251
          );
        }

        const rightWaveSpine = sampleCubicCurve(
          { x: w * 1.03, y: h * 0.88 },
          { x: w * 0.89, y: h * 0.76 },
          { x: w * 0.84, y: h * 0.44 },
          { x: w * 0.74, y: h * 0.28 },
          52,
          0.14,
          seed + 263
        ).filter((pt) => pt.t <= reach);

        if (rightWaveSpine.length >= 8) {
          drawHokusaiWaveCrest(
            sCtx,
            rc,
            rightWaveSpine.map((p, i, arr) => ({ ...p, t: i / Math.max(1, arr.length - 1) })),
            Math.max(32, 58 * scale),
            -1,
            5,
            hokusaiCfg,
            Math.max(0.82, scale * 1.05),
            0.64,
            seed + 271
          );
        }

        drawCornerSakuraBranch(
          sCtx,
          w + 14,
          h * 0.07,
          w * (isCompact ? 0.68 : 0.76),
          h * 0.16,
          1,
          Math.max(14, 22 * scale),
          reach,
          0,
          '#11100E',
          '#C8232C',
          '#FFF5F5',
          seed + 299
        );
      } else if (theme === 'misty_mountains_sakura') {
        const mountainPeaks = [
          {
            x0: -w * 0.02,
            xPeak: w * 0.16,
            x1: w * 0.42,
            yPeak: h * 0.56,
            yBase: h * 0.98,
            alpha: 0.2,
          },
          {
            x0: w * 0.58,
            xPeak: w * 0.84,
            x1: w * 1.03,
            yPeak: h * 0.52,
            yBase: h * 0.98,
            alpha: 0.22,
          },
        ];

        mountainPeaks.forEach((mt, idx) => {
          sCtx.save();
          sCtx.beginPath();
          sCtx.moveTo(mt.x0, mt.yBase);
          sCtx.quadraticCurveTo(
            (mt.x0 + mt.xPeak) * 0.5,
            (mt.yBase + mt.yPeak) * 0.52,
            mt.xPeak,
            mt.yPeak
          );
          sCtx.quadraticCurveTo(
            (mt.xPeak + mt.x1) * 0.5,
            (mt.yBase + mt.yPeak) * 0.52,
            mt.x1,
            mt.yBase
          );
          sCtx.closePath();

          const grad = sCtx.createLinearGradient(mt.xPeak, mt.yPeak, mt.xPeak, mt.yBase);
          grad.addColorStop(0.0, rgbaStr(schoolColors.inkPrimary, mt.alpha * reach));
          grad.addColorStop(
            0.7,
            rgbaStr(mixHex(schoolColors.inkPrimary, '#4A5559', 0.5), mt.alpha * 0.5 * reach)
          );
          grad.addColorStop(1.0, rgbaStr(schoolColors.inkPrimary, 0.0));
          sCtx.fillStyle = grad;
          sCtx.fill();
          sCtx.restore();

          const ridgeSpine = sampleQuadraticCurve(
            { x: mt.xPeak, y: mt.yPeak },
            { x: (mt.x0 + mt.xPeak) * 0.5, y: (mt.yBase + mt.yPeak) * 0.52 },
            { x: mt.x0, y: mt.yBase },
            36,
            0.16,
            seed + 310 + idx * 17
          );
          drawSumiKasureRibbon(sCtx, {
            spine: ridgeSpine,
            maxWidth: 15 * scale,
            bristleCount: 12,
            dryBrushGap: 0.38,
            taperStart: 0.25,
            taperEnd: 0.95,
            color: schoolColors.inkPrimary,
            alpha: 0.42 * reach,
            headReach: reach,
            seed: seed + 320 + idx * 17,
          });
        });

        drawUkiyoeCloudBank(
          sCtx,
          rc,
          w * 0.15,
          h * 0.18,
          Math.max(140, 235 * scale * reach),
          4,
          vfxConfig,
          Math.max(0.8, scale),
          0.26 * reach,
          seed + 331
        );

        drawUkiyoeCloudBank(
          sCtx,
          rc,
          w * 0.85,
          h * 0.78,
          Math.max(150, 250 * scale * reach),
          4,
          vfxConfig,
          Math.max(0.8, scale),
          0.26 * reach,
          seed + 347
        );

        drawCornerSakuraBranch(
          sCtx,
          -14,
          h * 0.96,
          w * (isCompact ? 0.28 : 0.2),
          h * 0.76,
          1,
          Math.max(16, 24 * scale),
          reach,
          0,
          schoolColors.inkPrimary,
          '#C8232C',
          '#FFF5F5',
          seed + 373
        );

        drawCornerSakuraBranch(
          sCtx,
          w + 14,
          h * 0.96,
          w * (isCompact ? 0.72 : 0.8),
          h * 0.76,
          -1,
          Math.max(16, 24 * scale),
          reach,
          1.2,
          schoolColors.inkPrimary,
          '#C8232C',
          '#FFF5F5',
          seed + 389
        );
      } else if (theme === 'enso_imperial_seal') {
        const cx = w * 0.5;
        const cy = h * 0.52;
        const r = Math.min(w, h) * 0.44;

        drawTarashikomiWashBlob(
          sCtx,
          cx,
          cy,
          r * 1.04 * reach,
          r * 1.02 * reach,
          0.1,
          schoolColors.coreGlow,
          schoolColors.energySecondary,
          0.18 * reach,
          seed + 401
        );

        const ensoSpine = samplePolarArc(
          cx,
          cy,
          r,
          r * 0.96,
          -Math.PI * 0.82,
          Math.PI * 0.96,
          0,
          -0.06,
          84,
          0.16,
          seed + 419
        );

        drawSumiKasureRibbon(sCtx, {
          spine: ensoSpine,
          maxWidth: Math.max(20, 38 * scale),
          bristleCount: 24,
          dryBrushGap: 0.36,
          taperStart: 0.85,
          taperEnd: 0.99,
          color: schoolColors.inkPrimary,
          alpha: 0.28,
          headReach: reach,
          roundHeadCap: true,
          seed: seed + 431,
        });

        drawSumiKasureRibbon(sCtx, {
          spine: ensoSpine,
          maxWidth: Math.max(7, 13 * scale),
          bristleCount: 12,
          dryBrushGap: 0.42,
          taperStart: 0.85,
          taperEnd: 0.99,
          color: schoolColors.energySecondary,
          offsetNormal: 6 * scale,
          alpha: 0.34,
          headReach: Math.max(0, reach - 0.08),
          seed: seed + 449,
        });

        drawCornerSakuraBranch(
          sCtx,
          -12,
          h * 0.84,
          w * (isCompact ? 0.28 : 0.22),
          h * 0.52,
          1,
          Math.max(15, 23 * scale),
          reach,
          0,
          schoolColors.inkPrimary,
          schoolColors.energySecondary,
          schoolColors.coreGlow,
          seed + 463
        );

        drawCornerSakuraBranch(
          sCtx,
          w + 12,
          h * 0.22,
          w * (isCompact ? 0.72 : 0.78),
          h * 0.5,
          -1,
          Math.max(15, 23 * scale),
          reach,
          1.1,
          schoolColors.inkPrimary,
          schoolColors.energySecondary,
          schoolColors.coreGlow,
          seed + 479
        );
      }

      sCtx.restore();
    };

    const render = (now: number) => {
      if (!isVisibleRef.current && theme !== 'header_single_stroke') {
        if (ambientMotion) animId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(1.75, window.devicePixelRatio || 1);
      const w = Math.max(240, Math.floor(cachedRect.width || canvas.clientWidth || 600));
      const h = Math.max(52, Math.floor(cachedRect.height || canvas.clientHeight || 120));

      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        staticCanvas.width = targetW;
        staticCanvas.height = targetH;
        staticKeyRef.current = '';
      }

      const ctx = canvas.getContext('2d');
      const sCtx = staticCanvas.getContext('2d');
      if (!ctx || !sCtx) return;

      const rawProg = scrollProgressRef ? scrollProgressRef.current : scrollProgress;
      const prog = Math.max(0.0, Math.min(1, rawProg));

      if (theme === 'header_single_stroke' && prog <= 0.005) {
        ctx.clearRect(0, 0, targetW, targetH);
        return;
      }

      const reach =
        theme === 'header_single_stroke'
          ? Math.min(1, Math.pow(prog, 0.6))
          : Math.min(1, Math.pow(prog, 0.65) * 1.15);

      const quantReach = reach >= 0.995 ? 1 : Math.round(reach * 60) / 60;
      const cacheKey = `${theme}:${targetW}x${targetH}:${quantReach}:${school}:${seed}`;

      if (staticKeyRef.current !== cacheKey) {
        drawStaticLayer(sCtx, staticCanvas, w, h, dpr, quantReach);
        staticKeyRef.current = cacheKey;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Copia a base estática do cache offscreen (< 0.1ms)
      ctx.drawImage(staticCanvas, 0, 0, w, h);

      // 2. Desenha apenas os elementos vivos animados sobre a base
      if (ambientMotion && reach > 0.1) {
        const elapsed = (now - startRef.current) / 1000;
        const isCompact = w < 640;
        const scale = Math.min(w / (isCompact ? 760 : 1280), Math.max(0.62, h / 520));
        const schoolColors = MAGIC_SCHOOLS[school]?.colors ?? MAGIC_SCHOOLS.fuji_sakura.colors;

        if (theme === 'sakura_katana_canopy') {
          const rand = createSeededRandom(seed + 199);
          const count = isCompact ? 10 : 15;
          for (let p = 0; p < count; p++) {
            const bx = rand() * w;
            const by = rand() * h;
            const px = (bx + elapsed * (16 + (p % 5) * 5) + Math.sin(elapsed + p) * 16) % w;
            const py = (by + elapsed * (7 + (p % 3) * 4) + Math.cos(elapsed + p) * 10) % h;
            drawFloatingSakuraPetal(
              ctx,
              px,
              py,
              (5.0 + (p % 4) * 1.8) * scale,
              elapsed * 1.4 + p,
              0.35 + 0.55 * Math.abs(Math.sin(elapsed * 2 + p)),
              schoolColors.energySecondary,
              0.72 * reach
            );
          }
        } else if (theme === 'koi_river_rapids' && reach > 0.15) {
          const koiAlpha = Math.min(0.95, (reach - 0.12) * 1.35);

          // Carpa 1: Bem visível no vão aberto superior-central do rio
          const koi1X = w * 0.56 + Math.cos(elapsed * 0.6) * 22 * scale;
          const koi1Y = h * 0.18 + Math.sin(elapsed * 0.75) * 12 * scale;
          drawCalligraphicKoiCarp(
            ctx,
            koi1X,
            koi1Y,
            Math.max(95, 160 * scale),
            -0.24 + Math.sin(elapsed * 0.7) * 0.08,
            elapsed * 3.2,
            '#11100E',
            '#C8232C',
            '#FAF8F5',
            koiAlpha,
            seed + 281
          );

          // Carpa 2: Subindo pela margem esquerda alta
          const koi2X = w * 0.08 + Math.sin(elapsed * 0.55) * 16 * scale;
          const koi2Y = h * 0.43 + Math.cos(elapsed * 0.7) * 18 * scale;
          drawCalligraphicKoiCarp(
            ctx,
            koi2X,
            koi2Y,
            Math.max(88, 145 * scale),
            -0.95 + Math.cos(elapsed * 0.65) * 0.08,
            elapsed * 3.0 + 1.4,
            '#11100E',
            '#E11D48',
            '#FFF7ED',
            koiAlpha,
            seed + 293
          );

          // Carpa 3: Nadando na correnteza inferior sob o glassmorphismo
          const koi3X = w * 0.63 + Math.sin(elapsed * 0.5) * 24 * scale;
          const koi3Y = h * 0.91 + Math.cos(elapsed * 0.6) * 10 * scale;
          drawCalligraphicKoiCarp(
            ctx,
            koi3X,
            koi3Y,
            Math.max(90, 148 * scale),
            -Math.PI + 0.28 + Math.sin(elapsed * 0.6) * 0.07,
            elapsed * 3.1 + 2.7,
            '#11100E',
            '#C8232C',
            '#FAF8F5',
            koiAlpha,
            seed + 307
          );
        } else if (theme === 'misty_mountains_sakura') {
          const rand = createSeededRandom(seed + 395);
          for (let p = 0; p < 10; p++) {
            const bx = rand() * w;
            const by = rand() * h;
            const px = (bx + elapsed * (14 + (p % 4) * 4) + Math.sin(elapsed + p) * 14) % w;
            const py = (by + elapsed * (6 + (p % 3) * 3) + Math.cos(elapsed + p) * 8) % h;
            drawFloatingSakuraPetal(
              ctx,
              px,
              py,
              (4.8 + (p % 3) * 1.6) * scale,
              elapsed * 1.2 + p,
              0.4 + 0.5 * Math.abs(Math.sin(elapsed * 1.8 + p)),
              '#C8232C',
              0.65 * reach
            );
          }
        } else if (theme === 'enso_imperial_seal') {
          const cx = w * 0.5;
          const cy = h * 0.52;
          const r = Math.min(w, h) * 0.44;
          const rand = createSeededRandom(seed + 499);
          for (let p = 0; p < 12; p++) {
            const ang = (p / 12) * Math.PI * 2 + elapsed * 0.22;
            const dist = r * (0.85 + (rand() - 0.3) * 0.35);
            const px = cx + Math.cos(ang) * dist;
            const py = cy + Math.sin(ang) * dist;
            drawFloatingSakuraPetal(
              ctx,
              px,
              py,
              Math.max(5, 8.0 * scale * reach),
              elapsed * 1.3 + p,
              0.4 + 0.5 * Math.abs(Math.sin(elapsed + p)),
              schoolColors.energySecondary,
              0.5 * reach
            );
          }
        }
      }

      ctx.restore();

      if (ambientMotion || scrollProgressRef) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [theme, scrollProgress, scrollProgressRef, school, seed, ambientMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full pointer-events-none select-none ${className}`}
    />
  );
};

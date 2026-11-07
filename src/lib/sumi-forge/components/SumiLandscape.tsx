import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';
import {
  createSeededRandom,
  fbmNoise2D,
  mixHex,
  rgbaStr,
  sampleCubicCurve,
  samplePolarArc,
  sampleQuadraticCurve,
} from '../math';
import { DEFAULT_FUJI_LAYERS, DEFAULT_VFX_CONFIG } from '../presets';
import {
  drawFloatingSakuraPetal,
  drawSakuraBlossom,
  drawSumiKasureRibbon,
  drawTarashikomiWashBlob,
  drawUkiyoeCloudScrollVolute,
} from '../techniques';
import { SumiColors, SumiLayerIntensities } from '../types';

export interface SumiLandscapeProps {
  /** Progresso de pintura animada (0.0 a 1.0). Se omitido, anima automaticamente ao montar */
  revealProgress?: number;
  /** Referência mutável opcional para atualizar o progresso sem re-renderizar o React */
  revealProgressRef?: React.MutableRefObject<number | undefined>;
  /** Controle granular de intensidade de cada camada artística (0.0 a 1.5) */
  layers?: Partial<SumiLayerIntensities>;
  /** Paleta cromática (padrão: Monte Fuji & Sakura Carmesim da referência) */
  colors?: Partial<SumiColors>;
  /** Semente determinística Mulberry32 */
  seed?: number;
  /** Se verdadeiro, anima continuamente pétalas de Sakura ao vento e reflexos solares na água */
  animated?: boolean;
  /** Velocidade da brisa das pétalas e água */
  windSpeed?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Callback ao mover o cursor na cena para paralaxe sutil */
  interactive?: boolean;
}

interface BlossomNode {
  bx: number;
  by: number;
  radius: number;
  angle: number;
  stainStart: number;
  seed: number;
}

/**
 * Componente <SumiLandscape />
 * Recria de forma 100% procedural, responsiva e animada a obra japonesa do Monte Fuji,
 * Sol Vermelho, Galho de Sakura e Ilha de Pinheiros.
 *
 * Abertura em 3 atos fluidos a 60/120 FPS (sem engasgos):
 * 1. O Sol Vermelho surge e se espalha como uma mancha de tinta úmida (Tarashikomi) no papel Washi.
 * 2. Os traços de nanquim do Galho de Sakura, do Monte Fuji e da Ilha de Pinheiros deslizam pela tela.
 * 3. Após o traço do galho estar pintado, as flores de Sakura brotam como manchas de aquarela carmesim.
 */
export const SumiLandscape: React.FC<SumiLandscapeProps> = ({
  revealProgress,
  revealProgressRef,
  layers: customLayers,
  colors: customColors,
  seed = 8472,
  animated = true,
  windSpeed = 1.0,
  className = '',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const pointerRef = useRef<{
    x: number;
    y: number;
    smoothX: number;
    smoothY: number;
    active: boolean;
  }>({
    x: 0.5,
    y: 0.5,
    smoothX: 0.5,
    smoothY: 0.5,
    active: false,
  });
  const startTimeRef = useRef<number>(performance.now());

  const layers: SumiLayerIntensities = {
    ...DEFAULT_FUJI_LAYERS,
    ...customLayers,
  };

  const colors: SumiColors = {
    inkPrimary: customColors?.inkPrimary ?? '#141413',
    energySecondary: customColors?.energySecondary ?? '#C8232C',
    coreGlow: customColors?.coreGlow ?? '#FFF7F5',
    sporeAccent: customColors?.sporeAccent ?? '#4A5559',
  };

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [seed]);

  // Pausa automaticamente a animação quando o canvas sai da viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvases offscreen pré-renderizados uma única vez para animação 100% fluida sem engasgos
    const sunLayerCanvas = document.createElement('canvas');
    const mountainLayerCanvas = document.createElement('canvas');
    const branchLayerCanvas = document.createElement('canvas');
    const fullCompletedCanvas = document.createElement('canvas');
    const scratchCanvas = document.createElement('canvas');

    let blossomNodes: BlossomNode[] = [];
    let builtCacheKey = '';
    let animId = 0;
    let cachedRect = canvas.getBoundingClientRect();

    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        cachedRect = entries[0].contentRect as DOMRect;
        builtCacheKey = '';
      }
    });
    ro.observe(canvas);

    /**
     * Pré-renderiza uma única vez as camadas de tinta (Sol, Montanha/Ilha, Galhos de Nanquim e Cena Final)
     * para que a animação de abertura rode a 60/120 FPS cravados apenas revelando e manchando o papel!
     */
    const buildLayerCaches = (w: number, h: number, dpr: number) => {
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);

      [
        sunLayerCanvas,
        mountainLayerCanvas,
        branchLayerCanvas,
        fullCompletedCanvas,
        scratchCanvas,
      ].forEach((c) => {
        c.width = targetW;
        c.height = targetH;
      });

      const isCompact = w < 640;
      const scale = Math.min(w / (isCompact ? 720 : 1200), h / 700);

      // -----------------------------------------------------------------------
      // 1. Camada do Sol Vermelho (sunLayerCanvas)
      // -----------------------------------------------------------------------
      const sunCtx = sunLayerCanvas.getContext('2d');
      if (sunCtx && layers.sunIntensity > 0.02) {
        sunCtx.save();
        sunCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sunCtx.clearRect(0, 0, w, h);

        const sunX = w * (isCompact ? 0.75 : 0.795);
        const sunY = h * (isCompact ? 0.23 : 0.275);
        const sunR =
          Math.min(w, h) * (isCompact ? 0.185 : 0.165) * Math.min(1.3, layers.sunIntensity);

        drawTarashikomiWashBlob(
          sunCtx,
          sunX,
          sunY,
          sunR * 1.08,
          sunR * 1.05,
          0.15,
          colors.energySecondary,
          colors.energySecondary,
          0.88 * Math.min(1, layers.sunIntensity),
          seed + 11
        );

        sunCtx.save();
        sunCtx.beginPath();
        sunCtx.arc(sunX, sunY, sunR * 0.94, 0, Math.PI * 2);
        sunCtx.fillStyle = rgbaStr(colors.energySecondary, 0.94 * Math.min(1, layers.sunIntensity));
        sunCtx.fill();
        sunCtx.restore();

        const sunRimSpine = samplePolarArc(
          sunX,
          sunY,
          sunR * 0.92,
          sunR * 0.92,
          -Math.PI * 0.85,
          Math.PI * 0.95,
          0,
          0,
          64,
          0.12,
          seed + 23
        );
        drawSumiKasureRibbon(sunCtx, {
          spine: sunRimSpine,
          maxWidth: sunR * 0.24,
          bristleCount: 16,
          dryBrushGap: 0.46,
          taperStart: 0.5,
          taperEnd: 0.92,
          color: colors.energySecondary,
          alpha: 0.95 * Math.min(1, layers.sunIntensity),
          headReach: 1,
          seed: seed + 29,
        });

        sunCtx.restore();
      }

      // -----------------------------------------------------------------------
      // 2. Camada do Monte Fuji, Névoa Kumo e Ilha de Pinheiros (mountainLayerCanvas)
      // -----------------------------------------------------------------------
      const mtCtx = mountainLayerCanvas.getContext('2d');
      if (mtCtx) {
        mtCtx.save();
        mtCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mtCtx.clearRect(0, 0, w, h);

        if (layers.mountainIntensity > 0.02) {
          const peakX = w * (isCompact ? 0.68 : 0.735);
          const peakY = h * (isCompact ? 0.52 : 0.485);
          const peakHalfW = w * (isCompact ? 0.065 : 0.046);
          const baseLeftX = w * (isCompact ? 0.16 : 0.33);
          const baseRightX = w * 0.99;
          const baseY = h * 0.79;
          const mAlpha = Math.min(1, layers.mountainIntensity);

          mtCtx.save();
          mtCtx.beginPath();
          mtCtx.moveTo(baseLeftX, baseY);
          mtCtx.quadraticCurveTo(
            w * (isCompact ? 0.48 : 0.58),
            h * 0.68,
            peakX - peakHalfW,
            peakY + 4 * scale
          );
          mtCtx.lineTo(peakX - peakHalfW * 0.3, peakY);
          mtCtx.lineTo(peakX + peakHalfW * 0.45, peakY + 2 * scale);
          mtCtx.lineTo(peakX + peakHalfW, peakY + 6 * scale);
          mtCtx.quadraticCurveTo(w * 0.84, h * 0.65, baseRightX, baseY - 12 * scale);
          mtCtx.closePath();

          const fujiGrad = mtCtx.createLinearGradient(peakX, peakY, peakX, baseY);
          fujiGrad.addColorStop(0.0, rgbaStr(colors.inkPrimary, 0.92 * mAlpha));
          fujiGrad.addColorStop(
            0.45,
            rgbaStr(mixHex(colors.inkPrimary, colors.sporeAccent, 0.45), 0.78 * mAlpha)
          );
          fujiGrad.addColorStop(0.85, rgbaStr(colors.sporeAccent, 0.32 * mAlpha));
          fujiGrad.addColorStop(1.0, rgbaStr(colors.sporeAccent, 0.0));
          mtCtx.fillStyle = fujiGrad;
          mtCtx.fill();
          mtCtx.restore();

          const leftSlopeSpine = sampleQuadraticCurve(
            { x: peakX - peakHalfW, y: peakY + 4 * scale },
            { x: w * (isCompact ? 0.48 : 0.58), y: h * 0.675 },
            { x: baseLeftX, y: baseY },
            56,
            0.18,
            seed + 103
          );
          drawSumiKasureRibbon(mtCtx, {
            spine: leftSlopeSpine,
            maxWidth: 16 * scale,
            bristleCount: 16,
            dryBrushGap: 0.38,
            taperStart: 0.4,
            taperEnd: 0.95,
            color: colors.inkPrimary,
            alpha: 0.88 * mAlpha,
            headReach: 1,
            seed: seed + 107,
          });

          const rightSlopeSpine = sampleQuadraticCurve(
            { x: peakX + peakHalfW, y: peakY + 5 * scale },
            { x: w * 0.84, y: h * 0.64 },
            { x: baseRightX, y: baseY - 15 * scale },
            48,
            0.18,
            seed + 109
          );
          drawSumiKasureRibbon(mtCtx, {
            spine: rightSlopeSpine,
            maxWidth: 14 * scale,
            bristleCount: 14,
            dryBrushGap: 0.42,
            taperStart: 0.4,
            taperEnd: 0.95,
            color: colors.inkPrimary,
            alpha: 0.85 * mAlpha,
            headReach: 1,
            seed: seed + 113,
          });

          const ridgeCount = 12;
          const randFuji = createSeededRandom(seed + 151);
          for (let r = 0; r < ridgeCount; r++) {
            const u = (r / (ridgeCount - 1)) * 2 - 1;
            const rx0 = peakX + u * peakHalfW * 0.92;
            const ry0 = peakY + Math.abs(u) * 6 * scale;
            const spreadX = peakX + u * w * (0.14 + randFuji() * 0.08);
            const spreadY = peakY + h * (0.11 + randFuji() * 0.09);

            const ridgeSpine = sampleQuadraticCurve(
              { x: rx0, y: ry0 },
              { x: (rx0 + spreadX) * 0.5, y: (ry0 + spreadY) * 0.5 + 6 * scale },
              { x: spreadX, y: spreadY },
              32,
              0.22,
              seed + r * 29
            );

            drawSumiKasureRibbon(mtCtx, {
              spine: ridgeSpine,
              maxWidth: (r % 2 === 0 ? 15 : 9) * scale,
              bristleCount: 9,
              dryBrushGap: 0.32,
              taperStart: 0.25,
              taperEnd: 0.92,
              color: r % 2 === 0 ? '#FAF8F5' : colors.inkPrimary,
              alpha: (r % 2 === 0 ? 0.95 : 0.78) * mAlpha,
              headReach: 1,
              roundHeadCap: false,
              seed: seed + r * 53,
            });
          }
        }

        const wAlpha = Math.min(1, layers.waterReflectionIntensity);
        const mistAlpha = Math.min(1, layers.mistKumoIntensity);

        if (mistAlpha > 0.02) {
          let rc: ReturnType<typeof rough.canvas> | null = null;
          try {
            rc = rough.canvas(mountainLayerCanvas);
          } catch {
            rc = null;
          }
          const kumoConfig = {
            ...DEFAULT_VFX_CONFIG,
            colors: {
              inkPrimary: mixHex(colors.sporeAccent, '#D6D1C7', 0.6),
              energySecondary: '#EFECE4',
              coreGlow: '#FAF8F4',
              sporeAccent: colors.sporeAccent,
            },
          };

          for (let k = 0; k < 4; k++) {
            const kx = w * (0.45 + k * 0.14);
            const ky = h * (0.75 + (k % 2) * 0.03);
            drawUkiyoeCloudScrollVolute(mtCtx, rc, kumoConfig, scale, {
              startX: kx - 75 * scale,
              startY: ky,
              endX: kx + 75 * scale,
              endY: ky - 8 * scale,
              maxThickness: 28 * scale * mistAlpha,
              lobeCount: 3,
              flip: k % 2 === 0 ? 1 : -1,
              alpha: 0.42 * mistAlpha,
              seed: seed + 300 + k * 37,
            });
          }
        }

        if (wAlpha > 0.02) {
          const islandY = h * 0.845;
          const islandSpine = sampleCubicCurve(
            { x: w * (isCompact ? 0.46 : 0.56), y: islandY + 6 * scale },
            { x: w * 0.68, y: islandY - 12 * scale },
            { x: w * 0.82, y: islandY - 22 * scale },
            { x: w * 0.95, y: islandY + 4 * scale },
            44,
            0.25,
            seed + 509
          );
          drawSumiKasureRibbon(mtCtx, {
            spine: islandSpine,
            maxWidth: 32 * scale,
            bristleCount: 20,
            dryBrushGap: 0.22,
            taperStart: 0.75,
            taperEnd: 0.65,
            color: colors.inkPrimary,
            alpha: 0.94 * wAlpha,
            headReach: 1,
            seed: seed + 521,
          });

          const pines = [
            { x: w * 0.61, y: islandY - 2 * scale, h: 24 * scale },
            { x: w * 0.65, y: islandY - 4 * scale, h: 30 * scale },
            { x: w * 0.71, y: islandY - 8 * scale, h: 46 * scale },
            { x: w * 0.755, y: islandY - 12 * scale, h: 64 * scale },
            { x: w * 0.805, y: islandY - 10 * scale, h: 52 * scale },
          ];
          pines.forEach((pine, idx) => {
            const trunkSpine = sampleQuadraticCurve(
              { x: pine.x, y: pine.y },
              { x: pine.x + (idx % 2 === 0 ? -3 : 3) * scale, y: pine.y - pine.h * 0.5 },
              { x: pine.x, y: pine.y - pine.h },
              16,
              0.15,
              seed + 600 + idx
            );
            drawSumiKasureRibbon(mtCtx, {
              spine: trunkSpine,
              maxWidth: 4.2 * scale,
              bristleCount: 5,
              dryBrushGap: 0.15,
              taperStart: 0.2,
              taperEnd: 0.7,
              color: colors.inkPrimary,
              alpha: 0.95 * wAlpha,
              seed: seed + 610 + idx,
            });

            for (let c = 0; c < 3; c++) {
              const cyCanopy = pine.y - pine.h * (0.45 + c * 0.26);
              const cw = pine.h * (0.48 - c * 0.08);
              const canopySpine = sampleQuadraticCurve(
                { x: pine.x - cw, y: cyCanopy + 2 * scale },
                { x: pine.x, y: cyCanopy - 4 * scale },
                { x: pine.x + cw, y: cyCanopy + 2 * scale },
                18,
                0.2,
                seed + 630 + idx * 10 + c
              );
              drawSumiKasureRibbon(mtCtx, {
                spine: canopySpine,
                maxWidth: 9 * scale,
                bristleCount: 7,
                dryBrushGap: 0.3,
                taperStart: 0.7,
                taperEnd: 0.7,
                color: colors.inkPrimary,
                alpha: 0.92 * wAlpha,
                seed: seed + 650 + idx * 10 + c,
              });
            }
          });
        }

        mtCtx.restore();
      }

      // -----------------------------------------------------------------------
      // 3. Camada dos Galhos de Nanquim (branchLayerCanvas) + Posições das Flores
      // -----------------------------------------------------------------------
      blossomNodes = [];
      const brCtx = branchLayerCanvas.getContext('2d');
      if (brCtx && layers.sakuraBranchIntensity > 0.02) {
        brCtx.save();
        brCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        brCtx.clearRect(0, 0, w, h);

        const bAlpha = Math.min(1, layers.sakuraBranchIntensity);

        // Tronco Mestre de Sakura saindo da esquerda e subindo ACIMA do topo da tela (y < 0)
        const mainTrunk = sampleCubicCurve(
          { x: -24 * scale, y: h * 0.68 },
          { x: w * 0.11, y: h * 0.44 },
          { x: w * 0.25, y: h * 0.18 },
          { x: w * 0.46, y: -h * 0.08 },
          80,
          0.28,
          seed + 701
        );
        drawSumiKasureRibbon(brCtx, {
          spine: mainTrunk,
          maxWidth: 44 * scale * Math.min(1.25, layers.sakuraBranchIntensity),
          bristleCount: 24,
          dryBrushGap: 0.28,
          taperStart: 0.1,
          taperEnd: 0.99,
          color: colors.inkPrimary,
          alpha: 0.96 * bAlpha,
          headReach: 1,
          roundHeadCap: true,
          seed: seed + 709,
        });

        const subBranches = [
          {
            p0: { x: w * 0.12, y: h * 0.45 },
            p1: { x: w * 0.28, y: h * 0.44 },
            p2: { x: w * 0.44, y: h * 0.61 },
            p3: { x: w * 0.58, y: h * 0.72 },
            width: 22 * scale,
          },
          {
            p0: { x: w * 0.34, y: h * 0.52 },
            p1: { x: w * 0.44, y: h * 0.55 },
            p2: { x: w * 0.52, y: h * 0.49 },
            p3: { x: w * 0.6, y: h * 0.43 },
            width: 10 * scale,
          },
          {
            p0: { x: w * 0.1, y: h * 0.44 },
            p1: { x: w * 0.13, y: h * 0.26 },
            p2: { x: w * 0.1, y: h * 0.1 },
            p3: { x: w * 0.05, y: -h * 0.07 },
            width: 15 * scale,
          },
          {
            p0: { x: w * 0.21, y: h * 0.31 },
            p1: { x: w * 0.33, y: h * 0.3 },
            p2: { x: w * 0.46, y: h * 0.22 },
            p3: { x: w * 0.58, y: h * 0.15 },
            width: 12 * scale,
          },
          {
            p0: { x: w * 0.09, y: h * 0.53 },
            p1: { x: w * 0.16, y: h * 0.62 },
            p2: { x: w * 0.22, y: h * 0.69 },
            p3: { x: w * 0.28, y: h * 0.75 },
            width: 9 * scale,
          },
        ];

        const allBranchSpines = [mainTrunk];
        subBranches.forEach((b, idx) => {
          const sp = sampleCubicCurve(b.p0, b.p1, b.p2, b.p3, 48, 0.24, seed + 750 + idx * 31);
          allBranchSpines.push(sp);
          drawSumiKasureRibbon(brCtx, {
            spine: sp,
            maxWidth: b.width * Math.min(1.25, layers.sakuraBranchIntensity),
            bristleCount: 14,
            dryBrushGap: 0.26,
            taperStart: 0.12,
            taperEnd: 0.99,
            color: colors.inkPrimary,
            alpha: 0.95 * bAlpha,
            headReach: 1,
            roundHeadCap: false,
            seed: seed + 760 + idx * 31,
          });
        });

        // Calcula os nós das flores de Sakura que surgirão como manchas APÓS o traço do galho
        if (layers.sakuraPetalsIntensity > 0.02) {
          const randBlossom = createSeededRandom(seed + 881);
          allBranchSpines.forEach((sp, sIdx) => {
            const clusterCount = sIdx === 0 ? 18 : 11;
            for (let c = 0; c < clusterCount; c++) {
              const tPos = 0.12 + (c / Math.max(1, clusterCount - 1)) * 0.87;
              const ptIdx = Math.min(sp.length - 1, Math.floor(tPos * (sp.length - 1)));
              const pt = sp[ptIdx];
              const tipTighten = 1 - tPos * 0.55;
              const offsetDist = (randBlossom() - 0.45) * 26 * scale * tipTighten;
              const bx = pt.x + pt.nx * offsetDist;
              const by = pt.y + pt.ny * offsetDist;
              const radius =
                (8.5 + randBlossom() * 10.5) *
                scale *
                Math.min(1.25, layers.sakuraPetalsIntensity);

              // Cada flor surge entre progress = 0.50 e 0.86 (após o traço do galho já estar pintado!)
              const stainStart = 0.48 + tPos * 0.26 + (sIdx * 0.025) + randBlossom() * 0.05;
              blossomNodes.push({
                bx,
                by,
                radius,
                angle: c * 0.7 + sIdx * 1.3,
                stainStart: Math.min(0.84, stainStart),
                seed: seed + 900 + sIdx * 100 + c,
              });
            }
          });
        }

        brCtx.restore();
      }

      // -----------------------------------------------------------------------
      // 4. Cena Estática Completa (fullCompletedCanvas) para uso imediato após progress >= 1
      // -----------------------------------------------------------------------
      const fullCtx = fullCompletedCanvas.getContext('2d');
      if (fullCtx) {
        fullCtx.save();
        fullCtx.setTransform(1, 0, 0, 1, 0, 0);
        fullCtx.clearRect(0, 0, targetW, targetH);
        fullCtx.drawImage(sunLayerCanvas, 0, 0);
        fullCtx.drawImage(mountainLayerCanvas, 0, 0);
        fullCtx.drawImage(branchLayerCanvas, 0, 0);

        fullCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pAlpha = Math.min(1, layers.sakuraPetalsIntensity);
        blossomNodes.forEach((node) => {
          // Leve auréola de mancha aquarelada sob cada flor
          const grad = fullCtx.createRadialGradient(
            node.bx,
            node.by,
            0,
            node.bx,
            node.by,
            node.radius * 1.45
          );
          grad.addColorStop(0, rgbaStr(colors.energySecondary, 0.22 * pAlpha));
          grad.addColorStop(0.65, rgbaStr(colors.energySecondary, 0.08 * pAlpha));
          grad.addColorStop(1, rgbaStr(colors.energySecondary, 0));
          fullCtx.fillStyle = grad;
          fullCtx.beginPath();
          fullCtx.arc(node.bx, node.by, node.radius * 1.45, 0, Math.PI * 2);
          fullCtx.fill();

          drawSakuraBlossom(
            fullCtx,
            node.bx,
            node.by,
            node.radius,
            node.angle,
            colors.energySecondary,
            colors.coreGlow,
            colors.inkPrimary,
            0.95 * pAlpha,
            node.seed
          );
        });
        fullCtx.restore();
      }
    };

    const renderScene = (now: number) => {
      if (!isVisibleRef.current && revealProgress === 1) {
        if (animated) animId = requestAnimationFrame(renderScene);
        return;
      }

      const dpr = Math.min(1.75, window.devicePixelRatio || 1);
      const w = Math.max(300, Math.floor(cachedRect.width || canvas.clientWidth || 800));
      const h = Math.max(220, Math.floor(cachedRect.height || canvas.clientHeight || 500));

      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        builtCacheKey = '';
      }

      const cacheKey = `${targetW}x${targetH}:${seed}:${layers.sunIntensity}:${layers.mountainIntensity}:${layers.sakuraBranchIntensity}:${layers.sakuraPetalsIntensity}:${layers.waterReflectionIntensity}:${layers.mistKumoIntensity}:${colors.inkPrimary}:${colors.energySecondary}`;
      if (builtCacheKey !== cacheKey) {
        buildLayerCaches(w, h, dpr);
        builtCacheKey = cacheKey;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const elapsedSec = (now - startTimeRef.current) / 1000;
      const autoReveal = Math.min(1, elapsedSec / 2.4);
      const rawProgress =
        revealProgressRef?.current !== undefined
          ? revealProgressRef.current
          : revealProgress !== undefined
            ? revealProgress
            : autoReveal;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const time = animated ? elapsedSec * windSpeed : 1.5;

      // Suaviza o movimento do ponteiro
      const ptr = pointerRef.current;
      const targetPtrX = ptr.active ? ptr.x : 0.5;
      const targetPtrY = ptr.active ? ptr.y : 0.5;
      ptr.smoothX += (targetPtrX - ptr.smoothX) * 0.08;
      ptr.smoothY += (targetPtrY - ptr.smoothY) * 0.08;

      const isCompact = w < 640;
      const scale = Math.min(w / (isCompact ? 720 : 1200), h / 700);
      const ptrOffsetX = (ptr.smoothX - 0.5) * 14 * scale;
      const ptrOffsetY = (ptr.smoothY - 0.5) * 8 * scale;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (progress >= 0.998) {
        // =====================================================================
        // CENA COMPLETA EM CACHE (< 0.1ms por frame, 120 FPS cravados!)
        // =====================================================================
        ctx.drawImage(fullCompletedCanvas, ptrOffsetX * 0.35, ptrOffsetY * 0.3, w, h);
      } else {
        // =====================================================================
        // CERIMÔNIA DE ABERTURA EM 3 ATOS ULTRA-FLUIDOS (ZERO ENGASGOS)
        // =====================================================================
        const sunX = w * (isCompact ? 0.75 : 0.795) + ptrOffsetX * 0.35;
        const sunY = h * (isCompact ? 0.23 : 0.275) + ptrOffsetY * 0.25;
        const sunR =
          Math.min(w, h) * (isCompact ? 0.185 : 0.165) * Math.min(1.3, layers.sunIntensity);

        // ATO 1 (0.00 -> 0.45): O Sol Vermelho surge como uma mancha de tinta úmida (Tarashikomi)
        const sunStainP = Math.max(0, Math.min(1, progress / 0.44));
        if (layers.sunIntensity > 0.02 && sunStainP > 0.005) {
          const easeSun = 1 - Math.pow(1 - sunStainP, 3);

          // Mancha de aquarela carmesim se espalhando organicamente no papel Washi
          const bleedR = sunR * (0.35 + easeSun * 0.95);
          const stainGrad = ctx.createRadialGradient(
            sunX,
            sunY,
            bleedR * 0.08,
            sunX,
            sunY,
            bleedR
          );
          stainGrad.addColorStop(0, rgbaStr(colors.energySecondary, 0.85 * easeSun));
          stainGrad.addColorStop(0.65, rgbaStr(colors.energySecondary, 0.55 * easeSun));
          stainGrad.addColorStop(0.88, rgbaStr(colors.energySecondary, 0.24 * easeSun));
          stainGrad.addColorStop(1, rgbaStr(colors.energySecondary, 0));

          ctx.save();
          ctx.fillStyle = stainGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, bleedR, 0, Math.PI * 2);
          ctx.fill();

          // Revela suavemente a textura final do Sol sobre a mancha úmida
          ctx.globalAlpha = Math.pow(sunStainP, 1.4);
          ctx.drawImage(sunLayerCanvas, ptrOffsetX * 0.35, ptrOffsetY * 0.3, w, h);
          ctx.restore();
        }

        // ATO 2A (0.10 -> 0.62): Monte Fuji e Ilha de Pinheiros surgem em aguada Sumi-e
        const mtStrokeP = Math.max(0, Math.min(1, (progress - 0.1) / 0.52));
        if (mtStrokeP > 0.005) {
          const scCtx = scratchCanvas.getContext('2d');
          if (scCtx) {
            scCtx.save();
            scCtx.setTransform(1, 0, 0, 1, 0, 0);
            scCtx.clearRect(0, 0, targetW, targetH);
            scCtx.drawImage(mountainLayerCanvas, 0, 0);

            scCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            scCtx.globalCompositeOperation = 'destination-in';
            const easeMt = 1 - Math.pow(1 - mtStrokeP, 2.5);
            const maskX = w * 0.72;
            const maskY = h * 0.65;
            const maskR = Math.hypot(w * 0.75, h * 0.6) * easeMt;
            const mGrad = scCtx.createRadialGradient(maskX, maskY, maskR * 0.2, maskX, maskY, Math.max(10, maskR));
            mGrad.addColorStop(0, 'rgba(0,0,0,1)');
            mGrad.addColorStop(0.82, 'rgba(0,0,0,0.92)');
            mGrad.addColorStop(1, 'rgba(0,0,0,0)');
            scCtx.fillStyle = mGrad;
            scCtx.fillRect(0, 0, w, h);
            scCtx.restore();

            ctx.drawImage(scratchCanvas, ptrOffsetX * 0.35, ptrOffsetY * 0.3, w, h);
          }
        }

        // ATO 2B (0.08 -> 0.54): O Traço de Nanquim do Galho de Sakura desliza da esquerda para as pontas
        const branchStrokeP = Math.max(0, Math.min(1, (progress - 0.08) / 0.46));
        if (layers.sakuraBranchIntensity > 0.02 && branchStrokeP > 0.005) {
          const scCtx = scratchCanvas.getContext('2d');
          if (scCtx) {
            scCtx.save();
            scCtx.setTransform(1, 0, 0, 1, 0, 0);
            scCtx.clearRect(0, 0, targetW, targetH);
            scCtx.drawImage(branchLayerCanvas, 0, 0);

            // Máscara de pincelada contínua partindo da base esquerda do tronco (-20, h*0.68) até as pontas
            scCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            scCtx.globalCompositeOperation = 'destination-in';
            const easeBr = 1 - Math.pow(1 - branchStrokeP, 2.2);
            const maxSpan = Math.hypot(w * 0.68, h * 0.85) * 1.12;
            const currR = Math.max(12, maxSpan * easeBr);
            const originX = 0;
            const originY = h * 0.64;
            const brGrad = scCtx.createRadialGradient(
              originX,
              originY,
              currR * 0.55,
              originX,
              originY,
              currR
            );
            brGrad.addColorStop(0, 'rgba(0,0,0,1)');
            brGrad.addColorStop(0.85, 'rgba(0,0,0,1)');
            brGrad.addColorStop(1, 'rgba(0,0,0,0)');
            scCtx.fillStyle = brGrad;
            scCtx.fillRect(0, 0, w, h);
            scCtx.restore();

            ctx.drawImage(scratchCanvas, ptrOffsetX * 0.35, ptrOffsetY * 0.3, w, h);
          }
        }

        // ATO 3 (0.48 -> 1.00): As Flores de Sakura surgem como manchas de aquarela APÓS o traço do galho!
        if (layers.sakuraPetalsIntensity > 0.02 && progress > 0.48) {
          const pAlpha = Math.min(1, layers.sakuraPetalsIntensity);
          ctx.save();
          ctx.translate(ptrOffsetX * 0.35, ptrOffsetY * 0.3);

          for (let i = 0; i < blossomNodes.length; i++) {
            const node = blossomNodes[i];
            const localP = (progress - node.stainStart) / 0.16;
            if (localP <= 0.01) continue;
            const clampedP = Math.min(1, localP);
            const easeStain = 1 - Math.pow(1 - clampedP, 3);

            // 1. Mancha úmida de tinta carmesim (Tarashikomi) que brota primeiro no galho pintado
            const stainRad = node.radius * (0.4 + easeStain * 1.25);
            const stainAlpha =
              clampedP < 0.5
                ? (clampedP / 0.5) * 0.42 * pAlpha
                : (0.42 - ((clampedP - 0.5) / 0.5) * 0.2) * pAlpha;

            const sGrad = ctx.createRadialGradient(
              node.bx,
              node.by,
              0,
              node.bx,
              node.by,
              stainRad
            );
            sGrad.addColorStop(0, rgbaStr(colors.energySecondary, stainAlpha * 1.3));
            sGrad.addColorStop(0.6, rgbaStr(colors.energySecondary, stainAlpha * 0.7));
            sGrad.addColorStop(1, rgbaStr(colors.energySecondary, 0));
            ctx.fillStyle = sGrad;
            ctx.beginPath();
            ctx.arc(node.bx, node.by, stainRad, 0, Math.PI * 2);
            ctx.fill();

            // 2. A flor de Sakura se forma de dentro da mancha carmesim
            if (clampedP > 0.18) {
              const petalP = Math.min(1, (clampedP - 0.18) / 0.82);
              const easePetal = 1 - Math.pow(1 - petalP, 2.5);
              drawSakuraBlossom(
                ctx,
                node.bx,
                node.by,
                node.radius * (0.45 + easePetal * 0.55),
                node.angle,
                colors.energySecondary,
                colors.coreGlow,
                colors.inkPrimary,
                0.95 * pAlpha * easePetal,
                node.seed
              );
            }
          }

          ctx.restore();
        }
      }

      // =======================================================================
      // ELEMENTOS DINÂMICOS LEVES (Reflexos do Sol, Água e Pétalas ao Vento)
      // =======================================================================
      const sunProg = Math.max(0, Math.min(1, progress * 1.6));
      if (layers.sunIntensity > 0.02 && sunProg > 0.2) {
        const sunX = w * (isCompact ? 0.75 : 0.795) + ptrOffsetX * 0.35;
        const sunY = h * (isCompact ? 0.23 : 0.275) + ptrOffsetY * 0.25;
        const sunR =
          Math.min(w, h) *
          (isCompact ? 0.185 : 0.165) *
          Math.pow(sunProg, 0.45) *
          Math.min(1.3, layers.sunIntensity);

        const streakCount = 7;
        const randSun = createSeededRandom(seed + 47);
        for (let s = 0; s < streakCount; s++) {
          const sy = sunY + sunR * (0.58 + (s / streakCount) * 0.72);
          const halfSpan =
            sunR * (1.12 - Math.abs(s - 2.5) * 0.12 + Math.sin(time * 1.5 + s) * 0.04);
          const offsetX = (randSun() - 0.35) * sunR * 0.45;
          const streakSpine = sampleQuadraticCurve(
            { x: sunX - halfSpan + offsetX, y: sy },
            { x: sunX + offsetX, y: sy + (randSun() - 0.5) * 2 },
            { x: sunX + halfSpan + offsetX, y: sy },
            18,
            0.05,
            seed + s * 19
          );
          drawSumiKasureRibbon(ctx, {
            spine: streakSpine,
            maxWidth: Math.max(2.2, (5.8 - s * 0.4) * scale),
            bristleCount: 5,
            dryBrushGap: 0.48,
            taperStart: 0.85,
            taperEnd: 0.85,
            color: colors.energySecondary,
            alpha: (0.8 - s * 0.06) * Math.min(1, layers.sunIntensity) * sunProg,
            headReach: sunProg,
            roundHeadCap: false,
            seed: seed + s * 41,
          });
        }
      }

      const waterProg = Math.max(0, Math.min(1, (progress - 0.2) * 1.4));
      if (layers.waterReflectionIntensity > 0.02 && waterProg > 0.15) {
        const wAlpha = Math.min(1, layers.waterReflectionIntensity);
        const waterLines = 9;
        const randWater = createSeededRandom(seed + 401);
        for (let wl = 0; wl < waterLines; wl++) {
          const wy = h * (0.81 + (wl / waterLines) * 0.16);
          const wxCenter =
            w * (0.28 + randWater() * 0.62) + Math.sin(time * 0.9 + wl) * 8 * scale;
          const wSpan = w * (0.08 + randWater() * 0.16);
          const waterSpine = sampleQuadraticCurve(
            { x: wxCenter - wSpan, y: wy },
            { x: wxCenter, y: wy + Math.sin(time + wl) * 1.5 },
            { x: wxCenter + wSpan, y: wy },
            18,
            0.06,
            seed + wl * 23
          );
          drawSumiKasureRibbon(ctx, {
            spine: waterSpine,
            maxWidth: (4.0 + (wl % 3) * 2.0) * scale,
            bristleCount: 5,
            dryBrushGap: 0.52,
            taperStart: 0.85,
            taperEnd: 0.85,
            color: wl % 3 === 0 ? colors.inkPrimary : colors.sporeAccent,
            alpha: (0.22 + (wl % 3) * 0.11) * wAlpha * waterProg,
            headReach: waterProg,
            roundHeadCap: false,
            seed: seed + wl * 61,
          });
        }
      }

      // Pétalas de Sakura flutuando ao vento (surgem após as flores brotarem)
      if (layers.sakuraPetalsIntensity > 0.05 && progress > 0.62) {
        const petalFade = Math.min(1, (progress - 0.62) / 0.3);
        const randPetal = createSeededRandom(seed + 1201);
        const floatingCount = Math.round(
          (isCompact ? 14 : 22) * Math.min(1.4, layers.sakuraPetalsIntensity)
        );
        for (let p = 0; p < floatingCount; p++) {
          const baseX = randPetal() * w * 0.75;
          const baseY = randPetal() * h * 0.82;
          const speed = 18 + randPetal() * 24;
          const driftX =
            (baseX + time * speed * 1.35 + Math.sin(time * 1.5 + p) * 20 * scale) % (w * 0.95);
          const driftY =
            (baseY + time * speed * 0.65 + Math.cos(time * 1.1 + p) * 12 * scale) % (h * 0.88);
          const windNoise = fbmNoise2D(driftX * 0.005, driftY * 0.005, seed + p);

          drawFloatingSakuraPetal(
            ctx,
            driftX,
            driftY,
            (5.5 + (p % 4) * 2.0) * scale,
            time * (1.2 + (p % 3) * 0.4) + windNoise * Math.PI,
            0.35 + 0.6 * Math.abs(Math.sin(time * 2.1 + p)),
            colors.energySecondary,
            0.88 * petalFade
          );
        }
      }

      ctx.restore();

      if (animated || (revealProgress === undefined && !revealProgressRef)) {
        animId = requestAnimationFrame(renderScene);
      }
    };

    animId = requestAnimationFrame(renderScene);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [
    revealProgress,
    revealProgressRef,
    layers.sunIntensity,
    layers.mountainIntensity,
    layers.sakuraBranchIntensity,
    layers.sakuraPetalsIntensity,
    layers.waterReflectionIntensity,
    layers.mistKumoIntensity,
    colors.inkPrimary,
    colors.energySecondary,
    colors.coreGlow,
    colors.sporeAccent,
    seed,
    animated,
    windSpeed,
  ]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.x = (e.clientX - rect.left) / Math.max(1, rect.width);
    pointerRef.current.y = (e.clientY - rect.top) / Math.max(1, rect.height);
    pointerRef.current.active = true;
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`block w-full h-full select-none ${className}`}
    />
  );
};

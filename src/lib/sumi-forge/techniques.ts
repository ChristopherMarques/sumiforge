import rough from 'roughjs';
import type { Options as RoughOptions } from 'roughjs/bin/core';
import { createSeededRandom, fbmNoise2D, mixHex, rgbaStr, sampleCubicCurve, sampleNoise2D, sampleQuadraticCurve } from './math';
import { Point2D, SumiColors, VFXConfig } from './types';

type RoughCanvasInstance = ReturnType<typeof rough.canvas>;

/**
 * Técnica #10: Opções Determinísticas para Rough.js
 */
export function makeFineRoughOptions(
  config: VFXConfig,
  scale: number,
  seedOffset: number,
  overrides: Partial<RoughOptions> = {}
): RoughOptions {
  const rp = config.rough;
  const palette = config.colors;
  return {
    roughness: rp.roughness * 0.65,
    bowing: rp.bowing * 0.8,
    stroke: rgbaStr(palette.inkPrimary, 0.85),
    strokeWidth: Math.max(0.45, rp.outlineWidth * 0.6 * scale),
    fillStyle: rp.fillStyle === 'solid' ? 'solid' : rp.fillStyle,
    fillWeight: Math.max(0.4, rp.outlineWidth * 0.38 * scale),
    hachureGap: Math.max(2.2, 3.5 * scale),
    seed: Math.max(1, Math.floor(config.seed + seedOffset)),
    ...overrides,
  };
}

/**
 * Técnica #03 & #04: Fita Caligráfica Multi-Cerdas Sumi-e com Efeito Kasure (Flying-White)
 * + Erosão Celular Progressiva por Limiar de Ruído FBM 2D
 */
export interface KasureRibbonOpts {
  spine: Point2D[];
  maxWidth: number;
  bristleCount: number;
  dryBrushGap: number;
  taperStart: number;
  taperEnd: number;
  color: string;
  alpha?: number;
  offsetNormal?: number;
  headReach?: number;
  tailRetract?: number;
  erosionProgress?: number;
  erosionScale?: number;
  hookWaves?: number;
  roundHeadCap?: boolean;
  seed: number;
}

export function drawSumiKasureRibbon(
  ctx: CanvasRenderingContext2D,
  opts: KasureRibbonOpts
) {
  const {
    spine,
    maxWidth,
    bristleCount,
    dryBrushGap,
    taperStart,
    taperEnd,
    color,
    alpha = 1,
    offsetNormal = 0,
    headReach = 1,
    tailRetract = 0,
    erosionProgress = 0,
    erosionScale = 1,
    hookWaves = 0,
    roundHeadCap = true,
    seed,
  } = opts;

  if (spine.length < 2 || headReach <= tailRetract + 0.01) return;

  const actualBristles = Math.max(1, Math.min(44, Math.round(bristleCount)));
  ctx.save();
  ctx.fillStyle = rgbaStr(color, alpha);

  // Gota inicial de apoio do pincel (roundHeadCap) nos primeiros quadros
  if (roundHeadCap && tailRetract < 0.12 && erosionProgress < 0.35) {
    const startIdx = Math.min(spine.length - 1, Math.floor(tailRetract * spine.length));
    const pStart = spine[startIdx];
    if (pStart) {
      const capR = maxWidth * 0.28 * (1 - erosionProgress * 0.6);
      ctx.beginPath();
      ctx.arc(
        pStart.x + pStart.nx * offsetNormal,
        pStart.y + pStart.ny * offsetNormal,
        Math.max(1, capR),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  for (let b = 0; b < actualBristles; b++) {
    const bSeed = seed + b * 73;
    const rand = createSeededRandom(bSeed);
    const u = actualBristles === 1 ? 0 : (b / (actualBristles - 1)) * 2 - 1;

    // Lacuna de Pincel Seco (Kasure): omite certos filamentos intermediários
    if (Math.abs(u) > 0.18 && Math.abs(u) < 0.84 && rand() < dryBrushGap * 0.55) {
      continue;
    }

    const bristleStartShift = (rand() - 0.5) * 0.06;
    const bristleEndShift = (rand() - 0.5) * 0.08;
    const activeStart = Math.max(0, tailRetract + bristleStartShift);
    const activeEnd = Math.min(1, headReach + bristleEndShift);
    if (activeEnd <= activeStart + 0.02) continue;

    const bristleWidthWeight =
      (maxWidth / actualBristles) * (1.18 + (rand() - 0.5) * 0.45) * (1 - Math.abs(u) * 0.22);

    let leftEdge: { x: number; y: number }[] = [];
    let rightEdge: { x: number; y: number }[] = [];
    let inSegment = false;

    const flushSegment = () => {
      if (leftEdge.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
        for (let i = 1; i < leftEdge.length; i++) {
          ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
        }
        for (let i = rightEdge.length - 1; i >= 0; i--) {
          ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      leftEdge = [];
      rightEdge = [];
      inSegment = false;
    };

    for (let i = 0; i < spine.length; i++) {
      const pt = spine[i];
      if (pt.t < activeStart || pt.t > activeEnd) {
        if (inSegment) flushSegment();
        continue;
      }

      const localT = Math.max(0, Math.min(1, (pt.t - activeStart) / Math.max(0.001, activeEnd - activeStart)));

      // Técnica #04: Erosão Celular Progressiva por Limiar de Ruído FBM 2D
      if (erosionProgress > 0.02) {
        const nVal = fbmNoise2D(pt.t * 8.5 * erosionScale + u * 2.2, b * 0.35 + seed * 0.05, bSeed);
        const tailBias = (1 - localT) * 0.35 + Math.abs(u) * 0.18;
        if (nVal < erosionProgress * 0.92 + tailBias - 0.18) {
          if (inSegment) flushSegment();
          continue;
        }
      }

      // Lacunas secas ao longo da parte final do traço (Flying-White Kasure)
      if (dryBrushGap > 0.05 && localT > 0.35) {
        const streakNoise = sampleNoise2D(localT * 14, b * 1.7, bSeed + 19);
        if (streakNoise < dryBrushGap * (localT - 0.25) * 0.85) {
          if (inSegment) flushSegment();
          continue;
        }
      }

      // Técnica #03: Envelope Caligráfico de Pressão
      const headProfile = Math.pow(Math.min(1, localT * 4.5), Math.max(0.15, 1 - taperStart * 0.7));
      const tailProfile = Math.pow(Math.max(0, 1 - localT), 0.35 + taperEnd * 1.35);
      const envelope =
        Math.sin(Math.min(1, localT * 1.35) * Math.PI * 0.5) * tailProfile * 1.65 +
        headProfile * (1 - localT) * 0.85;

      // Convergência total na ponta quando taperEnd é alto (evita ponta quadrada nos galhos!)
      const convergenceStrength = 0.72 + taperEnd * 0.27;
      const spreadFactor = Math.pow(
        Math.max(0.005, 1 - localT * convergenceStrength),
        0.75 + taperEnd * 0.65
      );
      const hookMod =
        hookWaves > 0 && u > 0.25
          ? Math.sin(localT * Math.PI * hookWaves * 2 + b * 0.4) * maxWidth * 0.16 * u * localT
          : 0;

      const lateralCenter =
        offsetNormal +
        u * maxWidth * 0.52 * spreadFactor +
        Math.sin(localT * Math.PI * 3 + b) * (dryBrushGap * 2.2 * spreadFactor) +
        hookMod;

      const minTipHalfThick = taperEnd > 0.8 ? 0.12 * (1 - localT * 0.85) : 0.4;
      const halfThick = Math.max(minTipHalfThick, bristleWidthWeight * envelope * 0.55);
      leftEdge.push({
        x: pt.x + pt.nx * (lateralCenter - halfThick),
        y: pt.y + pt.ny * (lateralCenter - halfThick),
      });
      rightEdge.push({
        x: pt.x + pt.nx * (lateralCenter + halfThick),
        y: pt.y + pt.ny * (lateralCenter + halfThick),
      });
      inSegment = true;
    }

    if (inSegment) flushSegment();
  }

  ctx.restore();
}

/**
 * Técnica #04: Gotas Centrífugas Alongadas na Direção Tangente + Normal
 */
export function drawCentrifugalSplatters(
  ctx: CanvasRenderingContext2D,
  spine: Point2D[],
  frameNorm: number,
  splatterCount: number,
  splatterSpread: number,
  scale: number,
  colors: SumiColors,
  seed: number
) {
  if (spine.length < 4 || splatterCount <= 0) return;
  const rand = createSeededRandom(seed + 991);
  ctx.save();

  for (let s = 0; s < splatterCount; s++) {
    const birthFrame = rand() * 0.55;
    if (frameNorm < birthFrame) continue;
    const life = (frameNorm - birthFrame) / Math.max(0.1, 1 - birthFrame);
    if (life > 1) continue;

    const spineIdx = Math.min(
      spine.length - 2,
      Math.max(1, Math.floor(rand() * (spine.length - 2)))
    );
    const pt = spine[spineIdx];
    const nextPt = spine[spineIdx + 1];
    const tx = nextPt.x - pt.x;
    const ty = nextPt.y - pt.y;
    const tLen = Math.hypot(tx, ty) || 1;
    const ux = tx / tLen;
    const uy = ty / tLen;

    const outSign = rand() > 0.25 ? 1 : -1;
    const speed = (12 + rand() * 28) * splatterSpread * scale;
    const dist = Math.pow(life, 0.72) * speed;

    const vx = ux * 0.65 + pt.nx * outSign * (0.45 + rand() * 0.5);
    const vy = uy * 0.65 + pt.ny * outSign * (0.45 + rand() * 0.5);
    const vAngle = Math.atan2(vy, vx);

    const dropX = pt.x + Math.cos(vAngle) * dist;
    const dropY = pt.y + Math.sin(vAngle) * dist;

    // Erosão por limiar celular em vez de fade fantasma
    const erodeNoise = fbmNoise2D(s * 1.3, life * 3.5, seed + s * 17);
    if (life > 0.65 && erodeNoise < (life - 0.55) * 1.8) continue;

    const baseR = (1.1 + rand() * 2.4) * scale * (1 - life * 0.45);
    const stretch = 1.4 + life * 2.2 * splatterSpread;

    const colorPick = rand();
    ctx.fillStyle =
      colorPick < 0.52
        ? colors.inkPrimary
        : colorPick < 0.85
          ? colors.energySecondary
          : colors.coreGlow;

    ctx.save();
    ctx.translate(dropX, dropY);
    ctx.rotate(vAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.6, baseR * stretch), Math.max(0.5, baseR * 0.65), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Técnica #05: Pétalas de Chama Aquareladas em S-Curve com Estrias Fibrosas & Fitas Desprendidas
 */
export interface FlamePetalTongueOpts {
  rootX: number;
  rootY: number;
  ctrl1X: number;
  ctrl1Y: number;
  ctrl2X: number;
  ctrl2Y: number;
  tipX: number;
  tipY: number;
  maxBellyWidth: number;
  striationCount?: number;
  alpha?: number;
  seed: number;
}

export function drawFlamePetalTongue(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  config: VFXConfig,
  scale: number,
  opts: FlamePetalTongueOpts
) {
  const {
    rootX,
    rootY,
    ctrl1X,
    ctrl1Y,
    ctrl2X,
    ctrl2Y,
    tipX,
    tipY,
    maxBellyWidth,
    striationCount = 5,
    alpha = 1,
    seed,
  } = opts;

  const spine = sampleCubicCurve(
    { x: rootX, y: rootY },
    { x: ctrl1X, y: ctrl1Y },
    { x: ctrl2X, y: ctrl2Y },
    { x: tipX, y: tipY },
    48,
    config.dynamics.jitterAmount * 0.18,
    seed
  );

  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];

  for (const pt of spine) {
    // Envelope de Barriga da Pétala: bellyEnv(t) = sin(t^0.58 · π) · (1 - t)^0.7 · 1.48
    const bellyEnv =
      Math.sin(Math.pow(pt.t, 0.58) * Math.PI) * Math.pow(Math.max(0, 1 - pt.t), 0.7) * 1.48;
    const halfW = maxBellyWidth * 0.5 * bellyEnv;
    // Assimetria Lateral: esquerda 1.0 * halfW, direita 0.88 * halfW
    leftPts.push([pt.x - pt.nx * halfW, pt.y - pt.ny * halfW * 0.92]);
    rightPts.push([pt.x + pt.nx * halfW * 0.88, pt.y + pt.ny * halfW]);
  }

  const polygon: [number, number][] = [...leftPts, ...rightPts.reverse()];

  ctx.save();
  ctx.beginPath();
  polygon.forEach(([px, py], idx) => {
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();

  // Gradiente Aquarelado Suibokuga de 5 Paradas (ponta extrema acumula pigmento escuro)
  const grad = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
  const pal = config.colors;
  grad.addColorStop(0.0, rgbaStr(pal.coreGlow, alpha));
  grad.addColorStop(0.28, rgbaStr(mixHex(pal.coreGlow, pal.energySecondary, 0.35), alpha));
  grad.addColorStop(0.68, rgbaStr(pal.energySecondary, alpha * 0.96));
  grad.addColorStop(0.92, rgbaStr(mixHex(pal.energySecondary, pal.inkPrimary, 0.45), alpha * 0.95));
  grad.addColorStop(1.0, rgbaStr(pal.inkPrimary, alpha));

  ctx.fillStyle = grad;
  ctx.fill();

  // Estrias Fibrosas Internas
  for (let s = 0; s < striationCount; s++) {
    const u = striationCount === 1 ? 0 : (s / (striationCount - 1)) * 2 - 1;
    ctx.beginPath();
    for (let i = 2; i < spine.length - 2; i += 2) {
      const pt = spine[i];
      const bellyEnv =
        Math.sin(Math.pow(pt.t, 0.58) * Math.PI) * Math.pow(Math.max(0, 1 - pt.t), 0.7) * 1.48;
      const offset = u * 0.36 * maxBellyWidth * bellyEnv;
      const sx = pt.x + pt.nx * offset;
      const sy = pt.y + pt.ny * offset;
      if (i === 2) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = rgbaStr(
      s % 2 === 0 ? pal.coreGlow : pal.inkPrimary,
      alpha * (s % 2 === 0 ? 0.5 : 0.42)
    );
    ctx.lineWidth = Math.max(0.5, 0.75 * scale);
    ctx.stroke();
  }

  // Contorno Caligráfico Rough.js
  if (rc && config.rough.outlineWidth > 0.1) {
    const roughStepPolygon = polygon.filter((_, idx) => idx % 3 === 0);
    rc.polygon(
      roughStepPolygon,
      makeFineRoughOptions(config, scale, seed, {
        fill: undefined,
        stroke: rgbaStr(pal.inkPrimary, alpha * 0.85),
      })
    );
  }

  ctx.restore();
}

export function drawDetachedSumiFlameWisp(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
  color: string,
  seed: number
) {
  const midX = (startX + endX) * 0.5 + (endY - startY) * 0.25;
  const midY = (startY + endY) * 0.5 - (endX - startX) * 0.25;
  const spine = sampleQuadraticCurve(
    { x: startX, y: startY },
    { x: midX, y: midY },
    { x: endX, y: endY },
    28,
    0.2,
    seed
  );
  drawSumiKasureRibbon(ctx, {
    spine,
    maxWidth: width,
    bristleCount: 6,
    dryBrushGap: 0.25,
    taperStart: 0.7,
    taperEnd: 0.95,
    color,
    roundHeadCap: false,
    seed,
  });
}

/**
 * Técnica #06: Cristas de Onda Ukiyo-e (Hokusai), 5 Correntes Listradas & Garras Fractais de Espuma
 */
export function drawHokusaiFoamClawCluster(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  cx: number,
  cy: number,
  baseAngle: number,
  curlDir: 1 | -1,
  clawCount: number,
  radius: number,
  config: VFXConfig,
  scale: number,
  seed: number
) {
  const rand = createSeededRandom(seed);
  const pal = config.colors;
  ctx.save();

  for (let c = 0; c < clawCount; c++) {
    const u = clawCount === 1 ? 0 : (c / (clawCount - 1)) * 2 - 1;
    const ang = baseAngle + u * 0.65 + (rand() - 0.5) * 0.18;
    const len = radius * (0.72 + (1 - Math.abs(u) * 0.35) * 0.52);
    const tipX = cx + Math.cos(ang + curlDir * 0.55) * len;
    const tipY = cy + Math.sin(ang + curlDir * 0.55) * len;

    const baseHalfW = Math.max(1.2, radius * 0.22);
    const perpX = -Math.sin(ang) * baseHalfW;
    const perpY = Math.cos(ang) * baseHalfW;

    const ctrlX = cx + Math.cos(ang) * len * 0.65;
    const ctrlY = cy + Math.sin(ang) * len * 0.65;

    ctx.beginPath();
    ctx.moveTo(cx - perpX, cy - perpY);
    ctx.quadraticCurveTo(ctrlX - perpX * 0.4, ctrlY - perpY * 0.4, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + perpX * 0.3, ctrlY + perpY * 0.3, cx + perpX, cy + perpY);
    ctx.closePath();

    ctx.fillStyle = pal.coreGlow;
    ctx.fill();
    ctx.strokeStyle = rgbaStr(pal.inkPrimary, 0.88);
    ctx.lineWidth = Math.max(0.65, 0.9 * scale * config.rough.outlineWidth * 0.65);
    ctx.stroke();

    if (rc && config.rough.roughness > 0.2) {
      rc.curve(
        [
          [cx - perpX, cy - perpY],
          [ctrlX, ctrlY],
          [tipX, tipY],
        ],
        makeFineRoughOptions(config, scale, seed + c * 31, {
          strokeWidth: Math.max(0.5, 0.7 * scale),
        })
      );
    }

    // Gotículas de spray marinho contornadas a nanquim
    if (rand() > 0.25) {
      const dropDist = len * (1.12 + rand() * 0.38);
      const dropAng = ang + curlDir * (0.5 + rand() * 0.35);
      const dx = cx + Math.cos(dropAng) * dropDist;
      const dy = cy + Math.sin(dropAng) * dropDist;
      const dr = Math.max(0.8, (1.1 + rand() * 1.4) * scale);
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fillStyle = pal.coreGlow;
      ctx.fill();
      ctx.strokeStyle = pal.inkPrimary;
      ctx.lineWidth = Math.max(0.45, 0.6 * scale);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawHokusaiWaveCrest(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  spine: Point2D[],
  maxWidth: number,
  curlDir: 1 | -1,
  clawCount: number,
  config: VFXConfig,
  scale: number,
  alpha: number,
  seed: number
) {
  if (spine.length < 6) return;
  const pal = config.colors;
  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (const pt of spine) {
    // Envelope Muscular da Vaga: waveEnv(t) = sin(t^0.55 · π · 0.92) · (1 - 0.35·t) + 0.35·(1 - t)
    const waveEnv =
      Math.sin(Math.pow(pt.t, 0.55) * Math.PI * 0.92) * (1 - 0.35 * pt.t) + 0.35 * (1 - pt.t);
    const halfW = maxWidth * 0.48 * waveEnv;
    leftEdge.push([pt.x - pt.nx * halfW, pt.y - pt.ny * halfW]);
    rightEdge.push([pt.x + pt.nx * halfW, pt.y + pt.ny * halfW]);
  }

  ctx.save();
  ctx.beginPath();
  leftEdge.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    ctx.lineTo(rightEdge[i][0], rightEdge[i][1]);
  }
  ctx.closePath();

  const startPt = spine[0];
  const endPt = spine[spine.length - 1];
  const grad = ctx.createLinearGradient(startPt.x, startPt.y, endPt.x, endPt.y);
  grad.addColorStop(0.0, rgbaStr(pal.inkPrimary, alpha * 0.95));
  grad.addColorStop(0.55, rgbaStr(pal.energySecondary, alpha * 0.92));
  grad.addColorStop(1.0, rgbaStr(pal.coreGlow, alpha * 0.98));
  ctx.fillStyle = grad;
  ctx.fill();

  // 5 Faixas Longitudinais Internas de Correnteza (Hokusai)
  const stripeCount = 5;
  for (let s = 0; s < stripeCount; s++) {
    const u = (s / (stripeCount - 1)) * 1.44 - 0.72;
    const isLightStripe = s % 2 === 0;
    ctx.strokeStyle = rgbaStr(isLightStripe ? pal.coreGlow : pal.inkPrimary, alpha * 0.84);
    ctx.lineWidth = Math.max(0.7, (isLightStripe ? 1.3 : 1.0) * scale);
    ctx.beginPath();
    for (let i = 1; i < spine.length - 2; i += 2) {
      const pt = spine[i];
      const waveEnv =
        Math.sin(Math.pow(pt.t, 0.55) * Math.PI * 0.92) * (1 - pt.t * 0.35) + (1 - pt.t) * 0.35;
      const offset = u * maxWidth * 0.38 * waveEnv;
      const sx = pt.x + pt.nx * offset;
      const sy = pt.y + pt.ny * offset;
      if (i === 1) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Cluster principal de Garras de Espuma na Crista (t = 1.0) e cluster secundário no dorso (t ≈ 0.62)
  const tip = spine[spine.length - 1];
  const prevTip = spine[Math.max(0, spine.length - 3)];
  const tipAngle = Math.atan2(tip.y - prevTip.y, tip.x - prevTip.x);
  drawHokusaiFoamClawCluster(
    ctx,
    rc,
    tip.x,
    tip.y,
    tipAngle,
    curlDir,
    clawCount,
    maxWidth * 0.58,
    config,
    scale,
    seed + 101
  );

  const dorsalIdx = Math.floor(spine.length * 0.62);
  const dorsal = spine[dorsalIdx];
  if (dorsal) {
    const dorsalAngle = Math.atan2(dorsal.ny * curlDir, dorsal.nx * curlDir);
    drawHokusaiFoamClawCluster(
      ctx,
      rc,
      dorsal.x + dorsal.nx * curlDir * maxWidth * 0.32,
      dorsal.y + dorsal.ny * curlDir * maxWidth * 0.32,
      dorsalAngle,
      curlDir,
      Math.max(3, Math.floor(clawCount * 0.65)),
      maxWidth * 0.42,
      config,
      scale,
      seed + 203
    );
  }

  ctx.restore();
}

/**
 * Técnica #07: Bancos de Nuvens & Fumaça Ukiyo-e (Kumo) com Volutas em C-Hook e Caracóis Internos
 */
export interface KumoVoluteOpts {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  maxThickness: number;
  lobeCount?: number;
  curlRadius?: number;
  flip?: 1 | -1;
  alpha?: number;
  seed: number;
}

export function drawUkiyoeCloudScrollVolute(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  config: VFXConfig,
  scale: number,
  opts: KumoVoluteOpts
) {
  const {
    startX,
    startY,
    endX,
    endY,
    maxThickness,
    lobeCount = 3,
    curlRadius = maxThickness * 0.48,
    flip = 1,
    alpha = 0.92,
    seed,
  } = opts;

  const dx = endX - startX;
  const dy = endY - startY;
  const ctrl1X = startX + dx * 0.32 - dy * 0.18 * flip;
  const ctrl1Y = startY + dy * 0.32 + dx * 0.18 * flip;
  const ctrl2X = startX + dx * 0.72 + dy * 0.12 * flip;
  const ctrl2Y = startY + dy * 0.72 - dx * 0.12 * flip;

  const spine = sampleCubicCurve(
    { x: startX, y: startY },
    { x: ctrl1X, y: ctrl1Y },
    { x: ctrl2X, y: ctrl2Y },
    { x: endX, y: endY },
    44,
    config.dynamics.jitterAmount * 0.12,
    seed
  );

  const upperEdge: [number, number][] = [];
  const lowerEdge: [number, number][] = [];

  for (let i = 0; i < spine.length; i++) {
    const pt = spine[i];
    const t = pt.t;
    // Crista Superior Lobulada: lóbulo(t) = 0.58 + 0.42 · |sin(t · π · lobeCount)|
    const lobeWave = 0.58 + 0.42 * Math.abs(Math.sin(t * Math.PI * lobeCount));
    // Envelope da Cauda Afilada: tailTaper(t) = sin(t^0.62 · π) · 1.28
    const tailEnv = Math.sin(Math.pow(t, 0.62) * Math.PI) * 1.28;
    const upperW = maxThickness * 0.62 * lobeWave * tailEnv;
    const lowerW = maxThickness * 0.28 * Math.sin(t * Math.PI);

    upperEdge.push([pt.x + pt.nx * flip * upperW, pt.y + pt.ny * flip * upperW]);
    lowerEdge.push([pt.x - pt.nx * flip * lowerW, pt.y - pt.ny * flip * lowerW]);
  }

  const pal = config.colors;
  ctx.save();
  ctx.beginPath();
  upperEdge.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = lowerEdge.length - 1; i >= 0; i--) {
    ctx.lineTo(lowerEdge[i][0], lowerEdge[i][1]);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(startX, startY, endX, endY);
  grad.addColorStop(0.0, rgbaStr(pal.inkPrimary, alpha * 0.75));
  grad.addColorStop(0.55, rgbaStr(mixHex(pal.energySecondary, pal.coreGlow, 0.45), alpha * 0.88));
  grad.addColorStop(1.0, rgbaStr(pal.coreGlow, alpha * 0.95));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = rgbaStr(pal.inkPrimary, alpha * 0.85);
  ctx.lineWidth = Math.max(0.75, 1.15 * scale * (config.rough.outlineWidth * 0.7));
  ctx.stroke();

  // Caracol Espiralado em C-Hook na cabeça da voluta (t -> 1.0)
  const headPt = spine[spine.length - 1];
  const prevPt = spine[spine.length - 3];
  const headAng = Math.atan2(headPt.y - prevPt.y, headPt.x - prevPt.x);
  const curlCenterX = headPt.x + headPt.nx * flip * curlRadius * 0.35;
  const curlCenterY = headPt.y + headPt.ny * flip * curlRadius * 0.35;

  const spiralPts: [number, number][] = [];
  for (let i = 0; i <= 22; i++) {
    const u = i / 22;
    const ang = headAng + flip * (0.4 + u * Math.PI * 2.25);
    const r = curlRadius * (0.92 - u * 0.76);
    spiralPts.push([curlCenterX + Math.cos(ang) * r, curlCenterY + Math.sin(ang) * r]);
  }

  ctx.beginPath();
  spiralPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = rgbaStr(pal.inkPrimary, alpha * 0.92);
  ctx.lineWidth = Math.max(0.8, 1.35 * scale);
  ctx.stroke();

  if (rc && config.rough.outlineWidth > 0.2) {
    rc.curve(
      spiralPts.filter((_, idx) => idx % 2 === 0),
      makeFineRoughOptions(config, scale, seed + 59, {
        stroke: rgbaStr(pal.inkPrimary, alpha * 0.82),
      })
    );
  }

  ctx.restore();
}

export function drawUkiyoeCloudBank(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  cx: number,
  cy: number,
  spanWidth: number,
  puffCount: number,
  config: VFXConfig,
  scale: number,
  alpha: number,
  seed: number
) {
  const rand = createSeededRandom(seed);
  for (let p = 0; p < puffCount; p++) {
    const u = puffCount === 1 ? 0 : (p / (puffCount - 1)) * 2 - 1;
    const flip: 1 | -1 = p % 2 === 0 ? 1 : -1;
    const sx = cx + u * spanWidth * 0.38 - flip * spanWidth * 0.22;
    const sy = cy + (rand() - 0.5) * spanWidth * 0.16;
    const ex = cx + u * spanWidth * 0.38 + flip * spanWidth * 0.26;
    const ey = sy - spanWidth * 0.06 * (1 - Math.abs(u) * 0.5);

    drawUkiyoeCloudScrollVolute(ctx, rc, config, scale, {
      startX: sx,
      startY: sy,
      endX: ex,
      endY: ey,
      maxThickness: spanWidth * (0.22 + (1 - Math.abs(u) * 0.3) * 0.1),
      lobeCount: 3,
      flip,
      alpha,
      seed: seed + p * 83,
    });
  }
}

/**
 * Técnica #08: Núcleo Sólido 100% Opaco com Oclusão Real (Alpha 1.0 em todas as paradas)
 */
export function drawSolidOpaqueCoreSphere(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  dirAngle: number,
  wobbleAmount: number,
  config: VFXConfig,
  scale: number,
  seed: number
) {
  const steps = 36;
  const pts: [number, number][] = [];
  const cosD = Math.cos(dirAngle);
  const sinD = Math.sin(dirAngle);

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const n = fbmNoise2D(Math.cos(theta) * 1.6, Math.sin(theta) * 1.6, seed);
    const rMod = 1 + (n - 0.5) * wobbleAmount;
    const lx = Math.cos(theta) * rx * rMod;
    const ly = Math.sin(theta) * ry * rMod;
    pts.push([cx + lx * cosD - ly * sinD, cy + lx * sinD + ly * cosD]);
  }

  const pal = config.colors;
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();

  // Passo 1 de Oclusão: Preenchimento Hex 100% Sólido para apagar raízes traseiras
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = pal.energySecondary;
  ctx.fill();

  // Passo 2 de Volume Radial (Alpha 1.0 em todas as paradas Hex)
  const noseX = cx + cosD * rx * 0.32;
  const noseY = cy + sinD * rx * 0.32;
  const grad = ctx.createRadialGradient(noseX, noseY, rx * 0.08, cx, cy, Math.max(rx, ry) * 1.05);
  grad.addColorStop(0.0, '#FFFFFF');
  grad.addColorStop(0.38, pal.coreGlow);
  grad.addColorStop(0.75, pal.energySecondary);
  grad.addColorStop(1.0, mixHex(pal.inkPrimary, pal.energySecondary, 0.35));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = pal.inkPrimary;
  ctx.lineWidth = Math.max(1.0, 1.5 * scale);
  ctx.stroke();

  if (rc && config.rough.outlineWidth > 0.2) {
    rc.polygon(
      pts.filter((_, idx) => idx % 2 === 0),
      makeFineRoughOptions(config, scale, seed + 41, {
        fill: undefined,
        stroke: pal.inkPrimary,
      })
    );
  }
  ctx.restore();
}

/**
 * Técnica #09: Aguada Suibokuga (Tarashikomi) com Borda de Sangria de Pigmento
 */
export function drawTarashikomiWashBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  coreColor: string,
  edgeColor: string,
  alpha: number,
  seed: number
) {
  const steps = 36;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const n = fbmNoise2D(Math.cos(ang) * 1.8 + seed * 0.1, Math.sin(ang) * 1.8, seed);
    const deform = 1 + (n - 0.5) * 0.34;
    const lx = Math.cos(ang) * rx * deform;
    const ly = Math.sin(ang) * ry * deform;
    const px = cx + lx * cosR - ly * sinR;
    const py = cy + lx * sinR + ly * cosR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const maxR = Math.max(1, Math.max(rx, ry));
  const grad = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.1, cx, cy, maxR);
  grad.addColorStop(0.0, rgbaStr(coreColor, alpha * 0.42));
  grad.addColorStop(0.68, rgbaStr(edgeColor, alpha * 0.58));
  grad.addColorStop(0.9, rgbaStr(edgeColor, alpha * 0.78)); // Borda úmida Tarashikomi (water-bloom rim)
  grad.addColorStop(1.0, rgbaStr(edgeColor, 0.0));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/**
 * Técnica #10: Geometria Poligonal Sólida Hand-Made com Rough.js (Cristais Chanfrados Cel-Shaded)
 */
export function drawFacetedRoughCrystal(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvasInstance | null,
  baseX: number,
  baseY: number,
  angle: number,
  length: number,
  width: number,
  config: VFXConfig,
  scale: number,
  seed: number
) {
  if (length <= 1 || width <= 1) return;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const nx = -sinA;
  const ny = cosA;

  const halfW = width * 0.5;
  const shoulderDist = length * 0.72;

  const baseC: [number, number] = [baseX, baseY];
  const baseL: [number, number] = [baseX + nx * halfW, baseY + ny * halfW];
  const baseR: [number, number] = [baseX - nx * halfW, baseY - ny * halfW];
  const shoulderL: [number, number] = [
    baseX + cosA * shoulderDist + nx * halfW * 0.82,
    baseY + sinA * shoulderDist + ny * halfW * 0.82,
  ];
  const shoulderR: [number, number] = [
    baseX + cosA * shoulderDist - nx * halfW * 0.82,
    baseY + sinA * shoulderDist - ny * halfW * 0.82,
  ];
  const tip: [number, number] = [baseX + cosA * length, baseY + sinA * length];

  const pal = config.colors;
  ctx.save();

  // Face Esquerda Iluminada (coreGlow)
  ctx.beginPath();
  [baseC, baseL, shoulderL, tip].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = pal.coreGlow;
  ctx.fill();

  // Face Direita Sombreada (energySecondary -> inkPrimary)
  ctx.beginPath();
  [baseC, tip, shoulderR, baseR].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = mixHex(pal.energySecondary, pal.inkPrimary, 0.28);
  ctx.fill();

  // Aresta Central Iluminada
  ctx.beginPath();
  ctx.moveTo(baseC[0], baseC[1]);
  ctx.lineTo(tip[0], tip[1]);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(0.8, 1.2 * scale);
  ctx.stroke();

  const outerVertices: [number, number][] = [baseL, shoulderL, tip, shoulderR, baseR];
  if (rc) {
    rc.polygon(
      outerVertices,
      makeFineRoughOptions(config, scale, seed, {
        fill: config.rough.fillStyle === 'solid' ? undefined : rgbaStr(pal.inkPrimary, 0.25),
        stroke: pal.inkPrimary,
        strokeWidth: Math.max(0.9, config.rough.outlineWidth * 0.85 * scale),
      })
    );
  } else {
    ctx.beginPath();
    outerVertices.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = pal.inkPrimary;
    ctx.lineWidth = Math.max(0.9, 1.3 * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Flor de Sakura (Cerejeira) Aquarelada Suibokuga com 5 pétalas chanfradas e estames
 */
export function drawSakuraBlossom(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
  petalColor: string,
  coreColor: string,
  inkColor: string,
  alpha = 1,
  seed = 1
) {
  if (radius < 1 || alpha <= 0.01) return;
  const rand = createSeededRandom(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  const petalCount = 5;
  for (let p = 0; p < petalCount; p++) {
    const pAng = (p / petalCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    ctx.save();
    ctx.rotate(pAng);

    // Pétala de Sakura com pequeno entalhe característico na ponta
    const r = radius * (0.88 + rand() * 0.22);
    const w = r * 0.56;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w * 0.95, -r * 0.38, -w * 0.85, -r * 0.92, -w * 0.18, -r);
    ctx.lineTo(0, -r * 0.86); // Entalhe central da pétala de cerejeira
    ctx.lineTo(w * 0.18, -r);
    ctx.bezierCurveTo(w * 0.85, -r * 0.92, w * 0.95, -r * 0.38, 0, 0);
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, -r * 0.25, r * 0.05, 0, -r * 0.55, r * 0.95);
    grad.addColorStop(0.0, rgbaStr(coreColor, alpha * 0.95));
    grad.addColorStop(0.45, rgbaStr(petalColor, alpha * 0.94));
    grad.addColorStop(0.88, rgbaStr(mixHex(petalColor, inkColor, 0.22), alpha * 0.98));
    grad.addColorStop(1.0, rgbaStr(petalColor, alpha * 0.9));

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = rgbaStr(mixHex(petalColor, inkColor, 0.45), alpha * 0.55);
    ctx.lineWidth = Math.max(0.4, radius * 0.04);
    ctx.stroke();
    ctx.restore();
  }

  // Estames delicados no centro da flor
  const stamenCount = 7;
  for (let s = 0; s < stamenCount; s++) {
    const sAng = (s / stamenCount) * Math.PI * 2 + 0.2;
    const sLen = radius * (0.26 + (s % 2) * 0.08);
    const sx = Math.cos(sAng) * sLen;
    const sy = Math.sin(sAng) * sLen;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = rgbaStr(coreColor, alpha * 0.85);
    ctx.lineWidth = Math.max(0.45, radius * 0.045);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.6, radius * 0.055), 0, Math.PI * 2);
    ctx.fillStyle = rgbaStr(coreColor, alpha * 0.95);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Pétala Individual de Sakura Flutuando ao Vento
 */
export function drawFloatingSakuraPetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  tiltRatio: number,
  color: string,
  alpha = 0.92
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, Math.max(0.28, Math.min(1, tiltRatio)));

  ctx.beginPath();
  ctx.moveTo(-size * 0.5, 0);
  ctx.bezierCurveTo(-size * 0.2, -size * 0.55, size * 0.45, -size * 0.48, size * 0.6, -size * 0.12);
  ctx.lineTo(size * 0.42, 0);
  ctx.lineTo(size * 0.6, size * 0.12);
  ctx.bezierCurveTo(size * 0.45, size * 0.48, -size * 0.2, size * 0.55, -size * 0.5, 0);
  ctx.closePath();

  ctx.fillStyle = rgbaStr(color, alpha);
  ctx.fill();
  ctx.restore();
}

/**
 * Carpa Japonesa (Nishikigoi / Kohaku) pintada a pincel Sumi-e & Suibokuga
 * Corpo em curva S fluida, nadadeiras peitorais caligráficas, manchas vermelhas e ondulações de rio.
 */
export function drawCalligraphicKoiCarp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  angle: number,
  swimPhase: number,
  inkColor: string,
  crimsonColor: string,
  bodyLightColor: string,
  alpha = 0.9,
  seed = 1
) {
  if (length < 8 || alpha <= 0.01) return;
  const rand = createSeededRandom(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const halfL = length * 0.5;
  const wave1 = Math.sin(swimPhase) * length * 0.11;
  const wave2 = -Math.cos(swimPhase) * length * 0.16;

  // Espinha S-Curve da Carpa (Cabeça em +halfL, Cauda em -halfL)
  const spine = sampleCubicCurve(
    { x: halfL, y: 0 },
    { x: halfL * 0.3, y: wave1 },
    { x: -halfL * 0.35, y: wave2 },
    { x: -halfL, y: wave1 * 0.8 },
    44,
    0.05,
    seed
  );

  // Ondulações sutis de água ao redor da carpa
  ctx.save();
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.16);
  ctx.lineWidth = Math.max(0.8, length * 0.012);
  ctx.beginPath();
  ctx.ellipse(halfL * 0.15, 0, length * 0.62, length * 0.24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Nadadeiras Peitorais e Ventrais Fluídas (Desenhadas antes do tronco)
  const finAnchor = spine[Math.floor(spine.length * 0.24)];
  if (finAnchor) {
    for (const side of [-1, 1] as const) {
      const finSwing = Math.sin(swimPhase + side * 0.6) * 0.22;
      const finLen = length * 0.28;
      const finAng = Math.atan2(finAnchor.ny * side, finAnchor.nx * side) - 0.55 + finSwing;
      ctx.save();
      ctx.translate(finAnchor.x, finAnchor.y);
      ctx.rotate(finAng);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(finLen * 0.55, -finLen * 0.38 * side, finLen, -finLen * 0.1 * side);
      ctx.quadraticCurveTo(finLen * 0.45, finLen * 0.25 * side, 0, 0);
      ctx.closePath();
      ctx.fillStyle = rgbaStr(bodyLightColor, alpha * 0.78);
      ctx.fill();
      ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.65);
      ctx.lineWidth = Math.max(0.8, length * 0.012);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Cauda Bilobada Caligráfica (Véu de Noiva)
  const tailPt = spine[spine.length - 1];
  const prevTailPt = spine[spine.length - 4];
  if (tailPt && prevTailPt) {
    const tailAng = Math.atan2(tailPt.y - prevTailPt.y, tailPt.x - prevTailPt.x);
    const tailLen = length * 0.34;
    for (const lobe of [-1, 1] as const) {
      const lAng = tailAng + lobe * (0.38 + Math.sin(swimPhase * 1.2) * 0.12);
      ctx.beginPath();
      ctx.moveTo(tailPt.x, tailPt.y);
      ctx.quadraticCurveTo(
        tailPt.x + Math.cos(lAng) * tailLen * 0.65,
        tailPt.y + Math.sin(lAng) * tailLen * 0.65,
        tailPt.x + Math.cos(lAng - lobe * 0.25) * tailLen,
        tailPt.y + Math.sin(lAng - lobe * 0.25) * tailLen
      );
      ctx.quadraticCurveTo(
        tailPt.x + Math.cos(tailAng) * tailLen * 0.4,
        tailPt.y + Math.sin(tailAng) * tailLen * 0.4,
        tailPt.x,
        tailPt.y
      );
      ctx.fillStyle = rgbaStr(lobe === 1 ? crimsonColor : inkColor, alpha * 0.72);
      ctx.fill();
    }
  }

  // Corpo Muscular da Carpa
  const leftBody: [number, number][] = [];
  const rightBody: [number, number][] = [];
  const maxBodyW = length * 0.23;

  for (const pt of spine) {
    const t = pt.t;
    // Perfil hidrodinâmico de carpa: cabeça arredondada em t=0, ombro largo em t=0.25, afilando até a cauda em t=1
    const bodyEnv =
      t < 0.22
        ? Math.pow(t / 0.22, 0.52)
        : Math.pow(Math.max(0.06, 1 - (t - 0.22) / 0.78), 0.82);
    const halfW = maxBodyW * 0.5 * bodyEnv;
    leftBody.push([pt.x - pt.nx * halfW, pt.y - pt.ny * halfW]);
    rightBody.push([pt.x + pt.nx * halfW, pt.y + pt.ny * halfW]);
  }

  ctx.beginPath();
  leftBody.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = rightBody.length - 1; i >= 0; i--) {
    ctx.lineTo(rightBody[i][0], rightBody[i][1]);
  }
  ctx.closePath();

  ctx.fillStyle = rgbaStr(bodyLightColor, alpha * 0.95);
  ctx.fill();

  // Manchas Tradicionais Kohaku / Sanke (Vermelhão e Nanquim recortados dentro do corpo da carpa)
  ctx.save();
  ctx.clip();
  const spot1 = spine[Math.floor(spine.length * 0.16)];
  const spot2 = spine[Math.floor(spine.length * 0.48)];
  const spot3 = spine[Math.floor(spine.length * 0.72)];
  if (spot1) {
    drawTarashikomiWashBlob(
      ctx,
      spot1.x,
      spot1.y + (rand() - 0.5) * maxBodyW * 0.25,
      maxBodyW * 0.55,
      maxBodyW * 0.42,
      0.3,
      crimsonColor,
      crimsonColor,
      alpha * 0.95,
      seed + 11
    );
  }
  if (spot2) {
    drawTarashikomiWashBlob(
      ctx,
      spot2.x,
      spot2.y - maxBodyW * 0.12,
      maxBodyW * 0.62,
      maxBodyW * 0.45,
      -0.2,
      crimsonColor,
      crimsonColor,
      alpha * 0.9,
      seed + 23
    );
  }
  if (spot3) {
    drawTarashikomiWashBlob(
      ctx,
      spot3.x,
      spot3.y,
      maxBodyW * 0.42,
      maxBodyW * 0.35,
      0.1,
      inkColor,
      inkColor,
      alpha * 0.85,
      seed + 37
    );
  }
  ctx.restore();

  // Contorno Caligráfico Sumi-e do Corpo + Nadadeira Dorsal
  ctx.beginPath();
  leftBody.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = rightBody.length - 1; i >= 0; i--) {
    ctx.lineTo(rightBody[i][0], rightBody[i][1]);
  }
  ctx.closePath();
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.88);
  ctx.lineWidth = Math.max(1.1, length * 0.018);
  ctx.stroke();

  // Fita Dorsal Caligráfica
  const dorsalSlice = spine.slice(
    Math.floor(spine.length * 0.26),
    Math.floor(spine.length * 0.76)
  );
  if (dorsalSlice.length >= 4) {
    drawSumiKasureRibbon(ctx, {
      spine: dorsalSlice.map((p, i, arr) => ({ ...p, t: i / Math.max(1, arr.length - 1) })),
      maxWidth: length * 0.065,
      bristleCount: 6,
      dryBrushGap: 0.25,
      taperStart: 0.4,
      taperEnd: 0.9,
      color: inkColor,
      alpha: alpha * 0.85,
      roundHeadCap: false,
      seed: seed + 71,
    });
  }

  // Barbilhões (Bigodes da Carpa) e Olhos na Cabeça
  const headPt = spine[1];
  if (headPt) {
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.arc(
        headPt.x - length * 0.03,
        headPt.y + side * maxBodyW * 0.22,
        Math.max(1.1, length * 0.016),
        0,
        Math.PI * 2
      );
      ctx.fillStyle = rgbaStr(inkColor, alpha);
      ctx.fill();

      // Barbilhão curvo no focinho
      ctx.beginPath();
      ctx.moveTo(halfL * 0.96, side * maxBodyW * 0.1);
      ctx.quadraticCurveTo(
        halfL * 1.08,
        side * maxBodyW * 0.28,
        halfL * 1.02,
        side * maxBodyW * 0.42
      );
      ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.78);
      ctx.lineWidth = Math.max(0.8, length * 0.011);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Galho Ornamental de Sakura (Cerejeira) com Sub-Ramos e Cachos de Flores
 * Usado para emoldurar cantos e seções com elegância orgânica japonesa.
 */
export function drawCornerSakuraBranch(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  archDir: 1 | -1,
  maxTrunkWidth: number,
  reachProgress: number,
  swayTime: number,
  inkColor: string,
  petalColor: string,
  coreColor: string,
  seed: number
) {
  if (reachProgress <= 0.02) return;
  const rand = createSeededRandom(seed);
  const dx = endX - startX;
  const dy = endY - startY;
  const swayX = Math.sin(swayTime * 0.9 + seed) * 5;
  const swayY = Math.cos(swayTime * 0.75 + seed) * 4;

  const mainSpine = sampleCubicCurve(
    { x: startX, y: startY },
    { x: startX + dx * 0.35 - dy * 0.18 * archDir, y: startY + dy * 0.35 + dx * 0.12 * archDir },
    {
      x: startX + dx * 0.7 + dy * 0.12 * archDir + swayX * 0.5,
      y: startY + dy * 0.7 - dx * 0.1 * archDir + swayY * 0.5,
    },
    { x: endX + swayX, y: endY + swayY },
    68,
    0.26,
    seed
  );

  drawSumiKasureRibbon(ctx, {
    spine: mainSpine,
    maxWidth: maxTrunkWidth,
    bristleCount: 22,
    dryBrushGap: 0.28,
    taperStart: 0.1,
    taperEnd: 0.99,
    color: inkColor,
    alpha: 0.94,
    headReach: reachProgress,
    roundHeadCap: true,
    seed: seed + 13,
  });

  // 2 Sub-ramos secundários brotando do tronco principal
  const subBranches = [0.32, 0.62];
  const allSpines = [mainSpine];

  subBranches.forEach((tFork, idx) => {
    if (reachProgress <= tFork + 0.08) return;
    const subReach = Math.min(1, (reachProgress - tFork) / (1 - tFork));
    const forkPt = mainSpine[Math.floor(tFork * (mainSpine.length - 1))];
    if (!forkPt) return;

    const side = idx % 2 === 0 ? archDir : -archDir;
    const subLen = Math.hypot(dx, dy) * (0.42 - idx * 0.08);
    const baseAng = Math.atan2(dy, dx) + side * 0.58;
    const subEndX = forkPt.x + Math.cos(baseAng) * subLen + swayX * 0.8;
    const subEndY = forkPt.y + Math.sin(baseAng) * subLen + swayY * 0.8;

    const subSpine = sampleQuadraticCurve(
      { x: forkPt.x, y: forkPt.y },
      {
        x: (forkPt.x + subEndX) * 0.5 + side * 14,
        y: (forkPt.y + subEndY) * 0.5 - 12,
      },
      { x: subEndX, y: subEndY },
      40,
      0.22,
      seed + 50 + idx * 19
    );

    allSpines.push(subSpine);
    drawSumiKasureRibbon(ctx, {
      spine: subSpine,
      maxWidth: maxTrunkWidth * 0.52,
      bristleCount: 12,
      dryBrushGap: 0.26,
      taperStart: 0.12,
      taperEnd: 0.99,
      color: inkColor,
      alpha: 0.92,
      headReach: subReach,
      roundHeadCap: false,
      seed: seed + 70 + idx * 19,
    });
  });

  // Flores de Sakura desabrochando ao longo do tronco e cobrindo também as pontas
  allSpines.forEach((sp, sIdx) => {
    const count = sIdx === 0 ? 14 : 8;
    for (let c = 0; c < count; c++) {
      const tPos = 0.14 + (c / Math.max(1, count - 1)) * 0.84;
      if (tPos > reachProgress) continue;
      const bloom = Math.min(1, (reachProgress - tPos * 0.72) * 2.8);
      if (bloom <= 0.05) continue;

      const pt = sp[Math.min(sp.length - 1, Math.floor(tPos * (sp.length - 1)))];
      const tipTighten = 1 - tPos * 0.55;
      const offset = (rand() - 0.45) * maxTrunkWidth * 1.1 * tipTighten;
      const bx = pt.x + pt.nx * offset + Math.sin(swayTime * 1.3 + c) * 1.5;
      const by = pt.y + pt.ny * offset + Math.cos(swayTime * 1.1 + c) * 1.5;
      const flowerR = (maxTrunkWidth * 0.42 + rand() * maxTrunkWidth * 0.34) * bloom;

      drawSakuraBlossom(
        ctx,
        bx,
        by,
        Math.max(4, flowerR),
        c * 0.8 + sIdx + Math.sin(swayTime + c) * 0.08,
        petalColor,
        coreColor,
        inkColor,
        0.95,
        seed + 200 + sIdx * 50 + c
      );
    }
  });
}


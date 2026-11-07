import { Point2D, VFXConfig } from './types';

/**
 * Técnica #01: PRNG Determinístico (Mulberry32)
 * Estado inteiro de 32 bits incrementado por 0x6D2B79F5 a cada chamada,
 * garantindo coerência temporal entre todos os quadros sem cintilação (flicker).
 */
export function createSeededRandom(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Técnica #01: Value Noise 2D suavizado por curva Hermite cúbica (Smoothstep)
 * u = xf² · (3 - 2·xf) e v = yf² · (3 - 2·yf)
 */
export function sampleNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const hash = (ix: number, iy: number) => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);

  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

/**
 * Técnica #01: FBM 2D de 3 Oitavas
 * FBM(x, y, seed) = 0.55 · N(x, y, s) + 0.30 · N(2.15x + 13.7, 2.15y + 7.3, s + 101) + 0.15 · N(4.4x - 5.2, 4.4y + 19.1, s + 307)
 */
export function fbmNoise2D(x: number, y: number, seed: number): number {
  const v1 = sampleNoise2D(x, y, seed);
  const v2 = sampleNoise2D(x * 2.15 + 13.7, y * 2.15 + 7.3, seed + 101);
  const v3 = sampleNoise2D(x * 4.4 - 5.2, y * 4.4 + 19.1, seed + 307);
  return v1 * 0.55 + v2 * 0.3 + v3 * 0.15;
}

/**
 * Técnica #02: Amostrador de Curva Bézier Cúbica (S-Curve) com Vetores Normais Analíticos
 */
export function sampleCubicCurve(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  steps = 96,
  jitterAmount = 0,
  seed = 1
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;

    let x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
    let y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;

    const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    if (jitterAmount > 0) {
      const j = (sampleNoise2D(t * 12, seed * 0.29, seed) - 0.5) * jitterAmount * 7.5;
      x += nx * j;
      y += ny * j;
    }
    pts.push({ x, y, nx, ny, t });
  }
  return pts;
}

/**
 * Técnica #02: Amostrador de Curva Bézier Quadrática com Normais Analíticas
 */
export function sampleQuadraticCurve(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  steps = 72,
  jitterAmount = 0,
  seed = 1
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    let x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
    let y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;

    const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    if (jitterAmount > 0) {
      const j = (sampleNoise2D(t * 10, seed * 0.37, seed) - 0.5) * jitterAmount * 6.0;
      x += nx * j;
      y += ny * j;
    }
    pts.push({ x, y, nx, ny, t });
  }
  return pts;
}

/**
 * Técnica #02: Arco Polar / Elíptico com Tilt 3D e Fator Espiral
 */
export function samplePolarArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  tiltRadians = 0,
  spiralFactor = 0,
  steps = 88,
  jitterAmount = 0,
  seed = 1
): Point2D[] {
  const pts: Point2D[] = [];
  const cosTilt = Math.cos(tiltRadians);
  const sinTilt = Math.sin(tiltRadians);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = startAngle + (endAngle - startAngle) * t;
    const rScale = 1 + spiralFactor * (t - 0.5);

    const lx = Math.cos(ang) * rx * rScale;
    const ly = Math.sin(ang) * ry * rScale;

    let x = cx + lx * cosTilt - ly * sinTilt;
    let y = cy + lx * sinTilt + ly * cosTilt;

    const dAng = endAngle - startAngle;
    const dlx = -Math.sin(ang) * rx * rScale * dAng + Math.cos(ang) * rx * spiralFactor;
    const dly = Math.cos(ang) * ry * rScale * dAng + Math.sin(ang) * ry * spiralFactor;

    const dx = dlx * cosTilt - dly * sinTilt;
    const dy = dlx * sinTilt + dly * cosTilt;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    if (jitterAmount > 0) {
      const j = (sampleNoise2D(t * 11, seed * 0.19, seed) - 0.5) * jitterAmount * 6.5;
      x += nx * j;
      y += ny * j;
    }

    pts.push({ x, y, nx, ny, t });
  }
  return pts;
}

/**
 * Converte amostras de ponteiro do usuário em uma espinha dorsal Point2D suavizada
 */
export function samplesToSpine(
  rawPoints: { x: number; y: number }[],
  jitterAmount = 0,
  seed = 1
): Point2D[] {
  if (rawPoints.length < 2) return [];
  const smoothed: { x: number; y: number }[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length - 1; i++) {
    const prev = rawPoints[i - 1];
    const curr = rawPoints[i];
    const next = rawPoints[i + 1];
    smoothed.push({
      x: prev.x * 0.2 + curr.x * 0.6 + next.x * 0.2,
      y: prev.y * 0.2 + curr.y * 0.6 + next.y * 0.2,
    });
  }
  smoothed.push(rawPoints[rawPoints.length - 1]);

  const totalLen: number[] = [0];
  let acc = 0;
  for (let i = 1; i < smoothed.length; i++) {
    acc += Math.hypot(smoothed[i].x - smoothed[i - 1].x, smoothed[i].y - smoothed[i - 1].y);
    totalLen.push(acc);
  }
  const maxLen = Math.max(1, acc);

  return smoothed.map((pt, i) => {
    const prev = smoothed[Math.max(0, i - 1)];
    const next = smoothed[Math.min(smoothed.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = totalLen[i] / maxLen;
    let x = pt.x;
    let y = pt.y;
    if (jitterAmount > 0) {
      const j = (sampleNoise2D(t * 12, seed * 0.31, seed) - 0.5) * jitterAmount * 5;
      x += nx * j;
      y += ny * j;
    }
    return { x, y, nx, ny, t };
  });
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16) || 0,
    parseInt(clean.substring(2, 4), 16) || 0,
    parseInt(clean.substring(4, 6), 16) || 0,
  ];
}

export function rgbaStr(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clampedA = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedA.toFixed(3)})`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Técnica #11: Shader de Recolorização por Separação de 3 Canais (CPU ImageData & GPU Shader Equivalente)
 * L = 0.299·R + 0.587·G + 0.114·B
 * W_core = (min(R, G, B))^2.2
 * W_energy = clamp(chroma * 2.1 + max(0, L - 0.18) * (1 - W_core), 0, 1)
 * W_ink = max(0, 1 - W_energy - W_core)
 */
export function recolorReferenceSheetData(src: ImageData, config: VFXConfig): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  const ink = hexToRgb(config.colors.inkPrimary);
  const nrg = hexToRgb(config.colors.energySecondary);
  const core = hexToRgb(config.colors.coreGlow);
  const boost = config.dynamics.glowIntensity;
  const mode = config.channelMode;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 4) continue;
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    const wCore = Math.pow(minC, 2.2);
    const wEnergy = Math.min(1, Math.max(0, (chroma * 2.1 + Math.max(0, lum - 0.18) * 0.9) * (1 - wCore)));
    const wInk = Math.max(0, 1 - wEnergy - wCore);

    if (mode === 'shader_rgb_mask') {
      d[i] = Math.min(255, Math.round(wInk * 255));
      d[i + 1] = Math.min(255, Math.round(wEnergy * 255));
      d[i + 2] = Math.min(255, Math.round(wCore * 255));
    } else if (mode === 'ink_only') {
      d[i] = ink[0];
      d[i + 1] = ink[1];
      d[i + 2] = ink[2];
      d[i + 3] = Math.round(a * Math.min(1, wInk * 1.4));
    } else if (mode === 'energy_only') {
      d[i] = nrg[0];
      d[i + 1] = nrg[1];
      d[i + 2] = nrg[2];
      d[i + 3] = Math.round(a * Math.min(1, (wEnergy + wCore) * 1.35));
    } else {
      d[i] = Math.min(255, Math.round(ink[0] * wInk + nrg[0] * boost * wEnergy + core[0] * wCore));
      d[i + 1] = Math.min(255, Math.round(ink[1] * wInk + nrg[1] * boost * wEnergy + core[1] * wCore));
      d[i + 2] = Math.min(255, Math.round(ink[2] * wInk + nrg[2] * boost * wEnergy + core[2] * wCore));
    }
  }
  return out;
}

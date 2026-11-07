import React, { useCallback, useEffect, useRef } from 'react';
import { createSeededRandom, fbmNoise2D, mixHex, rgbaStr } from '../math';
import { SANSUI_THEMES } from '../presets';
import { SansuiColors, SansuiComposition, SansuiThemeId } from '../types';

export interface SumiSansuiProps {
  /** Semente determinística Mulberry32: cada número gera uma paisagem única e reproduzível */
  seed?: number;
  /** Estilo de composição clássica Sansui (山水) */
  composition?: SansuiComposition;
  /** Tema pronto de cores (inclui Modo Noturno 'night_obsidian', 'jade_mineral', 'classic_washi' ou 'auto') */
  theme?: SansuiThemeId;
  /** Sobrescrita livre de cores (permite passar as cores da marca ou do tema do usuário) */
  colors?: Partial<SansuiColors>;
  /** Atalho para cor de fundo do papel/céu */
  backgroundColor?: string;
  /** Atalho para cor principal do nanquim / traços */
  inkColor?: string;
  /** Atalho para cor da aguada mineral das montanhas */
  washColor?: string;
  /** Quantidade de planos de montanhas (3 a 8) */
  ridgeLayers?: number;
  /** Densidade de pinheiros e árvores nas encostas (0.0 a 2.0) */
  treeDensity?: number;
  /** Intensidade da neblina entre os vales (0.0 a 1.5) */
  mistDensity?: number;
  /** Exibe o pescador solitário em seu barco (sampan) */
  showBoat?: boolean;
  /** Ativa o movimento sutil da água, da neblina e do barco */
  animated?: boolean;
  /** Referência opcional para exportar a pintura gerada em PNG de alta definição */
  actionsRef?: React.MutableRefObject<{
    exportPng: (filename?: string) => void;
  } | null>;
  /** Classe CSS adicional */
  className?: string;
}

interface MountainRidgeSpec {
  /** Posição horizontal central (0.0 a 1.0 da largura) */
  centerX: number;
  /** Largura total da base (em fração da largura w) */
  spanW: number;
  /** Altura do pico a partir do topo (0.0 = topo da tela, 1.0 = base) */
  peakY: number;
  /** Linha de base onde a montanha encontra a água ou neblina (0.0 a 1.0) */
  baseY: number;
  /** Agudeza do pico: > 1.4 cria torres Karst verticais; < 0.9 cria colinas suaves */
  sharpness: number;
  /** Achatamento de topo para ilhas distantes (0.0 a 1.0) */
  plateau?: number;
  /** Assimetria da encosta (-0.5 a +0.5) */
  skew?: number;
  /** Profundidade atmosférica: 0.0 = muito distante na neblina, 1.0 = primeiro plano nítido */
  depth: number;
  /** Densidade de hachuras Cunfa (皴法) de textura de rocha */
  cunfaDensity: number;
  /** Estilo de árvores nesta cadeia ('pines' | 'foliage' | 'distant_dots' | 'none') */
  treeStyle: 'pines' | 'foliage' | 'distant_dots' | 'none';
  /** Semente local da montanha */
  seed: number;
}

function isDarkHex(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.32;
}

/**
 * Resolve a paleta final combinando o tema escolhido, variáveis CSS (se 'auto') e cores customizadas
 */
function resolveSansuiColors(
  theme: SansuiThemeId,
  customColors?: Partial<SansuiColors>,
  bgOverride?: string,
  inkOverride?: string,
  washOverride?: string
): { resolved: SansuiColors; isDark: boolean } {
  let basePreset = SANSUI_THEMES.classic_washi;

  if (theme === 'auto' && typeof window !== 'undefined') {
    const htmlDark = document.documentElement.classList.contains('dark');
    basePreset = htmlDark ? SANSUI_THEMES.night_obsidian : SANSUI_THEMES.classic_washi;
    const style = getComputedStyle(document.documentElement);
    const cssBg = style.getPropertyValue('--sumi-bg').trim();
    const cssInk = style.getPropertyValue('--sumi-ink').trim();
    const cssWash = style.getPropertyValue('--sumi-wash').trim();
    const cssMist = style.getPropertyValue('--sumi-mist').trim();
    const cssAccent = style.getPropertyValue('--sumi-accent').trim();

    const resolved: SansuiColors = {
      background: bgOverride || customColors?.background || cssBg || basePreset.colors.background,
      ink: inkOverride || customColors?.ink || cssInk || basePreset.colors.ink,
      wash: washOverride || customColors?.wash || cssWash || basePreset.colors.wash,
      mist:
        customColors?.mist ||
        cssMist ||
        bgOverride ||
        customColors?.background ||
        basePreset.colors.mist,
      accent: customColors?.accent || cssAccent || basePreset.colors.accent,
    };
    return { resolved, isDark: isDarkHex(resolved.background) };
  }

  if (theme !== 'auto' && SANSUI_THEMES[theme]) {
    basePreset = SANSUI_THEMES[theme];
  }

  const background = bgOverride || customColors?.background || basePreset.colors.background;
  const ink = inkOverride || customColors?.ink || basePreset.colors.ink;
  const wash = washOverride || customColors?.wash || basePreset.colors.wash;
  const mist = customColors?.mist || bgOverride || customColors?.background || basePreset.colors.mist;
  const accent = customColors?.accent || basePreset.colors.accent;

  return {
    resolved: { background, ink, wash, mist, accent },
    isDark: isDarkHex(background),
  };
}

/**
 * Desenha um pinheiro oriental Sansui (松) com tronco caligráfico e patamares de agulhas horizontais
 */
function drawSansuiPineTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  scale: number,
  inkColor: string,
  washColor: string,
  alpha: number,
  seed: number
) {
  const rand = createSeededRandom(seed);
  const lean = (rand() - 0.5) * height * 0.24;
  const topX = x + lean;
  const topY = y - height;

  ctx.save();
  // Tronco principal
  ctx.beginPath();
  ctx.moveTo(x, y + 2 * scale);
  ctx.quadraticCurveTo(x + lean * 0.35, y - height * 0.52, topX, topY);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.92);
  ctx.lineWidth = Math.max(0.8, height * 0.068);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Patamares horizontais de agulhas/folhagem
  const tiers = Math.max(3, Math.min(7, Math.floor(height / (5.5 * scale)) + 2));
  for (let t = 0; t < tiers; t++) {
    const u = t / Math.max(1, tiers - 1);
    const ty = topY + u * height * 0.68;
    const tx = topX - lean * u * 0.55 + (rand() - 0.5) * 2.5 * scale;
    const tierSpan = height * (0.24 + Math.sin(u * Math.PI * 0.85) * 0.28) * (0.8 + rand() * 0.35);

    // Sombra aguada suave atrás do patamar
    ctx.beginPath();
    ctx.ellipse(
      tx,
      ty,
      tierSpan * 0.58,
      Math.max(1.2, height * 0.065),
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = rgbaStr(washColor, alpha * 0.34);
    ctx.fill();

    // Traços caligráficos de agulhas
    ctx.beginPath();
    ctx.moveTo(tx - tierSpan * 0.55, ty + (rand() - 0.5) * 1.5 * scale);
    ctx.quadraticCurveTo(tx, ty - 1.6 * scale, tx + tierSpan * 0.55, ty + (rand() - 0.5) * 1.5 * scale);
    ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.94);
    ctx.lineWidth = Math.max(0.9, height * 0.062);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Desenha as árvores retorcidas de promontório com folhagem em gotas de tinta (como no canto direito da referência)
 */
function drawSansuiPromontoryTrees(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  scale: number,
  inkColor: string,
  washColor: string,
  alpha: number,
  seed: number
) {
  const rand = createSeededRandom(seed);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Árvore seca retorcida à esquerda
  const bareX = x - height * 0.32;
  const bareY = y + height * 0.06;
  const bareH = height * 0.78;
  ctx.beginPath();
  ctx.moveTo(bareX, bareY + 4 * scale);
  ctx.quadraticCurveTo(bareX - bareH * 0.12, bareY - bareH * 0.48, bareX - bareH * 0.24, bareY - bareH);
  ctx.moveTo(bareX - bareH * 0.1, bareY - bareH * 0.55);
  ctx.lineTo(bareX - bareH * 0.38, bareY - bareH * 0.78);
  ctx.moveTo(bareX - bareH * 0.14, bareY - bareH * 0.68);
  ctx.lineTo(bareX + bareH * 0.08, bareY - bareH * 0.88);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.92);
  ctx.lineWidth = Math.max(1.2, height * 0.048);
  ctx.stroke();

  // 2. Duas árvores altas com copa em manchas circulares de nanquim (Dianfa)
  for (let treeIdx = 0; treeIdx < 2; treeIdx++) {
    const tx = x + treeIdx * height * 0.28;
    const ty = y + treeIdx * height * 0.05;
    const th = height * (treeIdx === 0 ? 1.02 : 0.88);
    const crownX = tx + (treeIdx === 0 ? 0.08 : 0.15) * th;
    const crownY = ty - th;

    ctx.beginPath();
    ctx.moveTo(tx, ty + 5 * scale);
    ctx.quadraticCurveTo(tx - th * 0.06, ty - th * 0.5, crownX, crownY);
    ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.95);
    ctx.lineWidth = Math.max(1.3, th * 0.052);
    ctx.stroke();

    // Galho secundário
    ctx.beginPath();
    ctx.moveTo(tx - th * 0.02, ty - th * 0.58);
    ctx.lineTo(crownX + th * 0.18, crownY + th * 0.16);
    ctx.lineWidth = Math.max(0.9, th * 0.035);
    ctx.stroke();

    // Manchas de folhagem em 2 tons (aguada média e nanquim denso)
    const blobCount = 7;
    for (let b = 0; b < blobCount; b++) {
      const ang = (b / blobCount) * Math.PI * 2 + rand() * 0.5;
      const dist = th * (0.06 + rand() * 0.22);
      const bx = crownX + Math.cos(ang) * dist;
      const by = crownY + Math.sin(ang) * dist * 0.68;
      const br = Math.max(1.8, th * (0.055 + rand() * 0.045));
      const isDarkBlob = b % 2 === 0;

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = rgbaStr(
        isDarkBlob ? inkColor : washColor,
        alpha * (isDarkBlob ? 0.86 : 0.52)
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renderiza uma massa montanhosa completa com:
 * 1. Aguada atmosférica vertical + dissolução na neblina da base
 * 2. Fissuras e hachuras internas de rocha Cunfa (皴法)
 * 3. Contorno caligráfico de largura variável na crista
 * 4. Vegetação (pinheiros, árvores de promontório ou pontos de musgo Dian-tai)
 */
function renderSansuiMountainRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  spec: MountainRidgeSpec,
  colors: SansuiColors,
  isDark: boolean,
  treeDensity: number,
  mistDensity: number
) {
  const rand = createSeededRandom(spec.seed);
  const startX = (spec.centerX - spec.spanW * 0.5) * w;
  const endX = (spec.centerX + spec.spanW * 0.5) * w;
  const peakY = spec.peakY * h;
  const baseY = spec.baseY * h;
  const maxAmplitude = Math.max(12, baseY - peakY);
  const steps = Math.max(48, Math.min(130, Math.floor((endX - startX) / (4 * scale))));

  const ridgePts: { x: number; y: number; u: number; env: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0..1
    const x = startX + u * (endX - startX);
    const skewU = Math.max(0, Math.min(1, u + (spec.skew || 0) * Math.sin(u * Math.PI)));
    const bell = Math.sin(skewU * Math.PI);
    let env = Math.pow(Math.max(0, bell), spec.sharpness);

    if (spec.plateau && spec.plateau > 0) {
      const cap = 1 - spec.plateau * 0.42;
      env = Math.min(cap, env) / cap;
    }

    // Modulação fractal FBM 2D para criar sub-picos, ombros rochosos e escarpas naturais
    const n1 = fbmNoise2D(u * 3.6, spec.seed * 0.013, spec.seed);
    const n2 = fbmNoise2D(u * 9.5, spec.seed * 0.029, spec.seed + 71);
    const noiseMod = 0.72 + (n1 - 0.35) * 0.52 + (n2 - 0.5) * 0.16;

    const elevation = maxAmplitude * env * Math.max(0.12, noiseMod);
    const y = baseY - elevation;
    ridgePts.push({ x, y, u, env });
  }

  // Encontra o ponto mais alto real da crista
  let highestPt = ridgePts[0];
  for (const pt of ridgePts) {
    if (pt.y < highestPt.y) highestPt = pt;
  }

  ctx.save();

  // =========================================================================
  // PASSO 1: POLÍGONO DE AGUADA ATMOSFÉRICA & DISSOLUÇÃO EM NEBLINA NA BASE
  // =========================================================================
  ctx.beginPath();
  ctx.moveTo(startX, baseY + 6 * scale);
  for (const pt of ridgePts) {
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.lineTo(endX, baseY + 6 * scale);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, highestPt.y, 0, baseY + 4 * scale);
  const washAlpha = (0.14 + spec.depth * 0.42) * (isDark ? 1.35 : 1.0);
  const mistStop = Math.max(0.52, Math.min(0.95, 0.92 - mistDensity * 0.18));

  if (isDark) {
    // No Modo Noturno (Night Obsidian), o corpo da montanha tem um leve brilho lunar no topo
    // e escurece até fundir-se à neblina noturna na base
    const topTint = mixHex(colors.wash, colors.ink, 0.16 * spec.depth);
    grad.addColorStop(0.0, rgbaStr(topTint, Math.min(0.95, washAlpha + 0.25)));
    grad.addColorStop(mistStop * 0.65, rgbaStr(colors.wash, Math.min(0.9, washAlpha * 0.85)));
    grad.addColorStop(1.0, rgbaStr(colors.mist, 0.96));
  } else {
    const topTint = mixHex(colors.wash, colors.ink, 0.18 * spec.depth);
    grad.addColorStop(0.0, rgbaStr(topTint, washAlpha));
    grad.addColorStop(mistStop * 0.6, rgbaStr(colors.wash, washAlpha * 0.58));
    grad.addColorStop(mistStop, rgbaStr(colors.mist, 0.85));
    grad.addColorStop(1.0, rgbaStr(colors.mist, 0.98));
  }

  ctx.fillStyle = grad;
  ctx.fill();

  // =========================================================================
  // PASSO 2: HACHURAS DE ROCHA CUNFA (皴法) RECORTADAS DENTRO DA MONTANHA
  // =========================================================================
  if (spec.cunfaDensity > 0.05 && spec.depth > 0.22) {
    ctx.save();
    ctx.clip();

    const strokeCount = Math.floor(
      (14 + spec.spanW * 28) * spec.cunfaDensity * (0.55 + spec.depth * 0.65)
    );

    for (let c = 0; c < strokeCount; c++) {
      const idx = Math.floor((0.08 + rand() * 0.84) * (ridgePts.length - 1));
      const anchor = ridgePts[idx];
      if (!anchor || anchor.env < 0.14) continue;

      const localSlopeH = baseY - anchor.y;
      if (localSlopeH < 10 * scale) continue;

      const startOffsetY = localSlopeH * (0.03 + rand() * 0.38);
      const sx = anchor.x + (rand() - 0.5) * 14 * scale;
      const sy = anchor.y + startOffsetY;
      const lenY = localSlopeH * (0.22 + rand() * 0.48);

      // Direção da fissura acompanha a inclinação da montanha em direção ao centro ou à borda
      const centerDir = anchor.u < 0.5 ? -1 : 1;
      const driftX =
        spec.sharpness > 1.35
          ? centerDir * (4 + rand() * 14) * scale
          : centerDir * (12 + rand() * 28) * scale;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + driftX * 0.35 + (rand() - 0.5) * 6 * scale,
        sy + lenY * 0.35,
        sx + driftX * 0.7 - (rand() - 0.5) * 6 * scale,
        sy + lenY * 0.72,
        sx + driftX,
        sy + lenY
      );

      const cunfaAlpha = (0.14 + spec.depth * 0.32) * (0.5 + rand() * 0.6);
      ctx.strokeStyle = rgbaStr(colors.ink, cunfaAlpha);
      ctx.lineWidth = (0.55 + rand() * 0.95) * scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Nas montanhas mais próximas, adiciona sub-arestas internas (cristas secundárias)
      if (c % 5 === 0 && spec.depth > 0.55) {
        ctx.beginPath();
        ctx.moveTo( anchor.x, anchor.y + 1.5 * scale );
        ctx.quadraticCurveTo(
          anchor.x + driftX * 0.45,
          anchor.y + lenY * 0.42,
          anchor.x + driftX * 0.85,
          anchor.y + lenY * 0.82
        );
        ctx.strokeStyle = rgbaStr(colors.ink, cunfaAlpha * 1.25);
        ctx.lineWidth = (0.9 + rand() * 0.9) * scale;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // PASSO 3: CONTORNO CALIGRÁFICO DE LARGURA VARIÁVEL NA CRISTA SUPERIOR
  // =========================================================================
  if (spec.depth > 0.18) {
    const ridgeAlpha = Math.min(0.98, 0.22 + spec.depth * 0.76);
    const maxStrokeW = (1.1 + spec.depth * 2.4) * scale;

    for (let i = 0; i < ridgePts.length - 1; i++) {
      const p0 = ridgePts[i];
      const p1 = ridgePts[i + 1];
      // A linha de contorno desaparece suavemente ao tocar a base de neblina
      const edgeFade = Math.sin(p0.u * Math.PI);
      if (edgeFade < 0.04) continue;

      const noiseThick = 0.75 + 0.5 * fbmNoise2D(p0.u * 12, spec.seed * 0.07, spec.seed + 303);
      const wSeg = Math.max(0.45 * scale, maxStrokeW * Math.pow(edgeFade, 0.65) * noiseThick);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = rgbaStr(colors.ink, ridgeAlpha * Math.min(1, edgeFade * 1.6));
      ctx.lineWidth = wSeg;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // =========================================================================
  // PASSO 4: PINHEIROS, ÁRVORES DE PROMONTÓRIO & PONTOS DE MUSGO (DIANTAI)
  // =========================================================================
  if (spec.treeStyle !== 'none' && treeDensity > 0.05) {
    if (spec.treeStyle === 'foliage') {
      // Árvores grandes em primeiro plano (estilo promontório)
      const anchorIdx = Math.floor(ridgePts.length * 0.46);
      const anchor = ridgePts[anchorIdx];
      if (anchor) {
        drawSansuiPromontoryTrees(
          ctx,
          anchor.x,
          anchor.y + 8 * scale,
          Math.min(72 * scale, maxAmplitude * 1.15),
          scale,
          colors.ink,
          colors.wash,
          0.95,
          spec.seed + 501
        );
      }
    } else if (spec.treeStyle === 'pines') {
      const pineCount = Math.max(
        1,
        Math.floor((3 + spec.spanW * 8) * treeDensity * (0.5 + spec.depth * 0.7))
      );
      for (let p = 0; p < pineCount; p++) {
        const idx = Math.floor((0.15 + rand() * 0.7) * (ridgePts.length - 1));
        const pt = ridgePts[idx];
        if (!pt || pt.env < 0.22) continue;

        const pineH = (9 + rand() * 16 * spec.depth) * scale;
        drawSansuiPineTree(
          ctx,
          pt.x,
          pt.y + (rand() * 5 + 1) * scale,
          pineH,
          scale,
          colors.ink,
          colors.wash,
          Math.min(0.96, 0.45 + spec.depth * 0.55),
          spec.seed + 700 + p * 29
        );
      }
    } else if (spec.treeStyle === 'distant_dots') {
      // Pequenos arbustos e árvores distantes ao longo da crista da ilha
      const dotCount = Math.floor(12 * treeDensity);
      for (let d = 0; d < dotCount; d++) {
        const idx = Math.floor((0.18 + rand() * 0.64) * (ridgePts.length - 1));
        const pt = ridgePts[idx];
        if (!pt || pt.env < 0.25) continue;
        const hTick = (2.5 + rand() * 3.8) * scale;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y + 0.5 * scale);
        ctx.lineTo(pt.x + (rand() - 0.5) * 1.5 * scale, pt.y - hTick);
        ctx.strokeStyle = rgbaStr(colors.ink, 0.55 * spec.depth);
        ctx.lineWidth = 0.85 * scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y - hTick, (1.1 + rand() * 1.2) * scale, 0, Math.PI * 2);
        ctx.fillStyle = rgbaStr(colors.ink, 0.5 * spec.depth);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Desenha o barco solitário (Sampan · 孤舟) com pescador de chapéu de bambu e vara
 */
function drawSansuiSampanBoat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  inkColor: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Casco curvo caligráfico da canoa
  ctx.beginPath();
  ctx.moveTo(-size * 0.95, -size * 0.12);
  ctx.quadraticCurveTo(0, size * 0.24, size * 0.98, -size * 0.16);
  ctx.quadraticCurveTo(0, size * 0.08, -size * 0.95, -size * 0.12);
  ctx.fillStyle = rgbaStr(inkColor, alpha * 0.94);
  ctx.fill();

  // Pescador em pé com chapéu cônico (笠)
  const personX = -size * 0.12;
  ctx.beginPath();
  ctx.moveTo(personX, size * 0.02);
  ctx.lineTo(personX + size * 0.04, -size * 0.52);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.92);
  ctx.lineWidth = Math.max(1.1, size * 0.11);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Chapéu de bambu
  ctx.beginPath();
  ctx.moveTo(personX - size * 0.2, -size * 0.48);
  ctx.lineTo(personX + size * 0.05, -size * 0.66);
  ctx.lineTo(personX + size * 0.26, -size * 0.48);
  ctx.closePath();
  ctx.fillStyle = rgbaStr(inkColor, alpha * 0.94);
  ctx.fill();

  // Remo / vara de bambu inclinada
  ctx.beginPath();
  ctx.moveTo(personX + size * 0.22, -size * 0.42);
  ctx.lineTo(-size * 0.48, size * 0.22);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.72);
  ctx.lineWidth = Math.max(0.65, size * 0.055);
  ctx.stroke();

  // Reflexo sutil sob o casco
  for (let r = 0; r < 2; r++) {
    const ry = size * (0.22 + r * 0.14);
    const rw = size * (0.65 - r * 0.2);
    ctx.beginPath();
    ctx.moveTo(-rw, ry);
    ctx.lineTo(rw, ry);
    ctx.strokeStyle = rgbaStr(inkColor, alpha * (0.28 - r * 0.1));
    ctx.lineWidth = Math.max(0.5, size * 0.045);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Gera a lista de cadeias montanhosas de acordo com a composição escolhida e a seed
 */
function buildCompositionRidges(
  composition: SansuiComposition,
  seed: number,
  ridgeLayers: number
): MountainRidgeSpec[] {
  const rand = createSeededRandom(seed);
  const ridges: MountainRidgeSpec[] = [];

  if (composition === 'panoramic_river') {
    // 1. Silhuetas muito distantes na neblina ao fundo (direita e esquerda)
    ridges.push({
      centerX: 0.71 + (rand() - 0.5) * 0.06,
      spanW: 0.42,
      peakY: 0.22 + rand() * 0.05,
      baseY: 0.37,
      sharpness: 0.95,
      skew: 0.15,
      depth: 0.16,
      cunfaDensity: 0.1,
      treeStyle: 'none',
      seed: seed + 11,
    });
    ridges.push({
      centerX: 0.94,
      spanW: 0.28,
      peakY: 0.27,
      baseY: 0.38,
      sharpness: 0.85,
      depth: 0.2,
      cunfaDensity: 0.1,
      treeStyle: 'none',
      seed: seed + 23,
    });

    // 2. Ilhas alongadas de meio-plano (como no banner Kalpa Shan)
    ridges.push({
      centerX: 0.58 + (rand() - 0.5) * 0.05,
      spanW: 0.34,
      peakY: 0.3 + rand() * 0.03,
      baseY: 0.38,
      sharpness: 0.75,
      plateau: 0.65,
      skew: -0.2,
      depth: 0.58,
      cunfaDensity: 0.75,
      treeStyle: 'distant_dots',
      seed: seed + 37,
    });
    ridges.push({
      centerX: 0.83 + (rand() - 0.5) * 0.04,
      spanW: 0.26,
      peakY: 0.28 + rand() * 0.03,
      baseY: 0.39,
      sharpness: 1.05,
      skew: -0.1,
      depth: 0.66,
      cunfaDensity: 0.85,
      treeStyle: 'distant_dots',
      seed: seed + 53,
    });

    // 3. Promontório rochoso em primeiro plano no canto inferior direito com árvores expressivas
    ridges.push({
      centerX: 0.93,
      spanW: 0.29,
      peakY: 0.81,
      baseY: 1.02,
      sharpness: 0.82,
      skew: -0.15,
      depth: 0.98,
      cunfaDensity: 1.25,
      treeStyle: 'foliage',
      seed: seed + 89,
    });

    return ridges;
  }

  if (composition === 'karst_peaks') {
    // 1. Picos fantasmas distantes na bruma
    ridges.push({
      centerX: 0.57 + (rand() - 0.5) * 0.06,
      spanW: 0.36,
      peakY: 0.34,
      baseY: 0.86,
      sharpness: 1.55,
      depth: 0.18,
      cunfaDensity: 0.15,
      treeStyle: 'none',
      seed: seed + 101,
    });

    // 2. Pico Karst secundário à direita
    ridges.push({
      centerX: 0.9 + (rand() - 0.5) * 0.04,
      spanW: 0.32,
      peakY: 0.36 + rand() * 0.06,
      baseY: 0.93,
      sharpness: 1.85,
      skew: -0.12,
      depth: 0.68,
      cunfaDensity: 1.15,
      treeStyle: 'pines',
      seed: seed + 131,
    });

    // 3. Grande Torre Karst Principal (protagonista vertical)
    ridges.push({
      centerX: 0.68 + (rand() - 0.5) * 0.05,
      spanW: 0.31,
      peakY: 0.16 + rand() * 0.05,
      baseY: 0.94,
      sharpness: 2.15,
      skew: 0.08,
      depth: 0.92,
      cunfaDensity: 1.35,
      treeStyle: 'pines',
      seed: seed + 167,
    });

    // 4. Margem rochosa com pinheiros altos na base direita
    ridges.push({
      centerX: 0.92,
      spanW: 0.32,
      peakY: 0.86,
      baseY: 1.03,
      sharpness: 0.88,
      depth: 1.0,
      cunfaDensity: 1.2,
      treeStyle: 'pines',
      seed: seed + 199,
    });

    return ridges;
  }

  if (composition === 'twin_gorges') {
    // 1. Cordilheiras atmosféricas de fundo
    ridges.push({
      centerX: 0.18,
      spanW: 0.45,
      peakY: 0.22,
      baseY: 0.78,
      sharpness: 1.35,
      depth: 0.18,
      cunfaDensity: 0.15,
      treeStyle: 'none',
      seed: seed + 211,
    });
    ridges.push({
      centerX: 0.82,
      spanW: 0.45,
      peakY: 0.2,
      baseY: 0.78,
      sharpness: 1.4,
      depth: 0.2,
      cunfaDensity: 0.15,
      treeStyle: 'none',
      seed: seed + 223,
    });

    // 2. Três grandes picos escarpados (esquerda, centro-direita alto, direita)
    ridges.push({
      centerX: 0.28 + (rand() - 0.5) * 0.04,
      spanW: 0.28,
      peakY: 0.42,
      baseY: 0.9,
      sharpness: 1.9,
      depth: 0.65,
      cunfaDensity: 1.0,
      treeStyle: 'pines',
      seed: seed + 241,
    });
    ridges.push({
      centerX: 0.76 + (rand() - 0.5) * 0.04,
      spanW: 0.3,
      peakY: 0.35,
      baseY: 0.91,
      sharpness: 1.95,
      depth: 0.76,
      cunfaDensity: 1.15,
      treeStyle: 'pines',
      seed: seed + 263,
    });
    ridges.push({
      centerX: 0.55 + (rand() - 0.5) * 0.04,
      spanW: 0.34,
      peakY: 0.18 + rand() * 0.04,
      baseY: 0.93,
      sharpness: 2.1,
      skew: 0.06,
      depth: 0.94,
      cunfaDensity: 1.3,
      treeStyle: 'pines',
      seed: seed + 281,
    });

    // 3. Ilha rochosa com pinheiros no canto inferior esquerdo
    ridges.push({
      centerX: 0.12,
      spanW: 0.34,
      peakY: 0.85,
      baseY: 1.03,
      sharpness: 0.9,
      depth: 1.0,
      cunfaDensity: 1.2,
      treeStyle: 'pines',
      seed: seed + 307,
    });

    return ridges;
  }

  // Default: 'layered_valley' (Vale das Cinco Neblinas com múltiplas colinas entrelaçadas)
  const totalLayers = Math.max(4, Math.min(8, ridgeLayers));
  for (let l = 0; l < totalLayers; l++) {
    const u = l / Math.max(1, totalLayers - 1); // 0 (fundo) -> 1 (frente)
    const isLeft = l % 2 === 0;
    const centerX = isLeft
      ? 0.22 + (rand() - 0.4) * 0.18
      : 0.78 + (rand() - 0.6) * 0.18;
    const spanW = 0.54 + rand() * 0.22;
    const peakY = 0.16 + u * 0.48 + (rand() - 0.5) * 0.05;
    const baseY = Math.min(1.04, peakY + 0.34 + u * 0.12);

    ridges.push({
      centerX,
      spanW,
      peakY,
      baseY,
      sharpness: 1.05 + (rand() - 0.5) * 0.35,
      skew: isLeft ? -0.14 : 0.14,
      depth: 0.16 + Math.pow(u, 0.85) * 0.84,
      cunfaDensity: 0.35 + u * 0.95,
      treeStyle: u < 0.25 ? 'none' : 'pines',
      seed: seed + 400 + l * 43,
    });
  }

  return ridges;
}

/**
 * Componente <SumiSansui />
 * Motor próprio de pintura gerativa de paisagens Sansui / Shan-Shui (山水) controlado por seed,
 * com suporte a temas prontos, Modo Noturno, variáveis CSS e cores customizadas.
 */
export const SumiSansui: React.FC<SumiSansuiProps> = ({
  seed = 8472,
  composition = 'panoramic_river',
  theme = 'classic_washi',
  colors: customColors,
  backgroundColor,
  inkColor,
  washColor,
  ridgeLayers = 6,
  treeDensity = 1.0,
  mistDensity = 1.0,
  showBoat = true,
  animated = false,
  actionsRef,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticMountainCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cacheKeyRef = useRef<string>('');
  const isVisibleRef = useRef<boolean>(true);

  const exportPng = useCallback(
    (filename?: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = filename || `sumi-sansui-${composition}-${seed}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
    [composition, seed]
  );

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { exportPng };
  }, [actionsRef, exportPng]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { rootMargin: '100px 0px', threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!staticMountainCacheRef.current) {
      staticMountainCacheRef.current = document.createElement('canvas');
    }
    const cacheCanvas = staticMountainCacheRef.current;
    let animId = 0;
    let cachedRect = canvas.getBoundingClientRect();

    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        cachedRect = entries[0].contentRect as DOMRect;
        cacheKeyRef.current = '';
      }
    });
    ro.observe(canvas);

    const startTime = performance.now();

    const renderFrame = (now: number) => {
      if (!isVisibleRef.current && animated) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(220, Math.floor(cachedRect.width || canvas.clientWidth || 640));
      const h = Math.max(150, Math.floor(cachedRect.height || canvas.clientHeight || 360));
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        cacheCanvas.width = targetW;
        cacheCanvas.height = targetH;
        cacheKeyRef.current = '';
      }

      const { resolved: palette, isDark } = resolveSansuiColors(
        theme,
        customColors,
        backgroundColor,
        inkColor,
        washColor
      );

      const scale = Math.max(0.55, Math.min(w / 900, h / 460));
      const nextCacheKey = `${targetW}x${targetH}:${seed}:${composition}:${ridgeLayers}:${treeDensity}:${mistDensity}:${palette.background}:${palette.ink}:${palette.wash}:${palette.mist}:${palette.accent}`;

      const ctx = canvas.getContext('2d');
      const cCtx = cacheCanvas.getContext('2d');
      if (!ctx || !cCtx) return;

      // 1. Constrói o cache estático das cadeias de montanhas, Cunfa e árvores
      if (cacheKeyRef.current !== nextCacheKey) {
        cCtx.save();
        cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cCtx.clearRect(0, 0, w, h);

        // Fundo Papel Washi / Céu
        cCtx.fillStyle = palette.background;
        cCtx.fillRect(0, 0, w, h);

        // Textura sutil de fibras de papel Washi / Seda
        const fiberRand = createSeededRandom(seed + 999);
        cCtx.strokeStyle = rgbaStr(palette.ink, isDark ? 0.03 : 0.022);
        cCtx.lineWidth = 0.6;
        for (let f = 0; f < 42; f++) {
          const fy = fiberRand() * h;
          cCtx.beginPath();
          cCtx.moveTo(0, fy);
          cCtx.lineTo(w, fy + (fiberRand() - 0.5) * 4);
          cCtx.stroke();
        }

        const ridges = buildCompositionRidges(composition, seed, ridgeLayers);

        // No modo panoramic_river, desenha as cadeias distantes primeiro, depois as linhas d'água,
        // e por último o promontório em primeiro plano para sobreposição perfeita
        const backRidges = ridges.filter((r) => r.depth < 0.9);
        const frontRidges = ridges.filter((r) => r.depth >= 0.9);

        for (const ridge of backRidges) {
          renderSansuiMountainRidge(
            cCtx,
            w,
            h,
            scale,
            ridge,
            palette,
            isDark,
            treeDensity,
            mistDensity
          );
        }

        // Linhas horizontais serenas da extensão d'água (estáticas no buffer base)
        const waterRand = createSeededRandom(seed + 777);
        const waterTopY =
          composition === 'panoramic_river'
            ? h * 0.37
            : composition === 'layered_valley'
              ? h * 0.72
              : h * 0.88;
        const rippleCount =
          composition === 'panoramic_river'
            ? 58
            : composition === 'layered_valley'
              ? 18
              : 16;

        for (let r = 0; r < rippleCount; r++) {
          const uY = Math.pow(waterRand(), 0.85);
          const wy = waterTopY + uY * (h * 0.96 - waterTopY);
          const wx = waterRand() * w * 0.92;
          const wLen = (28 + waterRand() * 135) * scale * (0.65 + (1 - uY) * 0.5);

          cCtx.beginPath();
          cCtx.moveTo(wx - wLen * 0.5, wy);
          cCtx.lineTo(wx + wLen * 0.5, wy);
          cCtx.strokeStyle = rgbaStr(
            palette.ink,
            (isDark ? 0.14 : 0.18) * (0.45 + waterRand() * 0.55)
          );
          cCtx.lineWidth = Math.max(0.5, 0.75 * scale);
          cCtx.stroke();
        }

        for (const ridge of frontRidges) {
          renderSansuiMountainRidge(
            cCtx,
            w,
            h,
            scale,
            ridge,
            palette,
            isDark,
            treeDensity,
            mistDensity
          );
        }

        cCtx.restore();
        cacheKeyRef.current = nextCacheKey;
      }

      // 2. Desenha o buffer cacheado + barco solitário e bruma viva opcional
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(cacheCanvas, 0, 0, w, h);

      const elapsed = animated ? (now - startTime) / 1000 : 0;

      if (showBoat) {
        const boatRand = createSeededRandom(seed + 555);
        let boatX = w * 0.61;
        let boatY = h * 0.81;
        let boatSize = 15 * scale;

        if (composition === 'panoramic_river') {
          boatX = w * (0.58 + (boatRand() - 0.5) * 0.08);
          boatY = h * (0.76 + (boatRand() - 0.5) * 0.05);
          boatSize = 15.5 * scale;
        } else if (composition === 'karst_peaks') {
          boatX = w * (0.43 + (boatRand() - 0.5) * 0.06);
          boatY = h * 0.94;
          boatSize = 12 * scale;
        } else if (composition === 'layered_valley') {
          boatX = w * 0.51;
          boatY = h * 0.9;
          boatSize = 10.5 * scale;
        } else if (composition === 'twin_gorges') {
          boatX = w * 0.37;
          boatY = h * 0.94;
          boatSize = 11.5 * scale;
        }

        const driftX = animated ? Math.sin(elapsed * 0.55) * 8 * scale : 0;
        const bobY = animated ? Math.cos(elapsed * 1.1) * 1.2 * scale : 0;

        drawSansuiSampanBoat(
          ctx,
          boatX + driftX,
          boatY + bobY,
          Math.max(8, boatSize),
          palette.ink,
          0.92
        );
      }

      ctx.restore();

      if (animated) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [
    seed,
    composition,
    theme,
    customColors,
    backgroundColor,
    inkColor,
    washColor,
    ridgeLayers,
    treeDensity,
    mistDensity,
    showBoat,
    animated,
  ]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

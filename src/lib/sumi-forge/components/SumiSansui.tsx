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
  /** Densidade de pinheiros e árvores nas encostas (0.0 a 2.5) */
  treeDensity?: number;
  /** Intensidade da neblina entre os vales (0.0 a 1.8) */
  mistDensity?: number;
  /** Exibe o pescador solitário em seu barco (sampan) */
  showBoat?: boolean;
  /** Ativa o movimento sutil da água, da neblina e do barco */
  animated?: boolean;
  /**
   * Quando true (padrão), a paisagem é auto-pintada progressivamente (aguada -> traços -> florestas).
   * Quando false, renderiza a pintura pronta e fixa instantaneamente.
   */
  autoPaint?: boolean;
  /** Quando true (padrão), inicia a auto-pintura apenas quando o componente entra na área visível da tela */
  paintOnView?: boolean;
  /** Duração da cerimônia de auto-pintura em segundos (padrão: 2.2s) */
  paintDuration?: number;
  /** Contador opcional para disparar novamente a animação de pintura ao mudar de valor */
  replayTrigger?: number;
  /** Referência opcional para exportar a pintura gerada em PNG ou repintar sob demanda */
  actionsRef?: React.MutableRefObject<{
    exportPng: (filename?: string) => void;
    replayPaint?: () => void;
  } | null>;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Especificação paramétrica de uma cadeia de montanhas Sansui (山水) para composição procedural em Canvas 2D.
 */
export interface MountainRidgeSpec {
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
  /** Estilo de árvores nesta cadeia ('pines' | 'foliage' | 'dense_forest' | 'distant_dots' | 'none') */
  treeStyle: 'pines' | 'foliage' | 'dense_forest' | 'distant_dots' | 'none';
  /** Se verdadeiro, desenha um pavilhão oriental (Azumaya) no ombro da montanha */
  hasPavilion?: boolean;
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
export function resolveSansuiColors(
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
  const mist =
    customColors?.mist || bgOverride || customColors?.background || basePreset.colors.mist;
  const accent = customColors?.accent || basePreset.colors.accent;

  return {
    resolved: { background, ink, wash, mist, accent },
    isDark: isDarkHex(background),
  };
}

/**
 * Preenche o canvas com a cor de papel Washi / Seda e desenha fibras orgânicas horizontais sutis.
 */
export function drawWashiPaperTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backgroundColor: string,
  inkColor = '#1D1B18',
  seed = 8472
) {
  const isDark = isDarkHex(backgroundColor);
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, w, h);

  const fiberRand = createSeededRandom(seed + 999);
  ctx.strokeStyle = rgbaStr(inkColor, isDark ? 0.03 : 0.022);
  ctx.lineWidth = 0.6;
  for (let f = 0; f < 42; f++) {
    const fy = fiberRand() * h;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(w, fy + (fiberRand() - 0.5) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Desenha um pinheiro oriental Sansui (松) com tronco caligráfico e patamares de agulhas horizontais
 */
export function drawSansuiPineTree(
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
  if (alpha <= 0.02 || height <= 1) return;
  const rand = createSeededRandom(seed);
  const lean = (rand() - 0.5) * height * 0.26;
  const topX = x + lean;
  const topY = y - height;

  ctx.save();
  // Tronco principal
  ctx.beginPath();
  ctx.moveTo(x, y + 2 * scale);
  ctx.quadraticCurveTo(x + lean * 0.35, y - height * 0.52, topX, topY);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.94);
  ctx.lineWidth = Math.max(0.85, height * 0.072);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Patamares horizontais de agulhas/folhagem
  const tiers = Math.max(3, Math.min(8, Math.floor(height / (5.0 * scale)) + 2));
  for (let t = 0; t < tiers; t++) {
    const u = t / Math.max(1, tiers - 1);
    const ty = topY + u * height * 0.72;
    const tx = topX - lean * u * 0.55 + (rand() - 0.5) * 2.5 * scale;
    const tierSpan =
      height * (0.26 + Math.sin(u * Math.PI * 0.85) * 0.32) * (0.82 + rand() * 0.35);

    // Sombra aguada suave atrás do patamar
    ctx.beginPath();
    ctx.ellipse(
      tx,
      ty,
      tierSpan * 0.6,
      Math.max(1.3, height * 0.07),
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = rgbaStr(washColor, alpha * 0.38);
    ctx.fill();

    // Traços caligráficos de agulhas
    ctx.beginPath();
    ctx.moveTo(tx - tierSpan * 0.56, ty + (rand() - 0.5) * 1.5 * scale);
    ctx.quadraticCurveTo(
      tx,
      ty - 1.8 * scale,
      tx + tierSpan * 0.56,
      ty + (rand() - 0.5) * 1.5 * scale
    );
    ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.95);
    ctx.lineWidth = Math.max(0.95, height * 0.065);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Desenha as árvores retorcidas de promontório com folhagem em gotas de tinta (Tenbyō / Dianfa)
 */
export function drawSansuiPromontoryTrees(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  scale: number,
  inkColor: string,
  washColor: string,
  alpha: number,
  seed: number,
  extraDense = false
) {
  if (alpha <= 0.02 || height <= 2) return;
  const rand = createSeededRandom(seed);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Árvore seca retorcida à esquerda
  const bareX = x - height * 0.34;
  const bareY = y + height * 0.06;
  const bareH = height * 0.8;
  ctx.beginPath();
  ctx.moveTo(bareX, bareY + 4 * scale);
  ctx.quadraticCurveTo(
    bareX - bareH * 0.12,
    bareY - bareH * 0.48,
    bareX - bareH * 0.24,
    bareY - bareH
  );
  ctx.moveTo(bareX - bareH * 0.1, bareY - bareH * 0.55);
  ctx.lineTo(bareX - bareH * 0.38, bareY - bareH * 0.78);
  ctx.moveTo(bareX - bareH * 0.14, bareY - bareH * 0.68);
  ctx.lineTo(bareX + bareH * 0.08, bareY - bareH * 0.88);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.92);
  ctx.lineWidth = Math.max(1.2, height * 0.048);
  ctx.stroke();

  // 2. Árvores altas com copa em manchas circulares de nanquim (Dianfa)
  const treeTotal = extraDense ? 4 : 2;
  for (let treeIdx = 0; treeIdx < treeTotal; treeIdx++) {
    const offsetFactor = treeIdx - (treeTotal - 1) * 0.3;
    const tx = x + offsetFactor * height * 0.26;
    const ty = y + Math.abs(offsetFactor) * height * 0.06;
    const th = height * (1.04 - (treeIdx % 2) * 0.16);
    const crownX = tx + (treeIdx % 2 === 0 ? 0.08 : -0.1) * th;
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
    const blobCount = extraDense ? 11 : 7;
    for (let b = 0; b < blobCount; b++) {
      const ang = (b / blobCount) * Math.PI * 2 + rand() * 0.5;
      const dist = th * (0.05 + rand() * 0.24);
      const bx = crownX + Math.cos(ang) * dist;
      const by = crownY + Math.sin(ang) * dist * 0.65;
      const br = Math.max(1.9, th * (0.055 + rand() * 0.05));
      const isDarkBlob = b % 2 === 0;

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = rgbaStr(
        isDarkBlob ? inkColor : washColor,
        alpha * (isDarkBlob ? 0.88 : 0.56)
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Desenha um pavilhão tradicional de montanha (Azumaya / 亭) com beirais curvos entre os pinheiros
 */
export function drawSansuiMountainPavilion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  inkColor: string,
  washColor: string,
  alpha: number
) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Plataforma de pedra na encosta
  ctx.beginPath();
  ctx.moveTo(-size * 0.85, 0);
  ctx.lineTo(size * 0.85, 0);
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.9);
  ctx.lineWidth = Math.max(1.1, size * 0.08);
  ctx.stroke();

  // Colunas de madeira do pavilhão
  const colH = size * 0.62;
  for (const cx of [-size * 0.52, -size * 0.18, size * 0.18, size * 0.52]) {
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, -colH);
    ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.82);
    ctx.lineWidth = Math.max(0.8, size * 0.055);
    ctx.stroke();
  }

  // Telhado curvo oriental (beirais arrebitados)
  ctx.beginPath();
  ctx.moveTo(-size * 1.05, -colH + size * 0.06);
  ctx.quadraticCurveTo(-size * 0.45, -colH - size * 0.12, 0, -colH - size * 0.52);
  ctx.quadraticCurveTo(size * 0.45, -colH - size * 0.12, size * 1.05, -colH + size * 0.06);
  ctx.quadraticCurveTo(0, -colH - size * 0.06, -size * 1.05, -colH + size * 0.06);
  ctx.closePath();
  ctx.fillStyle = rgbaStr(washColor, alpha * 0.65);
  ctx.fill();
  ctx.strokeStyle = rgbaStr(inkColor, alpha * 0.95);
  ctx.lineWidth = Math.max(1.0, size * 0.07);
  ctx.stroke();

  // Pináculo central
  ctx.beginPath();
  ctx.moveTo(0, -colH - size * 0.52);
  ctx.lineTo(0, -colH - size * 0.72);
  ctx.stroke();

  ctx.restore();
}

/**
 * Desenha um bando de garças / pássaros caligráficos voando entre as montanhas e a neblina
 */
export function drawSansuiCraneFlock(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  inkColor: string,
  alpha: number,
  seed: number
) {
  if (alpha <= 0.02) return;
  const rand = createSeededRandom(seed);
  const count = 5;
  ctx.save();
  ctx.lineCap = 'round';

  for (let i = 0; i < count; i++) {
    const bx = centerX + (i - 2) * 16 * scale + (rand() - 0.5) * 6 * scale;
    const by = centerY + Math.abs(i - 1.5) * 7 * scale + (rand() - 0.5) * 4 * scale;
    const span = (4.2 + (1 - i / count) * 2.5) * scale;

    ctx.beginPath();
    ctx.moveTo(bx - span, by - span * 0.38);
    ctx.quadraticCurveTo(bx - span * 0.35, by - span * 0.75, bx, by);
    ctx.quadraticCurveTo(bx + span * 0.35, by - span * 0.75, bx + span, by - span * 0.38);
    ctx.strokeStyle = rgbaStr(inkColor, alpha * (0.72 - i * 0.08));
    ctx.lineWidth = Math.max(0.75, 1.05 * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renderiza uma massa montanhosa completa com suporte a progresso de auto-pintura (layerProg 0..1):
 * 1. Aguada atmosférica vertical + dissolução na neblina da base
 * 2. Fissuras e hachuras internas de rocha Cunfa (皴法)
 * 3. Contorno caligráfico de largura variável na crista
 * 4. Vegetação (pinheiros, bosques densos, árvores de promontório, pavilhão e musgo Dian-tai)
 */
export function renderSansuiMountainRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  spec: MountainRidgeSpec,
  colors: SansuiColors,
  isDark: boolean,
  treeDensity: number,
  mistDensity: number,
  layerProg = 1.0
) {
  if (layerProg <= 0.005) return;

  const washProg = Math.min(1, layerProg / 0.55);
  const strokeProg = Math.max(0, Math.min(1, (layerProg - 0.12) / 0.68));
  const detailProg = Math.max(0, Math.min(1, (layerProg - 0.45) / 0.55));

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
  const washAlpha = (0.14 + spec.depth * 0.42) * (isDark ? 1.35 : 1.0) * washProg;
  const mistStop = Math.max(0.52, Math.min(0.95, 0.92 - mistDensity * 0.18));

  if (isDark) {
    const topTint = mixHex(colors.wash, colors.ink, 0.16 * spec.depth);
    grad.addColorStop(0.0, rgbaStr(topTint, Math.min(0.95, (washAlpha + 0.25) * washProg)));
    grad.addColorStop(mistStop * 0.65, rgbaStr(colors.wash, Math.min(0.9, washAlpha * 0.85)));
    grad.addColorStop(1.0, rgbaStr(colors.mist, 0.96 * washProg));
  } else {
    const topTint = mixHex(colors.wash, colors.ink, 0.18 * spec.depth);
    grad.addColorStop(0.0, rgbaStr(topTint, washAlpha));
    grad.addColorStop(mistStop * 0.6, rgbaStr(colors.wash, washAlpha * 0.58));
    grad.addColorStop(mistStop, rgbaStr(colors.mist, 0.85 * washProg));
    grad.addColorStop(1.0, rgbaStr(colors.mist, 0.98 * washProg));
  }

  ctx.fillStyle = grad;
  ctx.fill();

  // =========================================================================
  // PASSO 2: HACHURAS DE ROCHA CUNFA (皴法) RECORTADAS DENTRO DA MONTANHA
  // =========================================================================
  if (spec.cunfaDensity > 0.05 && spec.depth > 0.22 && strokeProg > 0.02) {
    ctx.save();
    ctx.clip();

    const totalStrokes = Math.floor(
      (14 + spec.spanW * 28) * spec.cunfaDensity * (0.55 + spec.depth * 0.65)
    );
    const activeStrokeCount = Math.floor(totalStrokes * strokeProg);

    for (let c = 0; c < activeStrokeCount; c++) {
      const idx = Math.floor((0.08 + rand() * 0.84) * (ridgePts.length - 1));
      const anchor = ridgePts[idx];
      if (!anchor || anchor.env < 0.14) continue;

      const localSlopeH = baseY - anchor.y;
      if (localSlopeH < 10 * scale) continue;

      const startOffsetY = localSlopeH * (0.03 + rand() * 0.38);
      const sx = anchor.x + (rand() - 0.5) * 14 * scale;
      const sy = anchor.y + startOffsetY;
      const lenY = localSlopeH * (0.22 + rand() * 0.48);

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

      const cunfaAlpha = (0.14 + spec.depth * 0.32) * (0.5 + rand() * 0.6) * strokeProg;
      ctx.strokeStyle = rgbaStr(colors.ink, cunfaAlpha);
      ctx.lineWidth = (0.55 + rand() * 0.95) * scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (c % 5 === 0 && spec.depth > 0.55) {
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y + 1.5 * scale);
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
  if (spec.depth > 0.18 && strokeProg > 0.01) {
    const ridgeAlpha = Math.min(0.98, 0.22 + spec.depth * 0.76);
    const maxStrokeW = (1.1 + spec.depth * 2.4) * scale;
    const maxSegIndex = Math.floor((ridgePts.length - 1) * strokeProg);

    for (let i = 0; i < maxSegIndex; i++) {
      const p0 = ridgePts[i];
      const p1 = ridgePts[i + 1];
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
  // PASSO 4: PAVILHÃO ORIENTAL NA ENCOSTA (OPCIONAL)
  // =========================================================================
  if (spec.hasPavilion && detailProg > 0.05) {
    const pavIdx = Math.floor(ridgePts.length * 0.54);
    const pavPt = ridgePts[pavIdx];
    if (pavPt) {
      drawSansuiMountainPavilion(
        ctx,
        pavPt.x,
        pavPt.y + 4 * scale,
        (16 + spec.depth * 10) * scale,
        colors.ink,
        colors.wash,
        detailProg * (0.55 + spec.depth * 0.42)
      );
    }
  }

  // =========================================================================
  // PASSO 5: PINHEIROS, BOSQUES DENSOS, PROMONTÓRIO & PONTOS DE MUSGO
  // =========================================================================
  if (spec.treeStyle !== 'none' && treeDensity > 0.05 && detailProg > 0.02) {
    if (spec.treeStyle === 'foliage') {
      const anchorIdx = Math.floor(ridgePts.length * 0.44);
      const anchor = ridgePts[anchorIdx];
      if (anchor) {
        drawSansuiPromontoryTrees(
          ctx,
          anchor.x,
          anchor.y + 8 * scale,
          Math.min(76 * scale, maxAmplitude * 1.18) * (0.4 + 0.6 * detailProg),
          scale,
          colors.ink,
          colors.wash,
          0.96 * detailProg,
          spec.seed + 501,
          treeDensity > 1.25
        );
      }
      // Pinheiros complementares acompanhando a encosta do promontório
      const sidePines = Math.floor(3 * treeDensity);
      for (let sp = 0; sp < sidePines; sp++) {
        const pIdx = Math.floor((0.22 + sp * 0.18) * (ridgePts.length - 1));
        const pPt = ridgePts[pIdx];
        if (!pPt) continue;
        drawSansuiPineTree(
          ctx,
          pPt.x,
          pPt.y + 4 * scale,
          (18 + rand() * 14) * scale * detailProg,
          scale,
          colors.ink,
          colors.wash,
          0.9 * detailProg,
          spec.seed + 610 + sp * 19
        );
      }
    } else if (spec.treeStyle === 'dense_forest') {
      // Floresta densa combinando muitos pinheiros imperiais + árvores de copa pontilhada + pontos de musgo
      const pineCount = Math.max(
        4,
        Math.floor((9 + spec.spanW * 18) * treeDensity * (0.65 + spec.depth * 0.65))
      );
      const visiblePines = Math.ceil(pineCount * detailProg);

      for (let p = 0; p < visiblePines; p++) {
        const idx = Math.floor((0.1 + rand() * 0.8) * (ridgePts.length - 1));
        const pt = ridgePts[idx];
        if (!pt || pt.env < 0.16) continue;

        const slopeOffset = rand() * Math.min(28 * scale, (baseY - pt.y) * 0.35);
        const pineH = (11 + rand() * 22 * spec.depth) * scale;
        drawSansuiPineTree(
          ctx,
          pt.x + (rand() - 0.5) * 6 * scale,
          pt.y + slopeOffset + 2 * scale,
          pineH,
          scale,
          colors.ink,
          colors.wash,
          Math.min(0.96, (0.48 + spec.depth * 0.5) * detailProg),
          spec.seed + 800 + p * 31
        );
      }

      // Bosques de árvores de copa pontilhada (Tenbyō) entre os pinheiros nas camadas mais próximas
      if (spec.depth > 0.65) {
        const groveIdx = Math.floor((0.35 + rand() * 0.3) * (ridgePts.length - 1));
        const grovePt = ridgePts[groveIdx];
        if (grovePt) {
          drawSansuiPromontoryTrees(
            ctx,
            grovePt.x,
            grovePt.y + 6 * scale,
            (32 + spec.depth * 24) * scale * detailProg,
            scale,
            colors.ink,
            colors.wash,
            0.9 * detailProg,
            spec.seed + 950,
            true
          );
        }
      }
    } else if (spec.treeStyle === 'pines') {
      const pineCount = Math.max(
        2,
        Math.floor((4 + spec.spanW * 11) * treeDensity * (0.55 + spec.depth * 0.7))
      );
      const visiblePines = Math.ceil(pineCount * detailProg);

      for (let p = 0; p < visiblePines; p++) {
        const idx = Math.floor((0.14 + rand() * 0.72) * (ridgePts.length - 1));
        const pt = ridgePts[idx];
        if (!pt || pt.env < 0.2) continue;

        const pineH = (10 + rand() * 18 * spec.depth) * scale;
        drawSansuiPineTree(
          ctx,
          pt.x,
          pt.y + (rand() * 6 + 1) * scale,
          pineH,
          scale,
          colors.ink,
          colors.wash,
          Math.min(0.96, (0.45 + spec.depth * 0.55) * detailProg),
          spec.seed + 700 + p * 29
        );
      }
    } else if (spec.treeStyle === 'distant_dots') {
      const dotCount = Math.floor(16 * treeDensity * detailProg);
      for (let d = 0; d < dotCount; d++) {
        const idx = Math.floor((0.15 + rand() * 0.7) * (ridgePts.length - 1));
        const pt = ridgePts[idx];
        if (!pt || pt.env < 0.22) continue;
        const hTick = (2.8 + rand() * 4.2) * scale;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y + 0.5 * scale);
        ctx.lineTo(pt.x + (rand() - 0.5) * 1.5 * scale, pt.y - hTick);
        ctx.strokeStyle = rgbaStr(colors.ink, 0.58 * spec.depth * detailProg);
        ctx.lineWidth = 0.85 * scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y - hTick, (1.2 + rand() * 1.4) * scale, 0, Math.PI * 2);
        ctx.fillStyle = rgbaStr(colors.ink, 0.52 * spec.depth * detailProg);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Desenha o barco solitário (Sampan · 孤舟) com pescador de chapéu de bambu e vara
 */
export function drawSansuiSampanBoat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  inkColor: string,
  alpha: number
) {
  if (alpha <= 0.02) return;
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
export function buildCompositionRidges(
  composition: SansuiComposition,
  seed: number,
  ridgeLayers: number
): MountainRidgeSpec[] {
  const rand = createSeededRandom(seed);
  const ridges: MountainRidgeSpec[] = [];

  if (composition === 'panoramic_river') {
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
      treeStyle: 'pines',
      seed: seed + 53,
    });

    ridges.push({
      centerX: 0.92,
      spanW: 0.31,
      peakY: 0.8,
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

  if (composition === 'dense_pine_sanctuary') {
    // 1. Picos distantes na neblina alta
    ridges.push({
      centerX: 0.32 + (rand() - 0.5) * 0.06,
      spanW: 0.52,
      peakY: 0.14 + rand() * 0.04,
      baseY: 0.62,
      sharpness: 1.25,
      depth: 0.18,
      cunfaDensity: 0.2,
      treeStyle: 'distant_dots',
      seed: seed + 503,
    });
    ridges.push({
      centerX: 0.76 + (rand() - 0.5) * 0.06,
      spanW: 0.48,
      peakY: 0.18 + rand() * 0.04,
      baseY: 0.65,
      sharpness: 1.35,
      depth: 0.26,
      cunfaDensity: 0.3,
      treeStyle: 'distant_dots',
      seed: seed + 521,
    });

    // 2. Montanha santuário central-direita com Pavilhão Oriental e mata de pinheiros
    ridges.push({
      centerX: 0.68 + (rand() - 0.5) * 0.05,
      spanW: 0.48,
      peakY: 0.26 + rand() * 0.04,
      baseY: 0.82,
      sharpness: 1.15,
      skew: -0.14,
      depth: 0.58,
      cunfaDensity: 0.95,
      treeStyle: 'dense_forest',
      hasPavilion: true,
      seed: seed + 547,
    });

    // 3. Encosta florestal esquerda em meio-plano
    ridges.push({
      centerX: 0.24 + (rand() - 0.5) * 0.05,
      spanW: 0.5,
      peakY: 0.36 + rand() * 0.04,
      baseY: 0.88,
      sharpness: 1.08,
      skew: 0.16,
      depth: 0.74,
      cunfaDensity: 1.1,
      treeStyle: 'dense_forest',
      seed: seed + 577,
    });

    // 4. Dois promontórios densos em primeiro plano emoldurando o rio
    ridges.push({
      centerX: 0.86,
      spanW: 0.42,
      peakY: 0.56,
      baseY: 1.03,
      sharpness: 0.95,
      skew: -0.18,
      depth: 0.92,
      cunfaDensity: 1.25,
      treeStyle: 'dense_forest',
      seed: seed + 601,
    });
    ridges.push({
      centerX: 0.16,
      spanW: 0.38,
      peakY: 0.68,
      baseY: 1.04,
      sharpness: 0.88,
      skew: 0.15,
      depth: 0.99,
      cunfaDensity: 1.3,
      treeStyle: 'foliage',
      seed: seed + 631,
    });

    return ridges;
  }

  if (composition === 'karst_peaks') {
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

    ridges.push({
      centerX: 0.92,
      spanW: 0.34,
      peakY: 0.84,
      baseY: 1.03,
      sharpness: 0.88,
      depth: 1.0,
      cunfaDensity: 1.2,
      treeStyle: 'dense_forest',
      seed: seed + 199,
    });

    return ridges;
  }

  if (composition === 'twin_gorges') {
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

    ridges.push({
      centerX: 0.12,
      spanW: 0.36,
      peakY: 0.84,
      baseY: 1.03,
      sharpness: 0.9,
      depth: 1.0,
      cunfaDensity: 1.2,
      treeStyle: 'dense_forest',
      seed: seed + 307,
    });

    return ridges;
  }

  // Default: 'layered_valley' (Vale das Cinco Neblinas com múltiplas colinas entrelaçadas e matas ricas)
  const totalLayers = Math.max(4, Math.min(8, ridgeLayers));
  for (let l = 0; l < totalLayers; l++) {
    const u = l / Math.max(1, totalLayers - 1);
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
      treeStyle: u < 0.22 ? 'distant_dots' : u > 0.65 ? 'dense_forest' : 'pines',
      hasPavilion: l === totalLayers - 2,
      seed: seed + 400 + l * 43,
    });
  }

  return ridges;
}

/**
 * Componente <SumiSansui />
 * Motor próprio de pintura gerativa de paisagens Sansui / Shan-Shui (山水) controlado por seed,
 * com suporte a auto-pintura ao vivo ou modo fixo, temas prontos, Modo Noturno, variáveis CSS e cores customizadas.
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
  treeDensity = 1.15,
  mistDensity = 1.0,
  showBoat = true,
  animated = false,
  autoPaint = true,
  paintOnView = true,
  paintDuration = 2.2,
  replayTrigger = 0,
  actionsRef,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticMountainCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cacheKeyRef = useRef<string>('');
  const isVisibleRef = useRef<boolean>(!paintOnView);
  const hasEnteredViewRef = useRef<boolean>(!paintOnView);
  const paintStartTimeRef = useRef<number | null>(null);

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

  const replayPaint = useCallback(() => {
    paintStartTimeRef.current = performance.now();
    cacheKeyRef.current = '';
  }, []);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { exportPng, replayPaint };
  }, [actionsRef, exportPng, replayPaint]);

  // Reinicia a cerimônia de pintura quando a seed, composição ou replayTrigger mudam
  useEffect(() => {
    if (autoPaint && hasEnteredViewRef.current) {
      paintStartTimeRef.current = performance.now();
      cacheKeyRef.current = '';
    }
  }, [seed, composition, replayTrigger, autoPaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') {
      isVisibleRef.current = true;
      hasEnteredViewRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting && !hasEnteredViewRef.current) {
            hasEnteredViewRef.current = true;
            paintStartTimeRef.current = performance.now();
          }
        });
      },
      { rootMargin: '60px 0px', threshold: 0.12 }
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

    const mountTime = performance.now();
    if (!paintOnView && paintStartTimeRef.current === null) {
      paintStartTimeRef.current = mountTime;
    }

    const drawSceneToContext = (
      targetCtx: CanvasRenderingContext2D,
      w: number,
      h: number,
      scale: number,
      palette: SansuiColors,
      isDark: boolean,
      overallPaintProg: number
    ) => {
      // Fundo Papel Washi / Céu
      targetCtx.fillStyle = palette.background;
      targetCtx.fillRect(0, 0, w, h);

      // Textura sutil de fibras de papel Washi / Seda
      const fiberRand = createSeededRandom(seed + 999);
      targetCtx.strokeStyle = rgbaStr(palette.ink, isDark ? 0.03 : 0.022);
      targetCtx.lineWidth = 0.6;
      for (let f = 0; f < 42; f++) {
        const fy = fiberRand() * h;
        targetCtx.beginPath();
        targetCtx.moveTo(0, fy);
        targetCtx.lineTo(w, fy + (fiberRand() - 0.5) * 4);
        targetCtx.stroke();
      }

      const ridges = buildCompositionRidges(composition, seed, ridgeLayers);
      const totalRidges = ridges.length;

      // Calcula o progresso individual de cada cadeia (das mais distantes às mais próximas)
      const getRidgeProgress = (index: number) => {
        if (overallPaintProg >= 0.999) return 1.0;
        const startSlot = (index / Math.max(1, totalRidges)) * 0.45;
        const spanSlot = 0.55;
        const raw = Math.max(0, Math.min(1, (overallPaintProg - startSlot) / spanSlot));
        // Easing cubic-out suave
        return 1 - Math.pow(1 - raw, 2.6);
      };

      const backRidges = ridges
        .map((r, i) => ({ r, i }))
        .filter((item) => item.r.depth < 0.9);
      const frontRidges = ridges
        .map((r, i) => ({ r, i }))
        .filter((item) => item.r.depth >= 0.9);

      for (const { r: ridge, i } of backRidges) {
        renderSansuiMountainRidge(
          targetCtx,
          w,
          h,
          scale,
          ridge,
          palette,
          isDark,
          treeDensity,
          mistDensity,
          getRidgeProgress(i)
        );
      }

      // Bando de garças / pássaros voando entre os picos distantes
      const craneProg = Math.max(0, Math.min(1, (overallPaintProg - 0.55) / 0.45));
      if (craneProg > 0.02) {
        drawSansuiCraneFlock(
          targetCtx,
          w * (composition === 'panoramic_river' ? 0.64 : 0.46),
          h * 0.24,
          scale,
          palette.ink,
          craneProg * 0.78,
          seed + 888
        );
      }

      // Linhas horizontais serenas da extensão d'água
      const waterProg = Math.max(0, Math.min(1, (overallPaintProg - 0.3) / 0.65));
      if (waterProg > 0.02) {
        const waterRand = createSeededRandom(seed + 777);
        const waterTopY =
          composition === 'panoramic_river'
            ? h * 0.37
            : composition === 'layered_valley' || composition === 'dense_pine_sanctuary'
              ? h * 0.72
              : h * 0.88;
        const rippleCount = Math.floor(
          (composition === 'panoramic_river'
            ? 58
            : composition === 'layered_valley' || composition === 'dense_pine_sanctuary'
              ? 24
              : 18) * waterProg
        );

        for (let r = 0; r < rippleCount; r++) {
          const uY = Math.pow(waterRand(), 0.85);
          const wy = waterTopY + uY * (h * 0.96 - waterTopY);
          const wx = waterRand() * w * 0.92;
          const wLen =
            (28 + waterRand() * 135) * scale * (0.65 + (1 - uY) * 0.5) * waterProg;

          targetCtx.beginPath();
          targetCtx.moveTo(wx - wLen * 0.5, wy);
          targetCtx.lineTo(wx + wLen * 0.5, wy);
          targetCtx.strokeStyle = rgbaStr(
            palette.ink,
            (isDark ? 0.14 : 0.18) * (0.45 + waterRand() * 0.55) * waterProg
          );
          targetCtx.lineWidth = Math.max(0.5, 0.75 * scale);
          targetCtx.stroke();
        }
      }

      for (const { r: ridge, i } of frontRidges) {
        renderSansuiMountainRidge(
          targetCtx,
          w,
          h,
          scale,
          ridge,
          palette,
          isDark,
          treeDensity,
          mistDensity,
          getRidgeProgress(i)
        );
      }
    };

    const renderFrame = (now: number) => {
      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      if (paintStartTimeRef.current === null) {
        paintStartTimeRef.current = now;
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
      const paintElapsed = (now - paintStartTimeRef.current) / 1000;
      const overallPaintProg = autoPaint
        ? Math.max(0, Math.min(1, paintElapsed / Math.max(0.4, paintDuration)))
        : 1.0;

      const isPaintingNow = overallPaintProg < 0.999;

      const ctx = canvas.getContext('2d');
      const cCtx = cacheCanvas.getContext('2d');
      if (!ctx || !cCtx) return;

      const nextCacheKey = `${targetW}x${targetH}:${seed}:${composition}:${ridgeLayers}:${treeDensity}:${mistDensity}:${palette.background}:${palette.ink}:${palette.wash}:${palette.mist}:${palette.accent}`;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (isPaintingNow) {
        // Durante a cerimônia de auto-pintura, desenha diretamente com o progresso atual
        drawSceneToContext(ctx, w, h, scale, palette, isDark, overallPaintProg);
      } else {
        // Quando a pintura atinge 100%, grava no cache offscreen para máxima performance (60/120 FPS)
        if (cacheKeyRef.current !== nextCacheKey) {
          cCtx.save();
          cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          cCtx.clearRect(0, 0, w, h);
          drawSceneToContext(cCtx, w, h, scale, palette, isDark, 1.0);
          cCtx.restore();
          cacheKeyRef.current = nextCacheKey;
        }
        ctx.drawImage(cacheCanvas, 0, 0, w, h);
      }

      const elapsed = animated ? (now - mountTime) / 1000 : 0;
      const boatAlpha = Math.max(0, Math.min(1, (overallPaintProg - 0.55) / 0.45));

      if (showBoat && boatAlpha > 0.02) {
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
        } else if (composition === 'layered_valley' || composition === 'dense_pine_sanctuary') {
          boatX = w * 0.52;
          boatY = h * 0.91;
          boatSize = 11.5 * scale;
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
          0.92 * boatAlpha
        );
      }

      ctx.restore();

      if (isPaintingNow || animated) {
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
    autoPaint,
    paintOnView,
    paintDuration,
    replayTrigger,
  ]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

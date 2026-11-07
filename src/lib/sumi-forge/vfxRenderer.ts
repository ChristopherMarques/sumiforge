import rough from 'roughjs';
import {
  createSeededRandom,
  recolorReferenceSheetData,
  sampleCubicCurve,
  samplePolarArc,
  sampleQuadraticCurve,
} from './math';
import {
  drawCentrifugalSplatters,
  drawDetachedSumiFlameWisp,
  drawFacetedRoughCrystal,
  drawFlamePetalTongue,
  drawFloatingSakuraPetal,
  drawHokusaiWaveCrest,
  drawSakuraBlossom,
  drawSolidOpaqueCoreSphere,
  drawSumiKasureRibbon,
  drawTarashikomiWashBlob,
  drawUkiyoeCloudBank,
  drawUkiyoeCloudScrollVolute,
} from './techniques';
import { VFXConfig } from './types';

/**
 * Renderiza um único quadro [0..15] no espaço canônico 128×128 multiplicado por scale = width / 128.
 * Segue a Cinética Não-Linear de Ataque (Sakuga Timing):
 * - Quadros 0..3 (frameNorm 0.00..0.20): Aceleração explosiva headReach = 1 - (1 - frameNorm)^3.4
 * - Quadros 4..6 (frameNorm 0.25..0.40): Ápice de impacto com núcleo branco e extensão máxima
 * - Quadros 7..15 (frameNorm 0.46..1.00): Erosão celular progressiva por FBM 2D + gotas centrífugas
 */
export function renderVFXFrame(
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  totalFrames: number,
  width: number,
  height: number,
  config: VFXConfig,
  transparentBg = false
) {
  const scale = width / 128;
  const frameNorm = totalFrames <= 1 ? 0.32 : frameIndex / (totalFrames - 1);
  const seed = config.seed;
  const pal = config.colors;

  ctx.save();
  if (!transparentBg) {
    if (config.bgMode === 'washi') {
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, width, height);
    } else if (config.bgMode === 'dark') {
      ctx.fillStyle = '#111113';
      ctx.fillRect(0, 0, width, height);
    }
  }

  let rc: ReturnType<typeof rough.canvas> | null = null;
  try {
    rc = rough.canvas(ctx.canvas);
  } catch {
    rc = null;
  }

  // Sakuga Timing Curves (Técnica #04)
  const headReach = Math.min(1, 1 - Math.pow(1 - frameNorm, 3.4));
  const tailRetract =
    frameNorm < 0.18 ? 0 : Math.pow((frameNorm - 0.18) / 0.82, 1.55) * 0.78;
  const erosionProgress =
    frameNorm < 0.25
      ? 0
      : Math.pow((frameNorm - 0.25) / 0.75, 1.25) * config.dynamics.erosionStrength;
  const apexFlash =
    frameNorm >= 0.18 && frameNorm <= 0.46
      ? Math.sin(((frameNorm - 0.18) / 0.28) * Math.PI)
      : 0;

  const rotRad = (config.brush.angle * Math.PI) / 180;
  const cx = 64 * scale;
  const cy = 64 * scale;

  // Aguada Atmosférica de Fundo (Tarashikomi: Técnica #09)
  if (config.dynamics.glowIntensity > 0.2 && erosionProgress < 0.88) {
    drawTarashikomiWashBlob(
      ctx,
      cx,
      cy,
      46 * scale * (0.7 + headReach * 0.35),
      38 * scale * (0.7 + headReach * 0.35),
      rotRad,
      pal.coreGlow,
      pal.energySecondary,
      Math.max(0.08, (1 - erosionProgress * 0.85) * 0.32 * config.dynamics.glowIntensity),
      seed + 11
    );
  }

  const arch = config.archetype;

  if (arch === 'hyb_slash_great_wave_katana' || arch === 'water_slash') {
    const startA = -Math.PI * 0.78 * config.brush.arcSweep + rotRad;
    const endA = Math.PI * 0.68 * config.brush.arcSweep + rotRad;
    const spine = samplePolarArc(
      cx,
      cy,
      43 * scale,
      36 * scale * config.brush.curvature,
      startA,
      endA,
      rotRad * 0.35,
      0.12,
      88,
      config.dynamics.jitterAmount,
      seed
    );

    // 1. Corpo de Nanquim Abissal (Kasure Multi-Cerdas)
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 24 * scale * config.brush.strokeThickness,
      bristleCount: config.brush.bristleCount,
      dryBrushGap: config.brush.dryBrushGap,
      taperStart: config.brush.taperStart,
      taperEnd: config.brush.taperEnd,
      color: pal.inkPrimary,
      headReach,
      tailRetract,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      hookWaves: config.dynamics.hookWaves,
      seed,
    });

    // 2. Crista de Onda Hokusai com 5 Correntes Listradas e Garras de Espuma (Técnica #06)
    const activeSlice = spine.filter(
      (pt) => pt.t >= tailRetract * 0.85 && pt.t <= headReach
    );
    if (activeSlice.length >= 6 && erosionProgress < 0.82) {
      drawHokusaiWaveCrest(
        ctx,
        rc,
        activeSlice.map((p, idx, arr) => ({ ...p, t: idx / Math.max(1, arr.length - 1) })),
        19 * scale * config.brush.strokeThickness * (1 - erosionProgress * 0.45),
        1,
        arch === 'hyb_slash_great_wave_katana' ? 6 : 4,
        config,
        scale,
        Math.max(0.2, 1 - erosionProgress * 0.65),
        seed + frameIndex * 7
      );
    }

    // 3. Núcleo Incandescente Branco no Ápice
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: (8 + apexFlash * 5) * scale * config.brush.strokeThickness,
      bristleCount: Math.max(6, Math.floor(config.brush.bristleCount * 0.45)),
      dryBrushGap: config.brush.dryBrushGap * 0.5,
      taperStart: 0.9,
      taperEnd: 0.95,
      color: pal.coreGlow,
      offsetNormal: 2.2 * scale * config.dynamics.colorOffset,
      headReach,
      tailRetract: Math.min(headReach, tailRetract + 0.08),
      erosionProgress: erosionProgress * 1.1,
      erosionScale: config.dynamics.erosionScale,
      seed: seed + 303,
    });

    drawCentrifugalSplatters(
      ctx,
      spine,
      frameNorm,
      config.dynamics.splatterCount,
      config.dynamics.splatterSpread,
      scale,
      pal,
      seed
    );
  } else if (arch === 'hyb_slash_crimson_phoenix_arc') {
    // S-Curve Odachi com Pétalas de Chama Suibokuga (Técnica #05)
    const spine = sampleCubicCurve(
      { x: 18 * scale, y: 104 * scale },
      { x: 24 * scale, y: 22 * scale * config.brush.curvature },
      { x: 104 * scale, y: 106 * scale * config.brush.curvature },
      { x: 110 * scale, y: 20 * scale },
      92,
      config.dynamics.jitterAmount,
      seed
    );

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 22 * scale * config.brush.strokeThickness,
      bristleCount: config.brush.bristleCount,
      dryBrushGap: config.brush.dryBrushGap,
      taperStart: config.brush.taperStart,
      taperEnd: config.brush.taperEnd,
      color: pal.inkPrimary,
      headReach,
      tailRetract,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      seed,
    });

    // Pétalas de Chama em S-Curve plantadas ao longo do arco ativo
    const petalCount = 7;
    for (let p = 0; p < petalCount; p++) {
      const u = (p + 0.5) / petalCount;
      if (u < tailRetract || u > headReach) continue;
      const idx = Math.min(spine.length - 1, Math.floor(u * (spine.length - 1)));
      const pt = spine[idx];
      const len = (22 + Math.sin(u * Math.PI) * 18) * scale * (1 - erosionProgress * 0.55);
      const ang = Math.atan2(pt.ny, pt.nx) - 0.45;
      const tipX = pt.x + Math.cos(ang) * len;
      const tipY = pt.y + Math.sin(ang) * len;

      drawFlamePetalTongue(ctx, rc, config, scale, {
        rootX: pt.x,
        rootY: pt.y,
        ctrl1X: pt.x + Math.cos(ang - 0.5) * len * 0.42,
        ctrl1Y: pt.y + Math.sin(ang - 0.5) * len * 0.42,
        ctrl2X: pt.x + Math.cos(ang + 0.48) * len * 0.76,
        ctrl2Y: pt.y + Math.sin(ang + 0.48) * len * 0.76,
        tipX,
        tipY,
        maxBellyWidth: 14 * scale * config.brush.strokeThickness,
        striationCount: 5,
        alpha: Math.max(0.2, 1 - erosionProgress * 0.65),
        seed: seed + p * 67,
      });

      if (p % 2 === 0 && erosionProgress < 0.7) {
        drawDetachedSumiFlameWisp(
          ctx,
          tipX,
          tipY,
          tipX + Math.cos(ang - 0.2) * 14 * scale,
          tipY + Math.sin(ang - 0.2) * 14 * scale,
          3.2 * scale,
          pal.energySecondary,
          seed + p * 131
        );
      }
    }

    drawCentrifugalSplatters(
      ctx,
      spine,
      frameNorm,
      config.dynamics.splatterCount,
      config.dynamics.splatterSpread,
      scale,
      pal,
      seed
    );
  } else if (arch === 'sakura_tempest_slash') {
    // Golpe Caligráfico com Flores de Cerejeira e Pétalas ao Vento
    const spine = samplePolarArc(
      cx,
      cy,
      44 * scale,
      34 * scale * config.brush.curvature,
      -Math.PI * 0.85 + rotRad,
      Math.PI * 0.75 + rotRad,
      -0.25,
      -0.15,
      92,
      config.dynamics.jitterAmount,
      seed
    );

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 21 * scale * config.brush.strokeThickness,
      bristleCount: config.brush.bristleCount,
      dryBrushGap: config.brush.dryBrushGap,
      taperStart: config.brush.taperStart,
      taperEnd: config.brush.taperEnd,
      color: pal.inkPrimary,
      headReach,
      tailRetract,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      seed,
    });

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 9 * scale * config.brush.strokeThickness,
      bristleCount: Math.max(8, Math.floor(config.brush.bristleCount * 0.5)),
      dryBrushGap: config.brush.dryBrushGap * 0.7,
      taperStart: 0.8,
      taperEnd: 0.9,
      color: pal.energySecondary,
      offsetNormal: 3.5 * scale,
      headReach,
      tailRetract,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      seed: seed + 77,
    });

    const rand = createSeededRandom(seed + 409);
    const blossomCount = 9;
    for (let b = 0; b < blossomCount; b++) {
      const tPos = (b + 0.4) / blossomCount;
      if (tPos > headReach) continue;
      const idx = Math.min(spine.length - 1, Math.floor(tPos * (spine.length - 1)));
      const pt = spine[idx];
      const drift = Math.max(0, frameNorm - tPos * 0.35) * 18 * scale;
      const bx = pt.x + pt.nx * ((rand() - 0.35) * 18 * scale + drift);
      const by = pt.y + pt.ny * ((rand() - 0.35) * 18 * scale - drift * 0.4);
      const flowerScale = (5.5 + (b % 3) * 2.5) * scale * (1 - erosionProgress * 0.35);

      if (b % 2 === 0) {
        drawSakuraBlossom(
          ctx,
          bx,
          by,
          flowerScale,
          frameNorm * 1.8 + b,
          pal.energySecondary,
          pal.coreGlow,
          pal.inkPrimary,
          Math.max(0.2, 1 - erosionProgress * 0.5),
          seed + b * 43
        );
      } else {
        drawFloatingSakuraPetal(
          ctx,
          bx,
          by,
          flowerScale * 1.1,
          frameNorm * 3.2 + b,
          0.45 + 0.5 * Math.abs(Math.cos(frameNorm * 4 + b)),
          pal.energySecondary,
          Math.max(0.25, 1 - erosionProgress * 0.4)
        );
      }
    }
  } else if (arch === 'enso_sigil') {
    // Círculo Zen Ensō Caligráfico (310° a 340° de varredura com fenda orgânica)
    const sweep = Math.PI * 1.82 * config.brush.arcSweep;
    const spine = samplePolarArc(
      cx,
      cy,
      41 * scale,
      40 * scale * config.brush.curvature,
      -Math.PI * 0.85 + rotRad + frameNorm * 0.25,
      -Math.PI * 0.85 + sweep + rotRad + frameNorm * 0.25,
      0,
      -0.06,
      96,
      config.dynamics.jitterAmount * 0.7,
      seed
    );

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 22 * scale * config.brush.strokeThickness,
      bristleCount: config.brush.bristleCount,
      dryBrushGap: Math.max(0.25, config.brush.dryBrushGap),
      taperStart: 0.85,
      taperEnd: 0.98,
      color: pal.inkPrimary,
      headReach,
      tailRetract: tailRetract * 0.45,
      erosionProgress: erosionProgress * 0.85,
      erosionScale: config.dynamics.erosionScale,
      roundHeadCap: true,
      seed,
    });

    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 10 * scale * config.brush.strokeThickness,
      bristleCount: Math.max(8, Math.floor(config.brush.bristleCount * 0.55)),
      dryBrushGap: config.brush.dryBrushGap,
      taperStart: 0.85,
      taperEnd: 0.98,
      color: pal.energySecondary,
      offsetNormal: 2.8 * scale * config.dynamics.colorOffset,
      headReach,
      tailRetract: tailRetract * 0.55,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      seed: seed + 149,
    });

    drawCentrifugalSplatters(
      ctx,
      spine,
      frameNorm,
      config.dynamics.splatterCount,
      config.dynamics.splatterSpread,
      scale,
      pal,
      seed
    );
  } else if (arch === 'elem_fire_meteor_bolide') {
    // Técnica #08: Bólido Meteoro de Magma com Oclusão Real em 3 Camadas
    const travel = Math.min(1, frameNorm * 1.25);
    const headX = (24 + travel * 68) * scale;
    const headY = (24 + travel * 68) * scale;
    const tailX = (10 + travel * 18) * scale;
    const tailY = (10 + travel * 18) * scale;
    const dirAngle = Math.atan2(headY - tailY, headX - tailX);
    const coreR = (16 - erosionProgress * 4) * scale * config.brush.strokeThickness;

    // Passo 1: Cauda Traseira de Pétalas S-Curve (nasce dentro de headX, headY)
    for (let t = 0; t < 4; t++) {
      const spread = (t - 1.5) * 14 * scale;
      drawFlamePetalTongue(ctx, rc, config, scale, {
        rootX: headX,
        rootY: headY,
        ctrl1X: (headX + tailX) * 0.55 + spread,
        ctrl1Y: (headY + tailY) * 0.55 - spread,
        ctrl2X: (headX + tailX) * 0.3 - spread * 0.8,
        ctrl2Y: (headY + tailY) * 0.3 + spread * 0.8,
        tipX: tailX + (t - 1.5) * 8 * scale,
        tipY: tailY - (t - 1.5) * 8 * scale,
        maxBellyWidth: 18 * scale * config.brush.strokeThickness,
        striationCount: 5,
        alpha: Math.max(0.25, 1 - erosionProgress * 0.6),
        seed: seed + t * 53,
      });
    }

    // Passo 2: Núcleo Sólido 100% Opaco (oclui totalmente as raízes da cauda!)
    if (frameNorm < 0.85) {
      drawSolidOpaqueCoreSphere(
        ctx,
        rc,
        headX,
        headY,
        coreR * 1.12,
        coreR * 0.94,
        dirAngle,
        0.24,
        config,
        scale,
        seed + frameIndex * 13
      );

      // Passo 3: Línguas Envolventes (Wrapping Tongues) abraçando a esfera
      for (const side of [-1, 1] as const) {
        const anchorAng = dirAngle + side * Math.PI * 0.42;
        const rx = headX + Math.cos(anchorAng) * coreR * 0.72;
        const ry = headY + Math.sin(anchorAng) * coreR * 0.72;
        const backAng = dirAngle + Math.PI + side * 0.28;
        drawFlamePetalTongue(ctx, rc, config, scale, {
          rootX: rx,
          rootY: ry,
          ctrl1X: rx + Math.cos(anchorAng) * 10 * scale,
          ctrl1Y: ry + Math.sin(anchorAng) * 10 * scale,
          ctrl2X: rx + Math.cos(backAng) * 22 * scale,
          ctrl2Y: ry + Math.sin(backAng) * 22 * scale,
          tipX: rx + Math.cos(backAng) * 34 * scale,
          tipY: ry + Math.sin(backAng) * 34 * scale,
          maxBellyWidth: 9.5 * scale,
          striationCount: 3,
          alpha: 0.96,
          seed: seed + (side > 0 ? 311 : 419),
        });
      }
    }

    // Transição para Nuvens Kumo no impacto (frames finais)
    if (frameNorm > 0.55) {
      drawUkiyoeCloudBank(
        ctx,
        rc,
        headX,
        headY,
        46 * scale * ((frameNorm - 0.5) * 1.8),
        4,
        config,
        scale,
        Math.min(0.95, (frameNorm - 0.5) * 1.9),
        seed + 701
      );
    }
  } else if (arch === 'elem_water_glacial_spikes') {
    // Técnica #10: Cristais Glaciais Chanfrados com Rough.js
    const spikeCount = 6;
    const growth =
      frameNorm < 0.28
        ? Math.min(1.12, Math.pow(frameNorm / 0.28, 0.65) * 1.12)
        : Math.max(0.15, 1 - Math.max(0, frameNorm - 0.65) * 2.1);

    for (let s = 0; s < spikeCount; s++) {
      const u = (s / (spikeCount - 1)) * 2 - 1;
      const ang = -Math.PI * 0.5 + u * 0.68 + rotRad * 0.3;
      const len = (56 - Math.abs(u) * 22) * scale * growth * config.brush.strokeThickness;
      const w = (16 - Math.abs(u) * 4) * scale * config.brush.strokeThickness;
      drawFacetedRoughCrystal(
        ctx,
        rc,
        cx + u * 16 * scale,
        104 * scale,
        ang,
        len,
        w,
        config,
        scale,
        seed + s * 97
      );
    }

    drawUkiyoeCloudBank(
      ctx,
      rc,
      cx,
      104 * scale,
      68 * scale,
      4,
      config,
      scale,
      Math.max(0.25, 1 - erosionProgress * 0.7),
      seed + 503
    );
  } else if (arch === 'solid_ref_fumaca') {
    // Técnica #07: Bancos de Nuvens & Fumaça Ukiyo-e (Kumo) em C-Hook
    const expand = 0.65 + headReach * 0.55;
    for (let v = 0; v < 5; v++) {
      const ang = (v / 5) * Math.PI * 2 + frameNorm * 0.55 + rotRad;
      const dist = (14 + frameNorm * 24) * scale;
      const sx = cx + Math.cos(ang) * dist * 0.35;
      const sy = cy + Math.sin(ang) * dist * 0.35;
      const ex = cx + Math.cos(ang + 0.55) * (36 * scale * expand);
      const ey = cy + Math.sin(ang + 0.55) * (36 * scale * expand);

      drawUkiyoeCloudScrollVolute(ctx, rc, config, scale, {
        startX: sx,
        startY: sy,
        endX: ex,
        endY: ey,
        maxThickness: 20 * scale * config.brush.strokeThickness * (1 - erosionProgress * 0.45),
        lobeCount: 3,
        flip: v % 2 === 0 ? 1 : -1,
        alpha: Math.max(0.2, 1 - erosionProgress * 0.65),
        seed: seed + v * 113,
      });
    }
  } else if (arch === 'elem_water_healing_fountain') {
    // Técnica #09: Aguada Tarashikomi + Fitas Ascendentes S-Curve
    drawTarashikomiWashBlob(
      ctx,
      cx,
      82 * scale,
      44 * scale,
      26 * scale,
      0,
      pal.coreGlow,
      pal.energySecondary,
      0.75 * (1 - erosionProgress * 0.5),
      seed + 31
    );

    for (let h = 0; h < 3; h++) {
      const phase = (h * Math.PI * 2) / 3 + frameNorm * Math.PI * 1.4;
      const spine = sampleCubicCurve(
        { x: cx + Math.sin(phase) * 20 * scale, y: 106 * scale },
        { x: cx - Math.sin(phase) * 32 * scale, y: 74 * scale },
        { x: cx + Math.sin(phase) * 28 * scale, y: 42 * scale },
        { x: cx - Math.sin(phase) * 14 * scale, y: 16 * scale },
        64,
        config.dynamics.jitterAmount * 0.4,
        seed + h * 71
      );
      drawSumiKasureRibbon(ctx, {
        spine,
        maxWidth: 13 * scale * config.brush.strokeThickness,
        bristleCount: 14,
        dryBrushGap: config.brush.dryBrushGap,
        taperStart: 0.7,
        taperEnd: 0.95,
        color: h === 0 ? pal.inkPrimary : h === 1 ? pal.energySecondary : pal.coreGlow,
        headReach,
        tailRetract: tailRetract * 0.7,
        erosionProgress,
        erosionScale: config.dynamics.erosionScale,
        seed: seed + h * 89,
      });
    }
  } else if (arch === 'portal_abyssal_vortex') {
    // Vórtice Espiral Logarítmico com Núcleo Abissal Oclusivo
    const arms = 3;
    for (let a = 0; a < arms; a++) {
      const baseA = (a / arms) * Math.PI * 2 + frameNorm * Math.PI * 1.5 + rotRad;
      const spine = samplePolarArc(
        cx,
        cy,
        45 * scale,
        42 * scale * config.brush.curvature,
        baseA,
        baseA + Math.PI * 1.45,
        0,
        -0.52,
        76,
        config.dynamics.jitterAmount * 0.5,
        seed + a * 61
      );
      drawSumiKasureRibbon(ctx, {
        spine,
        maxWidth: 16 * scale * config.brush.strokeThickness,
        bristleCount: Math.max(10, Math.floor(config.brush.bristleCount * 0.7)),
        dryBrushGap: config.brush.dryBrushGap,
        taperStart: 0.6,
        taperEnd: 0.95,
        color: a % 2 === 0 ? pal.energySecondary : pal.inkPrimary,
        headReach,
        tailRetract: tailRetract * 0.4,
        erosionProgress: erosionProgress * 0.75,
        erosionScale: config.dynamics.erosionScale,
        seed: seed + a * 107,
      });
    }

    // Olho Abissal Oclusivo no Centro
    ctx.beginPath();
    ctx.arc(cx, cy, 13 * scale * (1 - erosionProgress * 0.35), 0, Math.PI * 2);
    ctx.fillStyle = pal.inkPrimary;
    ctx.fill();
    ctx.strokeStyle = pal.coreGlow;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  } else {
    // Default / Crescent / Blood Moon Scythe (Técnicas #02, #03, #04)
    const isScythe = arch === 'hyb_slash_blood_moon_scythe';
    const sweepSpan = (isScythe ? Math.PI * 1.52 : Math.PI * 1.18) * config.brush.arcSweep;
    const spine = samplePolarArc(
      cx,
      cy,
      44 * scale,
      (isScythe ? 42 : 34) * scale * config.brush.curvature,
      -sweepSpan * 0.55 + rotRad,
      sweepSpan * 0.55 + rotRad,
      0.22,
      isScythe ? -0.18 : 0.08,
      96,
      config.dynamics.jitterAmount,
      seed
    );

    // Canal 1: Corpo de Nanquim Abissal
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: (isScythe ? 28 : 23) * scale * config.brush.strokeThickness,
      bristleCount: config.brush.bristleCount,
      dryBrushGap: config.brush.dryBrushGap,
      taperStart: config.brush.taperStart,
      taperEnd: config.brush.taperEnd,
      color: pal.inkPrimary,
      headReach,
      tailRetract,
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      hookWaves: config.dynamics.hookWaves,
      roundHeadCap: true,
      seed,
    });

    // Canal 2: Crista de Energia Elemental Deslocada pela Normal
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: 14 * scale * config.brush.strokeThickness,
      bristleCount: Math.max(8, Math.floor(config.brush.bristleCount * 0.68)),
      dryBrushGap: config.brush.dryBrushGap * 0.85,
      taperStart: config.brush.taperStart,
      taperEnd: config.brush.taperEnd,
      color: pal.energySecondary,
      offsetNormal: 3.2 * scale * config.dynamics.colorOffset,
      headReach,
      tailRetract: Math.min(headReach, tailRetract + 0.04),
      erosionProgress,
      erosionScale: config.dynamics.erosionScale,
      hookWaves: config.dynamics.hookWaves,
      roundHeadCap: false,
      seed: seed + 199,
    });

    // Canal 3: Núcleo Incandescente Branco no Ápice
    drawSumiKasureRibbon(ctx, {
      spine,
      maxWidth: (6.5 + apexFlash * 4.5) * scale * config.brush.strokeThickness,
      bristleCount: Math.max(5, Math.floor(config.brush.bristleCount * 0.38)),
      dryBrushGap: config.brush.dryBrushGap * 0.5,
      taperStart: 0.9,
      taperEnd: 0.95,
      color: pal.coreGlow,
      offsetNormal: 1.8 * scale * config.dynamics.colorOffset,
      headReach,
      tailRetract: Math.min(headReach, tailRetract + 0.09),
      erosionProgress: erosionProgress * 1.15,
      erosionScale: config.dynamics.erosionScale,
      roundHeadCap: false,
      seed: seed + 397,
    });

    drawCentrifugalSplatters(
      ctx,
      spine,
      frameNorm,
      config.dynamics.splatterCount,
      config.dynamics.splatterSpread,
      scale,
      pal,
      seed
    );
  }

  // Isolamento ou máscara de 3 canais (Técnica #11)
  if (config.channelMode !== 'composite') {
    const imgData = ctx.getImageData(0, 0, width, height);
    const processed = recolorReferenceSheetData(imgData, config);
    ctx.putImageData(processed, 0, 0);
  }

  ctx.restore();
}

/**
 * Técnica #12: Pipeline de Composição de Sprite Sheet 4×4 com Isolamento Estrito por Célula (ctx.clip)
 */
export function renderCompleteSpriteSheet(
  canvas: HTMLCanvasElement,
  config: VFXConfig,
  columns = 4
) {
  const rows = Math.ceil(config.totalFrames / columns);
  const fSize = config.frameSize;
  canvas.width = fSize * columns;
  canvas.height = fSize * rows;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < config.totalFrames; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    ctx.save();
    ctx.beginPath();
    ctx.rect(col * fSize, row * fSize, fSize, fSize);
    ctx.clip();
    ctx.translate(col * fSize, row * fSize);
    renderVFXFrame(ctx, i, config.totalFrames, fSize, fSize, config, true);
    ctx.restore();
  }
}

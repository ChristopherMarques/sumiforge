import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';
import { samplePolarArc, sampleQuadraticCurve } from '../math';
import { drawSumiKasureRibbon } from '../techniques';

export type SumiIconName =
  | 'logo'
  | 'brush'
  | 'katana'
  | 'sakura'
  | 'koi'
  | 'mountain'
  | 'scroll'
  | 'play'
  | 'pause'
  | 'replay'
  | 'copy'
  | 'check'
  | 'download'
  | 'upload'
  | 'undo'
  | 'trash'
  | 'eye'
  | 'layers'
  | 'sliders'
  | 'chevron-down'
  | 'close'
  | 'terminal';

export interface SumiIconProps {
  name: SumiIconName;
  size?: number;
  color?: string;
  accentColor?: string;
  seed?: number;
  className?: string;
}

/**
 * Componente <SumiIcon /> — Desenha todos os ícones da interface em nanquim monocromático
 * nítido usando Rough.js (preserveVertices: true), mantendo estética orgânica de traço à mão
 * com leitura imediata.
 */
export const SumiIcon: React.FC<SumiIconProps> = ({
  name,
  size = 22,
  color = '#11100E',
  seed = 101,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectiveSize = Math.max(20, size);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    canvas.width = effectiveSize * dpr;
    canvas.height = effectiveSize * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resolvedColor = color;
    if (color === 'currentColor' && canvas.parentElement) {
      resolvedColor = window.getComputedStyle(canvas.parentElement).color || '#11100E';
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, effectiveSize, effectiveSize);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rc = rough.canvas(canvas);
    const s = effectiveSize / 24;

    const opts = {
      stroke: resolvedColor,
      strokeWidth: Math.max(1.85, 2.0 * s),
      roughness: 0.22,
      bowing: 0.25,
      preserveVertices: true,
      disableMultiStroke: false,
      seed,
    };

    const solidOpts = {
      ...opts,
      fill: resolvedColor,
      fillStyle: 'solid' as const,
    };

    if (name === 'logo') {
      const enso = samplePolarArc(
        12 * s,
        12 * s,
        9.2 * s,
        9.0 * s,
        -Math.PI * 0.78,
        Math.PI * 1.05,
        0,
        0,
        36,
        0.08,
        seed
      );
      drawSumiKasureRibbon(ctx, {
        spine: enso,
        maxWidth: 3.4 * s,
        bristleCount: 10,
        dryBrushGap: 0.22,
        taperStart: 0.7,
        taperEnd: 0.98,
        color: resolvedColor,
        alpha: 0.95,
        roundHeadCap: true,
        seed,
      });
    } else if (name === 'brush') {
      // Pincel Caligráfico todo em nanquim: cabo cônico, anel de virola e cerdas curvas bem definidas
      rc.polygon(
        [
          [20.2 * s, 2.5 * s],
          [21.5 * s, 3.8 * s],
          [13.4 * s, 12.6 * s],
          [11.4 * s, 10.6 * s],
        ],
        solidOpts
      );
      // Virola / anel separador
      rc.line(9.8 * s, 11.2 * s, 12.8 * s, 14.2 * s, {
        ...opts,
        strokeWidth: Math.max(2.1, 2.3 * s),
      });
      // Tufo de cerdas com curvatura caligráfica na ponta e ranhuras de cerdas
      rc.curve(
        [
          [9.6 * s, 11.8 * s],
          [6.0 * s, 14.2 * s],
          [4.2 * s, 18.2 * s],
          [2.5 * s, 21.2 * s],
        ],
        opts
      );
      rc.curve(
        [
          [12.2 * s, 14.4 * s],
          [10.2 * s, 18.2 * s],
          [6.8 * s, 20.4 * s],
          [2.5 * s, 21.2 * s],
        ],
        opts
      );
      rc.curve(
        [
          [10.9 * s, 13.1 * s],
          [8.0 * s, 16.5 * s],
          [5.2 * s, 19.2 * s],
          [2.5 * s, 21.2 * s],
        ],
        { ...opts, strokeWidth: Math.max(1.3, 1.45 * s) }
      );
    } else if (name === 'katana') {
      rc.curve(
        [
          [7.5 * s, 16.5 * s],
          [14.0 * s, 9.5 * s],
          [21.0 * s, 3.0 * s],
        ],
        { ...opts, strokeWidth: Math.max(2.2, 2.4 * s) }
      );
      rc.line(6.0 * s, 13.5 * s, 10.5 * s, 18.0 * s, {
        ...opts,
        strokeWidth: Math.max(2.3, 2.5 * s),
      });
      rc.line(3.0 * s, 21.0 * s, 7.5 * s, 16.5 * s, {
        ...opts,
        strokeWidth: Math.max(2.4, 2.6 * s),
      });
    } else if (name === 'sakura') {
      // Flor de Sakura de 5 pétalas desenhada com Rough.js em nanquim nítido
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = 12 * s + Math.cos(ang) * 6.2 * s;
        const py = 12 * s + Math.sin(ang) * 6.2 * s;
        rc.circle(px, py, 6.2 * s, opts);
      }
      rc.circle(12 * s, 12 * s, 3.2 * s, solidOpts);
    } else if (name === 'koi') {
      rc.curve(
        [
          [3.5 * s, 14.5 * s],
          [8.0 * s, 6.5 * s],
          [15.5 * s, 7.5 * s],
          [19.0 * s, 12.0 * s],
        ],
        opts
      );
      rc.curve(
        [
          [3.5 * s, 14.5 * s],
          [9.5 * s, 16.0 * s],
          [15.0 * s, 14.2 * s],
          [19.0 * s, 12.0 * s],
        ],
        opts
      );
      rc.circle(8.2 * s, 11.2 * s, 3.2 * s, solidOpts);
      rc.polygon(
        [
          [18.5 * s, 12.0 * s],
          [22.0 * s, 8.0 * s],
          [20.6 * s, 12.0 * s],
          [22.0 * s, 16.0 * s],
        ],
        solidOpts
      );
    } else if (name === 'mountain') {
      rc.circle(17.5 * s, 6.5 * s, 5.2 * s, opts);
      rc.polygon(
        [
          [2.0 * s, 19.5 * s],
          [8.8 * s, 7.5 * s],
          [13.2 * s, 7.5 * s],
          [20.5 * s, 19.5 * s],
        ],
        opts
      );
      rc.linearPath(
        [
          [6.8 * s, 11.5 * s],
          [9.5 * s, 10.5 * s],
          [11.0 * s, 12.0 * s],
          [12.5 * s, 10.5 * s],
          [15.2 * s, 11.5 * s],
        ],
        opts
      );
    } else if (name === 'scroll') {
      rc.rectangle(5.5 * s, 4.0 * s, 13.0 * s, 16.0 * s, opts);
      rc.line(4.0 * s, 4.0 * s, 20.0 * s, 4.0 * s, {
        ...opts,
        strokeWidth: Math.max(2.2, 2.4 * s),
      });
      rc.line(4.0 * s, 20.0 * s, 20.0 * s, 20.0 * s, {
        ...opts,
        strokeWidth: Math.max(2.2, 2.4 * s),
      });
      rc.line(8.5 * s, 9.0 * s, 15.5 * s, 9.0 * s, opts);
      rc.line(8.5 * s, 13.0 * s, 15.5 * s, 13.0 * s, opts);
    } else if (name === 'play') {
      rc.polygon(
        [
          [6.5 * s, 4.5 * s],
          [19.5 * s, 12.0 * s],
          [6.5 * s, 19.5 * s],
        ],
        solidOpts
      );
    } else if (name === 'pause') {
      rc.rectangle(6.0 * s, 4.5 * s, 4.2 * s, 15.0 * s, solidOpts);
      rc.rectangle(13.8 * s, 4.5 * s, 4.2 * s, 15.0 * s, solidOpts);
    } else if (name === 'replay') {
      rc.arc(12 * s, 12.5 * s, 14.5 * s, 14.5 * s, 0.25, Math.PI * 1.65, false, opts);
      rc.polygon(
        [
          [15.5 * s, 3.0 * s],
          [21.0 * s, 6.2 * s],
          [15.2 * s, 9.5 * s],
        ],
        solidOpts
      );
    } else if (name === 'copy') {
      rc.rectangle(8.5 * s, 8.5 * s, 11.5 * s, 11.5 * s, opts);
      rc.linearPath(
        [
          [15.5 * s, 8.5 * s],
          [15.5 * s, 4.5 * s],
          [4.5 * s, 4.5 * s],
          [4.5 * s, 15.5 * s],
          [8.5 * s, 15.5 * s],
        ],
        opts
      );
    } else if (name === 'check') {
      rc.linearPath(
        [
          [4.0 * s, 12.5 * s],
          [9.5 * s, 18.0 * s],
          [20.0 * s, 6.0 * s],
        ],
        { ...opts, strokeWidth: Math.max(2.4, 2.7 * s) }
      );
    } else if (name === 'download') {
      rc.line(12 * s, 3.5 * s, 12 * s, 15.0 * s, opts);
      rc.linearPath(
        [
          [7.0 * s, 10.5 * s],
          [12.0 * s, 15.8 * s],
          [17.0 * s, 10.5 * s],
        ],
        opts
      );
      rc.line(4.5 * s, 20.0 * s, 19.5 * s, 20.0 * s, {
        ...opts,
        strokeWidth: Math.max(2.2, 2.4 * s),
      });
    } else if (name === 'upload') {
      rc.line(12 * s, 16.0 * s, 12 * s, 4.5 * s, opts);
      rc.linearPath(
        [
          [7.0 * s, 9.5 * s],
          [12.0 * s, 4.2 * s],
          [17.0 * s, 9.5 * s],
        ],
        opts
      );
      rc.line(4.5 * s, 20.0 * s, 19.5 * s, 20.0 * s, {
        ...opts,
        strokeWidth: Math.max(2.2, 2.4 * s),
      });
    } else if (name === 'undo') {
      rc.linearPath(
        [
          [9.5 * s, 5.0 * s],
          [4.5 * s, 9.5 * s],
          [9.5 * s, 14.0 * s],
        ],
        opts
      );
      rc.curve(
        [
          [5.0 * s, 9.5 * s],
          [15.0 * s, 9.0 * s],
          [19.5 * s, 13.5 * s],
          [16.0 * s, 19.5 * s],
        ],
        opts
      );
    } else if (name === 'trash') {
      rc.line(4.0 * s, 6.5 * s, 20.0 * s, 6.5 * s, opts);
      rc.line(9.5 * s, 3.8 * s, 14.5 * s, 3.8 * s, opts);
      rc.rectangle(6.5 * s, 6.8 * s, 11.0 * s, 13.2 * s, opts);
      rc.line(10.2 * s, 10.5 * s, 10.2 * s, 16.5 * s, opts);
      rc.line(13.8 * s, 10.5 * s, 13.8 * s, 16.5 * s, opts);
    } else if (name === 'eye') {
      rc.curve(
        [
          [2.0 * s, 12.0 * s],
          [12.0 * s, 4.8 * s],
          [22.0 * s, 12.0 * s],
        ],
        opts
      );
      rc.curve(
        [
          [2.0 * s, 12.0 * s],
          [12.0 * s, 19.2 * s],
          [22.0 * s, 12.0 * s],
        ],
        opts
      );
      rc.circle(12.0 * s, 12.0 * s, 5.4 * s, solidOpts);
    } else if (name === 'layers') {
      rc.polygon(
        [
          [12.0 * s, 3.2 * s],
          [21.0 * s, 8.0 * s],
          [12.0 * s, 12.8 * s],
          [3.0 * s, 8.0 * s],
        ],
        opts
      );
      rc.linearPath(
        [
          [3.0 * s, 12.8 * s],
          [12.0 * s, 17.2 * s],
          [21.0 * s, 12.8 * s],
        ],
        opts
      );
      rc.linearPath(
        [
          [3.0 * s, 16.8 * s],
          [12.0 * s, 21.2 * s],
          [21.0 * s, 16.8 * s],
        ],
        opts
      );
    } else if (name === 'sliders') {
      rc.line(3.5 * s, 7.0 * s, 20.5 * s, 7.0 * s, opts);
      rc.circle(9.0 * s, 7.0 * s, 5.2 * s, solidOpts);
      rc.line(3.5 * s, 16.5 * s, 20.5 * s, 16.5 * s, opts);
      rc.circle(15.5 * s, 16.5 * s, 5.2 * s, solidOpts);
    } else if (name === 'chevron-down') {
      rc.linearPath(
        [
          [5.0 * s, 8.5 * s],
          [12.0 * s, 15.8 * s],
          [19.0 * s, 8.5 * s],
        ],
        { ...opts, strokeWidth: Math.max(2.1, 2.3 * s) }
      );
    } else if (name === 'close') {
      rc.line(5.5 * s, 5.5 * s, 18.5 * s, 18.5 * s, opts);
      rc.line(18.5 * s, 5.5 * s, 5.5 * s, 18.5 * s, opts);
    } else if (name === 'terminal') {
      rc.linearPath(
        [
          [4.0 * s, 6.5 * s],
          [10.5 * s, 12.0 * s],
          [4.0 * s, 17.5 * s],
        ],
        { ...opts, strokeWidth: Math.max(2.2, 2.4 * s) }
      );
      rc.line(12.0 * s, 17.5 * s, 20.0 * s, 17.5 * s, {
        ...opts,
        strokeWidth: Math.max(2.2, 2.4 * s),
      });
    }

    ctx.restore();
  }, [name, effectiveSize, color, seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: effectiveSize, height: effectiveSize }}
      className={`inline-block shrink-0 pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};

export interface SumiBrandEmblemProps {
  size?: number;
  className?: string;
}

/**
 * Emblema Japonês Pintado (<SumiBrandEmblem />) — Pinta o círculo Ensō em nanquim,
 * o sol carmesim e o ideograma 墨 (Sumi: Nanquim) à mão usando as técnicas da biblioteca.
 */
export const SumiBrandEmblem: React.FC<SumiBrandEmblemProps> = ({
  size = 36,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const s = size / 40;
    const rc = rough.canvas(canvas);

    // 1. Disco Solar Carmesim Descentralizado
    rc.circle(25.5 * s, 14.5 * s, 14.5 * s, {
      stroke: '#C8232C',
      fill: '#C8232C',
      fillStyle: 'solid',
      roughness: 0.25,
      preserveVertices: true,
      seed: 77,
    });

    // 2. Círculo Zen Ensō Caligráfico em Nanquim
    const ensoSpine = samplePolarArc(
      20 * s,
      20 * s,
      15.5 * s,
      15.2 * s,
      -Math.PI * 0.82,
      Math.PI * 0.98,
      0,
      -0.05,
      54,
      0.08,
      8472
    );

    drawSumiKasureRibbon(ctx, {
      spine: ensoSpine,
      maxWidth: 4.8 * s,
      bristleCount: 14,
      dryBrushGap: 0.22,
      taperStart: 0.65,
      taperEnd: 0.98,
      color: '#11100E',
      alpha: 0.96,
      roundHeadCap: true,
      seed: 8472,
    });

    // 3. Traço Caligráfico sob o Kanji
    const baseStroke = sampleQuadraticCurve(
      { x: 10 * s, y: 29 * s },
      { x: 20 * s, y: 27 * s },
      { x: 31 * s, y: 28.5 * s },
      24,
      0.04,
      99
    );
    drawSumiKasureRibbon(ctx, {
      spine: baseStroke,
      maxWidth: 2.6 * s,
      bristleCount: 8,
      dryBrushGap: 0.18,
      taperStart: 0.3,
      taperEnd: 0.9,
      color: '#C8232C',
      alpha: 0.9,
      roundHeadCap: true,
      seed: 99,
    });

    // 4. Ideograma Japonês 墨 (Sumi: Nanquim)
    ctx.font = `700 ${Math.round(17.5 * s)}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#11100E';
    ctx.fillText('墨', 19.5 * s, 19.5 * s);

    ctx.restore();
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};

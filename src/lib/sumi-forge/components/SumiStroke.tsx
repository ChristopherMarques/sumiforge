import React, { useEffect, useRef } from 'react';
import { sampleCubicCurve, samplePolarArc, sampleQuadraticCurve } from '../math';
import { drawSakuraBlossom, drawSumiKasureRibbon } from '../techniques';

export interface SumiStrokeProps {
  /** Estilo da pincelada decorativa ou divisor de seção */
  variant?: 'horizontal_kasure' | 's_curve_flourish' | 'enso_seal' | 'sakura_branch_divider';
  /** Cor primária do nanquim */
  inkColor?: string;
  /** Cor secundária de acento (ex: vermelho Sakura / Hanko) */
  accentColor?: string;
  /** Quantidade de cerdas */
  bristleCount?: number;
  /** Falha de pincel seco Kasure */
  dryBrushGap?: number;
  /** Espessura máxima em pixels */
  thickness?: number;
  /** Semente determinística */
  seed?: number;
  /** Anima a pincelada ao montar */
  animateOnMount?: boolean;
  className?: string;
}

/**
 * Componente <SumiStroke />: Pincelada caligráfica declarativa para divisores de seção,
 * sublinhados editoriais, selos Ensō e ramos ornamentais de Sakura.
 */
export const SumiStroke: React.FC<SumiStrokeProps> = ({
  variant = 'horizontal_kasure',
  inkColor = '#141413',
  accentColor = '#C8232C',
  bristleCount = 18,
  dryBrushGap = 0.36,
  thickness = 14,
  seed = 4096,
  animateOnMount = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(120, Math.floor(rect.width));
      const h = Math.max(28, Math.floor(rect.height));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const prog = animateOnMount ? Math.min(1, (now - start) / 950) : 1;
      const headReach = 1 - Math.pow(1 - prog, 3.2);

      if (variant === 'enso_seal') {
        const r = Math.min(w, h) * 0.38;
        const spine = samplePolarArc(
          w * 0.5,
          h * 0.5,
          r,
          r * 0.96,
          -Math.PI * 0.8,
          Math.PI * 0.95,
          0,
          -0.05,
          72,
          0.12,
          seed
        );
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: thickness,
          bristleCount,
          dryBrushGap,
          taperStart: 0.85,
          taperEnd: 0.98,
          color: inkColor,
          headReach,
          seed,
        });
      } else if (variant === 's_curve_flourish') {
        const spine = sampleCubicCurve(
          { x: 12, y: h * 0.65 },
          { x: w * 0.32, y: h * 0.15 },
          { x: w * 0.68, y: h * 0.85 },
          { x: w - 12, y: h * 0.35 },
          72,
          0.12,
          seed
        );
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: thickness,
          bristleCount,
          dryBrushGap,
          taperStart: 0.75,
          taperEnd: 0.95,
          color: inkColor,
          headReach,
          seed,
        });
      } else if (variant === 'sakura_branch_divider') {
        const spine = sampleCubicCurve(
          { x: 8, y: h * 0.58 },
          { x: w * 0.35, y: h * 0.32 },
          { x: w * 0.65, y: h * 0.68 },
          { x: w - 12, y: h * 0.42 },
          72,
          0.18,
          seed
        );
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: thickness,
          bristleCount,
          dryBrushGap,
          taperStart: 0.2,
          taperEnd: 0.95,
          color: inkColor,
          headReach,
          seed,
        });

        const flowerPositions = [0.22, 0.46, 0.72, 0.88];
        flowerPositions.forEach((tPos, idx) => {
          if (tPos > headReach) return;
          const pt = spine[Math.floor(tPos * (spine.length - 1))];
          if (pt) {
            drawSakuraBlossom(
              ctx,
              pt.x,
              pt.y + (idx % 2 === 0 ? -4 : 4),
              Math.min(h * 0.32, thickness * 0.75),
              idx * 0.9,
              accentColor,
              '#FFF5F5',
              inkColor,
              0.95,
              seed + idx * 31
            );
          }
        });
      } else {
        const spine = sampleQuadraticCurve(
          { x: 8, y: h * 0.55 },
          { x: w * 0.48, y: h * 0.42 },
          { x: w - 8, y: h * 0.52 },
          64,
          0.1,
          seed
        );
        drawSumiKasureRibbon(ctx, {
          spine,
          maxWidth: thickness,
          bristleCount,
          dryBrushGap,
          taperStart: 0.8,
          taperEnd: 0.95,
          color: inkColor,
          headReach,
          seed,
        });
      }

      ctx.restore();
      if (prog < 1) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [variant, inkColor, accentColor, bristleCount, dryBrushGap, thickness, seed, animateOnMount]);

  return <canvas ref={canvasRef} className={`block w-full select-none ${className}`} />;
};

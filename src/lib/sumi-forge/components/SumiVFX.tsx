import React, { useEffect, useRef } from 'react';
import { DEFAULT_VFX_CONFIG } from '../presets';
import { VFXConfig } from '../types';
import { renderCompleteSpriteSheet, renderVFXFrame } from '../vfxRenderer';

export interface SumiVFXProps {
  /** Configuração parcial ou completa do efeito Sakuga */
  config?: Partial<VFXConfig>;
  /** Modo de exibição: animação contínua ('player') ou folha de sprites 4x4 ('spritesheet') */
  mode?: 'player' | 'spritesheet';
  /** Quadro fixo opcional [0..15]. Se omitido, anima continuamente na taxa `fps` */
  fixedFrame?: number | null;
  /** Resolução do canvas em pixels */
  size?: number;
  /** Se verdadeiro, pausa a reprodução automática */
  paused?: boolean;
  /** Callback por frame para sincronizar UI externa */
  onFrameTick?: (frameIndex: number) => void;
  className?: string;
}

/**
 * Componente <SumiVFX />
 * Renderizador declarativo de efeitos procedurais de 16 quadros com Cinética Sakuga.
 * Redesenha apenas quando o quadro avança (ex: 16 FPS) e pausa automaticamente fora da viewport.
 */
export const SumiVFX: React.FC<SumiVFXProps> = ({
  config: customConfig,
  mode = 'player',
  fixedFrame = null,
  size = 256,
  paused = false,
  onFrameTick,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  const mergedConfig: VFXConfig = {
    ...DEFAULT_VFX_CONFIG,
    ...customConfig,
    colors: { ...DEFAULT_VFX_CONFIG.colors, ...customConfig?.colors },
    brush: { ...DEFAULT_VFX_CONFIG.brush, ...customConfig?.brush },
    dynamics: { ...DEFAULT_VFX_CONFIG.dynamics, ...customConfig?.dynamics },
    rough: { ...DEFAULT_VFX_CONFIG.rough, ...customConfig?.rough },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { rootMargin: '80px 0px', threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (mode === 'spritesheet') {
      renderCompleteSpriteSheet(canvas, mergedConfig, 4);
      return;
    }

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawSingleFrame = (f: number) => {
      ctx.clearRect(0, 0, size, size);
      renderVFXFrame(
        ctx,
        f,
        mergedConfig.totalFrames,
        size,
        size,
        mergedConfig,
        mergedConfig.bgMode === 'checker' || mergedConfig.bgMode === 'transparent'
      );
    };

    if (fixedFrame !== null || paused) {
      const f = fixedFrame !== null ? fixedFrame : frameRef.current;
      drawSingleFrame(f);
      return;
    }

    // Desenha o quadro inicial imediatamente
    drawSingleFrame(frameRef.current);

    let animId = 0;
    let lastTick = performance.now();
    const interval = 1000 / Math.max(1, mergedConfig.fps);

    const loop = (now: number) => {
      if (isVisibleRef.current && now - lastTick >= interval) {
        lastTick = now;
        frameRef.current = (frameRef.current + 1) % mergedConfig.totalFrames;
        drawSingleFrame(frameRef.current);
        onFrameTick?.(frameRef.current);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [mergedConfig, mode, fixedFrame, size, paused, onFrameTick]);

  return (
    <canvas
      ref={canvasRef}
      className={`block max-w-full h-auto select-none ${
        mergedConfig.bgMode === 'checker' ? 'checker-bg' : ''
      } ${className}`}
    />
  );
};

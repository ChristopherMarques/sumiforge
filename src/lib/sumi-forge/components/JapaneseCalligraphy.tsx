import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface JapaneseCalligraphyProps {
  /** Caracteres em Japonês (Kanji) */
  jp: string;
  /** Leitura Romaji opcional */
  romaji?: string;
  /** Significado auspicioso em Português-Brasileiro exibido no modal/tooltip ao passar o mouse */
  pt: string;
  /** Estilo visual: selo vermelho Hanko, caligrafia vertical Tategaki ou texto inline */
  variant?: 'hanko' | 'tategaki' | 'inline';
  /** Direção controlada onde o modal/tooltip de tradução deve aparecer */
  tooltipPlacement?: TooltipPlacement;
  className?: string;
}

/**
 * Componente <JapaneseCalligraphy />: Mantém os ideogramas japoneses intactos no layout
 * e exibe a tradução em Português-Brasileiro dentro de um pequeno modal/tooltip flutuante
 * com direção controlada (top, bottom, left, right) e proteção automática contra fuga da tela.
 */
export const JapaneseCalligraphy: React.FC<JapaneseCalligraphyProps> = ({
  jp,
  romaji,
  pt,
  variant = 'inline',
  tooltipPlacement = 'top',
  className = '',
}) => {
  const [hovered, setHovered] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    effectivePlacement: TooltipPlacement;
  }>({
    top: 0,
    left: 0,
    effectivePlacement: tooltipPlacement,
  });

  const updateTooltipPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const modalWidth = 248;
    const modalHeight = 86;
    const gap = 10;
    const safeMargin = 12;

    let finalPlacement: TooltipPlacement = tooltipPlacement;

    // Inverte automaticamente caso o local escolhido fique fora da janela visível
    if (finalPlacement === 'top' && rect.top - modalHeight - gap < safeMargin) {
      finalPlacement = 'bottom';
    } else if (finalPlacement === 'bottom' && rect.bottom + modalHeight + gap > vh - safeMargin) {
      finalPlacement = 'top';
    } else if (finalPlacement === 'left' && rect.left - modalWidth - gap < safeMargin) {
      finalPlacement = 'right';
    } else if (finalPlacement === 'right' && rect.right + modalWidth + gap > vw - safeMargin) {
      finalPlacement = 'left';
    }

    let top = 0;
    let left = 0;

    if (finalPlacement === 'top') {
      top = rect.top - modalHeight - gap;
      left = rect.left + rect.width / 2 - modalWidth / 2;
    } else if (finalPlacement === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - modalWidth / 2;
    } else if (finalPlacement === 'left') {
      top = rect.top + rect.height / 2 - modalHeight / 2;
      left = rect.left - modalWidth - gap;
    } else {
      top = rect.top + rect.height / 2 - modalHeight / 2;
      left = rect.right + gap;
    }

    // Clamping rigoroso nas bordas da tela para jamais escapar da viewport
    left = Math.max(safeMargin, Math.min(vw - modalWidth - safeMargin, left));
    top = Math.max(safeMargin, Math.min(vh - modalHeight - safeMargin, top));

    setCoords({ top, left, effectivePlacement: finalPlacement });
  };

  useEffect(() => {
    if (!hovered) return;
    updateTooltipPosition();
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [hovered, tooltipPlacement]);

  const handleEnter = () => {
    updateTooltipPosition();
    setHovered(true);
  };

  const handleLeave = () => {
    setHovered(false);
  };

  const tooltipPortal =
    hovered && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: 248,
              zIndex: 9999,
            }}
            className="pointer-events-none rounded-xl border border-[#C8232C]/45 bg-[#161412]/96 backdrop-blur-md text-[#F4EFE6] p-3 shadow-xl transition-opacity duration-150"
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#F4EFE6]/12">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#C8232C] text-white text-xs font-editorial font-bold leading-none">
                  {jp}
                </span>
                {romaji && (
                  <span className="text-[11px] font-medium text-[#E5B8B8] italic">
                    {romaji}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#A69F93] font-tabular">PT-BR</span>
            </div>
            <p className="text-xs leading-snug font-sans text-[#F4EFE6]">{pt}</p>
          </div>,
          document.body
        )
      : null;

  const handleToggleTap = () => {
    updateTooltipPosition();
    setHovered((prev) => !prev);
  };

  if (variant === 'hanko') {
    return (
      <>
        <span
          ref={triggerRef}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={handleToggleTap}
          className={`relative inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-help select-none transition-transform duration-200 ${
            hovered ? 'scale-105' : ''
          } ${className}`}
        >
          <span
            style={{
              border: '2px solid #C8232C',
              boxShadow: 'inset 0 0 0 1px rgba(200, 35, 44, 0.25)',
              letterSpacing: '0.08em',
            }}
            className={`hanko-seal px-2 py-0.5 text-xs font-bold font-editorial whitespace-nowrap transition-colors duration-200 ${
              hovered
                ? 'bg-[#C8232C] text-[#FAF8F5]'
                : 'bg-[#F2EDE2]/90 text-[#C8232C]'
            }`}
          >
            {jp}
          </span>
        </span>
        {tooltipPortal}
      </>
    );
  }

  if (variant === 'tategaki') {
    return (
      <>
        <span
          ref={triggerRef}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={handleToggleTap}
          className={`relative inline-flex flex-col items-center shrink-0 cursor-help select-none ${className}`}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
            }}
            className={`tategaki font-editorial tracking-widest transition-colors duration-200 px-1.5 py-2 rounded-lg border ${
              hovered
                ? 'text-[#C8232C] border-[#C8232C]/50 bg-[#C8232C]/8'
                : 'text-[#3F3D39] border-transparent'
            }`}
          >
            {jp}
          </span>
        </span>
        {tooltipPortal}
      </>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleToggleTap}
        className={`relative inline-flex items-center gap-1 whitespace-nowrap shrink-0 border-b border-dotted border-[#C8232C]/70 cursor-help select-none transition-colors duration-200 ${
          hovered ? 'text-[#C8232C]' : ''
        } ${className}`}
      >
        <span className="font-editorial font-semibold text-sm whitespace-nowrap">{jp}</span>
      </span>
      {tooltipPortal}
    </>
  );
};


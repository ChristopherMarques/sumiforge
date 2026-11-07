import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { SumiIconColorContext } from './SumiIcon';

export type SumiButtonVariant = 'crimson' | 'ink' | 'washi' | 'ghost' | 'outline';
export type SumiButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SumiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estilo visual da caixa caligráfica */
  variant?: SumiButtonVariant;
  /** Tamanho e espaçamento interno */
  size?: SumiButtonSize;
  /** Estado ativo para abas e seletores */
  active?: boolean;
  /** Semente determinística para o traço Rough.js */
  seed?: number;
  /** Ocupar 100% da largura disponível */
  fullWidth?: boolean;
  children: React.ReactNode;
}

// Cache global em memória para evitar recalcular geometria Rough.js para botões de mesmo tamanho/estilo
const ROUGH_RECT_CACHE = new Map<string, string[]>();

function getRoughRectPaths(
  w: number,
  h: number,
  strokeColor: string,
  innerAccentColor: string | null,
  seed: number
): { mainPaths: string[]; accentPaths: string[] } {
  const key = `${w}x${h}:${strokeColor}:${innerAccentColor ?? 'none'}:${seed}`;
  const cached = ROUGH_RECT_CACHE.get(key);
  if (cached) {
    return {
      mainPaths: [cached[0] ?? ''],
      accentPaths: cached[1] ? [cached[1]] : [],
    };
  }

  if (typeof document === 'undefined' || w < 8 || h < 8) {
    return { mainPaths: [], accentPaths: [] };
  }

  const dummySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const rc = rough.svg(dummySvg);

  // Borda principal mais reta e arquitetônica desenhada com Rough.js alinhada exatamente ao limite da caixa
  const mainNode = rc.rectangle(0.75, 0.75, Math.max(4, w - 1.5), Math.max(4, h - 1.5), {
    stroke: strokeColor,
    strokeWidth: 1.45,
    roughness: 0.34,
    bowing: 0.25,
    preserveVertices: true,
    seed,
  });

  const mainPaths: string[] = [];
  mainNode.querySelectorAll('path').forEach((p) => {
    const d = p.getAttribute('d');
    if (d) mainPaths.push(d);
  });

  const accentPaths: string[] = [];
  if (innerAccentColor && w > 24 && h > 20) {
    const innerNode = rc.rectangle(3, 3, Math.max(4, w - 6), Math.max(4, h - 6), {
      stroke: innerAccentColor,
      strokeWidth: 0.8,
      roughness: 0.22,
      bowing: 0.18,
      preserveVertices: true,
      seed: seed + 17,
    });
    innerNode.querySelectorAll('path').forEach((p) => {
      const d = p.getAttribute('d');
      if (d) accentPaths.push(d);
    });
  }

  ROUGH_RECT_CACHE.set(key, [mainPaths.join(' '), accentPaths.join(' ')]);
  return { mainPaths, accentPaths };
}

/**
 * Componente <SumiButton />
 * Botão retangular de bordas retas desenhadas com Rough.js, inspirado em selos e placas
 * de xilogravura japonesa, com performance instantânea via cache de caminhos SVG.
 */
export const SumiButton: React.FC<SumiButtonProps> = ({
  variant = 'washi',
  size = 'md',
  active = false,
  seed = 108,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(false);

  useLayoutEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      setDims((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, size, fullWidth]);

  // Determina cores de fundo, texto e borda Rough.js conforme variante e estado ativo/hover
  const effectiveVariant: SumiButtonVariant = active
    ? variant === 'crimson'
      ? 'crimson'
      : 'ink'
    : variant;

  let bgClass = '';
  let textClass = '';
  let strokeColor = '#11100E';
  let innerAccentColor: string | null = null;

  if (effectiveVariant === 'crimson') {
    bgClass = hovered && !disabled ? 'bg-[#A81B23]' : 'bg-[#C8232C]';
    textClass = 'text-[#FAF7F0]';
    strokeColor = '#11100E';
    innerAccentColor = 'rgba(250, 247, 240, 0.35)';
  } else if (effectiveVariant === 'ink') {
    bgClass = hovered && !disabled ? 'bg-[#25221F]' : 'bg-[#11100E]';
    textClass = 'text-[#F5F0E6]';
    strokeColor = hovered || active ? '#C8232C' : '#11100E';
    innerAccentColor = 'rgba(245, 240, 230, 0.28)';
  } else if (effectiveVariant === 'washi') {
    bgClass = hovered && !disabled ? 'bg-[#F3EDE0]' : 'bg-[#FAF7F0]';
    textClass = 'text-[#11100E]';
    strokeColor = hovered ? '#C8232C' : '#11100E';
    innerAccentColor = hovered ? 'rgba(200, 35, 44, 0.24)' : 'rgba(17, 16, 14, 0.18)';
  } else if (effectiveVariant === 'outline') {
    bgClass = hovered && !disabled ? 'bg-[#11100E]/6' : 'bg-[#F8F4EC]/70';
    textClass = 'text-[#11100E]';
    strokeColor = hovered ? '#C8232C' : '#2C2A27';
    innerAccentColor = null;
  } else {
    // ghost
    bgClass = hovered && !disabled ? 'bg-[#11100E]/8' : 'bg-transparent';
    textClass = 'text-[#11100E]';
    strokeColor = hovered ? '#11100E' : 'rgba(17, 16, 14, 0.38)';
    innerAccentColor = null;
  }

  // Alturas travadas por tamanho para garantir proporção 100% idêntica entre botões claros (washi) e escuros (ink/crimson)
  const sizeClasses: Record<SumiButtonSize, string> = {
    xs: 'h-8 px-3 text-xs gap-1.5',
    sm: 'h-9 px-3.5 text-xs gap-2',
    md: 'h-10 px-4 text-xs sm:text-sm gap-2.5',
    lg: 'h-11 px-5 text-sm gap-2.5',
  };

  const { mainPaths, accentPaths } =
    dims.w > 0 && dims.h > 0
      ? getRoughRectPaths(dims.w, dims.h, strokeColor, innerAccentColor, seed)
      : { mainPaths: [], accentPaths: [] };

  return (
    <button
      ref={btnRef}
      disabled={disabled}
      onMouseEnter={(e) => {
        setHovered(true);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        rest.onMouseLeave?.(e);
      }}
      className={`relative inline-flex items-center justify-center font-medium leading-none rounded-[2px] transition-colors duration-150 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
        fullWidth ? 'w-full' : 'shrink-0'
      } ${bgClass} ${textClass} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {/* Borda reta orgânica desenhada com Rough.js */}
      {dims.w > 0 && dims.h > 0 && (
        <svg
          width={dims.w}
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          aria-hidden="true"
        >
          {accentPaths.map((d, i) => (
            <path
              key={`acc-${i}`}
              d={d}
              fill="none"
              stroke={innerAccentColor ?? strokeColor}
              strokeWidth={0.8}
              strokeLinecap="square"
            />
          ))}
          {mainPaths.map((d, i) => (
            <path
              key={`main-${i}`}
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.45}
              strokeLinecap="square"
            />
          ))}
        </svg>
      )}
      <SumiIconColorContext.Provider
        value={
          effectiveVariant === 'crimson'
            ? '#FAF7F0'
            : effectiveVariant === 'ink'
              ? '#F5F0E6'
              : null
        }
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {children}
        </span>
      </SumiIconColorContext.Provider>
    </button>
  );
};

export interface SumiRoughBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  strokeColor?: string;
  innerAccentColor?: string | null;
  seed?: number;
  children: React.ReactNode;
}

/**
 * Container retangular com borda reta desenhada por Rough.js (ideal para barras de comando, grupos de abas e selos).
 */
export const SumiRoughBox: React.FC<SumiRoughBoxProps> = ({
  strokeColor = '#11100E',
  innerAccentColor = 'rgba(17, 16, 14, 0.14)',
  seed = 303,
  className = '',
  children,
  ...rest
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      setDims((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { mainPaths, accentPaths } =
    dims.w > 0 && dims.h > 0
      ? getRoughRectPaths(dims.w, dims.h, strokeColor, innerAccentColor, seed)
      : { mainPaths: [], accentPaths: [] };

  return (
    <div ref={boxRef} className={`relative rounded-[2px] ${className}`} {...rest}>
      {dims.w > 0 && dims.h > 0 && (
        <svg
          width={dims.w}
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20"
          aria-hidden="true"
        >
          {accentPaths.map((d, i) => (
            <path
              key={`acc-${i}`}
              d={d}
              fill="none"
              stroke={innerAccentColor ?? strokeColor}
              strokeWidth={0.75}
              strokeLinecap="square"
            />
          ))}
          {mainPaths.map((d, i) => (
            <path
              key={`main-${i}`}
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.35}
              strokeLinecap="square"
            />
          ))}
        </svg>
      )}
      {children}
    </div>
  );
};

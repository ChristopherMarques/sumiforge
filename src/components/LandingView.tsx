import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArchetypeId,
  DEFAULT_FUJI_LAYERS,
  JapaneseCalligraphy,
  MAGIC_SCHOOLS,
  MaskChoreography,
  SchoolId,
  SumiBrandEmblem,
  SumiButton,
  SumiIcon,
  SumiLandscape,
  SumiLayerIntensities,
  SumiMaskReveal,
  SumiRoughBox,
  SumiSectionPainter,
  SumiVFX,
} from '../lib/sumi-forge';

gsap.registerPlugin(ScrollTrigger);

interface LandingViewProps {
  onOpenPlayground: (
    initialTab?: 'mask' | 'atelier' | 'vfx' | 'landscape',
    archetype?: string
  ) => void;
}

// 5 Estilos Artísticos Distintos
const CURATED_BRUSH_EXPERIENCES: {
  id: ArchetypeId;
  title: string;
  jp: string;
  romaji: string;
  ptMeaning: string;
  poeticDesc: string;
  useCase: string;
  defaultSchool: SchoolId;
}[] = [
  {
    id: 'sakura_tempest_slash',
    title: 'Tempestade de Cerejeira',
    jp: '桜吹雪',
    romaji: 'Sakura Fubuki',
    ptMeaning: 'Brisa que faz as flores de cerejeira dançarem pelo ar',
    poeticDesc:
      'Traços de nanquim vivo acompanhados por flores de Sakura que desabrocham e flutuam ao vento.',
    useCase: 'Ideal para aberturas de páginas, transições suaves e cursores poéticos.',
    defaultSchool: 'fuji_sakura',
  },
  {
    id: 'hyb_slash_great_wave_katana',
    title: 'A Grande Onda Oriental',
    jp: '青海波',
    romaji: 'Seigaiha',
    ptMeaning: 'Ondas azuis do mar que trazem serenidade e sorte eterna',
    poeticDesc:
      'Vagas esculpidas com correntes internas e espuma articulada que varrem a tela com presença dramática.',
    useCase: 'Ideal para revelar seções inteiras no scroll e destacar chamadas principais.',
    defaultSchool: 'calligraphy_tide',
  },
  {
    id: 'enso_sigil',
    title: 'Círculo Zen Ensō',
    jp: '円相',
    romaji: 'Ensō',
    ptMeaning: 'Plenitude, iluminação e a beleza do gesto único feito à mão',
    poeticDesc:
      'Um único giro rápido de pincel que emoldura títulos, avatares ou selos de destaque com textura de papel.',
    useCase: 'Ideal para emoldurar logotipos, botões de ação e encerramentos de página.',
    defaultSchool: 'fuji_sakura',
  },
  {
    id: 'hyb_slash_crimson_phoenix_arc',
    title: 'Dança da Fênix Carmesim',
    jp: '不死鳥',
    romaji: 'Fushichō',
    ptMeaning: 'Renovação constante, vitalidade ardente e voo livre',
    poeticDesc:
      'Pétalas aquareladas de fogo que sobem com leveza, concentrando pigmento intenso nas pontas.',
    useCase: 'Ideal para momentos de impacto, conquistas de usuário e cards em destaque.',
    defaultSchool: 'abyssal_flame',
  },
  {
    id: 'solid_ref_fumaca',
    title: 'Brisa das Nuvens Douradas',
    jp: '瑞雲',
    romaji: 'Zuiun',
    ptMeaning: 'Nuvens auspiciosas que anunciam bons presságios e paz',
    poeticDesc:
      'Volutas ornamentais de neblina oriental que se abrem suavemente para revelar o conteúdo por trás.',
    useCase: 'Ideal para fundos atmosféricos e transições elegantes entre capítulos.',
    defaultSchool: 'astral_gold',
  },
];

export const LandingView: React.FC<LandingViewProps> = ({ onOpenPlayground }) => {
  // Referências mutáveis para animar canvas a 60/120 FPS sem causar re-renders na árvore React
  const ceremonyProgressRef = useRef<number | undefined>(0);
  const act1ProgressRef = useRef<number>(0.28);
  const act2ProgressRef = useRef<number>(0.28);
  const act3ProgressRef = useRef<number>(0.28);
  const finaleProgressRef = useRef<number>(0.28);

  const [replayKey, setReplayKey] = useState<number>(1);
  const [seed] = useState<number>(8472);
  const [layers, setLayers] = useState<SumiLayerIntensities>({ ...DEFAULT_FUJI_LAYERS });
  const [showLayerScrollDrawer, setShowLayerScrollDrawer] = useState<boolean>(false);

  // Estados de UI & Seções Compactas
  const [pkgManager, setPkgManager] = useState<'npm' | 'pnpm' | 'yarn'>('npm');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showcaseMaskMode, setShowcaseMaskMode] = useState<MaskChoreography>('katana_slashes');
  const [showcaseReplay, setShowcaseReplay] = useState<number>(1);
  const [selectedExpIdx, setSelectedExpIdx] = useState<number>(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroUiRef = useRef<HTMLDivElement | null>(null);
  const act1Ref = useRef<HTMLElement | null>(null);
  const act2Ref = useRef<HTMLElement | null>(null);
  const act3Ref = useRef<HTMLElement | null>(null);
  const finaleRef = useRef<HTMLElement | null>(null);

  // 1. Pintura 100% Procedural do Monte Fuji na abertura via ref (Sol em mancha -> Traço -> Flores em mancha)
  useEffect(() => {
    ceremonyProgressRef.current = 0;

    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 2.5,
      ease: 'power2.out',
      onUpdate: () => {
        ceremonyProgressRef.current = proxy.p;
      },
      onComplete: () => {
        ceremonyProgressRef.current = 1;
      },
    });

    return () => {
      tween.kill();
    };
  }, [replayKey]);

  useEffect(() => {
    if (!heroUiRef.current) return;
    gsap.fromTo(
      heroUiRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.75, delay: 0.15, ease: 'power3.out' }
    );
  }, [replayKey]);

  // 2. Coreografia de Scroll GSAP + Parallax do Monte Fuji + Pintura Viva das Seções via Refs
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroBgRef.current) {
        gsap.to(heroBgRef.current, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: heroBgRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      if (act1Ref.current) {
        ScrollTrigger.create({
          trigger: act1Ref.current,
          start: 'top 88%',
          end: 'center center',
          scrub: 0.35,
          onUpdate: (self) => {
            act1ProgressRef.current = Math.max(0.25, self.progress);
          },
        });

        gsap.fromTo(
          act1Ref.current.querySelectorAll('.samurai-reveal-card'),
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            duration: 0.55,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: act1Ref.current,
              start: 'top 78%',
            },
          }
        );
      }

      if (act2Ref.current) {
        ScrollTrigger.create({
          trigger: act2Ref.current,
          start: 'top 86%',
          end: 'center center',
          scrub: 0.35,
          onUpdate: (self) => {
            act2ProgressRef.current = Math.max(0.28, self.progress);
          },
        });
      }

      if (act3Ref.current) {
        ScrollTrigger.create({
          trigger: act3Ref.current,
          start: 'top 86%',
          end: 'center center',
          scrub: 0.35,
          onUpdate: (self) => {
            act3ProgressRef.current = Math.max(0.28, self.progress);
          },
        });
      }

      if (finaleRef.current) {
        ScrollTrigger.create({
          trigger: finaleRef.current,
          start: 'top 88%',
          end: 'center center',
          scrub: 0.35,
          onUpdate: (self) => {
            finaleProgressRef.current = Math.max(0.28, self.progress);
          },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const installCmd =
    pkgManager === 'npm'
      ? 'npm install @sumi-forge/react'
      : pkgManager === 'pnpm'
        ? 'pnpm add @sumi-forge/react'
        : 'yarn add @sumi-forge/react';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const activeExp = CURATED_BRUSH_EXPERIENCES[selectedExpIdx] ?? CURATED_BRUSH_EXPERIENCES[0];
  const activeSchoolObj = MAGIC_SCHOOLS[activeExp.defaultSchool];

  return (
    <div ref={rootRef} className="w-full overflow-x-hidden">
      {/* =====================================================================
          ATO 0: CENA 100% PROCEDURAL VIVA DO MONTE FUJI, SAKURA E SOL VERMELHO
          Qualidade máxima em qualquer resolução + Glassmorphismo para leitura perfeita
          ===================================================================== */}
      <section className="relative w-full min-h-[100svh] pt-16 flex flex-col justify-between overflow-hidden border-b border-[#D5CEC0]/70">
        {/* BACKGROUND 100% PROCEDURAL: Monte Fuji, Sol Carmesim, Galho de Sakura e Ilha de Pinheiros */}
        <div
          ref={heroBgRef}
          className="absolute inset-0 w-full h-[108%] -top-[4%] z-0 will-change-transform"
        >
          <SumiLandscape
            key={`hero-landscape-${replayKey}`}
            revealProgressRef={ceremonyProgressRef}
            layers={layers}
            seed={seed}
            animated
            windSpeed={1.05}
            interactive
          />
        </div>

        {/* HERO MINIMALISTA COM GLASSMORPHISMO REFINADO E RESPONSIVIDADE TOTAL */}
        <div
          ref={heroUiRef}
          className="relative z-10 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 flex-1 flex flex-col justify-between gap-5 sm:gap-6 pointer-events-none"
        >
          {/* Topo com Selo Interativo e Botões Lado a Lado no Mobile/Tablet/Desktop */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 pointer-events-auto">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-[#F8F4EC]/80 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-white/80 shadow-[0_8px_28px_rgba(17,16,14,0.06)] w-full md:w-auto">
              <JapaneseCalligraphy
                jp="花鳥風月"
                romaji="Kachō Fūgetsu"
                pt="Contemplar a beleza da natureza, das flores, do vento e da lua"
                variant="hanko"
                tooltipPlacement="bottom"
              />
              <span className="text-[11px] sm:text-xs font-medium text-[#2C2A27] leading-snug">
                Toque ou passe o mouse nos selos japoneses para ver a tradução
              </span>
            </div>

            {/* No mobile ficam lado a lado (grid-cols-2), em telas maiores ficam em linha flex */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
              <SumiButton
                variant="washi"
                size="sm"
                seed={21}
                fullWidth
                className="sm:w-auto"
                onClick={() => setReplayKey((k) => k + 1)}
              >
                <SumiIcon name="replay" size={17} color="#11100E" />
                <span>Repintar Abertura</span>
              </SumiButton>

              <SumiButton
                variant={showLayerScrollDrawer ? 'ink' : 'washi'}
                size="sm"
                seed={22}
                fullWidth
                className="sm:w-auto"
                active={showLayerScrollDrawer}
                onClick={() => setShowLayerScrollDrawer((v) => !v)}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-[2px] p-0.5 ${
                    showLayerScrollDrawer ? 'bg-[#F7F3EB]' : ''
                  }`}
                >
                  <SumiIcon name="layers" size={17} color="#11100E" />
                </span>
                <span>Camadas da Pintura</span>
              </SumiButton>
            </div>
          </div>

          {/* Card Principal Centralizado no Mobile/Tablet e Alinhado à Esquerda no Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end my-auto py-2 sm:py-4">
            <div className="lg:col-span-7 xl:col-span-6 pointer-events-auto w-full flex justify-center lg:justify-start">
              <div className="w-full max-w-[610px] bg-[#F8F4EC]/82 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_16px_44px_rgba(17,16,14,0.08)]">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-3">
                  <JapaneseCalligraphy
                    jp="一期一会"
                    romaji="Ichigo Ichie"
                    pt="Cada encontro e cada pincelada são únicos na vida"
                    tooltipPlacement="top"
                  />
                  <span aria-hidden="true" className="text-[#3F3D39]">
                    ·
                  </span>
                  <span className="text-xs font-medium text-[#3F3D39]">
                    Biblioteca React de Arte Viva
                  </span>
                </div>

                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.06] tracking-tight text-[#11100E] text-center sm:text-left mb-3.5 sm:mb-4"
                  style={{ textWrap: 'balance' }}
                >
                  Onde a Web deixa de ser código e vira pintura viva.
                </h1>

                <p className="text-sm sm:text-base leading-relaxed text-[#252320] text-center sm:text-left mb-5 sm:mb-6">
                  Transforme imagens, seções e interações em experiências inesquecíveis. Revele fotos
                  com pinceladas animadas, dê sensibilidade de pressão ao cursor e traga a poesia da
                  arte japonesa para qualquer aplicação React com um único pacote.
                </p>

                {/* Barra de Instalação contida 100% dentro do card com borda Rough.js */}
                <SumiRoughBox
                  seed={33}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-[#FAF7F0]/95 mb-5"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-1.5">
                    <div className="flex items-center gap-1">
                      {(['npm', 'pnpm', 'yarn'] as const).map((pm, idx) => (
                        <SumiButton
                          key={pm}
                          variant={pkgManager === pm ? 'ink' : 'ghost'}
                          size="xs"
                          seed={40 + idx}
                          active={pkgManager === pm}
                          onClick={() => setPkgManager(pm)}
                        >
                          {pm}
                        </SumiButton>
                      ))}
                    </div>

                    <div className="sm:hidden">
                      <SumiButton
                        variant="washi"
                        size="xs"
                        seed={45}
                        onClick={() => handleCopy(installCmd, 'hero-install')}
                      >
                        <SumiIcon
                          name={copiedId === 'hero-install' ? 'check' : 'copy'}
                          size={16}
                          color="#11100E"
                        />
                        <span>{copiedId === 'hero-install' ? 'Copiado' : 'Copiar'}</span>
                      </SumiButton>
                    </div>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 px-1.5 py-0.5 text-xs font-tabular text-[#11100E] min-w-0 overflow-x-auto">
                    <SumiIcon name="terminal" size={18} color="#11100E" className="shrink-0" />
                    <code className="whitespace-nowrap truncate">{installCmd}</code>
                  </div>

                  <div className="hidden sm:block shrink-0">
                    <SumiButton
                      variant="washi"
                      size="xs"
                      seed={46}
                      onClick={() => handleCopy(installCmd, 'hero-install')}
                    >
                      <SumiIcon
                        name={copiedId === 'hero-install' ? 'check' : 'copy'}
                        size={16}
                        color="#11100E"
                      />
                      <span>{copiedId === 'hero-install' ? 'Copiado' : 'Copiar'}</span>
                    </SumiButton>
                  </div>
                </SumiRoughBox>

                {/* Ações Principais lado a lado */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
                  <SumiButton
                    variant="crimson"
                    size="md"
                    seed={51}
                    className="flex-1"
                    onClick={() => onOpenPlayground('atelier')}
                  >
                    <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                      <SumiIcon name="brush" size={18} color="#11100E" />
                    </span>
                    <span>Experimentar no Playground</span>
                  </SumiButton>

                  <SumiButton
                    variant="washi"
                    size="md"
                    seed={52}
                    className="flex-1"
                    onClick={() => {
                      const el = document.getElementById('experiencias');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>Desenrolar o Pergaminho</span>
                    <SumiIcon name="chevron-down" size={18} color="#11100E" />
                  </SumiButton>
                </div>
              </div>
            </div>

            {/* Gaveta Retrátil de Camadas da Obra Procedural do Monte Fuji */}
            <div className="lg:col-span-5 xl:col-span-6 flex flex-col items-center lg:items-end justify-end pointer-events-auto w-full">
              {showLayerScrollDrawer && (
                <div className="w-full max-w-[610px] lg:max-w-lg bg-[#F8F4EC]/88 backdrop-blur-xl border border-white/80 rounded-2xl p-4 sm:p-5 shadow-[0_16px_44px_rgba(17,16,14,0.1)]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D5CEC0]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#11100E]">
                      <SumiIcon name="sliders" size={18} color="#11100E" />
                      <span>Intensidade das Camadas da Pintura Ao Vivo</span>
                    </div>
                    <SumiButton
                      variant="ghost"
                      size="xs"
                      seed={59}
                      onClick={() => setShowLayerScrollDrawer(false)}
                    >
                      <SumiIcon name="close" size={16} color="#11100E" />
                    </SumiButton>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(
                      [
                        { key: 'sunIntensity', label: 'Sol Vermelho' },
                        { key: 'mountainIntensity', label: 'Monte Fuji' },
                        { key: 'sakuraBranchIntensity', label: 'Galho de Sakura' },
                        { key: 'sakuraPetalsIntensity', label: 'Pétalas no Ar' },
                        { key: 'waterReflectionIntensity', label: 'Lago & Pinheiros' },
                        { key: 'mistKumoIntensity', label: 'Neblina da Manhã' },
                      ] as const
                    ).map((item) => (
                      <label key={item.key} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#2C2A27] truncate">{item.label}</span>
                          <span className="font-tabular">
                            {Math.round(layers[item.key] * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1.4}
                          step={0.05}
                          value={layers[item.key]}
                          onChange={(e) =>
                            setLayers((prev) => ({
                              ...prev,
                              [item.key]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-[#C8232C]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé discreto da Hero com Glassmorphismo e ideograma sem quebra */}
          <div className="flex flex-row items-center justify-between gap-3 text-xs text-[#252320] bg-[#F8F4EC]/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/80 shadow-[0_8px_24px_rgba(17,16,14,0.05)] pointer-events-auto">
            <span className="leading-snug">
              Mova o cursor sobre a pintura acima para sentir a brisa nas flores de cerejeira e o
              reflexo nas águas do Monte Fuji.
            </span>
            <JapaneseCalligraphy
              jp="明鏡止水"
              romaji="Meikyō Shisui"
              pt="Mente serena como um espelho polido e água tranquila"
              tooltipPlacement="top"
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO I: JARDIM DE SAKURA · O QUE VOCÊ PODE CRIAR COM O PACOTE
          Caligrafia no topo em mobile/tablet e cards centralizados
          ===================================================================== */}
      <section
        id="experiencias"
        ref={act1Ref}
        className="relative py-16 sm:py-24 lg:py-28 border-b border-[#D5CEC0]/70 overflow-hidden"
      >
        {/* Pintura Viva da Seção: Galhos de Sakura posicionados nas margens livres */}
        <div className="absolute inset-0 z-0">
          <SumiSectionPainter
            theme="sakura_katana_canopy"
            scrollProgressRef={act1ProgressRef}
            school="fuji_sakura"
            seed={seed + 101}
          />
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Cabeçalho centralizado no mobile/tablet e com caligrafia no topo */}
          <div className="flex justify-center lg:justify-start mb-8 sm:mb-12">
            <div className="inline-flex flex-col xl:flex-row items-center sm:items-start gap-4 sm:gap-6 bg-[#F8F4EC]/82 backdrop-blur-xl border border-white/80 rounded-2xl p-5 sm:p-7 shadow-[0_10px_32px_rgba(17,16,14,0.05)] max-w-2xl xl:max-w-3xl w-full text-center sm:text-left">
              <JapaneseCalligraphy
                jp="桜吹雪"
                romaji="Sakura Fubuki"
                pt="Tempestade poética de pétalas de cerejeira sopradas pela brisa"
                variant="tategaki"
                tooltipPlacement="right"
                className="hidden xl:flex text-lg pt-1 shrink-0"
              />

              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#C8232C] font-medium mb-2">
                  <span className="xl:hidden">
                    <JapaneseCalligraphy
                      jp="桜吹雪"
                      romaji="Sakura Fubuki"
                      pt="Tempestade poética de pétalas de cerejeira sopradas pela brisa"
                      variant="hanko"
                      tooltipPlacement="top"
                    />
                  </span>
                  <span>01 · Experiências Visuais Inéditas</span>
                  <span aria-hidden="true">·</span>
                  <JapaneseCalligraphy
                    jp="侘寂"
                    romaji="Wabi-Sabi"
                    pt="A beleza autêntica do traço feito à mão"
                    tooltipPlacement="top"
                  />
                </div>
                <h2
                  className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-[#11100E] tracking-tight mb-3"
                  style={{ textWrap: 'balance' }}
                >
                  Quatro formas de encantar quem visita seu projeto.
                </h2>
                <p className="text-sm sm:text-base text-[#2C2A27] leading-relaxed">
                  Sem vídeos pesados e sem imagens estáticas repetitivas. Tudo nasce ao vivo na tela,
                  adaptando-se a qualquer tamanho de monitor, tablet ou celular.
                </p>
              </div>
            </div>
          </div>

          {/* 4 Cards com Glassmorphismo Translúcido, Centralizados no Mobile e Ícones Nítidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="samurai-reveal-card border border-white/80 bg-[#F8F4EC]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-7 flex flex-col justify-between items-center sm:items-stretch text-center sm:text-left gap-5 shadow-[0_10px_32px_rgba(17,16,14,0.05)]">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <SumiIcon name="eye" size={24} color="#11100E" className="shrink-0" />
                    <span className="text-xs font-tabular text-[#3F3D39] truncate">
                      &lt;SumiMaskReveal /&gt;
                    </span>
                  </div>
                  <JapaneseCalligraphy
                    jp="顕現"
                    romaji="Kengen"
                    pt="O ato mágico de revelar o que estava oculto"
                    variant="hanko"
                    tooltipPlacement="top"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#11100E] mb-2">
                  Pintura Animada de Imagens e Fotos
                </h3>
                <p className="text-sm text-[#252320] leading-relaxed">
                  Passe qualquer fotografia ou ilustração do seu produto e deixe que golpes de
                  pincel a revelem na tela durante o carregamento ou conforme o visitante rola a
                  página.
                </p>
              </div>
              <div className="pt-1 w-full sm:w-auto flex justify-center sm:justify-start">
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={101}
                  onClick={() => onOpenPlayground('mask')}
                >
                  <span>Testar com suas imagens no Playground</span>
                  <span>→</span>
                </SumiButton>
              </div>
            </div>

            <div className="samurai-reveal-card border border-white/80 bg-[#F8F4EC]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-7 flex flex-col justify-between items-center sm:items-stretch text-center sm:text-left gap-5 shadow-[0_10px_32px_rgba(17,16,14,0.05)]">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <SumiIcon name="brush" size={24} color="#11100E" className="shrink-0" />
                    <span className="text-xs font-tabular text-[#3F3D39] truncate">
                      &lt;SumiBrushCanvas /&gt;
                    </span>
                  </div>
                  <JapaneseCalligraphy
                    jp="筆勢"
                    romaji="Hissei"
                    pt="A energia vital e a força transmitidas pela ponta do pincel"
                    variant="hanko"
                    tooltipPlacement="top"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#11100E] mb-2">
                  Sensibilidade Real à Pressão e Velocidade
                </h3>
                <p className="text-sm text-[#252320] leading-relaxed">
                  Permita que seus usuários desenhem, assinem ou interajam com a página sentindo o
                  peso da tinta: movimentos lentos criam traços densos, movimentos rápidos abrem as
                  cerdas secas ou fazem brotar flores de cerejeira.
                </p>
              </div>
              <div className="pt-1 w-full sm:w-auto flex justify-center sm:justify-start">
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={102}
                  onClick={() => onOpenPlayground('atelier')}
                >
                  <span>Experimentar os pincéis no Atelier</span>
                  <span>→</span>
                </SumiButton>
              </div>
            </div>

            <div className="samurai-reveal-card border border-white/80 bg-[#F8F4EC]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-7 flex flex-col justify-between items-center sm:items-stretch text-center sm:text-left gap-5 shadow-[0_10px_32px_rgba(17,16,14,0.05)]">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <SumiIcon name="mountain" size={24} color="#11100E" className="shrink-0" />
                    <span className="text-xs font-tabular text-[#3F3D39] truncate">
                      &lt;SumiLandscape /&gt; &amp; &lt;SumiSectionPainter /&gt;
                    </span>
                  </div>
                  <JapaneseCalligraphy
                    jp="山水"
                    romaji="Sansui"
                    pt="A harmonia sagrada entre as montanhas e as águas"
                    variant="hanko"
                    tooltipPlacement="top"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#11100E] mb-2">
                  Cenários Vivos que Reagem ao Scroll e ao Vento
                </h3>
                <p className="text-sm text-[#252320] leading-relaxed">
                  Crie fundos de seção com rios de carpas, galhos floridos, ondas orientais e
                  montanhas na neblina. Você controla a intensidade de cada camada individualmente.
                </p>
              </div>
              <div className="pt-1 w-full sm:w-auto flex justify-center sm:justify-start">
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={103}
                  onClick={() => onOpenPlayground('landscape')}
                >
                  <span>Personalizar camadas no Compositor</span>
                  <span>→</span>
                </SumiButton>
              </div>
            </div>

            <div className="samurai-reveal-card border border-white/80 bg-[#F8F4EC]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-7 flex flex-col justify-between items-center sm:items-stretch text-center sm:text-left gap-5 shadow-[0_10px_32px_rgba(17,16,14,0.05)]">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <SumiIcon name="katana" size={24} color="#11100E" className="shrink-0" />
                    <span className="text-xs font-tabular text-[#3F3D39] truncate">
                      &lt;SumiVFX /&gt; &amp; &lt;SumiStroke /&gt;
                    </span>
                  </div>
                  <JapaneseCalligraphy
                    jp="一閃"
                    romaji="Issen"
                    pt="O brilho relâmpago de um golpe perfeito"
                    variant="hanko"
                    tooltipPlacement="top"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#11100E] mb-2">
                  Ornamentos Caligráficos e Efeitos de Impacto
                </h3>
                <p className="text-sm text-[#252320] leading-relaxed">
                  Sublinhe títulos com uma pincelada de nanquim ao entrar na tela ou dispare
                  animações de ondas, chamas e círculos Zen, prontos para usar no React ou exportar
                  em GIF transparente.
                </p>
              </div>
              <div className="pt-1 w-full sm:w-auto flex justify-center sm:justify-start">
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={104}
                  onClick={() => onOpenPlayground('vfx')}
                >
                  <span>Abrir o Estúdio de Efeitos</span>
                  <span>→</span>
                </SumiButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO II: O RIO DAS CARPAS & REVELAÇÃO ARTÍSTICA DE IMAGENS
          Caligrafia no topo no mobile/tablet, cards 100% alinhados e botões em grade 2x2 no mobile
          ===================================================================== */}
      <section
        id="rio-carpas"
        ref={act2Ref}
        className="relative py-16 sm:py-24 lg:py-32 border-b border-[#D5CEC0]/70 overflow-hidden"
      >
        {/* Pintura Viva: Rio Sinuoso, Ondas de Hokusai e 3 Carpas Koi Nadando */}
        <div className="absolute inset-0 z-0">
          <SumiSectionPainter
            theme="koi_river_rapids"
            scrollProgressRef={act2ProgressRef}
            school="calligraphy_tide"
            seed={seed + 202}
          />
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="flex items-start justify-center lg:justify-start gap-5 w-full xl:w-auto">
              <JapaneseCalligraphy
                jp="鯉の滝登り"
                romaji="Koi no Takinobori"
                pt="A carpa que nada contra a correnteza e se transforma em dragão, símbolo de coragem e conquista"
                variant="tategaki"
                tooltipPlacement="right"
                className="hidden xl:flex text-lg pt-1 shrink-0"
              />

              <div className="w-full max-w-2xl xl:max-w-lg bg-[#F8F4EC]/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-white/80 shadow-[0_10px_32px_rgba(17,16,14,0.05)] text-center sm:text-left mx-auto lg:mx-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#C8232C] font-medium mb-2">
                  <span className="xl:hidden">
                    <JapaneseCalligraphy
                      jp="鯉の滝登り"
                      romaji="Koi no Takinobori"
                      pt="A carpa que nada contra a correnteza e se transforma em dragão, símbolo de coragem e conquista"
                      variant="hanko"
                      tooltipPlacement="top"
                    />
                  </span>
                  <SumiIcon name="koi" size={20} color="#11100E" />
                  <span>02 · Revelação Artística de Imagens</span>
                </div>
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#11100E] tracking-tight mb-2"
                  style={{ textWrap: 'balance' }}
                >
                  Qualquer imagem ganha vida quando revelada a pincel.
                </h2>
                <p className="text-xs sm:text-sm text-[#252320] leading-relaxed">
                  Observe as carpas nadando pelo rio ao fundo enquanto testa como diferentes
                  coreografias de pinceladas revelam uma arte na tela.
                </p>
              </div>
            </div>

            {/* Seletor de Coreografia: Lado a lado em grade 2x2 no Mobile e em linha única no Tablet/Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 bg-[#F8F4EC]/82 backdrop-blur-xl p-2.5 rounded-xl border border-white/80 shadow-[0_8px_24px_rgba(17,16,14,0.05)] w-full max-w-2xl xl:w-auto mx-auto lg:mx-0">
              {(
                [
                  { id: 'katana_slashes', label: 'Golpes Cruzados' },
                  { id: 'hokusai_tide', label: 'Correntes do Rio' },
                  { id: 'enso_spiral', label: 'Giro Zen Ensō' },
                  { id: 'fuji_masterpiece', label: 'Abertura Fuji' },
                ] as const
              ).map((mode, idx) => (
                <SumiButton
                  key={mode.id}
                  variant={showcaseMaskMode === mode.id ? 'ink' : 'washi'}
                  size="sm"
                  seed={130 + idx}
                  fullWidth
                  className="sm:w-auto"
                  active={showcaseMaskMode === mode.id}
                  onClick={() => {
                    setShowcaseMaskMode(mode.id);
                    setShowcaseReplay((r) => r + 1);
                  }}
                >
                  {mode.label}
                </SumiButton>
              ))}
            </div>
          </div>

          {/* Comparativo com Glassmorphismo Translúcido para revelar o rio e as carpas sob os cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            <div className="lg:col-span-8 border border-white/80 bg-[#F8F4EC]/72 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(17,16,14,0.06)] flex flex-col justify-between gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#11100E]">
                  Obra Revelada Dinamicamente (Arraste o mouse sobre a tela para pintar mais)
                </span>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={141}
                  onClick={() => setShowcaseReplay((r) => r + 1)}
                >
                  <SumiIcon name="replay" size={16} color="#11100E" />
                  <span>Pintar Novamente</span>
                </SumiButton>
              </div>

              <div className="h-[240px] sm:h-[310px] md:h-[340px] rounded-xl border border-[#D5CEC0]/80 bg-[#F4F0E6]/85 overflow-hidden relative">
                <SumiMaskReveal
                  src="/assets/aistudio/image_8f7809d3.png"
                  choreography={showcaseMaskMode}
                  duration={2.7}
                  bristleCount={26}
                  dryBrushGap={0.3}
                  seed={seed + 77}
                  showLiveInkAccents
                  replayTrigger={showcaseReplay}
                  interactiveBrush
                />
              </div>
            </div>

            <div className="lg:col-span-4 border border-white/80 bg-[#F8F4EC]/72 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(17,16,14,0.06)] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-[#11100E]">
                    Movimento do Pincel por Trás
                  </span>
                  <JapaneseCalligraphy
                    jp="飛白"
                    romaji="Kasure"
                    pt="A textura orgânica das cerdas quando o pincel desliza velozmente"
                    tooltipPlacement="top"
                  />
                </div>

                <div className="h-[200px] sm:h-[235px] rounded-xl border border-[#D5CEC0]/80 bg-[#F4F0E6]/85 overflow-hidden relative">
                  <SumiMaskReveal
                    src="/assets/aistudio/image_8f7809d3.png"
                    choreography={showcaseMaskMode}
                    duration={2.7}
                    bristleCount={26}
                    dryBrushGap={0.3}
                    seed={seed + 77}
                    maskOnlyPreview
                    replayTrigger={showcaseReplay}
                    interactiveBrush
                  />
                </div>
              </div>

              <p className="text-xs text-[#252320] leading-relaxed text-center sm:text-left">
                Basta envolver sua imagem com{' '}
                <code className="font-tabular text-[#11100E] font-semibold">
                  &lt;SumiMaskReveal /&gt;
                </code>
                . Cada traço tem identidade própria e responde ao toque do visitante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO III: CORDILHEIRA NA NEBLINA & GALERIA FLUIDA DE 5 ESTILOS
          Abas centralizadas e responsivas com bordas Rough.js
          ===================================================================== */}
      <section
        ref={act3Ref}
        className="relative py-16 sm:py-24 lg:py-28 border-b border-[#D5CEC0]/70 overflow-hidden"
      >
        {/* Fundo Pintado: Cordilheiras Sumi-e + Nuvens Kumo + Galhos de Sakura nos cantos */}
        <div className="absolute inset-0 z-0">
          <SumiSectionPainter
            theme="misty_mountains_sakura"
            scrollProgressRef={act3ProgressRef}
            school={activeExp.defaultSchool}
            seed={seed + 303}
          />
        </div>

        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9 bg-[#F8F4EC]/80 backdrop-blur-xl border border-white/80 rounded-2xl p-5 sm:p-6 shadow-[0_8px_28px_rgba(17,16,14,0.04)]">
            <div className="inline-flex items-center gap-2 text-xs text-[#C8232C] font-medium mb-2">
              <SumiIcon name="sakura" size={20} color="#11100E" />
              <span>03 · Galeria Viva de Estilos</span>
            </div>
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-[#11100E] tracking-tight mb-3"
              style={{ textWrap: 'balance' }}
            >
              Da delicadeza da Sakura à força da Grande Onda.
            </h2>
            <p className="text-xs sm:text-base text-[#252320]">
              Explore cinco movimentos artísticos tradicionais prontos para animar qualquer
              interface.
            </p>
          </div>

          {/* Abas para os 5 Estilos Poéticos: Centralizadas em todas as telas sem barra de rolagem desnecessária */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8">
            {CURATED_BRUSH_EXPERIENCES.map((exp, idx) => {
              const isSelected = idx === selectedExpIdx;
              return (
                <SumiButton
                  key={exp.id}
                  variant={isSelected ? 'ink' : 'washi'}
                  size="sm"
                  seed={160 + idx}
                  active={isSelected}
                  onClick={() => setSelectedExpIdx(idx)}
                >
                  <span>{exp.title}</span>
                  <span
                    className={`font-editorial text-sm ${
                      isSelected ? 'text-[#C8232C]' : 'text-[#3F3D39]'
                    }`}
                  >
                    {exp.jp}
                  </span>
                </SumiButton>
              );
            })}
          </div>

          {/* Palco Central Glassmórfico Compacto & Elegante */}
          <div className="border border-white/80 bg-[#F8F4EC]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_12px_36px_rgba(17,16,14,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
              {/* Visualizador Animado Central (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="relative p-3 sm:p-4 rounded-2xl border border-[#D5CEC0]/80 bg-[#F4F1EA]/90">
                  <SumiVFX
                    config={{
                      archetype: activeExp.id,
                      school: activeExp.defaultSchool,
                      colors: activeSchoolObj.colors,
                      bgMode: 'washi',
                      seed,
                    }}
                    mode="player"
                    size={230}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Descrição Inspiradora Direta (7 cols) */}
              <div className="md:col-span-7 space-y-4 sm:space-y-5 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-between gap-2.5 border-b border-[#D5CEC0]/80 pb-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <JapaneseCalligraphy
                      jp={activeExp.jp}
                      romaji={activeExp.romaji}
                      pt={activeExp.ptMeaning}
                      variant="hanko"
                      tooltipPlacement="top"
                    />
                    <span className="text-xs text-[#3F3D39]">
                      Toque ou passe o mouse no selo para traduzir
                    </span>
                  </div>

                  <SumiButton
                    variant="washi"
                    size="xs"
                    seed={175}
                    onClick={() => onOpenPlayground('vfx', activeExp.id)}
                  >
                    <SumiIcon name="sliders" size={16} color="#11100E" />
                    <span>Personalizar no Playground →</span>
                  </SumiButton>
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-[#11100E] mb-2">
                    {activeExp.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#252320] leading-relaxed mb-3">
                    {activeExp.poeticDesc}
                  </p>
                  <p className="text-xs font-medium text-[#3F3D39]">{activeExp.useCase}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO FINAL: SELO IMPERIAL ENSŌ & CONVITE AO DOJO (PLAYGROUND STUDIO)
          Card Glassmórfico no centro do Ensō para leitura cristalina
          ===================================================================== */}
      <section ref={finaleRef} className="relative py-16 sm:py-24 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <SumiSectionPainter
            theme="enso_imperial_seal"
            scrollProgressRef={finaleProgressRef}
            school="fuji_sakura"
            seed={seed + 888}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="bg-[#F8F4EC]/82 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-3xl p-6 sm:p-9 md:p-10 shadow-[0_14px_40px_rgba(17,16,14,0.06)]">
            <div className="inline-flex flex-col items-center gap-2.5 mb-5">
              <SumiBrandEmblem size={48} />
              <JapaneseCalligraphy
                jp="円相"
                romaji="Ensō"
                pt="Círculo Zen que simboliza iluminação, harmonia e liberdade criativa"
                variant="hanko"
                tooltipPlacement="top"
              />
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#11100E] tracking-tight mb-4"
              style={{ textWrap: 'balance' }}
            >
              Pronto para pintar sua próxima aplicação?
            </h2>

            <p className="text-sm sm:text-base text-[#252320] mb-7 sm:mb-8 max-w-xl mx-auto leading-relaxed">
              Entre no Playground para testar suas próprias imagens, desenhar com pressão real no
              papel Washi, ajustar cada camada do Monte Fuji e copiar o componente React pronto.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <SumiButton
                variant="crimson"
                size="md"
                seed={191}
                onClick={() => onOpenPlayground('atelier')}
              >
                <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                  <SumiIcon name="brush" size={18} color="#11100E" />
                </span>
                <span>Abrir Atelier de Pintura Livre</span>
              </SumiButton>

              <SumiButton
                variant="ink"
                size="md"
                seed={192}
                onClick={() => onOpenPlayground('mask')}
              >
                <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                  <SumiIcon name="eye" size={18} color="#11100E" />
                </span>
                <span>Testar Revelação de Imagens</span>
              </SumiButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

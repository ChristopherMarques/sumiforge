/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { LandingView } from './components/LandingView';
import { PlaygroundView } from './components/PlaygroundView';
import {
  ArchetypeId,
  JapaneseCalligraphy,
  SumiBrandEmblem,
  SumiButton,
  SumiIcon,
  SumiSectionPainter,
  SumiStroke,
} from './lib/sumi-forge';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'playground'>('landing');
  const [playgroundInitialTab, setPlaygroundInitialTab] = useState<
    'mask' | 'atelier' | 'vfx' | 'landscape' | 'sansui'
  >('mask');
  const [playgroundArchetype, setPlaygroundArchetype] = useState<ArchetypeId | undefined>(
    undefined
  );

  // Estado booleano dispara apenas na transição de 24px (evita re-renders a cada pixel de scroll)
  const [isScrolled, setIsScrolled] = useState(false);
  const headerBrushProgressRef = useRef<number>(0);
  const [headerTrigger, setHeaderTrigger] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 24;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Quando muda de página, o efeito pintado na navbar desaparece imediatamente
  useEffect(() => {
    setIsScrolled(false);
    headerBrushProgressRef.current = 0;
    setHeaderTrigger((t) => t + 1);
  }, [currentView]);

  useEffect(() => {
    let raf = 0;
    const target = isScrolled ? 1 : 0;

    const animateRibbon = () => {
      const prev = headerBrushProgressRef.current;
      const diff = target - prev;
      if (Math.abs(diff) < 0.015) {
        headerBrushProgressRef.current = target;
        setHeaderTrigger((t) => t + 1);
        return;
      }
      headerBrushProgressRef.current = prev + diff * 0.22;
      raf = requestAnimationFrame(animateRibbon);
    };

    raf = requestAnimationFrame(animateRibbon);
    return () => cancelAnimationFrame(raf);
  }, [isScrolled]);

  const handleOpenPlayground = (
    tab: 'mask' | 'atelier' | 'vfx' | 'landscape' | 'sansui' = 'mask',
    archetype?: string
  ) => {
    setIsScrolled(false);
    headerBrushProgressRef.current = 0;
    setPlaygroundInitialTab(tab);
    setPlaygroundArchetype(archetype as ArchetypeId | undefined);
    setCurrentView('playground');
    window.scrollTo({ top: 0 });
  };

  const handleNavigateSection = (sectionId?: string) => {
    if (currentView !== 'landing') {
      setIsScrolled(false);
      headerBrushProgressRef.current = 0;
      setCurrentView('landing');
    }
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      setIsScrolled(false);
      headerBrushProgressRef.current = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col washi-surface text-[#11100E] dark:text-stone-100">
      {/* Navbar Fixa: 100% Transparente no topo e pintada por uma faixa de pergaminho Washi e Sakura no scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 min-h-16 py-2 md:py-0 md:h-16 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2 gap-x-2 sm:gap-x-4 px-3 sm:px-6 lg:px-8 transition-all duration-300 ${
          isScrolled ? 'backdrop-blur-md' : ''
        }`}
      >
        {/* Faixa Única Pintada Atrás de Toda a Navbar exclusivamente durante o Scroll */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <SumiSectionPainter
            key={`header-stroke-${headerTrigger}`}
            theme="header_single_stroke"
            scrollProgressRef={headerBrushProgressRef}
            ambientMotion={false}
          />
        </div>

        {/* Zone 1: Logo Pintada com Símbolo Japonês (墨) + Nome do Projeto */}
        <button
          onClick={() => handleNavigateSection()}
          title="SumiForge · 墨 (Sumi: A arte viva do nanquim)"
          className="order-1 relative z-10 flex items-center gap-2 sm:gap-2.5 text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap shrink-0 font-editorial text-[#11100E] cursor-pointer group"
        >
          <SumiBrandEmblem
            size={34}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span>SumiForge</span>
        </button>

        {/* Zone 2: Menu de Navegação Sempre Visível (em linha no Desktop/Tablet/Notebook e em barra compacta no Mobile) */}
        <nav
          aria-label="Navegação Principal"
          className="order-3 md:order-2 w-full md:w-auto relative z-10 flex items-center justify-start md:justify-center gap-1 lg:gap-1.5 overflow-x-auto bg-[#F8F4EC]/85 backdrop-blur-md px-2 py-1 rounded-[2px] border border-white/80 shadow-[0_2px_12px_rgba(17,16,14,0.05)]"
        >
          <SumiButton
            variant="ghost"
            size="xs"
            seed={11}
            onClick={() => handleNavigateSection()}
          >
            Obra Monte Fuji
          </SumiButton>
          <SumiButton
            variant="ghost"
            size="xs"
            seed={12}
            onClick={() => handleNavigateSection('experiencias')}
          >
            Experiências
          </SumiButton>
          <SumiButton
            variant="ghost"
            size="xs"
            seed={13}
            onClick={() => handleNavigateSection('rio-carpas')}
          >
            Pintura Viva
          </SumiButton>
          <SumiButton
            variant="ghost"
            size="xs"
            seed={14}
            onClick={() => handleNavigateSection('paisagens-sansui')}
          >
            Paisagens Sansui
          </SumiButton>
          <SumiButton
            variant="ghost"
            size="xs"
            seed={15}
            onClick={() => handleOpenPlayground('sansui')}
          >
            Playground
          </SumiButton>
        </nav>

        {/* Zone 3: Ações no Canto Direito (GitHub + Abrir Playground) com caixas de borda reta Rough.js */}
        <div className="order-2 md:order-3 relative z-10 flex items-center gap-2 shrink-0">
          <a
            href="https://github.com/ChristopherMarques/sumiforge"
            target="_blank"
            rel="noopener noreferrer"
            title="Repositório Oficial no GitHub: ChristopherMarques/sumiforge"
            className="inline-flex shrink-0"
          >
            <SumiButton variant="washi" size="sm" seed={16} type="button">
              <SumiIcon name="github" size={16} />
              <span>GitHub</span>
            </SumiButton>
          </a>

          <SumiButton
            variant="ink"
            size="sm"
            seed={19}
            onClick={() =>
              currentView === 'landing'
                ? handleOpenPlayground('mask')
                : handleNavigateSection()
            }
          >
            <SumiIcon
              name={currentView === 'landing' ? 'brush' : 'mountain'}
              size={16}
            />
            <span>{currentView === 'landing' ? 'Abrir Playground' : 'Ver Obra Viva'}</span>
          </SumiButton>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${currentView === 'playground' ? 'pt-28 md:pt-20' : ''}`}>
        {currentView === 'landing' ? (
          <LandingView onOpenPlayground={handleOpenPlayground} />
        ) : (
          <PlaygroundView
            key={`${playgroundInitialTab}-${playgroundArchetype ?? 'default'}`}
            initialTab={playgroundInitialTab}
            initialArchetype={playgroundArchetype}
          />
        )}
      </main>

      {/* Rodapé Samurai Minimalista com Logo Pintada, Criador, GitHub, Tradução no Hover e "made with love in Japa.... ops, Brazil" */}
      <footer className="border-t border-[#D5CEC0] dark:border-stone-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-[#EAE3D5]/65 dark:bg-stone-950">
        <div className="max-w-[1360px] mx-auto space-y-6">
          {/* Linha Principal do Rodapé */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
              <SumiBrandEmblem size={32} />
              <JapaneseCalligraphy
                jp="墨鍛"
                romaji="Sumi-Tan"
                pt="Forja viva de tinta nanquim e caligrafia japonesa"
                variant="hanko"
                tooltipPlacement="top"
              />
              <span className="text-base sm:text-lg font-bold font-editorial whitespace-nowrap text-[#11100E] dark:text-stone-100">
                @sumi-forge/react
              </span>
              <div className="w-20 h-5 hidden sm:block shrink-0">
                <SumiStroke
                  variant="horizontal_kasure"
                  thickness={7}
                  animateOnMount={false}
                />
              </div>
            </div>

            {/* Brincadeira solicitada em linha única sem quebras: "made with love in Japa.... ops, Brazil" */}
            <div className="text-sm font-editorial italic text-[#11100E] dark:text-stone-200 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="whitespace-nowrap">made with love in</span>
              <span className="relative inline-block px-1 text-[#3F3D39] dark:text-stone-400 whitespace-nowrap">
                Japa....
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 top-1/2 h-[2.5px] bg-[#C8232C] -rotate-6 rounded-full"
                />
              </span>
              <span className="font-semibold not-italic text-[#C8232C] whitespace-nowrap">
                ops, Brazil
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 sm:gap-3 text-xs text-[#3F3D39] dark:text-stone-400">
              <JapaneseCalligraphy
                jp="一期一会"
                romaji="Ichigo Ichie"
                pt="Um momento único na vida que jamais se repetirá"
                tooltipPlacement="top"
              />
              <span aria-hidden="true">·</span>
              <JapaneseCalligraphy
                jp="桜吹雪"
                romaji="Sakura Fubuki"
                pt="Dança das pétalas de cerejeira ao vento"
                tooltipPlacement="top"
              />
              <span aria-hidden="true">·</span>
              <JapaneseCalligraphy
                jp="鯉の滝登り"
                romaji="Koi no Takinobori"
                pt="Coragem e prosperidade da carpa que sobe a cachoeira"
                tooltipPlacement="top"
              />
            </div>
          </div>

          {/* Assinatura do Criador (Christopher Marques Corrêa) & Links Oficiais Desenhados com Rough.js */}
          <div className="pt-5 border-t border-[#D5CEC0]/80 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs sm:text-sm text-[#2C2A27] dark:text-stone-300">
              <JapaneseCalligraphy
                jp="匠"
                romaji="Takumi"
                pt="Mestre artesão, idealizador e criador da biblioteca SumiForge"
                variant="hanko"
                tooltipPlacement="top"
              />
              <span>Idealizado e forjado por</span>
              <a
                href="https://www.linkedin.com/in/christopher-marques-correa/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-editorial font-bold text-base text-[#11100E] hover:text-[#C8232C] transition-colors underline decoration-[#C8232C]/50 underline-offset-4 whitespace-nowrap"
              >
                Christopher Marques Corrêa
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="https://www.linkedin.com/in/christopher-marques-correa/"
                target="_blank"
                rel="noopener noreferrer"
                title="Conectar com Christopher Marques Corrêa no LinkedIn"
                className="inline-flex"
              >
                <SumiButton variant="washi" size="sm" seed={81} type="button">
                  <SumiIcon name="linkedin" size={16} />
                  <span>LinkedIn · Criador</span>
                </SumiButton>
              </a>

              <a
                href="https://github.com/ChristopherMarques/sumiforge"
                target="_blank"
                rel="noopener noreferrer"
                title="Ver código-fonte e dar Star no GitHub (ChristopherMarques/sumiforge)"
                className="inline-flex"
              >
                <SumiButton variant="ink" size="sm" seed={82} type="button">
                  <SumiIcon name="github" size={16} />
                  <span>GitHub · Repositório</span>
                </SumiButton>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

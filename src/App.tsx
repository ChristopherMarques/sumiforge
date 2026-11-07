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
    'mask' | 'atelier' | 'vfx' | 'landscape'
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
    tab: 'mask' | 'atelier' | 'vfx' | 'landscape' = 'mask',
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
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between gap-3 sm:gap-5 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
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
          className="relative z-10 flex items-center gap-2 sm:gap-2.5 text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap shrink-0 font-editorial text-[#11100E] cursor-pointer group"
        >
          <SumiBrandEmblem
            size={34}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span>SumiForge</span>
        </button>

        {/* Zone 2: Links de navegação com fundo translúcido Washi para leitura nítida sobre os galhos */}
        <nav className="relative z-10 hidden lg:flex items-center gap-2 bg-[#F8F4EC]/75 backdrop-blur-md px-2 py-1 rounded-[2px] border border-white/70">
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
            onClick={() => handleOpenPlayground('mask')}
          >
            Playground
          </SumiButton>
        </nav>

        {/* Zone 3: Ação Principal com caixa de borda reta Rough.js */}
        <div className="relative z-10 flex items-center gap-2 shrink-0">
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
            <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
              <SumiIcon
                name={currentView === 'landing' ? 'brush' : 'mountain'}
                size={18}
                color="#11100E"
              />
            </span>
            <span>{currentView === 'landing' ? 'Abrir Playground' : 'Ver Obra Viva'}</span>
          </SumiButton>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${currentView === 'playground' ? 'pt-18 sm:pt-20' : ''}`}>
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

      {/* Rodapé Samurai Minimalista com Logo Pintada, Tradução no Hover e "made with love in Japa.... ops, Brazil" */}
      <footer className="border-t border-[#D5CEC0] dark:border-stone-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-[#EAE3D5]/55 dark:bg-stone-950">
        <div className="max-w-[1360px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 text-center lg:text-left">
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
      </footer>
    </div>
  );
}

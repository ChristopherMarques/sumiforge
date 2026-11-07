# @sumi-forge/react — Experiência Samurai Sengoku, Cerimônia de Abertura Monte Fuji & Scroll-Driven Painting com GSAP

Reimaginação completa da Landing Page como uma experiência autoral **Samurai Sengoku**, onde a obra do **Monte Fuji, Sakura e Sol Vermelho** protagoniza a cerimônia de abertura (loading artístico em tela cheia) e permanece viva como background interativo da Hero, seguida por uma narrativa de pergaminho (*Emakimono*) controlada por **GSAP + ScrollTrigger** em que cada seção é literalmente pintada ou cortada a lâmina usando uma técnica diferente do pacote `@sumi-forge/react`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo consolidam o novo fluxo de abertura, o scroll-reveal com GSAP e a direção de arte Samurai Sengoku confirmados por você.

- **Decisão Confirmada 1 — Cerimônia de Abertura Full-Screen → Background Vivo da Hero**:
  - Ao abrir o site, a tela inteira (`100vw × 100vh`) funciona como uma folha de papel Washi Sengoku onde o próprio pacote pinta diante dos olhos do visitante a obra do **Monte Fuji, Sakura e Sol Vermelho** (usando a fusão de `<SumiMaskReveal />` sobre a arte de referência `/assets/aistudio/image_8f7809d3.png` + a cena procedural `<SumiLandscape />`), acompanhada de um selo *Hanko* vermelho e indicador caligráfico de progresso.
  - Assim que a pintura se completa (~2.8s, com botão discreto para repetir a cerimônia quando quiser), um golpe de Katana revela a tipografia principal, o comando `npm i @sumi-forge/react` e um controle flutuante retrátil de camadas, enquanto a pintura do Monte Fuji continua viva no fundo da Hero (com pétalas de cerejeira sopradas pelo vento, reflexos no lago e parallax GSAP ao rolar).
- **Decisão Confirmada 2 — Pergaminho Samurai com GSAP ScrollTrigger (Cada Seção Pintada por uma Técnica)**:
  - Cada seção subsequente da Landing Page utiliza o próprio pacote sincronizado com o scroll do GSAP para se desenhar na tela:
    1. **Ato I — O Corte da Katana (`Técnicas #03 Kasure & #04 Erosão Sakuga`)**: Um golpe diagonal de espada multi-cerdas rasga a tela conforme o scroll desce, revelando a suíte dos 5 componentes React instaláveis (`SumiMaskReveal`, `SumiLandscape`, `SumiBrushCanvas`, `SumiStroke`, `SumiVFX`).
    2. **Ato II — A Maré de Hokusai & A Chama Suibokuga (`Técnicas #06 Grande Onda, #05 Pétalas de Fogo S-Curve & #08 Bólido Oclusivo`)**: Cristas de onda *Ukiyo-e* com garras de espuma e correntes listradas pintam as margens em parallax enquanto chamas aquareladas demonstram o poder de revelar cards e imagens com máscaras elementais.
    3. **Ato III — O Pergaminho das 12 Técnicas & Névoa Kumo (`Técnicas #07 Nuvens Kumo C-Hook, #09 Aguada Tarashikomi, #10 Rough.js & #11 Shader 3 Canais`)**: Volutas de fumaça oriental se abrem no scroll para exibir o Códice Mestre das 12 Técnicas Procedurais e as 10 Escolas de Magia com demonstração ao vivo.
- **Decisão Confirmada 3 — Estética Samurai Sengoku & Rodapé "Japa.... ops, Brazil"**:
  - Papel Washi envelhecido com textura orgânica, nanquim abissal denso (`#11100E`), vermelhão lacado de armadura/selo Hanko (`#C8232C`), detalhes em ouro velho (`#B48A3E`), marcadores editoriais verticais e, no encerramento do pergaminho, a assinatura bem-humorada com um traço de pincel riscando a palavra: **"Made with love in ~~Japa....~~ ops, Brazil"**.

---

## 1. Overview & Core Concept

- **O Que Faz**: Apresenta a biblioteca `@sumi-forge/react` não como uma documentação estática, mas como uma obra de arte interativa onde **100% dos efeitos de abertura, fundos de seção, divisores, máscaras de imagem e transições de scroll são renderizados pelo próprio pacote**.
- **Experiência Visual**: Une a atmosfera dramática do Japão Feudal (caligrafia de espada *Kenjutsu*, xilogravuras *Ukiyo-e* e pergaminhos *Sumi-e*) com engenharia web moderna (GSAP ScrollTrigger + Canvas 2D determinístico + CSS Masking).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Ato 0 — Cerimônia de Tinta (Loading Artístico Full-Screen → Hero Background)**:
   - O visitante vê o papel Washi receber o impacto inicial do pincel: o Sol Vermelho sangra no papel em aguada *Tarashikomi*, as vertentes do Monte Fuji são riscadas com cerdas secas *Kasure*, o tronco negro de cerejeira serpenteia da esquerda desabrochando dezenas de flores vermelhas, e a neblina *Kumo* assenta sobre o lago.
   - Quando a pintura atinge 100%, a câmera realiza um sutil assentamento GSAP e a tipografia editorial da Hero surge com contraste impecável sobre uma área de respiro caligráfico (*Ma*), mantendo toda a obra visível, responsiva e animada no fundo.
   - Um botão **"Rever Cerimônia de Pintura"** e um drawer compacto **"Ajustar Camadas & Máscara do Fuji"** permitem ao visitante brincar com o background da Hero sem poluir a composição.
2. **Ato I — O Golpe da Lâmina (Os 5 Componentes do Pacote)**:
   - Ao rolar a página, o `ScrollTrigger` do GSAP aciona uma fita caligráfica gigante (`<SumiStroke />` + `<SumiMaskReveal />`) que corta a transição entre a Hero e a primeira seção.
   - Os 5 componentes exportados pelo pacote são exibidos em painéis de pergaminho Sengoku com demonstrações interativas ao vivo e snippets prontos para `npm` / `pnpm` / `yarn`.
3. **Ato II — Duelo de Água & Fogo (Demonstração de CSS Mask e Paralaxe Procedural)**:
   - Conforme o usuário continua rolando, ondas de *Hokusai* com garras de espuma e pétalas de fogo *Suibokuga* entram em parallax nas bordas e pintam progressivamente retratos e cenas com `<SumiMaskReveal />`, provando como qualquer desenvolvedor pode usar os pincéis da biblioteca para revelar fotos, banners e cards no scroll.
4. **Ato III — O Códice Samurai das 12 Técnicas & 10 Escolas**:
   - Emoldurado por bancos de nuvens *Kumo* em C-Hook e manchas *Tarashikomi*, o usuário explora cada uma das 12 técnicas matemáticas do motor, troca a Escola de Magia em tempo real e pode saltar com 1 clique para o **Playground Studio** completo (com as 4 bancadas de criação e exportação JSX/GIF89a/Sprite Sheet 4×4).
5. **Encerramento & Rodapé**:
   - Um grande selo *Ensō* caligráfico se fecha no scroll final, acompanhado do rodapé com o easter egg caligráfico: **"Made with love in ~~Japa....~~ ops, Brazil"**.

---

## 3. Technical Architecture & GSAP Scroll Choreography

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     Landing Page Samurai Sengoku (GSAP + SumiForge)                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  [1. Opening Ink Ceremony & Hero Full-Bleed Background (100vh)]                     │
│   ├── <SumiMaskReveal src="/assets/aistudio/image_8f7809d3.png" />                  │
│   ├── <SumiLandscape /> (Live Fuji, Crimson Sun, Sakura Petals & Kumo Mist)         │
│   ├── GSAP Timeline: Paint Progress (0 -> 100%) ──► Katana Slash UI Reveal          │
│   └── Collapsible Layer & Mode Drawer (Hybrid / Pure CSS Mask / Pure Procedural)    │
│                                         │                                           │
│                                  (GSAP ScrollTrigger)                               │
│                                         ▼                                           │
│  [2. Act I: Blade of the 5 Components — Painted by Technique #03 Kasure & #04]      │
│   ├── Scroll-driven diagonal Katana brushstroke divider                             │
│   └── Live Bento Showcase of <SumiMaskReveal>, <SumiBrushCanvas>, <SumiVFX>, etc.   │
│                                         │                                           │
│                                  (GSAP ScrollTrigger)                               │
│                                         ▼                                           │
│  [3. Act II: Tide & Flame Parallax — Painted by Technique #06 Hokusai & #05 Flame]  │
│   ├── Scroll-linked Hokusai Great Wave Crests & Foam Claws canvas backdrop          │
│   └── Interactive CSS Mask Gallery revealing artwork with Water, Fire & Sakura      │
│                                         │                                           │
│                                  (GSAP ScrollTrigger)                               │
│                                         ▼                                           │
│  [4. Act III: The 12 Techniques Codex — Painted by Technique #07 Kumo & #09 Wash]   │
│   ├── Kumo Cloud C-Hook scrolls parting on scroll + Tarashikomi pigment blooms      │
│   └── Interactive 12-Technique & 10-School Inspector + Direct Jump to Playground    │
│                                         │                                           │
│                                         ▼                                           │
│  [5. Enso Seal Finale & Footer]                                                     │
│   └── "Made with love in Japa.... ops, Brazil" with calligraphic strike-through     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

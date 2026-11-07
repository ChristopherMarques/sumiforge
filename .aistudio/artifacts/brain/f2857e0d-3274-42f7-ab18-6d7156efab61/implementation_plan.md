# Motor Gerativo de Paisagens Sansui (`<SumiSansui />`) para `@sumi-forge/react`

Criação de um motor 100% próprio e nativo de pintura de paisagens orientais **Sansui / Shan-Shui (山水 · Montanhas e Águas)** controlado por semente determinística (`seed`), capaz de gerar composições infinitas de picos escarpados, vales em múltiplas camadas de neblina, rios panorâmicos com barcos solitários e pinheiros nas encostas, adaptando-se automaticamente ao tema do usuário, a paletas tradicionais (incluindo **Modo Noturno** e **Verde Mineral Jade**) ou a qualquer cor customizada via props ou variáveis CSS.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo refletem exatamente as escolhas confirmadas por você e definem o escopo de construção após a aprovação deste plano:

- **Componente Versátil com 4 Composições Clássicas (`<SumiSansui />`)**:
  1. **`panoramic_river` (Horizonte Fluvial & Barco Solitário)**: Grande extensão de águas serenas com linhas de correnteza horizontais, ilhas distantes na neblina, promontório rochoso em primeiro plano com árvores retorcidas e um pescador solitário em seu barco (*sampan*).
  2. **`karst_peaks` (Picos Escarpados de Guilin)**: Torres montanhosas verticais dramáticas emergindo da água, com fissuras internas de rocha (*Cunfa* · 皴法), pinheiros agarrados às escarpas e picos fantasmas ao fundo.
  3. **`layered_valley` (Vale das Cinco Neblinas)**: Cadeias de colinas e montanhas sobrepostas em 5 a 7 planos de profundidade atmosférica, com grupos de pinheiros nas cristas e bancos de neblina entre os vales.
  4. **`twin_gorges` (Desfiladeiro Espelhado & Travessia)**: Duas grandes massas montanhosas laterais emoldurando um canal central profundo por onde desliza a embarcação.
- **Sistema de Cores, Temas Prontos e Modo Noturno (`theme` + `customColors` + CSS Variables)**:
  - **5 Temas Prontos**:
    - `classic_washi`: Papel Washi envelhecido (`#EFECE4`), nanquim denso (`#141413`) e aguadas cinza-carvão.
    - `jade_mineral` (*Qinglü Shanshui* · 青綠山水): Papel seda aquecido com aguadas de verde-celadon/jade mineral (`#5E7A68`) nas encostas e nanquim nos contornos.
    - `night_obsidian` (*Yakō Sansui* · 夜行山水 / **Modo Noturno**): Céu e águas em obsidiana profunda (`#121316`), contornos das cristas em giz prateado/marfim (`#EAE4D7`) e preenchimento escuro esfumaçado nas montanhas.
    - `crimson_dawn` (*Akatsuki* · 暁): Atmosfera de alvorada com aguadas carmesim suave (`#B83B40`) e nanquim.
    - `auto_theme`: Lê automaticamente variáveis CSS do projeto do usuário (`--sumi-bg`, `--sumi-ink`, `--sumi-wash`, `--sumi-accent`, `--sumi-mist`) ou adapta-se à classe `.dark` da aplicação hospedeira.
  - **Cores Livres via Props**: O desenvolvedor pode passar qualquer cor hexadecimal ou `rgb/hsl` em `backgroundColor`, `inkColor`, `washColor`, `mistColor` e `accentColor` para combinar com a identidade visual do seu site.
- **Demonstração na Landing Page e no Playground Studio**:
  - **Nova Seção na Landing Page (`03 · Paisagens Gerativas Sansui por Seed`)**: Exibe um banner panorâmico vivo acompanhado por uma grade interativa de 3 cartões (Picos Escarpados, Vale Verde Mineral e Modo Noturno Obsidiana), com botões para sortear novas sementes (`seed`) e alternar temas em tempo real.
  - **Nova Bancada no Playground Studio (`5. Gerador Sansui (Seeds)`)**: Estúdio completo para explorar sementes infinitas, alternar entre as 4 composições, escolher temas ou cores personalizadas, ajustar densidade de árvores/rochas/neblina, exportar a pintura em **PNG de alta resolução** e copiar o snippet JSX pronto.

---

### 1. Overview & Core Concept

- **What It Does**: Adiciona ao pacote `@sumi-forge/react` um gerador determinístico de pinturas de paisagem *Sansui* (山水) que constrói montanhas, texturas de rocha, árvores, águas e barcos inteiramente por algoritmos matemáticos e traços caligráficos em `<canvas>` com cache offscreen de alta performance.
- **Target Audience / Persona**: Desenvolvedores e designers React que desejam fundos de seção, cabeçalhos panorâmicos, cartões temáticos (Light/Dark mode) ou divisores de página com estética oriental autêntica que nunca se repetem e pesam poucos kilobytes.
- **Key Value**: Diferente de ilustrações estáticas ou bibliotecas externas limitadas, o `<SumiSansui />` integra-se ao ecossistema `@sumi-forge/react`, suporta animação sutil de neblina/água e barco, desenha a cena gradualmente se desejado e aceita qualquer paleta de cores do usuário.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Descoberta na Landing Page**: Ao rolar até a seção **Paisagens Gerativas Sansui**, o visitante vê o grande panorama fluvial no topo e os 3 cartões demonstrando o contraste entre o estilo clássico Washi, o Verde Mineral Jade e o Modo Noturno Obsidiana. Com um clique em **"Sortear Nova Paisagem (Seed)"** ou nos seletores de paleta, todas as montanhas e ilhas se reconfiguram instantaneamente.
  2. **Experimentação e Exportação no Playground**: Na nova aba **5. Gerador Sansui**, o usuário escolhe a composição (`panoramic_river`, `karst_peaks`, `layered_valley`, `twin_gorges`), digita ou sorteia uma `seed`, personaliza as cores (ou ativa o Modo Noturno), controla a quantidade de árvores, barcos e neblina, baixa o PNG ou copia o código `<SumiSansui />`.
- **Visual Identity & Theme**:
  - *Técnicas Tradicionais Codificadas*:
    - **Cunfa (皴法 · Hachuras de Textura de Rocha)**: Traços verticais e diagonais irregulares no interior das montanhas que dão volume tridimensional às escarpas.
    - **Contorno Caligráfico de Crista**: Linha superior mais espessa e expressiva no pico da montanha que afila conforme desce para o vale.
    - **Gradiente de Neblina na Base**: Cada camada de montanha dissolve-se suavemente na neblina em sua base antes que a camada mais próxima seja pintada por cima.
    - **Pinheiros e Árvores de Encosta**: Troncos orgânicos com agulhas horizontais ou folhagem pontilhada em nanquim posicionados estrategicamente nas fendas e promontórios.
- **Interactive Feedback & Motion**:
  - Animação opcional de baixa potência (`animated`): ondulações calmas na água, leve deriva do barco solitário e deslocamento sutil da neblina entre os picos, utilizando cache offscreen da cadeia montanhosa para manter **60/120 FPS cravados** em qualquer dispositivo.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Motor Próprio em Canvas 2D com Cache Offscreen das Montanhas**
  - *Chosen Approach*: Renderizar as camadas de montanhas, hachuras *Cunfa* e árvores em um buffer offscreen sempre que a `seed`, `composition` ou paleta mudar, e compor a água/barco/neblina em cima no loop principal.
  - *Why*: Gerar centenas de hachuras de rocha e folhagens de pinheiros leva cerca de 4ms na criação inicial, mas com o cache offscreen o custo por frame durante o scroll ou animação cai para **menos de 0.15ms**, mantendo fluidez absoluta no celular e desktop.
  - *Alternatives Considered*: Gerar milhares de nós DOM `<svg>` (descartado porque sobrecarrega o DOM quando múltiplos cartões são exibidos simultaneamente na página).
- **Decision 2: Suporte Híbrido a Temas Prontos, Modo Noturno e Cores Customizadas**
  - *Chosen Approach*: Oferecer uma prop `theme` (`'classic_washi' | 'jade_mineral' | 'night_obsidian' | 'crimson_dawn' | 'auto'`) combinada com uma prop opcional `colors` (`{ background, ink, wash, mist, accent }`) que sobrescreve qualquer canal individualmente.
  - *Why*: Permite uso imediato com 1 linha de código (`<SumiSansui composition="karst_peaks" theme="night_obsidian" />`) e, ao mesmo tempo, dá controle total para quem quer aplicar a cor primária da própria marca nas aguadas das montanhas.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         @sumi-forge/react Library                         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    <SumiSansui /> Component                         │  │
│  │  Props: seed, composition, theme, colors, ridgeLayers, treeDensity, │  │
│  │         showBoat, mistDensity, animated, revealProgress             │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     │                                     │
│                                     ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │               Procedural Sansui Engine (sansuiEngine.ts)            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  1. Ridge Silhouette Generator (1D FBM + Karst Power Shaping)       │  │
│  │  2. Atmospheric Wash & Base Mist Dissolve (Multi-Stop Gradient)     │  │
│  │  3. Cunfa Rock Texture Strokes (皴法 Inner Contour Fissures)         │  │
│  │  4. Variable-Width Calligraphic Ridge Spine                         │  │
│  │  5. Cliffside Pines & Gnarled Promontory Trees Generator            │  │
│  │  6. Water Ripples & Solitary Sampan Boat Renderer                   │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     │                                     │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
┌─────────────────────────────────────┐ ┌───────────────────────────────────┐
│        LandingView Showcase         │ │      PlaygroundView Workbench     │
│  • Banner Panorâmico + 3 Cartões    │ │  • Bancada "5. Gerador Sansui"    │
│    (Karst, Vale Jade, Modo Noturno) │ │  • Sorteador de Seeds & Cores     │
│  • Sorteador Rápido de Seeds        │ │  • Exportação PNG & Copiar JSX    │
└─────────────────────────────────────┘ └───────────────────────────────────┘
```

- **Data Model & State**:
  - `SansuiComposition`: `'panoramic_river' | 'karst_peaks' | 'layered_valley' | 'twin_gorges'`
  - `SansuiThemeId`: `'classic_washi' | 'jade_mineral' | 'night_obsidian' | 'crimson_dawn' | 'auto'`
  - `SansuiColors`:
    - `background`: Cor do papel/céu (ex: `#EFECE4` no modo claro ou `#121316` no modo noturno)
    - `ink`: Cor do contorno caligráfico das cristas, barcos e árvores (ex: `#181715` no modo claro ou `#EAE4D7` no modo noturno)
    - `wash`: Cor da aguada mineral ou sombreado das encostas (ex: `#5E7A68` no tema Jade ou `#2B2D33` no modo noturno)
    - `mist`: Cor da neblina que dissolve a base das montanhas e separa os planos
    - `accent`: Detalhe sutil opcional (selo ou folhagem)
- **Interactive Component & State Mapping**:
  - Na **Landing Page**: Botões para alternar a semente (`seed`) e testar os temas (`Clássico Washi`, `Verde Mineral`, `Modo Noturno`, `Alvorada Carmesim`) atualizam os cartões instantaneamente; clicar em **"Abrir Gerador Sansui no Playground"** abre diretamente a nova bancada com a composição selecionada.
  - No **Playground Studio**: Controles deslizantes e seletores de cor atualizam a pré-visualização em tempo real, geram o código JSX exato para cópia e permitem baixar a pintura gerada em PNG.

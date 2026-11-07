# Evolução do `<SumiSansui />`: Auto-Pintura ao Entrar na Tela, Florestas Densas, Modal em Tela Cheia & Traduções Interativas

Este plano detalha o encapsulamento de todos os termos em japonês com tradução interativa para Português Brasileiro, a cerimônia de auto-pintura progressiva nas paisagens *Sansui* (com opção de modo fixo via prop), novas composições densas com florestas de pinheiros e pavilhões, download direto em PNG e visualização em **Modal de Tela Cheia** com ícone desenhado em `rough.js`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo refletem exatamente as escolhas confirmadas e os requisitos solicitados:

- **Decisão Confirmada 1 — Auto-Pintura das Paisagens (`autoPaint` & `paintOnView`)**:
  - Por padrão na Landing Page (`autoPaint={true}`, `paintOnView={true}`), cada pintura `<SumiSansui />` se desenha progressivamente ao entrar no campo de visão (*IntersectionObserver*), revelando em sequência: (1) a aguada mineral/nanquim das montanhas distantes às próximas, (2) os traços caligráficos das cristas e hachuras de rocha (*Cunfa*), e (3) as florestas densas de pinheiros, árvores de copa pontilhada e o barco solitário.
  - O desenvolvedor pode controlar esse comportamento via props (`autoPaint?: boolean`, `paintDuration?: number`, `replayTrigger?: number`), podendo renderizar a pintura **100% fixa/instantânea** (`autoPaint={false}`) ou animada ao montar/entrar na tela.
- **Decisão Confirmada 2 — Visualização em Tela Cheia (Modal Imersivo + Ícone Rough.js) & Download PNG**:
  - Adicionaremos os ícones `'fullscreen'` e `'minimize'` ao `<SumiIcon />`, desenhados com `rough.js` em nanquim nítido.
  - Tanto o banner panorâmico quanto os cartões da Landing Page e a bancada do Playground terão botões de **Tela Cheia** e **Baixar PNG** (além de **Repintar Obra**).
  - Ao clicar em **Tela Cheia**, abre-se um **Modal Imersivo em Tela Cheia** onde o visitante pode contemplar a paisagem em alta resolução, sortear novas *seeds*, alternar composições (incluindo as novas paisagens densas), trocar temas (Washi, Verde Jade, Modo Noturno, Alvorada), acionar a **Repintura ao Vivo** e **Baixar o PNG** em alta definição.
- **Decisão Confirmada 3 — Todos os Termos em Japonês com Tradução no Hover/Toque**:
  - Todos os ideogramas japoneses na seção Sansui, nas abas da Galeria Viva de Estilos e no Playground serão encapsulados no componente `<JapaneseCalligraphy />`, exibindo o modal/tooltip inteligente em Português Brasileiro ao passar o mouse ou tocar no celular.

---

## 1. Overview & Core Concept

- **O que faremos**:
  1. **Revisão Completa de `<JapaneseCalligraphy />`**: Nenhum kanji ou termo japonês ficará solto como texto puro. Todos terão leitura *romaji* e tradução poética/clara em Português Brasileiro no hover (desktop) e no toque (mobile).
  2. **Cerimônia de Auto-Pintura no `<SumiSansui />` (`autoPaint`)**: Assim como a abertura principal do site, as paisagens *Sansui* poderão se auto-pintar diante dos olhos do usuário quando a seção entra na tela (ou quando a `seed` muda), ou ser renderizadas de forma fixa (`autoPaint={false}`).
  3. **Paisagens Mais Densas e Ricas em Vegetação**: Expandiremos o motor e as composições do `<SumiSansui />` (incluindo a nova composição `'dense_pine_sanctuary'` — *Bosque Denso de Pinheiros & Pavilhão na Montanha*, além de enriquecer a densidade de árvores, bosques em camadas, pontes/pavilhões orientais e bandos de garças/pássaros caligráficos nas composições existentes).
  4. **Download PNG & Modal de Tela Cheia**: Qualquer paisagem na Landing Page ou no Playground poderá ser baixada imediatamente como imagem `.png` ou expandida em um **Modal de Tela Cheia** interativo.

---

## 2. User Experience & Visual Design

- **Fluxo de Auto-Pintura na Landing Page**:
  - Ao rolar até a seção `03 · Paisagens Gerativas Sansui por Seed`, o visitante assiste às montanhas surgindo como manchas de aguada mineral, seguidas pelo traçado caligráfico das escarpas e pelo desabrochar dos bosques de pinheiros e árvores nas encostas.
  - Um seletor rápido permite alternar entre **Auto-Pintar ao Vivo** e **Renderização Fixa**, além de um botão **Repintar** para rever a cerimônia a qualquer momento.
- **Controles em Cada Obra (Banner & Cartões)**:
  - Cada paisagem exibe controles com bordas retas `rough.js` para:
    - **Sortear Seed** (gera uma nova geografia única)
    - **Baixar PNG** (salva a pintura atual em alta resolução)
    - **Tela Cheia** (ícone `'fullscreen'` desenhado com `rough.js`, abrindo o modal imersivo)
- **Modal Imersivo em Tela Cheia**:
  - Ocupa `100vw × 100vh` (com fechamento via tecla `ESC` ou botão com ícone Rough.js), apresentando a pintura em escala monumental e uma barra flutuante em glassmorphismo Washi para testar *seeds*, alternar entre as 5 composições (incluindo o novo *Santuário Denso de Pinheiros*), mudar a densidade de florestas, alternar temas/Modo Noturno, repintar a obra e baixar o PNG.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Animação de Auto-Pintura por Camadas com Cache Progressivo**
  - *Abordagem Escolhida*: Durante os ~2.2 segundos da auto-pintura (`autoPaint={true}`), o componente revela progressivamente cada plano de montanha (da mais distante à mais próxima), animando a extensão do traço da crista, as hachuras *Cunfa* e o surgimento das árvores. Ao atingir 100%, congela as montanhas e florestas no buffer offscreen a 60/120 FPS, mantendo apenas a deriva leve da água e do barco.
  - *Por que*: Garante o espetáculo visual da pintura nascendo ao vivo sem sacrificar a leveza e a fluidez após a conclusão do traço.
- **Decisão 2: Densidade Florestal Multi-Espécie**
  - *Abordagem Escolhida*: Combinar três tipos de vegetação tradicional *Sansui* nas encostas e promontórios:
    1. **Pinheiros Imperiais (*Matsu* 松)** com troncos retorcidos e patamares densos de agulhas.
    2. **Bosques de Copa Pontilhada (*Tenbyō* 点描)** com dezenas de manchas circulares de nanquim em diferentes tons de transparência.
    3. **Salgueiros/Bambus de Margem & Pavilhão de Montanha** nos promontórios rochosos, criando cenas densas e ricas em detalhes.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitetura e Fluxo Interativo

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        @sumi-forge/react Library                           │
├────────────────────────────────────────────────────────────────────────────┤
│  <SumiIcon /> (Rough.js)                                                   │
│   └── Novos ícones: 'fullscreen' (expandir cantos) & 'minimize' (reduzir)  │
│                                                                            │
│  <JapaneseCalligraphy />                                                   │
│   └── Encapsula 100% dos termos japoneses (Landing Page + Playground)      │
│                                                                            │
│  <SumiSansui /> Engine                                                     │
│   ├── Composições: panoramic_river | karst_peaks | layered_valley |        │
│   │                twin_gorges | dense_pine_sanctuary (NOVA - super densa) │
│   ├── Modos de Pintura: autoPaint (true/false), paintOnView, paintDuration │
│   ├── Vegetação Densa: Pinheiros Matsu + Bosques Tenbyō + Pavilhão/Pássaros│
│   └── Actions API: exportPng() + replayPaint()                             │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
┌───────────────────────────────────────┐     ┌──────────────────────────────┐
│     Landing Page (Seção 03 Sansui)    │     │  Modal Imersivo Tela Cheia   │
│  • Auto-pintura ao entrar na seção    │     │  • Canvas 100vw x 100vh      │
│  • Toggle Auto-Pintar vs Modo Fixo    │────▶│  • Seletor de Composição     │
│  • Botões em cada card:               │     │  • Controle de Seed & Tema   │
│    [Nova Seed] [Baixar PNG] [Expandir]│     │  • Slider Densidade Floresta │
└───────────────────────────────────────┘     │  • Botões Repintar & PNG     │
                                              └──────────────────────────────┘
```

### Mapeamento de Estado e Interações
- **Encapsulamento `<JapaneseCalligraphy />`**:
  - No Banner Sansui (`山水` *Sansui*), nos cartões, nos seletores de estilo da Seção 04 (`CURATED_BRUSH_EXPERIENCES`) e nos cabeçalhos/etiquetas da Bancada 5 do Playground, todos os kanjis passarão a usar `<JapaneseCalligraphy jp="..." romaji="..." pt="..." />`.
- **Controles de Exportação PNG e Fullscreen**:
  - Cada instância de `<SumiSansui />` na Landing Page poderá exportar seu próprio PNG diretamente pelo botão do card ou abrir suas configurações exatas (`seed`, `composition`, `theme`, `treeDensity`, `washColor`) no Modal de Tela Cheia.

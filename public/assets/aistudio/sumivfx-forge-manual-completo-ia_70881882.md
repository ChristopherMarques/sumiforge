# SumiVFX Forge — Manual Mestre de Engenharia & Replicação para Agentes de IA (.md)

> **Propósito deste Documento**: Especificação técnica completa, determinística e auto-contida para que qualquer Agente de IA (Claude Code, Cursor, Gemini, Windsurf, OpenAI Codex) compreenda e replique com 100% de precisão o motor procedural de efeitos visuais 2D **SumiVFX Forge** (combinação de Caligrafia Japonesa **Sumi-e Kasure**, Xilogravura **Ukiyo-e Hokusai**, Nuvens Orientais **Kumo**, Aquarela **Suibokuga Tarashikomi** e Geometria **Rough.js**).

---

## Sumário Executivo da Arquitetura

1. **Resolução e Escala Independente**: Todo quadro é projetado em um espaço virtual canônico de `128×128` unidades e multiplicado por `scale = width / 128`. Uma folha completa de Sprite Sheet possui `4×4 = 16 quadros` (`frameIndex ∈ [0..15]`, `frameNorm = frameIndex / 15`).
2. **Cinética Não-Linear de Ataque (Sakuga Timing)**:
   - Quadros `0..3` (`frameNorm 0.00..0.20`): Aceleração explosiva (`headReach = 1 - (1 - frameNorm)^3.4`).
   - Quadros `4..6` (`frameNorm 0.25..0.40`): Ápice de impacto com flash de núcleo branco e extensão máxima das garras/pétalas.
   - Quadros `7..15` (`frameNorm 0.46..1.00`): Erosão celular progressiva por ruído FBM 2D + dispersão de gotas centrífugas e volutas de fumaça Kumo.
3. **Arquitetura de 3 Canais Cromáticos**:
   - `inkPrimary`: Corpo de nanquim abissal e contornos caligráficos Rough.js.
   - `energySecondary`: Crista luminosa elemental, barriga das pétalas S-Curve e correntes intermediárias.
   - `coreGlow`: Núcleo incandescente branco/claro, garras de espuma Hokusai e centro dos bólidos.

---

## Tabela das 10 Escolas de Magia & Paletas Oficiais

| ID da Escola | Nome da Escola | Elemento / Estilo | Tinta (`inkPrimary`) | Energia (`energySecondary`) | Núcleo (`coreGlow`) | Acento (`sporeAccent`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `fungal_emerald` | **Éter Fúngico & Esmeralda** | Bio-Arcano · Referência | `#080D0A` | `#8BE36A` | `#F6FFF0` | `#4ADE80` |
| `toxic_venom` | **Veneno & Peçonha Ácida** | Alquimia · Miasma Corrosivo | `#0E1708` | `#A3E635` | `#ECFCCB` | `#84CC16` |
| `abyssal_curse` | **Maldição & Grilhão Abissal** | Bruxaria · Sombra & Agonia | `#0F051D` | `#C026D3` | `#FAE8FF` | `#9333EA` |
| `blood_shadow` | **Sangue & Hemomancia** | Vampírico · Corte Arterial | `#190408` | `#E11D48` | `#FFE4E6` | `#9F1239` |
| `necro_phantom` | **Necromancia & Fogo-Fátuo** | Post-Mortem · Alma & Osso | `#091114` | `#2DD4BF` | `#F0FDFA` | `#E2E8F0` |
| `capoeira_dende` | **Axé Solar & Dendê** | Capoeira · Cinética & Fogo | `#1A0E07` | `#F59E0B` | `#FEF9C3` | `#EA580C` |
| `abyssal_flame` | **Chama Abissal & Cinza** | Pirocinese · Brasa & Fuligem | `#160706` | `#FF5331` | `#FFF6CC` | `#F59E0B` |
| `calligraphy_tide` | **Maré Caligráfica** | Hidromancia · Tinta & Espuma | `#061320` | `#38BDF8` | `#F0F9FF` | `#7DD3FC` |
| `celestial_thunder` | **Trovão Celestial** | Eletromancia · Alta Voltagem | `#0B071E` | `#A855F7` | `#ECFEFF` | `#22D3EE` |
| `astral_gold` | **Luz Astral & Ouro** | Geomancia · Ordem Divina | `#171206` | `#FACC15` | `#FEFCE8` | `#F59E0B` |

---

## Preset Ativo no Estúdio no Momento da Exportação

```json
{
  "archetype": "hyb_slash_great_wave_katana",
  "school": "calligraphy_tide",
  "colors": {
    "inkPrimary": "#081C2E",
    "energySecondary": "#38BDF8",
    "coreGlow": "#F0F9FF",
    "sporeAccent": "#0284C7"
  },
  "bgMode": "checker",
  "channelMode": "composite",
  "brush": {
    "bristleCount": 24,
    "strokeThickness": 1.2,
    "taperStart": 0.9,
    "taperEnd": 0.95,
    "dryBrushGap": 0.34,
    "curvature": 1,
    "angle": 0,
    "arcSweep": 1
  },
  "dynamics": {
    "splatterCount": 28,
    "splatterSpread": 1.4,
    "hookWaves": 4,
    "erosionStrength": 0.9,
    "erosionScale": 1.1,
    "glowIntensity": 1.35,
    "colorOffset": 1.15,
    "jitterAmount": 0.3
  },
  "rough": {
    "roughness": 1,
    "bowing": 0.85,
    "outlineWidth": 1.5,
    "fillStyle": "solid",
    "celSteps": 3
  },
  "totalFrames": 16,
  "fps": 16,
  "seed": 8472,
  "frameSize": 128
}
```

---

## Catálogo Completo das 12 Técnicas Procedurais do Motor

# Técnica #01: PRNG Determinístico (Mulberry32) & Ruído Fractal FBM 2D

> **Subtítulo**: Coerência temporal entre os 16 quadros sem cintilação (flicker) aleatória  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts`  
> **Origem Estética**: Fundação Matemática Procedural  
> **Arquétipo de Demonstração**: `crescent` (Meia-Lua Caligráfica)

---

## 1. Visão Geral & Anatomia Visual

Em animações procedurais de 16 quadros, usar Math.random() faz com que as cerdas, ilhas de tinta e gotas pisquem caoticamente a cada frame. O motor utiliza um gerador pseudo-aleatório determinístico de 32 bits (Mulberry32) combinado com Value Noise 2D suavizado por curva Hermite cúbica e Movimento Browniano Fracionário (FBM de 3 oitavas). Assim, cada cerda e cada gota mantém sua identidade física do quadro 1 ao 16.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `PRNG Mulberry32: estado inteiro de 32 bits incrementado por 0x6D2B79F5 a cada chamada, garantindo distribuição uniforme em [0, 1).`
2. `Interpolação Hermite (Smoothstep): u = xf² · (3 - 2·xf) e v = yf² · (3 - 2·yf) para derivadas contínuas nas bordas da grade.`
3. `FBM 2D de 3 Oitavas: FBM(x, y, seed) = 0.55 · N(x, y, s) + 0.30 · N(2.15x + 13.7, 2.15y + 7.3, s + 101) + 0.15 · N(4.4x - 5.2, 4.4y + 19.1, s + 307).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Derive a semente de cada sub-elemento deterministicamente: ex. bristleSeed = config.seed + b * 73.
- [x] Use o mesmo seed em todos os 16 frames da mesma animação para que a erosão corroa exatamente as mesmas manchas ao longo do tempo.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: JAMAIS chame Math.random() dentro do loop de renderização de frames.
- [ ] **PROIBIDO**: Não use ruído puro de 1 única oitava para erosão de tinta, pois gera manchas circulares artificiais; use sempre FBM de 3 oitavas.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `config.seed` | `1000 – 99999` | Semente mestre que define o DNA único do efeito |
| `dynamics.erosionScale` | `0.5 – 2.5` | Frequência espacial do ruído FBM 2D |
| `dynamics.jitterAmount` | `0.0 – 1.0` | Amplitude de perturbação orgânica da curva |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Caligráfico #06: Dinâmica de Pincel Seco e Tinta Abissal** (`/assets/aistudio/image_0be540a7.png`)
  - *Anatomia*: Demonstra a transição entre a pressão inicial máxima do pincel (cabeça carregada de tinta) e a abertura das cerdas na metade final do golpe.
  - *Paleta Dominante*: `#090D16`, `#38BDF8`, `#E0F2FE`
- **Matriz 4×4: Corte Meia-Lua Caligráfico (#8BE36A)** (`/assets/aistudio/meia-lua-pintado-8be36a-128px_548e5cf4.png`)
  - *Anatomia*: O arquétipo mestre de slash 2D: ataque explosivo que atinge 90% do arco no frame 3, brilha no ápice e sofre erosão celular da cauda para a ponta até o frame 15.
  - *Paleta Dominante*: `#0B1911`, `#8BE36A`, `#FFFFFF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
export function createSeededRandom(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const hash = (ix: number, iy: number) => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);

  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

export function fbmNoise2D(x: number, y: number, seed: number): number {
  const v1 = sampleNoise2D(x, y, seed);
  const v2 = sampleNoise2D(x * 2.15 + 13.7, y * 2.15 + 7.3, seed + 101);
  const v3 = sampleNoise2D(x * 4.4 - 5.2, y * 4.4 + 19.1, seed + 307);
  return v1 * 0.55 + v2 * 0.3 + v3 * 0.15;
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "PRNG Determinístico (Mulberry32) & Ruído Fractal FBM 2D" seguindo exatamente a especificação acima.
Para replicar a estabilidade temporal deste motor: implemente primeiro createSeededRandom(seed) e fbmNoise2D(x, y, seed). Todo deslocamento de cerda, tamanho de gota ou corte de erosão nos 16 frames deve ser função pura de (frameIndex, t, bristleIndex, seed).
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #02: Amostradores de Curvas Paramétricas (Arco Polar 3D Tilt, Bézier Quadrática e Cúbica S-Curve)

> **Subtítulo**: Geração de espinhas dorsais Point2D com vetores normais analíticos para espessura e camadas  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts & src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Cinemática Caligráfica & Espadas 2D  
> **Arquétipo de Demonstração**: `capoeira_meia_lua_compasso` (06. Capoeira · Meia-Lua de Compasso)

---

## 1. Visão Geral & Anatomia Visual

Todo efeito de ataque, onda, chicote ou pétala de fogo começa com a amostragem de uma curva espinhal discretizada em 60 a 110 pontos (Point2D). Cada ponto armazena (x, y), o parâmetro normalizado t ∈ [0, 1] e o vetor unitário normal externo (nx, ny) calculado pela derivada analítica da curva. É esse vetor normal que permite deslocar as cerdas lateralmente e separar o canal de Tinta do canal de Energia.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Arco Polar / Elíptico com Tilt 3D: r(t) = r0 · (1 + spiralFactor · (t - 0.5)); rotação planar por tiltRadians.`
2. `Bézier Quadrática: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2; derivada B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1).`
3. `Bézier Cúbica (S-Curve): B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3.`
4. `Vetor Normal Unitário: (nx, ny) = (-dy / ||B'(t)||, dx / ||B'(t)||).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Calcule sempre a derivada analítica (dx, dy) para obter normais suaves sem degraus.
- [x] Aplique o jitter orgânico multiplicando sampleNoise2D pelo vetor normal (nx, ny), nunca alterando x e y independentemente.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Não use ctx.arc() nativo para golpes de espada, pois ele tem largura constante e não permite separar cerdas nem aplicar erosão progressiva.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `brush.curvature` | `0.2 – 2.0` | Controla a excentricidade elíptica ou arqueamento dos pontos de controle |
| `brush.arcSweep` | `0.3 – 1.6` | Extensão angular total varrida pelo golpe |
| `brush.angle` | `-180° – +180°` | Rotação global do plano da curva |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Caligráfico #07: Volutas e Espirais de Energia Elemental** (`/assets/aistudio/image_1739c4ad.png`)
  - *Anatomia*: Referência para vórtices, portais e redemoinhos que combinam braços espirais logarítmicos com aguada Tarashikomi no fundo.
  - *Paleta Dominante*: `#1E1B4B`, `#818CF8`, `#EEF2FF`
- **Matriz 4×4: Corte Meia-Lua Caligráfico (#8BE36A)** (`/assets/aistudio/meia-lua-pintado-8be36a-128px_548e5cf4.png`)
  - *Anatomia*: O arquétipo mestre de slash 2D: ataque explosivo que atinge 90% do arco no frame 3, brilha no ápice e sofre erosão celular da cauda para a ponta até o frame 15.
  - *Paleta Dominante*: `#0B1911`, `#8BE36A`, `#FFFFFF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
export interface Point2D {
  x: number;
  y: number;
  nx: number;
  ny: number;
  t: number;
}

export function sampleCubicCurve(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  steps = 96,
  jitterAmount = 0,
  seed = 1
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;

    let x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
    let y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;

    const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    if (jitterAmount > 0) {
      const j = (sampleNoise2D(t * 12, seed * 0.29, seed) - 0.5) * jitterAmount * 7.5;
      x += nx * j;
      y += ny * j;
    }
    pts.push({ x, y, nx, ny, t });
  }
  return pts;
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Amostradores de Curvas Paramétricas (Arco Polar 3D Tilt, Bézier Quadrática e Cúbica S-Curve)" seguindo exatamente a especificação acima.
Para replicar qualquer trajetória de ataque ou magia: gere primeiro um array Point2D[] contendo {x, y, nx, ny, t}. Todas as funções subsequentes de cerdas, ondas, chamas ou cristais consomem esse array padronizado.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #03: Fita Caligráfica Multi-Cerdas Sumi-e com Efeito Kasure (Flying-White)

> **Subtítulo**: Simulação de 10 a 38 filamentos individuais de pincel com pressão variável e ranhuras secas  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts & src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Pintura Caligráfica Japonesa Sumi-e (Suibokuga)  
> **Arquétipo de Demonstração**: `hyb_slash_blood_moon_scythe` (123. Slash · Ceifa da Lua de Sangue (Foice 270°))

---

## 1. Visão Geral & Anatomia Visual

Na caligrafia japonesa Sumi-e, um golpe rápido de pincel não produz um bloco chapado: as cerdas se abrem deixando trilhas brancas onde o papel aparece (técnica Kasure ou Flying-White). O motor divide a largura máxima do traço em N filamentos indexados por u ∈ [-1, +1]. Cada filamento possui seu próprio ponto de início/fim ligeiramente defasado, sua própria oscilação senoidal lateral e um envelope de pressão que cria uma cabeça arredondada (gota de apoio do pincel) e uma cauda afiada como lâmina.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Posição normalizada da cerda na ponteira: u = (b / (bristleCount - 1)) * 2 - 1 ∈ [-1, 1].`
2. `Lacuna de Pincel Seco (Kasure): se |u| ∈ (0.2, 0.82) e rand() < dryBrushGap * 0.55, a cerda é omitida ou interrompida, criando o veio vazio.`
3. `Envelope Caligráfico de Pressão: E(t) = sin(min(1, 1.35·t) · π/2) · (1 - t)^(0.35 + 1.15·taperEnd) · 1.65 + headProfile · (1 - t) · 0.85.`
4. `Convergência na Ponta (Spread Factor): spread(t) = (1 - 0.72·t)^0.75 faz as cerdas convergirem na ponta da lâmina.`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Construa cada segmento contínuo de cerda como um polígono fechado (leftEdge indo de 0 a N, rightEdge voltando de N a 0) preenchido com ctx.fill() para bordas ultra-afiadas.
- [x] Adicione a gota de entrada do pincel (roundHeadCap) no início do traço nos primeiros quadros.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Não desenhe apenas uma linha grossa com ctx.lineWidth = 30; sem a subdivisão em cerdas (bristleCount >= 12), o efeito perde toda a textura caligráfica.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `brush.bristleCount` | `8 – 40` | Quantidade de filamentos individuais do pincel |
| `brush.dryBrushGap` | `0.0 – 0.85` | Intensidade das ranhuras brancas de pincel seco (Kasure) |
| `brush.taperStart / taperEnd` | `0.1 – 1.0` | Afilamento da cabeça e da cauda da pincelada |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Sumi-e #03: Fitas Caligráficas de Fogo com Efeito Kasure** (`/assets/aistudio/image_ca12ac32.png`)
  - *Anatomia*: Traços ascendentes em S com pressão máxima na base arredondada e chicoteamento rápido no ápice, deixando filamentos brancos expostos (Kasure / Flying-White) e línguas finas desprendidas que flutuam acima da chama principal.
  - *Paleta Dominante*: `#171312`, `#C2410C`, `#FDE68A`
- **Matriz 4×4: Círculo Zen Ensō Verde (#8BE36A)** (`/assets/aistudio/enso-pintado-8be36a-128px_eb52b886.png`)
  - *Anatomia*: Anel caligráfico traçado em alta velocidade nos 5 primeiros frames, seguido por rotação sutil e erosão celular em ilhas de nanquim.
  - *Paleta Dominante*: `#0F1F17`, `#8BE36A`, `#F0FDF4`
- **Matriz 4×4: Corte Meia-Lua Caligráfico (#8BE36A)** (`/assets/aistudio/meia-lua-pintado-8be36a-128px_548e5cf4.png`)
  - *Anatomia*: O arquétipo mestre de slash 2D: ataque explosivo que atinge 90% do arco no frame 3, brilha no ápice e sofre erosão celular da cauda para a ponta até o frame 15.
  - *Paleta Dominante*: `#0B1911`, `#8BE36A`, `#FFFFFF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// Envelope de pressão e posicionamento lateral de cada cerda b ∈ [0, actualBristles)
const u = actualBristles === 1 ? 0 : (b / (actualBristles - 1)) * 2 - 1;
const headProfile = Math.pow(Math.min(1, localT * 4.5), 1 - taperStart * 0.7);
const tailProfile = Math.pow(Math.max(0, 1 - localT), 0.35 + taperEnd * 1.15);
const envelope =
  Math.sin(Math.min(1, localT * 1.35) * Math.PI * 0.5) * tailProfile * 1.65 +
  headProfile * (1 - localT) * 0.85;

const spreadFactor = Math.pow(1 - localT * 0.72, 0.75);
const lateralCenter =
  offsetNormal +
  u * maxWidth * 0.52 * spreadFactor +
  Math.sin(localT * Math.PI * 3 + b) * (dryBrushGap * 2.2);

const halfThick = Math.max(0.4, bristleWidthWeight * envelope * 0.55);
leftEdge.push({
  x: pt.x + pt.nx * (lateralCenter - halfThick),
  y: pt.y + pt.ny * (lateralCenter - halfThick),
});
rightEdge.push({
  x: pt.x + pt.nx * (lateralCenter + halfThick),
  y: pt.y + pt.ny * (lateralCenter + halfThick),
});
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Fita Caligráfica Multi-Cerdas Sumi-e com Efeito Kasure (Flying-White)" seguindo exatamente a especificação acima.
Para replicar o traço Sumi-e Kasure: itere sobre actualBristles filamentos, calcule leftEdge e rightEdge somando pt.nx e pt.ny multiplicados por lateralCenter ± halfThick, e interrompa o polígono (flushSegment) sempre que o ruído FBM ficar abaixo do limiar de erosão.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #04: Erosão Celular Progressiva por Limiar de Ruído & Gotas Centrífugas

> **Subtítulo**: Dissolução orgânica da tinta em ilhas isoladas de nanquim em vez de fade-out de opacidade  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts`  
> **Origem Estética**: Animação 2D Tradicional de Efeitos (Sakuga VFX)  
> **Arquétipo de Demonstração**: `water_slash` (Corte d’Água / Éter Fluido)

---

## 1. Visão Geral & Anatomia Visual

O erro mais comum em VFX 2D programados é desaparecer o efeito reduzindo globalAlpha de 1 para 0 (fade-out fantasma). Na animação tradicional japonesa (Sakuga), o golpe mantém 100% de opacidade nos fragmentos restantes enquanto é corroído por dentro, quebrando-se primeiro na cauda e nas bordas laterais até virar pequenas ilhas e gotas centrífugas que voam na direção tangente.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Curva de Alcance da Cabeça (Attack Snap): headReach = min(1, 1 - (1 - frameNorm)^3.4) — atinge 85% do arco já no frame 3.`
2. `Curva de Retração da Cauda: tailRetract = max(0, (frameNorm - 0.18) / 0.82)^1.55 * 0.78.`
3. `Viés de Erosão na Cauda e Bordas: tailBias = (1 - localT) * 0.35 + |u| * 0.18.`
4. `Condição de Corte Celular: se fbmNoise2D(pt.t * 8.5 * scale, b * 0.35, seed) < erosionProgress * 0.92 + tailBias - 0.18, o ponto é descartado e o segmento atual da cerda é fechado.`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Mantenha a opacidade alta (0.85 a 1.0) enquanto aumenta erosionProgress de 0.0 (frame 4) até 0.95 (frame 15).
- [x] Alongue as gotas centrífugas (splatters) na direção do vetor velocidade (tangente + normal) proporcionalmente à distância percorrida.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: NUNCA desapareça um corte de espada apenas aplicando ctx.globalAlpha = 1 - frameNorm.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `dynamics.erosionStrength` | `0.2 – 1.5` | Velocidade de corrosão celular nos quadros finais |
| `dynamics.splatterCount` | `0 – 60` | Quantidade de gotas de tinta projetadas pela força centrífuga |
| `dynamics.splatterSpread` | `0.5 – 2.5` | Alcance radial e dispersão das gotas |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Matriz 4×4: Corte d’Água Pintado (#8BE36A)** (`/assets/aistudio/corte-dagua-pintado-8be36a-128px_54aad902.png`)
  - *Anatomia*: Golpe fluido que serpenteia pela tela com ganchos de espuma na borda externa e dissolução em gotas alongadas.
  - *Paleta Dominante*: `#0D1F14`, `#8BE36A`, `#ECFDF5`
- **Matriz 4×4: Explosão Caligráfica (#8BE36A)** (`/assets/aistudio/explosao-pintado-8be36a-128px_08a56278.png`)
  - *Anatomia*: Chicotes radiais de nanquim e energia que se abrem a partir do centro com dezenas de gotas alongadas projetadas pela força centrífuga.
  - *Paleta Dominante*: `#0D1F14`, `#8BE36A`, `#F0FDF4`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// Cálculo de janela cinemática e erosão celular dentro do loop da espinha
const headReach = Math.min(1, 1 - Math.pow(1 - frameNorm, 3.4));
const tailRetract = frameNorm < 0.18 ? 0 : Math.pow((frameNorm - 0.18) / 0.82, 1.55) * 0.78;
const erosionProgress =
  frameNorm < 0.25 ? 0 : Math.pow((frameNorm - 0.25) / 0.75, 1.25) * config.dynamics.erosionStrength;

if (erosionProgress > 0.02) {
  const nVal = fbmNoise2D(pt.t * 8.5 * erosionScale + u * 2.2, b * 0.35 + seed * 0.05, seed);
  const tailBias = (1 - localT) * 0.35 + Math.abs(u) * 0.18;
  if (nVal < erosionProgress * 0.92 + tailBias - 0.18) {
    if (inSegment) flushSegment(); // Quebra a cerda em ilhas orgânicas!
    continue;
  }
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Erosão Celular Progressiva por Limiar de Ruído & Gotas Centrífugas" seguindo exatamente a especificação acima.
Para replicar a dissolução Sakuga: mantenha as cores sólidas e use fbmNoise2D comparado com um limiar crescente (erosionProgress + tailBias). Quando o ruído for menor que o limiar, feche o polígono atual (flushSegment) e inicie outro mais adiante.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #05: Pétalas de Chama Aquareladas em S-Curve com Estrias Fibrosas & Fitas Desprendidas

> **Subtítulo**: Síntese de fogo oriental combinando línguas curvas sobrepostas, cerdas internas e pontas intensas  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Aquarela Oriental Suibokuga & Caligrafia de Fogo  
> **Arquétipo de Demonstração**: `hyb_slash_crimson_phoenix_arc` (122. Slash · Talho da Fênix Carmesim (Odachi S-Curve))

---

## 1. Visão Geral & Anatomia Visual

Inspirada diretamente nos estudos de chamas aquareladas (/assets/aistudio/image_bab088c8.png e /assets/aistudio/image_ca12ac32.png), esta técnica constrói o fogo como uma coroa de pétalas sinuosas em curva S (Bézier cúbica). Ao contrário do fogo ocidental genérico (que é opaco no centro e transparente na ponta), a aquarela oriental Suibokuga acumula pigmento escuro e intenso nas pontas e bordas superiores das pétalas, percorrendo o interior da língua com 5 a 7 estrias fibrosas de pincel e soltando fitas caligráficas finas (wisps) no ar.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Envelope de Barriga da Pétala: bellyEnv(t) = sin(t^0.58 · π) · (1 - t)^0.7 · 1.48.`
2. `Assimetria Lateral: borda esquerda expandida por 1.0 * halfW, borda direita contraída por 0.88 * halfW.`
3. `Gradiente Aquarelado de 5 Paradas: t=0.0 (baseColor luminosa) → t=0.28 (baseColor) → t=0.68 (midColor) → t=0.92 (tipColor saturada) → t=1.0 (inkColor escura na ponta extrema).`
4. `Estrias Fibrosas Internas: N curvas acompanhando pt + pt.n * (u * 0.36 * maxBellyWidth * bellyEnv).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Sobreponha pétalas em 2 ou 3 camadas (camada traseira maior e mais escura, camada frontal menor e mais incandescente).
- [x] Adicione de 2 a 5 fitas caligráficas desprendidas (drawDetachedSumiFlameWisp) subindo acima das pontas principais.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Nunca desenhe fogo usando triângulos retos ou círculos borrados com shadowBlur.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `maxBellyWidth` | `8px – 38px` | Largura máxima da barriga da pétala de chama |
| `striationCount` | `3 – 8` | Número de nervuras/estrias de pincel dentro de cada língua |
| `rough.outlineWidth` | `0.5 – 3.0` | Espessura do acento caligráfico Rough.js na borda da pétala |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Suibokuga #02: Pétalas de Chama Aquareladas em S-Curve** (`/assets/aistudio/image_bab088c8.png`)
  - *Anatomia*: Em vez de triângulos rígidos ou gradientes radiais genéricos, o fogo é construído por pétalas em curva S (Bézier cúbica) que nascem largas na base luminosa e afilam em pontas escuras/saturadas no topo, percorridas por 5 a 7 estrias fibrosas de cerdas.
  - *Paleta Dominante*: `#FFFBEB`, `#FF8C59`, `#9A1B12`
- **Estudo Sumi-e #03: Fitas Caligráficas de Fogo com Efeito Kasure** (`/assets/aistudio/image_ca12ac32.png`)
  - *Anatomia*: Traços ascendentes em S com pressão máxima na base arredondada e chicoteamento rápido no ápice, deixando filamentos brancos expostos (Kasure / Flying-White) e línguas finas desprendidas que flutuam acima da chama principal.
  - *Paleta Dominante*: `#171312`, `#C2410C`, `#FDE68A`
- **Matriz 4×4: Círculo Zen Ensō Solar (#FF8C59)** (`/assets/aistudio/enso-pintado-ff8c59-128px_fd022a5d.png`)
  - *Anatomia*: Variação solar do Ensō onde a borda externa do anel emite pétalas de chama S-Curve tangenciais que giram ao redor do selo.
  - *Paleta Dominante*: `#2A120A`, `#FF8C59`, `#FFFBEB`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
function drawFlamePetalTongue(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  config: VFXConfig,
  scale: number,
  opts: FlamePetalTongueOpts
) {
  const spine = sampleSuibokugaCubic(
    { x: opts.rootX, y: opts.rootY },
    { x: opts.ctrl1X, y: opts.ctrl1Y },
    { x: opts.ctrl2X, y: opts.ctrl2Y },
    { x: opts.tipX, y: opts.tipY },
    56, config.dynamics.jitterAmount * 0.18, opts.seed
  );

  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];
  for (const pt of spine) {
    const bellyEnv = Math.sin(Math.pow(pt.t, 0.58) * Math.PI) * Math.pow(Math.max(0, 1 - pt.t), 0.7) * 1.48;
    const halfW = opts.maxBellyWidth * 0.5 * bellyEnv;
    leftPts.push([pt.x - pt.nx * halfW, pt.y - pt.ny * halfW * 0.92]);
    rightPts.push([pt.x + pt.nx * halfW * 0.88, pt.y + pt.ny * halfW]);
  }
  // Preenche polígono com gradiente linear de 5 paradas + estrias internas + borda Rough.js
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Pétalas de Chama Aquareladas em S-Curve com Estrias Fibrosas & Fitas Desprendidas" seguindo exatamente a especificação acima.
Para replicar chamas Suibokuga S-Curve: use pontos de controle ctrl1 e ctrl2 em lados opostos do eixo raiz-ponta para forçar a curvatura em S, aplique o gradiente de 5 paradas que escurece na ponta extrema (t=1.0) e desenhe as estrias internas acompanhando a normal da curva.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #06: Cristas de Onda Ukiyo-e (Hokusai), Correntes Listradas & Garras Fractais de Espuma

> **Subtítulo**: Síntese da Grande Onda de Kanagawa com faixas longitudinais Azul-da-Prússia e garras na crista  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Xilogravura Japonesa Ukiyo-e (Katsushika Hokusai)  
> **Arquétipo de Demonstração**: `hyb_slash_great_wave_katana` (121. Slash · Corte da Grande Onda (Katana Hokusai))

---

## 1. Visão Geral & Anatomia Visual

Baseada no estudo de "A Grande Onda de Kanagawa" (/assets/aistudio/image_a2117501.png), esta técnica divide qualquer efeito aquático ou maré de sangue/almas em quatro componentes anatômicos clássicos do Ukiyo-e: (1) o corpo côncavo da vaga com gradiente profundo; (2) as 5 faixas paralelas longitudinais de correnteza que percorrem o interior da barriga da onda; (3) os cachos fractais de garras de espuma ("foam claws") que se curvam na ponta da crista e no dorso; e (4) as gotículas circulares de spray marinho contornadas a nanquim.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Envelope Muscular da Vaga: waveEnv(t) = sin(t^0.55 · π · 0.92) · (1 - 0.35·t) + 0.35·(1 - t).`
2. `Correntes Longitudinais Internas: 5 curvas paralelas em u ∈ [-0.72, +0.72] deslocadas por u * maxWidth * 0.38 * waveEnv(t), alternando coreGlow e inkPrimary.`
3. `Geometria de Cada Garra de Espuma: 2 curvas quadráticas convergindo para tip = (cx + cos(ang + curlDir*0.55)*len, cy + sin(ang + curlDir*0.55)*len).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Plante um cluster principal de 5 a 7 garras de espuma na ponta da crista (t = 1.0) e um cluster secundário de 3 garras no dorso da onda (t ≈ 0.62).
- [x] Contorne cada garra de espuma com rc.curve() em nanquim escuro (inkPrimary) para preservar a estética de xilogravura Ukiyo-e.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Não represente água apenas como círculos azuis translúcidos; sem as faixas longitudinais na barriga da onda e as garras articuladas na ponta, o efeito perde a assinatura Hokusai.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `clawCount` | `3 – 7` | Número de garras de espuma articuladas em cada crista de quebra |
| `curlDir` | `+1 ou -1` | Sentido de enrolamento do gancho da onda e das garras |
| `dynamics.hookWaves` | `1 – 8` | Quantidade de ondas secundárias ao longo do arco |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Ukiyo-e #01: A Grande Onda de Hokusai (Garras de Espuma & Correntes)** (`/assets/aistudio/image_a2117501.png`)
  - *Anatomia*: Corpo côncavo da onda estruturado por listras paralelas longitudinais alternando Azul-da-Prússia profundo, azul cerúleo e ciano pálido. Na crista de quebra, a espuma se divide em garras curvas articuladas ("foam claws") contornadas a nanquim fino com gotículas brancas suspensas.
  - *Paleta Dominante*: `#081C2E`, `#38BDF8`, `#F0F9FF`
- **Matriz 4×4: Corte d’Água Pintado (#8BE36A)** (`/assets/aistudio/corte-dagua-pintado-8be36a-128px_54aad902.png`)
  - *Anatomia*: Golpe fluido que serpenteia pela tela com ganchos de espuma na borda externa e dissolução em gotas alongadas.
  - *Paleta Dominante*: `#0D1F14`, `#8BE36A`, `#ECFDF5`
- **Amostra Exportada: Gêiser de Vapor & Maré (128px)** (`/assets/aistudio/elem_water_steam_geyser-pintado-128px__1__cc30ed63.png`)
  - *Anatomia*: Coluna de água pressurizada que rompe o solo com garras de espuma Hokusai na coroa e bancos de vapor Kumo na base.
  - *Paleta Dominante*: `#082F49`, `#38BDF8`, `#F0F9FF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// 1. Corpo da onda com 5 faixas longitudinais Hokusai + 2. Cluster de Garras na Crista
const stripeCount = 5;
for (let s = 0; s < stripeCount; s++) {
  const u = (s / (stripeCount - 1)) * 1.44 - 0.72;
  const isLightStripe = s % 2 === 0;
  ctx.strokeStyle = rgbaStr(isLightStripe ? palette.coreGlow : palette.inkPrimary, alpha * 0.82);
  ctx.beginPath();
  for (let i = 1; i < spine.length - 3; i += 2) {
    const pt = spine[i];
    const waveEnv = Math.sin(Math.pow(pt.t, 0.55) * Math.PI * 0.92) * (1 - pt.t * 0.35) + (1 - pt.t) * 0.35;
    const offset = u * maxWidth * 0.38 * waveEnv;
    const sx = pt.x + pt.nx * offset;
    const sy = pt.y + pt.ny * offset;
    if (i === 1) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
}
// Em seguida invoca drawHokusaiFoamClawCluster na ponta (t=1.0) e no dorso (t=0.62)
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Cristas de Onda Ukiyo-e (Hokusai), Correntes Listradas & Garras Fractais de Espuma" seguindo exatamente a especificação acima.
Para replicar o estilo Hokusai Ukiyo-e em cortes de espada, tsunamis ou marés de sangue: use drawHokusaiWaveCrest combinando o preenchimento em gradiente, as 5 listras longitudinais internas e os clusters de garras brancas contornadas por Rough.js.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #07: Bancos de Nuvens & Fumaça Ukiyo-e (Kumo) com Volutas em C-Hook e Caracóis Internos

> **Subtítulo**: Substituição total de esferas empilhadas por volutas ornamentais com cauda afilada e espiral interna  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Gravuras Tradicionais de Nuvens Ukiyo-e (Kumo)  
> **Arquétipo de Demonstração**: `solid_ref_fumaca` (Ref Sólida 02 · Fumaça Pintada)

---

## 1. Visão Geral & Anatomia Visual

Inspirada diretamente nas referências /assets/aistudio/image_6646cbb0.png e /assets/aistudio/image_fdddfadd.png, esta técnica proíbe o uso de "bolhas/esferas empilhadas" para desenhar fumaça, vapor ou névoa. Em vez disso, cada nuvem é uma voluta caligráfica (drawUkiyoeCloudScrollVolute) composta por uma crista superior dividida em lóbulos senoidais suaves, uma cauda inferior côncava que afila até uma ponta fina, linhas de fluxo paralelas no ventre e um caracol espiralado em C-Hook na cabeça da voluta.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Crista Superior Lobulada: lóbulo(t) = 0.55 + 0.45 · |sin(t · π · lobeCount)|.`
2. `Envelope da Cauda Afilada: tailTaper(t) = sin(t^0.62 · π) · 1.28.`
3. `Espiral Interna do Caracol (C-Hook): para i ∈ [0, 22], u = i/22, ang = headAng + flip * (0.5 + u * π * 2.35), r = curlR * (1 - u * 0.78).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Desenhe sempre o caracol interno (inner C-hook scroll) com traço mais espesso no início e afilado no centro do caracol.
- [x] Agrupe de 3 a 6 volutas em camadas com drawUkiyoeCloudBank para formar bancos de neblina, fumaça vulcânica ou poeira sísmica.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: PROIBIDO usar loops de ctx.arc() ou rc.circle() sobrepostos ("cotton-ball smoke") para representar fumaça ou nuvens.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `lobeCount` | `2 – 4` | Número de ondulações na crista superior da voluta Kumo |
| `curlRadius` | `6px – 28px` | Raio do caracol em C-Hook na extremidade da nuvem |
| `puffCount` | `3 – 8` | Quantidade de volutas Kumo combinadas no banco de fumaça |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Ukiyo-e #04: Bancos de Nuvens Kumo com Volutas e Caudas Afiladas** (`/assets/aistudio/image_6646cbb0.png`)
  - *Anatomia*: Bancos horizontais e diagonais de nuvens formados por cristas lobuladas superiores, caudas longas que afilam como fitas de vento e caracóis internos duplos em forma de vírgula/C-Hook.
  - *Paleta Dominante*: `#0F172A`, `#94A3B8`, `#F8FAFC`
- **Estudo Ukiyo-e #05: Asas de Fumaça Ornamentais em Gancho C-Hook** (`/assets/aistudio/image_fdddfadd.png`)
  - *Anatomia*: Volutas de fumaça que se abrem como asas laterais a partir de um eixo central, cada lóbulo terminando em um caracol interno enrolado para dentro com traço mais grosso na cabeça e fino na cauda.
  - *Paleta Dominante*: `#1E293B`, `#CBD5E1`, `#FFFFFF`
- **Matriz 4×4: Fumaça & Nuvens Kumo (#B3B3D1)** (`/assets/aistudio/fumaca-pintado-b3b3d1-128px_4caaac54.png`)
  - *Anatomia*: Bancos de fumaça estilizados com caracóis internos e caudas afiladas que se afastam do centro enquanto se dissolvem.
  - *Paleta Dominante*: `#1E2230`, `#B3B3D1`, `#F8FAFC`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// Construção da Voluta Kumo: crista lobulada + cauda afilada + caracol interno em C-Hook
for (let i = 0; i < spine.length; i++) {
  const pt = spine[i];
  const t = pt.t;
  const lobeWave = 0.58 + 0.42 * Math.abs(Math.sin(t * Math.PI * lobeCount));
  const tailEnv = Math.sin(Math.pow(t, 0.62) * Math.PI) * 1.28;
  const upperW = maxThickness * 0.62 * lobeWave * tailEnv;
  const lowerW = maxThickness * 0.28 * Math.sin(t * Math.PI);

  upperEdge.push([pt.x + pt.nx * flip * upperW, pt.y + pt.ny * flip * upperW]);
  lowerEdge.push([pt.x - pt.nx * flip * lowerW, pt.y - pt.ny * flip * lowerW]);
}
// Caracol espiralado C-Hook na cabeça da voluta (t -> 1.0):
for (let i = 0; i <= 22; i++) {
  const u = i / 22;
  const ang = headAng + flip * (0.4 + u * Math.PI * 2.25);
  const r = curlRadius * (0.92 - u * 0.76);
  spiralPts.push([curlCenterX + Math.cos(ang) * r, curlCenterY + Math.sin(ang) * r]);
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Bancos de Nuvens & Fumaça Ukiyo-e (Kumo) com Volutas em C-Hook e Caracóis Internos" seguindo exatamente a especificação acima.
Para replicar nuvens e fumaça Ukiyo-e Kumo: construa polígonos alongados com borda superior modulada por |sin(t * PI * lobeCount)|, borda inferior côncava afilada e finalize a cabeça da voluta com uma espiral interna de 1.2 voltas.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #08: Núcleo Sólido 100% Opaco com Oclusão Real & Línguas Envolventes para Bólidos e Cometas

> **Subtítulo**: Eliminação do aspecto de "adesivo translúcido" através de oclusão em 3 camadas (Cauda → Esfera Opaca → Abraço)  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Pintura de Projéteis & Meteoros Action RPG  
> **Arquétipo de Demonstração**: `elem_fire_meteor_bolide` (106. Fogo · Bólido de Magma)

---

## 1. Visão Geral & Anatomia Visual

Em projéteis como Cometas, Bólidos de Magma, Crânios Flamejantes e Corações Sanguíneos (/assets/aistudio/cometa-pintado-73bff2-128px_e64dcb01.png e /assets/aistudio/elem_fire_meteor_bolide-pintado-128px_6494c328.png), se o núcleo for desenhado com opacidade < 1.0 ou depois das línguas sem oclusão, as linhas da cauda aparecem atravessando a cabeça do projétil como um adesivo colado por cima. A solução arquitetural opera em 3 passos estritos de Z-order: (Passo 1) Cauda traseira de pétalas S-Curve; (Passo 2) Esfera deformada por ruído FBM preenchida com alpha = 1.0 (100% opaca) que apaga todas as raízes internas; (Passo 3) 3 línguas frontais/laterais que nascem na superfície da esfera e a abraçam em direção à cauda.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Deformação Orgânica do Núcleo: R(θ) = R0 · (1 + (fbmNoise2D(cos θ · 1.6, sin θ · 1.6, seed) - 0.5) · wobbleAmount).`
2. `Passo 1 de Oclusão: ctx.fillStyle = palette.energySecondary (alpha 1.0 sólido) preenchendo todo o polígono do núcleo.`
3. `Passo 2 de Volume Radial (Alpha 1.0 em todas as paradas): stop 0.0 (#FFFFFF no nariz frontal) → stop 0.38 (coreGlow) → stop 0.75 (energySecondary) → stop 1.0 (mix(inkPrimary, energySecondary, 0.35)).`
4. `Passo 3 (Wrapping Tongues): pétalas S-Curve ancoradas em θ = ±0.42π na borda do núcleo, curvando-se para trás.`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Garanta que todas as paradas do gradiente radial dentro de drawSolidOpaqueCoreSphere tenham opacidade 1.0 (use cores Hex puras, nunca rgba com alpha < 1).
- [x] Desenhe sempre 2 a 4 línguas envolventes (wrapping tongues) APÓS a esfera opaca para integrar o núcleo ao fluxo da cauda.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Nunca deixe linhas de cauda ou estrias de pincel visíveis através do centro da cabeça do cometa/meteoro.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `wobbleAmount` | `0.12 – 0.35` | Deformação orgânica da silhueta da cabeça do projétil |
| `dynamics.glowIntensity` | `0.8 – 2.2` | Intensidade do foco branco frontal e das línguas de fogo |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Matriz 4×4: Cometa Pintado (#73BFF2)** (`/assets/aistudio/cometa-pintado-73bff2-128px_e64dcb01.png`)
  - *Anatomia*: Projétil viajando do canto superior esquerdo para o inferior direito com cabeça esférica opaca envolvida por línguas de energia e impacto explosivo nos quadros 11 a 16.
  - *Paleta Dominante*: `#0B2545`, `#73BFF2`, `#F0F9FF`
- **Amostra Exportada: Bólido Meteoro de Magma (128px)** (`/assets/aistudio/elem_fire_meteor_bolide-pintado-128px_6494c328.png`)
  - *Anatomia*: Demonstra a oclusão perfeita da esfera sólida do meteoro sobre a cauda de chamas em S-Curve e a transição para cratera de fumaça Kumo no impacto.
  - *Paleta Dominante*: `#240B06`, `#FF6B35`, `#FFF7ED`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// Ordem estrita de Z-Ordering para Projéteis e Bólidos:
// 1. Desenha as pétalas traseiras da cauda (que nascem dentro de cx, cy)
drawTailFlamePetals(ctx, rc, headX, headY, tailX, tailY, config);

// 2. Desenha o Núcleo 100% Opaco (ocluindo totalmente as raízes da cauda!)
drawSolidOpaqueCoreSphere(
  ctx, rc, headX, headY, coreRadius * 1.12, coreRadius * 0.94,
  dirAngle, palette, 0.22, config, scale, seed
);

// 3. Desenha as línguas envolventes que abraçam a lateral externa da esfera
drawFlamePetalTongue(ctx, rc, config, scale, {
  rootX: headX + Math.cos(dirAngle) * coreRadius * 0.55,
  rootY: headY + Math.sin(dirAngle) * coreRadius * 0.55,
  // Curva por cima/baixo da esfera em direção à cauda
  opaqueBase: true,
  ...
});
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Núcleo Sólido 100% Opaco com Oclusão Real & Línguas Envolventes para Bólidos e Cometas" seguindo exatamente a especificação acima.
Para replicar cometas, meteoros e projéteis sem efeito de "adesivo colado": siga rigorosamente a ordem (1) Cauda traseira -> (2) drawSolidOpaqueCoreSphere com preenchimento Hex 100% opaco -> (3) Pétalas envolventes ancoradas na superfície frontal/lateral da esfera.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #09: Aguada Suibokuga (Tarashikomi) com Borda de Sangria de Pigmento

> **Subtítulo**: Manchas orgânicas de aquarela japonesa onde o pigmento se concentra no anel externo  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Pintura Rinpa & Suibokuga Japonesa (Técnica Tarashikomi)  
> **Arquétipo de Demonstração**: `elem_water_healing_fountain` (103. Água · Fonte de Cura Cristalina)

---

## 1. Visão Geral & Anatomia Visual

Na pintura tradicional japonesa Tarashikomi (gotejamento de tinta ou cor sobre papel ainda úmido), a água empurra parte das partículas de pigmento para a borda externa da mancha, formando uma auréola sutilmente mais densa ("water-bloom rim") enquanto o interior permanece translúcido e suave. Esta técnica cria a atmosfera de fundo para magias elementais, portais, fontes de cura e explosões sem recorrer a filtros Gaussian Blur pesados.

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Polígono Amebóide de 32 Vértices: r(θ) = rBase · (1 + (fbmNoise2D(cos θ · 1.8, sin θ · 1.8, seed) - 0.5) · 0.34).`
2. `Gradiente Radial Tarashikomi: stop 0.0 (coreColor com alpha * 0.35) → stop 0.65 (edgeColor com alpha * 0.55) → stop 0.88 (edgeColor com alpha * 0.72 — pico de pigmento na borda úmida!) → stop 1.0 (alpha 0.0).`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Aplique a aguada Tarashikomi como primeira camada (background wash) antes de desenhar as cerdas Sumi-e, cristais ou ondas Hokusai.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Não use ctx.filter = "blur(12px)" em loops de tempo real de 16 quadros, pois degrada severamente a performance em lote; use o gradiente radial Tarashikomi com polígono ruidoso.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `dynamics.glowIntensity` | `0.5 – 2.5` | Opacidade e saturação da aguada de pigmento |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Suibokuga #02: Pétalas de Chama Aquareladas em S-Curve** (`/assets/aistudio/image_bab088c8.png`)
  - *Anatomia*: Em vez de triângulos rígidos ou gradientes radiais genéricos, o fogo é construído por pétalas em curva S (Bézier cúbica) que nascem largas na base luminosa e afilam em pontas escuras/saturadas no topo, percorridas por 5 a 7 estrias fibrosas de cerdas.
  - *Paleta Dominante*: `#FFFBEB`, `#FF8C59`, `#9A1B12`
- **Matriz 4×4: Portal & Vórtice Abissal (#B380F2)** (`/assets/aistudio/portal-pintado-b380f2-128px_1a493e52.png`)
  - *Anatomia*: Olho abissal escuro no centro rodeado por braços espirais de energia e pétalas curvadas que giram continuamente.
  - *Paleta Dominante*: `#1E1035`, `#B380F2`, `#FAF5FF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
function drawTarashikomiWashBlob(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  rotation: number, coreColor: string, edgeColor: string,
  alpha: number, seed: number
) {
  const steps = 32;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const n = fbmNoise2D(Math.cos(ang) * 1.8 + seed * 0.1, Math.sin(ang) * 1.8, seed);
    const deform = 1 + (n - 0.5) * 0.34;
    // Projeta vértice rotacionado (px, py)
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.1, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0.0, rgbaStr(coreColor, alpha * 0.42));
  grad.addColorStop(0.68, rgbaStr(edgeColor, alpha * 0.58));
  grad.addColorStop(0.90, rgbaStr(edgeColor, alpha * 0.74)); // Borda úmida Tarashikomi
  grad.addColorStop(1.0, rgbaStr(edgeColor, 0.0));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Aguada Suibokuga (Tarashikomi) com Borda de Sangria de Pigmento" seguindo exatamente a especificação acima.
Para replicar a aguada Tarashikomi: crie um polígono fechado deformado por fbmNoise2D e aplique um gradiente radial cuja opacidade sobe levemente em r = 0.90 (efeito de borda d’água) antes de zerar em r = 1.0.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #10: Geometria Poligonal Sólida Hand-Made com Rough.js (Cristais Facetados, Hachuras & Contorno)

> **Subtítulo**: Integração do motor vetorial Rough.js para silhuetas desenhadas à mão, cristais chanfrados e hachuras  
> **Módulo do Motor**: `src/engine/roughSolidEngine.ts`  
> **Origem Estética**: Ilustração Hand-Crafted 2D & Cel-Shading Analógico  
> **Arquétipo de Demonstração**: `elem_water_glacial_spikes` (101. Água/Gelo · Cristais Glaciais)

---

## 1. Visão Geral & Anatomia Visual

Para efeitos que exigem massa mineral, gelo, ossos, espadas pesadas ou pilares tectônicos (/assets/aistudio/cristais-de-gelo-pintado-8cd9ff-128px_4ca23f17.png), o motor integra a biblioteca Rough.js (rough.canvas(canvas)) com sementes determinísticas. Cada cristal ou fragmento ósseo é construído com geometria chanfrada dividida em duas faces longitudinais (face iluminada em coreGlow e face sombreada em energySecondary/inkPrimary), linhas internas de refração e contorno caligráfico duplo com tremor orgânico (roughness e bowing).

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Geometria do Cristal Chanfrado (6 Vértices): Base esquerda, Base direita, Ombro direito (72% da altura), Ponta aguda (100% da altura), Ombro esquerdo (72% da altura).`
2. `Bipartição Cel-Shaded: Polígono Esquerdo = [BaseC, BaseE, OmbroE, Ponta] (luz alta); Polígono Direito = [BaseC, Ponta, OmbroD, BaseD] (meio-tom/sombra).`
3. `Opções Determinísticas Rough.js: seed = config.seed + offset garante que as linhas duplas do Rough.js não tremam caoticamente entre frames.`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Passe sempre um seed inteiro determinístico no objeto Options do Rough.js (seed: Math.floor(config.seed + seedOffset)).
- [x] Permita alternar fillStyle entre "solid", "hachure", "cross-hatch" e "zigzag" para texturas de gravura.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Nunca chame rc.polygon() ou rc.curve() sem definir explicitamente a propriedade seed, pois o Rough.js usa Math.random() por padrão.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `rough.roughness` | `0.0 – 2.5` | Tremor orgânico do traço desenhado à mão |
| `rough.bowing` | `0.0 – 3.0` | Arqueamento das linhas poligonais |
| `rough.outlineWidth` | `0.5 – 3.5` | Espessura do contorno de nanquim |
| `rough.fillStyle` | `solid | hachure | cross-hatch | zigzag` | Estilo de preenchimento Rough.js |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Estudo Caligráfico #08: Cristais Facetados & Impacto Tectônico** (`/assets/aistudio/image_364fc3f2.png`)
  - *Anatomia*: Pilares hexagonais chanfrados com aresta central iluminada, face esquerda clara, face direita em sombra e trincas de impacto no solo.
  - *Paleta Dominante*: `#0C4A6E`, `#7DD3FC`, `#F0F9FF`
- **Matriz 4×4: Cristais de Gelo Pintado (#8CD9FF)** (`/assets/aistudio/cristais-de-gelo-pintado-8cd9ff-128px_4ca23f17.png`)
  - *Anatomia*: Conjunto de 5 a 7 colunas hexagonais pontiagudas que brotam em leque a partir do chão, exibindo facetas de luz/sombra bem marcadas e estilhaçamento final.
  - *Paleta Dominante*: `#082F49`, `#8CD9FF`, `#FFFFFF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
function makeFineRoughOptions(
  config: VFXConfig,
  scale: number,
  seedOffset: number,
  overrides: Partial<RoughOptions> = {}
): RoughOptions {
  const rp = getRoughParams(config);
  const palette = resolveSuibokugaPalette(config);
  return {
    roughness: rp.roughness * 0.65,
    bowing: rp.bowing * 0.8,
    stroke: rgbaStr(palette.inkPrimary, 0.82),
    strokeWidth: Math.max(0.45, rp.outlineWidth * 0.6 * scale),
    fillStyle: rp.fillStyle === 'solid' ? 'solid' : rp.fillStyle,
    fillWeight: Math.max(0.4, rp.outlineWidth * 0.38 * scale),
    hachureGap: Math.max(2.2, 3.5 * scale),
    seed: Math.max(1, Math.floor(config.seed + seedOffset)),
    ...overrides,
  };
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Geometria Poligonal Sólida Hand-Made com Rough.js (Cristais Facetados, Hachuras & Contorno)" seguindo exatamente a especificação acima.
Para replicar cristais, rochas e lâminas sólidas com Rough.js: preencha primeiro as duas facetas de cel-shading no Canvas 2D (face clara à esquerda da aresta central, face escura à direita) e finalize chamando rc.polygon(outerVertices, makeFineRoughOptions(...)) com seed fixo.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #11: Shader de Recolorização por Separação de 3 Canais (Web Canvas, Godot 4 & Unity URP)

> **Subtítulo**: Decomposição matemática de qualquer Sprite Sheet em pesos de Tinta, Energia e Núcleo Branco  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts & src/components/TechniqueInspector.tsx`  
> **Origem Estética**: Pipeline de Shaders para Engines de Jogos 2D  
> **Arquétipo de Demonstração**: `enso_sigil` (Selo Ensō & Geometria)

---

## 1. Visão Geral & Anatomia Visual

Tanto os efeitos gerados proceduralmente quanto as folhas PNG originais anexadas ao projeto seguem uma arquitetura de 3 canais cromáticos: (1) Corpo de Tinta Abissal (baixa luminância / nanquim escuro); (2) Crista de Energia Elemental (alta saturação cromática); e (3) Núcleo Incandescente (alta luminância em R, G e B simultaneamente). Isso permite recolorir instantaneamente qualquer folha para qualquer uma das 10 Escolas de Magia na CPU (ImageData) ou na GPU (Godot .gdshader / Unity HLSL), além de exportar a folha como Máscara RGB pura (#FF0000 = Tinta, #00FF00 = Energia, #0000FF = Núcleo).

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Luminância Perceptual: L = 0.299·R + 0.587·G + 0.114·B.`
2. `Peso do Núcleo Branco (Core Mask): W_core = (min(R, G, B))^2.2.`
3. `Peso da Energia Cromática (Energy Mask): W_energy = clamp(chroma * 2.1 + max(0, L - 0.18) * (1 - W_core), 0, 1).`
4. `Peso da Tinta Sumi-e (Ink Mask): W_ink = max(0, 1 - W_energy - W_core).`
5. `Cor Final Reconstruída: RGB_out = InkColor · W_ink + (EnergyColor · GlowBoost) · W_energy + CoreColor · W_core.`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Preserve sempre o canal Alpha original da textura (out.a = tex.a) para manter o anti-aliasing suave das cerdas.
- [x] Use o modo "shader_rgb_mask" quando quiser exportar uma única textura para a engine e recolori-la via Material/Shader em tempo real.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Não use multiplicação simples de cor (tint multiply) sobre folhas Sumi-e, pois o multiply apaga o brilho sobre o nanquim escuro e escurece o núcleo branco.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `colors.inkPrimary` | `Hex #RRGGBB` | Cor mapeada para o canal de nanquim escuro (W_ink) |
| `colors.energySecondary` | `Hex #RRGGBB` | Cor mapeada para a crista elemental (W_energy) |
| `colors.coreGlow` | `Hex #RRGGBB` | Cor mapeada para o centro incandescente (W_core) |
| `channelMode` | `composite | ink_only | energy_only | shader_rgb_mask` | Isolamento de canais para debug ou motores de jogo |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Matriz 4×4: Cometa Pintado (#73BFF2)** (`/assets/aistudio/cometa-pintado-73bff2-128px_e64dcb01.png`)
  - *Anatomia*: Projétil viajando do canto superior esquerdo para o inferior direito com cabeça esférica opaca envolvida por línguas de energia e impacto explosivo nos quadros 11 a 16.
  - *Paleta Dominante*: `#0B2545`, `#73BFF2`, `#F0F9FF`
- **Matriz 4×4: Corte Meia-Lua Caligráfico (#8BE36A)** (`/assets/aistudio/meia-lua-pintado-8be36a-128px_548e5cf4.png`)
  - *Anatomia*: O arquétipo mestre de slash 2D: ataque explosivo que atinge 90% do arco no frame 3, brilha no ápice e sofre erosão celular da cauda para a ponta até o frame 15.
  - *Paleta Dominante*: `#0B1911`, `#8BE36A`, `#FFFFFF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
// Recolorização por Separação de 3 Canais (CPU ImageData & GPU Shader Equivalente)
export function recolorReferenceSheetData(src: ImageData, config: VFXConfig): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  const ink = hexToRgb(config.colors.inkPrimary);
  const nrg = hexToRgb(config.colors.energySecondary);
  const core = hexToRgb(config.colors.coreGlow);
  const boost = config.dynamics.glowIntensity;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 4) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    const wCore = Math.pow(minC, 2.2);
    const wEnergy = Math.min(1, Math.max(0, (chroma * 1.85 + Math.max(0, lum - 0.2) * 0.9) * (1 - wCore)));
    const wInk = Math.max(0, 1 - wEnergy - wCore);

    d[i]     = Math.min(255, ink[0] * wInk + nrg[0] * boost * wEnergy + core[0] * wCore);
    d[i + 1] = Math.min(255, ink[1] * wInk + nrg[1] * boost * wEnergy + core[1] * wCore);
    d[i + 2] = Math.min(255, ink[2] * wInk + nrg[2] * boost * wEnergy + core[2] * wCore);
  }
  return out;
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Shader de Recolorização por Separação de 3 Canais (Web Canvas, Godot 4 & Unity URP)" seguindo exatamente a especificação acima.
Para replicar o sistema de Escolas de Magia em qualquer engine: separe cada pixel nos pesos wInk, wEnergy e wCore (soma = 1.0) e faça a combinação linear das 3 cores da escola.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

# Técnica #12: Pipeline de Composição de Sprite Sheet 4×4 & Codificador Binário GIF89a LZW

> **Subtítulo**: Renderização de grade 16 quadros com isolamento de célula (ctx.clip) e exportação GIF transparente sem dependências externas  
> **Módulo do Motor**: `src/engine/sumiRenderer.ts & src/utils/gifEncoder.ts`  
> **Origem Estética**: Engenharia de Exportação de Assets 2D  
> **Arquétipo de Demonstração**: `solid_ref_cometa` (Ref Sólida 01 · Cometa Pintado)

---

## 1. Visão Geral & Anatomia Visual

Para garantir que os 16 quadros gerados possam ser importados diretamente no Godot, Unity, Unreal Paper2D, GameMaker ou RPG Maker sem vazamento de pixels entre células vizinhas, renderCompleteSpriteSheet aplica um retângulo de recorte estrito (ctx.rect + ctx.clip) em cada célula (col * frameSize, row * frameSize, frameSize, frameSize). Além disso, o projeto inclui um codificador binário GIF89a completo escrito do zero em TypeScript (src/utils/gifEncoder.ts) com quantização de paleta 3-3-2 bits, índice dedicado de transparência (255) e compressão LZW de código variável (9 a 12 bits).

---

## 2. Modelo Matemático & Equações Paramétricas

Para que um Agente de IA replique este efeito com exatidão matemática, implemente as seguintes relações:

1. `Mapeamento de Célula 4×4: para frameIndex ∈ [0, 15], col = frameIndex % 4, row = floor(frameIndex / 4).`
2. `Isolamento de Célula: ctx.save() → ctx.beginPath() → ctx.rect(col*S, row*S, S, S) → ctx.clip() → ctx.translate(col*S, row*S) → renderVFXFrame(...) → ctx.restore().`
3. `Quantização GIF89a: pixels com alpha < 48 mapeiam para o índice transparente 255; demais pixels mapeiam para (r5 * 36) + (g5 * 6) + b4 ∈ [0, 215].`

---

## 3. Regras Estritas de Replicação (Invariantes para Agentes de IA)

### O Que Fazer (Obrigatório)
- [x] Aplique sempre ctx.clip() antes de renderizar cada célula da Sprite Sheet 4×4 para impedir que gotas centrífugas invadam o quadro vizinho.
- [x] Inclua o Graphics Control Extension (0x21 0xF9) com disposal method = 2 (Restore to Background) no GIF89a para que os frames transparentes não acumulem rastro.

### O Que Jamais Fazer (Proibido)
- [ ] **PROIBIDO**: Nunca use disposal method = 1 em GIFs de VFX com fundo transparente, caso contrário todos os 16 frames ficarão empilhados uns sobre os outros.

---

## 4. Parâmetros de Controle da Técnica

| Parâmetro | Faixa Recomendada | Função Matemática no Renderizador |
| :--- | :--- | :--- |
| `config.frameSize` | `96px | 128px | 192px | 256px` | Resolução individual de cada quadro (folha total = 4 × frameSize) |
| `config.fps` | `8 – 30 FPS` | Taxa de quadros convertida em centésimos de segundo no cabeçalho GIF89a |

---

## 5. Referências Visuais Vinculadas no Projeto

- **Matriz 4×4: Cometa Pintado (#73BFF2)** (`/assets/aistudio/cometa-pintado-73bff2-128px_e64dcb01.png`)
  - *Anatomia*: Projétil viajando do canto superior esquerdo para o inferior direito com cabeça esférica opaca envolvida por línguas de energia e impacto explosivo nos quadros 11 a 16.
  - *Paleta Dominante*: `#0B2545`, `#73BFF2`, `#F0F9FF`
- **Matriz 4×4: Explosão Forte Abissal (#4D38BF)** (`/assets/aistudio/explosao-forte-pintado-4d38bf-128px_cf68812b.png`)
  - *Anatomia*: Ignição puntiforme no frame 0, expansão violenta de lanças radiais nos frames 2–5 e transição para um anel de volutas de fumaça Kumo nos frames 7–15.
  - *Paleta Dominante*: `#1E1035`, `#4D38BF`, `#F5F3FF`

---

## 6. Implementação de Referência (TypeScript / HTML5 Canvas 2D + Rough.js)

```typescript
export function renderCompleteSpriteSheet(
  canvas: HTMLCanvasElement,
  config: VFXConfig,
  columns = 4
) {
  const rows = Math.ceil(config.totalFrames / columns);
  const fSize = config.frameSize;
  canvas.width = fSize * columns;
  canvas.height = fSize * rows;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < config.totalFrames; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    ctx.save();
    ctx.beginPath();
    ctx.rect(col * fSize, row * fSize, fSize, fSize);
    ctx.clip();
    ctx.translate(col * fSize, row * fSize);
    renderVFXFrame(ctx, i, config.totalFrames, fSize, fSize, config, true);
    ctx.restore();
  }
}
```

---

## 7. Prompt Direto de Replicação para Agentes de IA (Copy & Paste)

```markdown
[INSTRUÇÃO DE SISTEMA PARA AGENTE DE IA — REPLICAÇÃO DE VFX PROCEDURAL]
Implemente a técnica "Pipeline de Composição de Sprite Sheet 4×4 & Codificador Binário GIF89a LZW" seguindo exatamente a especificação acima.
Para exportar Sprite Sheets 4×4 prontas para produção: use sempre ctx.clip() por célula e normalize todas as coordenadas internas multiplicando por scale = width / 128.
Garanta que toda a renderização seja determinística (baseada em seed), escalável por (width / 128) e compatível com exportação em grade Sprite Sheet 4x4 (16 quadros).
```


---

## Catálogo Completo das 26 Referências Visuais Anexadas

### Estudo Ukiyo-e #01: A Grande Onda de Hokusai (Garras de Espuma & Correntes)
- **Arquivo**: `/assets/aistudio/image_a2117501.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#081C2E` / `#38BDF8` / `#F0F9FF`
- **Anatomia**: Corpo côncavo da onda estruturado por listras paralelas longitudinais alternando Azul-da-Prússia profundo, azul cerúleo e ciano pálido. Na crista de quebra, a espuma se divide em garras curvas articuladas ("foam claws") contornadas a nanquim fino com gotículas brancas suspensas.
- **Regras de Síntese**:
  - Amostre a espinha dorsal da onda via curva Bézier cúbica com perfil de barriga muscular: sin(t^0.55 * PI * 0.92) * (1 - 0.35*t).
  - Desenhe 5 faixas longitudinais paralelas ao longo da normal da curva alternando inkPrimary e coreGlow.
  - Plante clusters de 3 a 6 garras curvas de espuma na ponta (t = 1.0) e no dorso (t = 0.62) usando curvas quadráticas convergentes com contorno Rough.js.

### Estudo Suibokuga #02: Pétalas de Chama Aquareladas em S-Curve
- **Arquivo**: `/assets/aistudio/image_bab088c8.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#FFFBEB` / `#FF8C59` / `#9A1B12`
- **Anatomia**: Em vez de triângulos rígidos ou gradientes radiais genéricos, o fogo é construído por pétalas em curva S (Bézier cúbica) que nascem largas na base luminosa e afilam em pontas escuras/saturadas no topo, percorridas por 5 a 7 estrias fibrosas de cerdas.
- **Regras de Síntese**:
  - Use envelope assimétrico de barriga: sin(t^0.58 * PI) * (1 - t)^0.7 * 1.48.
  - Aplique gradiente linear de 5 paradas da raiz clara/quente até a ponta saturada e queimada.
  - Renderize estrias internas acompanhando a normal da curva S para simular cerdas de pincel.

### Estudo Sumi-e #03: Fitas Caligráficas de Fogo com Efeito Kasure
- **Arquivo**: `/assets/aistudio/image_ca12ac32.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#171312` / `#C2410C` / `#FDE68A`
- **Anatomia**: Traços ascendentes em S com pressão máxima na base arredondada e chicoteamento rápido no ápice, deixando filamentos brancos expostos (Kasure / Flying-White) e línguas finas desprendidas que flutuam acima da chama principal.
- **Regras de Síntese**:
  - Instancie de 8 a 28 filamentos paralelos ao longo da curva cúbica, omitindo filamentos intermediários quando rand() < dryBrushGap * 0.55.
  - Adicione línguas desprendidas (drawDetachedSumiFlameWisp) oscilando acima das pétalas principais.

### Estudo Ukiyo-e #04: Bancos de Nuvens Kumo com Volutas e Caudas Afiladas
- **Arquivo**: `/assets/aistudio/image_6646cbb0.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#0F172A` / `#94A3B8` / `#F8FAFC`
- **Anatomia**: Bancos horizontais e diagonais de nuvens formados por cristas lobuladas superiores, caudas longas que afilam como fitas de vento e caracóis internos duplos em forma de vírgula/C-Hook.
- **Regras de Síntese**:
  - PROIBIDO empilhar círculos (arc) para desenhar fumaça ou nuvens.
  - Construa cada voluta com polígono fechado de crista ondulada (sin(u * PI * lobeCount)) + cauda afilada + espiral logarítmica interna de 1.35 voltas.

### Estudo Ukiyo-e #05: Asas de Fumaça Ornamentais em Gancho C-Hook
- **Arquivo**: `/assets/aistudio/image_fdddfadd.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#1E293B` / `#CBD5E1` / `#FFFFFF`
- **Anatomia**: Volutas de fumaça que se abrem como asas laterais a partir de um eixo central, cada lóbulo terminando em um caracol interno enrolado para dentro com traço mais grosso na cabeça e fino na cauda.
- **Regras de Síntese**:
  - Ao final da espinha da voluta, adicione uma espiral interna de 22 passos onde o raio decai de curlRadius * 0.95 até 0.12.

### Estudo Caligráfico #06: Dinâmica de Pincel Seco e Tinta Abissal
- **Arquivo**: `/assets/aistudio/image_0be540a7.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#090D16` / `#38BDF8` / `#E0F2FE`
- **Anatomia**: Demonstra a transição entre a pressão inicial máxima do pincel (cabeça carregada de tinta) e a abertura das cerdas na metade final do golpe.
- **Regras de Síntese**:
  - Use headProfile = min(1, localT * 4.5)^(1 - taperStart * 0.7) combinado com tailProfile exponencial.

### Estudo Caligráfico #07: Volutas e Espirais de Energia Elemental
- **Arquivo**: `/assets/aistudio/image_1739c4ad.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#1E1B4B` / `#818CF8` / `#EEF2FF`
- **Anatomia**: Referência para vórtices, portais e redemoinhos que combinam braços espirais logarítmicos com aguada Tarashikomi no fundo.
- **Regras de Síntese**:
  - Combine 2 a 4 braços samplePolarArc com spiralFactor negativo (-0.35 a -0.65) convergindo ao centro.

### Estudo Caligráfico #08: Cristais Facetados & Impacto Tectônico
- **Arquivo**: `/assets/aistudio/image_364fc3f2.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#0C4A6E` / `#7DD3FC` / `#F0F9FF`
- **Anatomia**: Pilares hexagonais chanfrados com aresta central iluminada, face esquerda clara, face direita em sombra e trincas de impacto no solo.
- **Regras de Síntese**:
  - Divida cada cristal em dois polígonos laterais ao longo do eixo central para criar contraste imediato de luz e sombra sem depender de iluminação 3D pesada.

### Estudo Caligráfico #09: Explosão Radial & Fragmentação de Brasas
- **Arquivo**: `/assets/aistudio/image_a13ddd3e.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#31102F` / `#F43F5E` / `#FFF1F2`
- **Anatomia**: Detonação radial assimétrica onde pontas longas alternam com pontas curtas, envoltas por nuvens de fumaça Kumo periféricas.
- **Regras de Síntese**:
  - Nos frames 2 a 6, alterne raios pares e ímpares (rOuter * 1.25 vs rOuter * 0.65) e converta as pontas externas em volutas de fumaça após o frame 8.

### Estudo Caligráfico #10: Anel Zen Ensō & Selos Caligráficos
- **Arquivo**: `/assets/aistudio/image_e7bf4056.png` (Estudo Mestre Ukiyo-e & Suibokuga)
- **Paleta**: `#1C1917` / `#FB923C` / `#FEF3C7`
- **Anatomia**: Círculo caligráfico traçado em um único gesto rápido (310° a 340° de varredura), deixando uma fenda orgânica onde as cerdas secam.
- **Regras de Síntese**:
  - Varra samplePolarArc de -PI*0.85 até +PI*0.95 com taperStart=0.85 e taperEnd=0.98 para preservar a abertura característica do Ensō.

### Matriz 4×4: Cometa Pintado (#73BFF2)
- **Arquivo**: `/assets/aistudio/cometa-pintado-73bff2-128px_e64dcb01.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0B2545` / `#73BFF2` / `#F0F9FF`
- **Anatomia**: Projétil viajando do canto superior esquerdo para o inferior direito com cabeça esférica opaca envolvida por línguas de energia e impacto explosivo nos quadros 11 a 16.
- **Regras de Síntese**:
  - Renderize primeiro a cauda de pétalas S-Curve, depois a esfera 100% opaca (drawSolidOpaqueCoreSphere) para ocluir as raízes, e por fim 3 línguas laterais abraçando a esfera.

### Matriz 4×4: Corte d’Água Pintado (#8BE36A)
- **Arquivo**: `/assets/aistudio/corte-dagua-pintado-8be36a-128px_54aad902.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0D1F14` / `#8BE36A` / `#ECFDF5`
- **Anatomia**: Golpe fluido que serpenteia pela tela com ganchos de espuma na borda externa e dissolução em gotas alongadas.
- **Regras de Síntese**:
  - Adicione modulação senoidal hookWaves ao longo da normal externa da fita principal.

### Matriz 4×4: Cristais de Gelo Pintado (#8CD9FF)
- **Arquivo**: `/assets/aistudio/cristais-de-gelo-pintado-8cd9ff-128px_4ca23f17.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#082F49` / `#8CD9FF` / `#FFFFFF`
- **Anatomia**: Conjunto de 5 a 7 colunas hexagonais pontiagudas que brotam em leque a partir do chão, exibindo facetas de luz/sombra bem marcadas e estilhaçamento final.
- **Regras de Síntese**:
  - Cresça a altura rapidamente nos frames 0 a 4 (easeOutBack), mantenha vibrando até o frame 10 e fragmente em losangos giratórios do frame 11 ao 15.

### Matriz 4×4: Cura & Bênção Botânica (#80E680)
- **Arquivo**: `/assets/aistudio/cura-pintado-80e680-128px_e82a0630.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#064E3B` / `#80E680` / `#F0FDF4`
- **Anatomia**: Correntes de vento ascendentes em hélice carregando folhas pontiagudas desenhadas a pincel e partículas estelares de restauração.
- **Regras de Síntese**:
  - Combine duas fitas senoidais verticais defasadas em PI radianos com folhas S-Curve girando ao longo da subida.

### Matriz 4×4: Círculo Zen Ensō Verde (#8BE36A)
- **Arquivo**: `/assets/aistudio/enso-pintado-8be36a-128px_eb52b886.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0F1F17` / `#8BE36A` / `#F0FDF4`
- **Anatomia**: Anel caligráfico traçado em alta velocidade nos 5 primeiros frames, seguido por rotação sutil e erosão celular em ilhas de nanquim.
- **Regras de Síntese**:
  - Use samplePolarArc com rx ≈ ry e deslocamento normal entre a camada de tinta e a camada de energia.

### Matriz 4×4: Círculo Zen Ensō Solar (#FF8C59)
- **Arquivo**: `/assets/aistudio/enso-pintado-ff8c59-128px_fd022a5d.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#2A120A` / `#FF8C59` / `#FFFBEB`
- **Anatomia**: Variação solar do Ensō onde a borda externa do anel emite pétalas de chama S-Curve tangenciais que giram ao redor do selo.
- **Regras de Síntese**:
  - Plante 6 a 10 pétalas drawFlamePetalTongue ancoradas na circunferência do Ensō apontando na direção tangente.

### Matriz 4×4: Explosão Forte Abissal (#4D38BF)
- **Arquivo**: `/assets/aistudio/explosao-forte-pintado-4d38bf-128px_cf68812b.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#1E1035` / `#4D38BF` / `#F5F3FF`
- **Anatomia**: Ignição puntiforme no frame 0, expansão violenta de lanças radiais nos frames 2–5 e transição para um anel de volutas de fumaça Kumo nos frames 7–15.
- **Regras de Síntese**:
  - Sobreponha estrela de pontas irregulares Rough.js sobre núcleo 100% opaco e substitua gradualmente por drawUkiyoeCloudScrollVolute.

### Matriz 4×4: Explosão Caligráfica (#8BE36A)
- **Arquivo**: `/assets/aistudio/explosao-pintado-8be36a-128px_08a56278.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0D1F14` / `#8BE36A` / `#F0FDF4`
- **Anatomia**: Chicotes radiais de nanquim e energia que se abrem a partir do centro com dezenas de gotas alongadas projetadas pela força centrífuga.
- **Regras de Síntese**:
  - Emita 8 a 14 raios sampleQuadraticCurve do centro para fora com splatterSpread elevado.

### Matriz 4×4: Fumaça & Nuvens Kumo (#B3B3D1)
- **Arquivo**: `/assets/aistudio/fumaca-pintado-b3b3d1-128px_4caaac54.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#1E2230` / `#B3B3D1` / `#F8FAFC`
- **Anatomia**: Bancos de fumaça estilizados com caracóis internos e caudas afiladas que se afastam do centro enquanto se dissolvem.
- **Regras de Síntese**:
  - Use drawUkiyoeCloudBank com 4 a 6 volutas radiais que expandem seu raio de ancoragem a cada frame.

### Matriz 4×4: Corte Meia-Lua Caligráfico (#8BE36A)
- **Arquivo**: `/assets/aistudio/meia-lua-pintado-8be36a-128px_548e5cf4.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0B1911` / `#8BE36A` / `#FFFFFF`
- **Anatomia**: O arquétipo mestre de slash 2D: ataque explosivo que atinge 90% do arco no frame 3, brilha no ápice e sofre erosão celular da cauda para a ponta até o frame 15.
- **Regras de Síntese**:
  - Use headReach = 1 - (1 - frameNorm)^3.4 para aceleração explosiva inicial e tailRetract não-linear após o frame 4.

### Matriz 4×4: Portal & Vórtice Abissal (#B380F2)
- **Arquivo**: `/assets/aistudio/portal-pintado-b380f2-128px_1a493e52.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#1E1035` / `#B380F2` / `#FAF5FF`
- **Anatomia**: Olho abissal escuro no centro rodeado por braços espirais de energia e pétalas curvadas que giram continuamente.
- **Regras de Síntese**:
  - Incremente o ângulo base em +frameNorm * PI * 1.6 e desenhe um núcleo escuro oclusivo no centro do vórtice.

### Matriz 4×4: Rasgo de Garra Triplo (#8BE36A)
- **Arquivo**: `/assets/aistudio/rasgo-pintado-8be36a-128px_7a5afa62.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#0B1911` / `#8BE36A` / `#F0FDF4`
- **Anatomia**: Três lâminas caligráficas paralelas levemente curvas com pequeno atraso temporal (stagger) entre a garra central e as laterais.
- **Regras de Síntese**:
  - Defase o frameNorm de cada garra em Δt = 0.055 para sensação orgânica de impacto multi-lâmina.

### Matriz 4×4: Subir de Nível / Ascensão Solar (#FFD959)
- **Arquivo**: `/assets/aistudio/subir-de-nivel-pintado-ffd959-128px_35961e19.png` (Matriz Sprite Sheet 4×4 Original)
- **Paleta**: `#291D06` / `#FFD959` / `#FFFBEB`
- **Anatomia**: Base elíptica no chão que dispara cortinas verticais de luz e chamas ascendentes com partículas douradas.
- **Regras de Síntese**:
  - Combine anéis horizontais em perspectiva (ry = rx * 0.34) na base com pilares verticais S-Curve subindo em velocidade alta.

### Amostra Exportada: Bólido Meteoro de Magma (128px)
- **Arquivo**: `/assets/aistudio/elem_fire_meteor_bolide-pintado-128px_6494c328.png` (Amostra Elemental Exportada)
- **Paleta**: `#240B06` / `#FF6B35` / `#FFF7ED`
- **Anatomia**: Demonstra a oclusão perfeita da esfera sólida do meteoro sobre a cauda de chamas em S-Curve e a transição para cratera de fumaça Kumo no impacto.
- **Regras de Síntese**:
  - Verifique nos frames 2 a 8 que nenhuma linha da cauda atravessa o interior da cabeça do meteoro.

### Amostra Exportada: Fumaça Vulcânica Kumo (128px)
- **Arquivo**: `/assets/aistudio/elem_fire_volcanic_smoke-pintado-128px_fd412d15.png` (Amostra Elemental Exportada)
- **Paleta**: `#1C1210` / `#EA580C` / `#FFEDD5`
- **Anatomia**: Volutas de cinza vulcânica com caracóis internos em C-Hook iluminados por baixo pelo brilho de magma.
- **Regras de Síntese**:
  - Misture inkPrimary com energySecondary na base das volutas inferiores para simular iluminação subcutânea de lava.

### Amostra Exportada: Gêiser de Vapor & Maré (128px)
- **Arquivo**: `/assets/aistudio/elem_water_steam_geyser-pintado-128px__1__cc30ed63.png` (Amostra Elemental Exportada)
- **Paleta**: `#082F49` / `#38BDF8` / `#F0F9FF`
- **Anatomia**: Coluna de água pressurizada que rompe o solo com garras de espuma Hokusai na coroa e bancos de vapor Kumo na base.
- **Regras de Síntese**:
  - Ancore 2 bancos de nuvens Kumo na base (y = 0.82 * h) enquanto a coluna central sobe até y = 0.14 * h.

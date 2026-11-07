import { ArchetypeId, MagicSchool, SchoolId, SumiLayerIntensities, TechniqueSpec, VFXConfig } from './types';

export const MAGIC_SCHOOLS: Record<SchoolId, MagicSchool> = {
  fuji_sakura: {
    id: 'fuji_sakura',
    name: 'Monte Fuji & Sakura Carmesim',
    elementStyle: 'Sumi-e Clássico · Sol & Cerejeira',
    colors: {
      inkPrimary: '#141413',
      energySecondary: '#C8232C',
      coreGlow: '#FFF5F5',
      sporeAccent: '#E11D48',
    },
  },
  calligraphy_tide: {
    id: 'calligraphy_tide',
    name: 'Maré Caligráfica',
    elementStyle: 'Hidromancia · Tinta & Espuma',
    colors: {
      inkPrimary: '#061320',
      energySecondary: '#38BDF8',
      coreGlow: '#F0F9FF',
      sporeAccent: '#7DD3FC',
    },
  },
  fungal_emerald: {
    id: 'fungal_emerald',
    name: 'Éter Fúngico & Esmeralda',
    elementStyle: 'Bio-Arcano · Referência',
    colors: {
      inkPrimary: '#080D0A',
      energySecondary: '#8BE36A',
      coreGlow: '#F6FFF0',
      sporeAccent: '#4ADE80',
    },
  },
  toxic_venom: {
    id: 'toxic_venom',
    name: 'Veneno & Peçonha Ácida',
    elementStyle: 'Alquimia · Miasma Corrosivo',
    colors: {
      inkPrimary: '#0E1708',
      energySecondary: '#A3E635',
      coreGlow: '#ECFCCB',
      sporeAccent: '#84CC16',
    },
  },
  abyssal_curse: {
    id: 'abyssal_curse',
    name: 'Maldição & Grilhão Abissal',
    elementStyle: 'Bruxaria · Sombra & Agonia',
    colors: {
      inkPrimary: '#0F051D',
      energySecondary: '#C026D3',
      coreGlow: '#FAE8FF',
      sporeAccent: '#9333EA',
    },
  },
  blood_shadow: {
    id: 'blood_shadow',
    name: 'Sangue & Hemomancia',
    elementStyle: 'Vampírico · Corte Arterial',
    colors: {
      inkPrimary: '#190408',
      energySecondary: '#E11D48',
      coreGlow: '#FFE4E6',
      sporeAccent: '#9F1239',
    },
  },
  necro_phantom: {
    id: 'necro_phantom',
    name: 'Necromancia & Fogo-Fátuo',
    elementStyle: 'Post-Mortem · Alma & Osso',
    colors: {
      inkPrimary: '#091114',
      energySecondary: '#2DD4BF',
      coreGlow: '#F0FDFA',
      sporeAccent: '#E2E8F0',
    },
  },
  capoeira_dende: {
    id: 'capoeira_dende',
    name: 'Axé Solar & Dendê',
    elementStyle: 'Capoeira · Cinética & Fogo',
    colors: {
      inkPrimary: '#1A0E07',
      energySecondary: '#F59E0B',
      coreGlow: '#FEF9C3',
      sporeAccent: '#EA580C',
    },
  },
  abyssal_flame: {
    id: 'abyssal_flame',
    name: 'Chama Abissal & Cinza',
    elementStyle: 'Pirocinese · Brasa & Fuligem',
    colors: {
      inkPrimary: '#160706',
      energySecondary: '#FF5331',
      coreGlow: '#FFF6CC',
      sporeAccent: '#F59E0B',
    },
  },
  celestial_thunder: {
    id: 'celestial_thunder',
    name: 'Trovão Celestial',
    elementStyle: 'Eletromancia · Alta Voltagem',
    colors: {
      inkPrimary: '#0B071E',
      energySecondary: '#A855F7',
      coreGlow: '#ECFEFF',
      sporeAccent: '#22D3EE',
    },
  },
  astral_gold: {
    id: 'astral_gold',
    name: 'Luz Astral & Ouro',
    elementStyle: 'Geomancia · Ordem Divina',
    colors: {
      inkPrimary: '#171206',
      energySecondary: '#FACC15',
      coreGlow: '#FEFCE8',
      sporeAccent: '#F59E0B',
    },
  },
};

export const ARCHETYPE_CATALOG: {
  id: ArchetypeId;
  name: string;
  category: string;
  defaultSchool: SchoolId;
  description: string;
}[] = [
  {
    id: 'hyb_slash_great_wave_katana',
    name: 'Corte da Grande Onda (Katana Hokusai)',
    category: 'Ukiyo-e · Hokusai',
    defaultSchool: 'calligraphy_tide',
    description: 'Golpe em arco com 5 correntes listradas internas e clusters de garras de espuma na crista.',
  },
  {
    id: 'sakura_tempest_slash',
    name: 'Tempestade de Sakura & Galho Sumi-e',
    category: 'Sumi-e · Cerejeira',
    defaultSchool: 'fuji_sakura',
    description: 'Fita de nanquim Kasure acompanhada por redemoinho de flores de cerejeira e pétalas S-Curve.',
  },
  {
    id: 'hyb_slash_crimson_phoenix_arc',
    name: 'Talho da Fênix Carmesim (Odachi S-Curve)',
    category: 'Suibokuga · Fogo',
    defaultSchool: 'abyssal_flame',
    description: 'Coroa de pétalas de chama aquareladas em curva S com 5 paradas e fitas desprendidas.',
  },
  {
    id: 'hyb_slash_blood_moon_scythe',
    name: 'Ceifa da Lua de Sangue (Foice 270°)',
    category: 'Sumi-e · Kasure',
    defaultSchool: 'blood_shadow',
    description: 'Varredura ampla de 270° com 28 filamentos individuais e ranhuras de pincel seco Flying-White.',
  },
  {
    id: 'crescent',
    name: 'Meia-Lua Caligráfica Mestre',
    category: 'Sakuga · Slash',
    defaultSchool: 'fungal_emerald',
    description: 'Arquétipo mestre: aceleração explosiva nos 3 primeiros quadros e erosão celular FBM 2D.',
  },
  {
    id: 'water_slash',
    name: 'Corte d’Água & Éter Fluido',
    category: 'Sakuga · Erosão',
    defaultSchool: 'calligraphy_tide',
    description: 'Serpenteio fluido com ondas de gancho externas e gotas centrífugas alongadas pela tangente.',
  },
  {
    id: 'enso_sigil',
    name: 'Círculo Zen Ensō & Selo Solar',
    category: 'Sumi-e · Caligrafia',
    defaultSchool: 'fuji_sakura',
    description: 'Anel caligráfico traçado em gesto único de 325° com fenda orgânica onde as cerdas secam.',
  },
  {
    id: 'elem_fire_meteor_bolide',
    name: 'Cometa Carmesim & Brasa Viva',
    category: 'Suibokuga · Fogo',
    defaultSchool: 'abyssal_flame',
    description: 'Esfera incandescente envolvida por línguas de chama e nuvens orientais.',
  },
  {
    id: 'solid_ref_fumaca',
    name: 'Brisa de Nuvens & Neblina Oriental',
    category: 'Ukiyo-e · Kumo',
    defaultSchool: 'necro_phantom',
    description: 'Volutas ornamentais de neblina que serpenteiam pelo papel como vento.',
  },
  {
    id: 'elem_water_healing_fountain',
    name: 'Fonte Cristalina Tarashikomi',
    category: 'Suibokuga · Aguada',
    defaultSchool: 'fungal_emerald',
    description: 'Manchas orgânicas de aquarela japonesa com borda de sangria de pigmento e correntes ascendentes.',
  },
  {
    id: 'portal_abyssal_vortex',
    name: 'Portal & Vórtice Espiral Abissal',
    category: 'Arco Polar · Vórtice',
    defaultSchool: 'abyssal_curse',
    description: 'Braços espirais logarítmicos convergindo sobre núcleo abissal oclusivo e aguada Tarashikomi.',
  },
];

export const DEFAULT_VFX_CONFIG: VFXConfig = {
  archetype: 'hyb_slash_great_wave_katana',
  school: 'calligraphy_tide',
  colors: {
    inkPrimary: '#081C2E',
    energySecondary: '#38BDF8',
    coreGlow: '#F0F9FF',
    sporeAccent: '#0284C7',
  },
  bgMode: 'washi',
  channelMode: 'composite',
  brush: {
    bristleCount: 24,
    strokeThickness: 1.2,
    taperStart: 0.9,
    taperEnd: 0.95,
    dryBrushGap: 0.34,
    curvature: 1,
    angle: 0,
    arcSweep: 1,
  },
  dynamics: {
    splatterCount: 28,
    splatterSpread: 1.4,
    hookWaves: 4,
    erosionStrength: 0.9,
    erosionScale: 1.1,
    glowIntensity: 1.35,
    colorOffset: 1.15,
    jitterAmount: 0.3,
  },
  rough: {
    roughness: 1,
    bowing: 0.85,
    outlineWidth: 1.5,
    fillStyle: 'solid',
    celSteps: 3,
  },
  totalFrames: 16,
  fps: 16,
  seed: 8472,
  frameSize: 128,
};

export const DEFAULT_FUJI_LAYERS: SumiLayerIntensities = {
  sunIntensity: 1.0,
  mountainIntensity: 1.0,
  sakuraBranchIntensity: 1.0,
  sakuraPetalsIntensity: 1.0,
  waterReflectionIntensity: 1.0,
  mistKumoIntensity: 1.0,
};

export const TECHNIQUES_CATALOG: TechniqueSpec[] = [
  {
    id: 1,
    code: 'TEC-01',
    title: 'PRNG Determinístico (Mulberry32) & Ruído Fractal FBM 2D',
    subtitle: 'Coerência temporal entre os 16 quadros sem cintilação (flicker) aleatória',
    origin: 'Fundação Matemática Procedural',
    archetype: 'crescent',
    school: 'fungal_emerald',
    equations: [
      'Mulberry32: a = (seed | 0) + 0x6D2B79F5; distribuição uniforme em [0, 1)',
      'Smoothstep Hermite: u = xf² · (3 - 2·xf), v = yf² · (3 - 2·yf)',
      'FBM 3 Oitavas: 0.55·N(x,y,s) + 0.30·N(2.15x+13.7, 2.15y+7.3, s+101) + 0.15·N(4.4x-5.2, 4.4y+19.1, s+307)',
    ],
    invariantsDo: [
      'Derivar semente deterministicamente por cerda: bristleSeed = config.seed + b * 73',
      'Usar o mesmo seed nos 16 quadros para corroer exatamente as mesmas ilhas de tinta',
    ],
    invariantsDont: [
      'JAMAIS chamar Math.random() dentro do loop de renderização de quadros',
      'Proibido usar ruído de 1 única oitava para erosão de nanquim',
    ],
    description:
      'Garante que cada cerda, gota e ilha de nanquim mantenha sua identidade física do quadro 1 ao 16 sem cintilação.',
  },
  {
    id: 2,
    code: 'TEC-02',
    title: 'Amostradores de Curvas Paramétricas (Arco Polar 3D Tilt & Bézier S-Curve)',
    subtitle: 'Geração de espinhas dorsais Point2D com vetores normais analíticos para espessura e camadas',
    origin: 'Cinemática Caligráfica & Espadas 2D',
    archetype: 'sakura_tempest_slash',
    school: 'capoeira_dende',
    equations: [
      'Arco Polar 3D Tilt: r(t) = r0 · (1 + spiralFactor · (t - 0.5))',
      'Bézier Cúbica: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3',
      'Vetor Normal Unitário: (nx, ny) = (-dy / ||B\'(t)||, dx / ||B\'(t)||)',
    ],
    invariantsDo: [
      'Calcular derivada analítica (dx, dy) para normais contínuas sem degraus',
      'Aplicar jitter orgânico multiplicando sampleNoise2D pelo vetor normal (nx, ny)',
    ],
    invariantsDont: ['Proibido usar ctx.arc() nativo de largura constante para golpes caligráficos'],
    description:
      'Amostra espinhas dorsais de 60 a 110 pontos com normais analíticas que permitem separar o canal de Tinta do canal de Energia.',
  },
  {
    id: 3,
    code: 'TEC-03',
    title: 'Fita Caligráfica Multi-Cerdas Sumi-e com Efeito Kasure (Flying-White)',
    subtitle: 'Simulação de 10 a 38 filamentos individuais de pincel com pressão variável e ranhuras secas',
    origin: 'Pintura Caligráfica Japonesa Sumi-e',
    archetype: 'hyb_slash_blood_moon_scythe',
    school: 'blood_shadow',
    equations: [
      'Posição da Cerda: u = (b / (bristleCount - 1)) * 2 - 1 ∈ [-1, 1]',
      'Envelope de Pressão: E(t) = sin(min(1, 1.35·t) · π/2) · (1-t)^(0.35 + 1.15·taperEnd) · 1.65',
      'Convergência na Lâmina: spread(t) = (1 - 0.72·t)^0.75',
    ],
    invariantsDo: [
      'Construir cada segmento de cerda como polígono fechado preenchido com ctx.fill()',
      'Incluir a gota arredondada de apoio inicial do pincel (roundHeadCap)',
    ],
    invariantsDont: ['Proibido desenhar linha grossa única com ctx.lineWidth sem subdivisão em cerdas'],
    description:
      'Reproduz a abertura real das cerdas de bambu no golpe rápido, deixando trilhas brancas onde o papel Washi aparece.',
  },
  {
    id: 4,
    code: 'TEC-04',
    title: 'Erosão Celular Progressiva por Limiar de Ruído & Gotas Centrífugas',
    subtitle: 'Dissolução orgânica da tinta em ilhas isoladas de nanquim em vez de fade-out fantasma',
    origin: 'Animação 2D Tradicional de Efeitos (Sakuga VFX)',
    archetype: 'water_slash',
    school: 'calligraphy_tide',
    equations: [
      'Attack Snap: headReach = min(1, 1 - (1 - frameNorm)^3.4)',
      'Retração da Cauda: tailRetract = max(0, (frameNorm - 0.18) / 0.82)^1.55 * 0.78',
      'Corte Celular: fbmNoise2D(...) < erosionProgress * 0.92 + tailBias - 0.18',
    ],
    invariantsDo: [
      'Manter opacidade alta (0.85 a 1.0) enquanto corrói o polígono em ilhas orgânicas',
      'Alongar gotas centrífugas na direção tangente + normal da velocidade',
    ],
    invariantsDont: ['NUNCA desaparecer um golpe apenas reduzindo ctx.globalAlpha de 1 para 0'],
    description:
      'Preserva 100% de presença gráfica nos fragmentos restantes enquanto quebra a pincelada da cauda para a ponta.',
  },
  {
    id: 5,
    code: 'TEC-05',
    title: 'Pétalas de Chama Aquareladas em S-Curve com Estrias Fibrosas',
    subtitle: 'Síntese de fogo e pétalas orientais combinando línguas curvas sobrepostas e pontas saturadas',
    origin: 'Aquarela Oriental Suibokuga & Caligrafia de Fogo',
    archetype: 'hyb_slash_crimson_phoenix_arc',
    school: 'abyssal_flame',
    equations: [
      'Envelope de Barriga: bellyEnv(t) = sin(t^0.58 · π) · (1 - t)^0.7 · 1.48',
      'Assimetria Lateral: esquerda 1.0 · halfW, direita 0.88 · halfW',
      'Gradiente Aquarelado de 5 Paradas: base clara (t=0) → meio energético → ponta escura nanquim (t=1)',
    ],
    invariantsDo: [
      'Sobrepor pétalas em 2 a 3 camadas com estrias fibrosas internas',
      'Adicionar fitas caligráficas desprendidas (wisps) subindo acima das pontas',
    ],
    invariantsDont: ['Proibido desenhar fogo usando triângulos retos ou círculos borrados com shadowBlur'],
    description:
      'Na aquarela oriental Suibokuga, o pigmento escuro se acumula nas pontas e bordas superiores das pétalas em curva S.',
  },
  {
    id: 6,
    code: 'TEC-06',
    title: 'Cristas de Onda Ukiyo-e (Hokusai), Correntes Listradas & Garras de Espuma',
    subtitle: 'Síntese da Grande Onda de Kanagawa com faixas longitudinais e garras articuladas na crista',
    origin: 'Xilogravura Japonesa Ukiyo-e (Katsushika Hokusai)',
    archetype: 'hyb_slash_great_wave_katana',
    school: 'calligraphy_tide',
    equations: [
      'Envelope Muscular da Vaga: waveEnv(t) = sin(t^0.55 · π · 0.92) · (1 - 0.35·t) + 0.35·(1 - t)',
      'Correntes Longitudinais: 5 faixas paralelas em u ∈ [-0.72, +0.72] alternando coreGlow e inkPrimary',
      'Garras de Espuma: clusters fractais na ponta (t=1.0) e no dorso (t=0.62)',
    ],
    invariantsDo: [
      'Plantar 5 a 7 garras de espuma na crista e 3 no dorso contornadas a nanquim',
      'Traçar as 5 faixas longitudinais internas acompanhando a barriga côncava da vaga',
    ],
    invariantsDont: ['Proibido representar água apenas como círculos azuis translúcidos sem garras e listras'],
    description:
      'Divide qualquer efeito aquático nos 4 componentes anatômicos clássicos das xilogravuras de Hokusai.',
  },
  {
    id: 7,
    code: 'TEC-07',
    title: 'Bancos de Nuvens & Fumaça Ukiyo-e (Kumo) com Volutas em C-Hook',
    subtitle: 'Substituição total de esferas empilhadas por volutas ornamentais com cauda afilada e caracol interno',
    origin: 'Gravuras Tradicionais de Nuvens Ukiyo-e (Kumo)',
    archetype: 'solid_ref_fumaca',
    school: 'necro_phantom',
    equations: [
      'Crista Superior Lobulada: lóbulo(t) = 0.58 + 0.42 · |sin(t · π · lobeCount)|',
      'Envelope da Cauda Afilada: tailTaper(t) = sin(t^0.62 · π) · 1.28',
      'Caracol Espiral C-Hook: ang = headAng + flip * (0.4 + u * π * 2.25), r = curlR * (0.92 - u * 0.76)',
    ],
    invariantsDo: [
      'Desenhar sempre o caracol interno em C-Hook com traço mais espesso na cabeça e fino no centro',
      'Agrupar de 3 a 6 volutas para formar bancos de neblina oriental ou fumaça vulcânica',
    ],
    invariantsDont: ['PROIBIDO usar loops de ctx.arc() ou círculos empilhados ("cotton-ball smoke")'],
    description:
      'Constrói neblina do Monte Fuji e fumaça com cristas lobuladas superiores, caudas longas e caracóis internos duplos.',
  },
  {
    id: 8,
    code: 'TEC-08',
    title: 'Núcleo Sólido 100% Opaco com Oclusão Real & Línguas Envolventes',
    subtitle: 'Eliminação do aspecto de adesivo translúcido através de oclusão em 3 camadas (Cauda → Esfera → Abraço)',
    origin: 'Pintura de Projéteis & Meteoros Action RPG',
    archetype: 'elem_fire_meteor_bolide',
    school: 'abyssal_flame',
    equations: [
      'Deformação do Núcleo: R(θ) = R0 · (1 + (fbmNoise2D(cos θ · 1.6, sin θ · 1.6, seed) - 0.5) · wobble)',
      'Z-Order Estrito: Passo 1 (Cauda Traseira) → Passo 2 (Esfera Hex Alpha 1.0) → Passo 3 (Wrapping Tongues)',
    ],
    invariantsDo: [
      'Garantir que todas as paradas do gradiente radial do núcleo tenham opacidade 1.0 (cores Hex puras)',
      'Desenhar línguas frontais/laterais após a esfera opaca para abraçar o projétil',
    ],
    invariantsDont: ['Nunca deixar linhas de cauda visíveis atravessando o interior da cabeça do cometa/meteoro'],
    description:
      'Opera em 3 passos estritos de Z-ordering para que o núcleo tenha massa sólida real integrada ao fluxo da cauda.',
  },
  {
    id: 9,
    code: 'TEC-09',
    title: 'Aguada Suibokuga (Tarashikomi) com Borda de Sangria de Pigmento',
    subtitle: 'Manchas orgânicas de aquarela japonesa onde o pigmento se concentra no anel externo úmido',
    origin: 'Pintura Rinpa & Suibokuga Japonesa (Tarashikomi)',
    archetype: 'elem_water_healing_fountain',
    school: 'fuji_sakura',
    equations: [
      'Polígono Amebóide (32 vértices): r(θ) = rBase · (1 + (fbmNoise2D(...) - 0.5) · 0.34)',
      'Gradiente Tarashikomi: stop 0.0 (alpha 0.42) → stop 0.68 (0.58) → stop 0.90 (0.74 pico úmido!) → stop 1.0 (0.0)',
    ],
    invariantsDo: [
      'Aplicar a aguada Tarashikomi como camada atmosférica de base ou no disco solar carmesim',
    ],
    invariantsDont: ['Proibido usar ctx.filter = "blur(12px)" que degrada a performance em tempo real'],
    description:
      'Simula o gotejamento de tinta sobre papel Washi úmido, empurrando o pigmento para a auréola externa ("water-bloom rim").',
  },
  {
    id: 10,
    code: 'TEC-10',
    title: 'Geometria Poligonal Sólida Hand-Made com Rough.js (Cristais & Facetas)',
    subtitle: 'Integração vetorial Rough.js para silhuetas desenhadas à mão, cristais chanfrados e hachuras',
    origin: 'Ilustração Hand-Crafted 2D & Cel-Shading Analógico',
    archetype: 'elem_water_glacial_spikes',
    school: 'calligraphy_tide',
    equations: [
      'Bipartição Cel-Shaded: Polígono Esquerdo (coreGlow luz alta) + Polígono Direito (energySecondary sombra)',
      'Rough.js Determinístico: seed = Math.max(1, Math.floor(config.seed + seedOffset))',
    ],
    invariantsDo: [
      'Passar sempre seed inteiro determinístico no objeto Options do Rough.js',
      'Permitir alternar fillStyle entre solid, hachure, cross-hatch e zigzag',
    ],
    invariantsDont: ['Jamais chamar rc.polygon() ou rc.curve() sem definir explicitamente a propriedade seed'],
    description:
      'Cria cristais glaciais, rochas tectônicas e as facetas nevadas do Monte Fuji com traço duplo caligráfico.',
  },
  {
    id: 11,
    code: 'TEC-11',
    title: 'Shader de Recolorização por Separação de 3 Canais (Web, Godot 4 & Unity)',
    subtitle: 'Decomposição matemática em pesos de Tinta Abissal, Energia Elemental e Núcleo Branco',
    origin: 'Pipeline de Shaders para Engines de Jogos 2D',
    archetype: 'enso_sigil',
    school: 'astral_gold',
    equations: [
      'Luminância Perceptual: L = 0.299·R + 0.587·G + 0.114·B',
      'Pesos: W_core = (min(R,G,B))^2.2; W_energy = clamp(chroma*2.1 + max(0,L-0.18)*(1-W_core), 0, 1); W_ink = 1 - W_energy - W_core',
      'Reconstrução: RGB_out = InkColor·W_ink + (EnergyColor·GlowBoost)·W_energy + CoreColor·W_core',
    ],
    invariantsDo: [
      'Preservar o canal Alpha original e suportar exportação de máscara pura RGB (#FF0000, #00FF00, #0000FF)',
    ],
    invariantsDont: ['Proibido usar multiplicação simples de cor (tint multiply) que apaga o brilho sobre o nanquim'],
    description:
      'Permite recolorir qualquer efeito ou textura instantaneamente para qualquer uma das Escolas de Magia.',
  },
  {
    id: 12,
    code: 'TEC-12',
    title: 'Pipeline de Composição Sprite Sheet 4×4 & Codificador Binário GIF89a LZW',
    subtitle: 'Renderização de grade 16 quadros com isolamento ctx.clip() e exportação GIF transparente nativa',
    origin: 'Engenharia de Exportação de Assets 2D',
    archetype: 'hyb_slash_great_wave_katana',
    school: 'calligraphy_tide',
    equations: [
      'Mapeamento 4×4: col = frameIndex % 4, row = floor(frameIndex / 4)',
      'Isolamento: ctx.rect(col*S, row*S, S, S) -> ctx.clip() -> ctx.translate(col*S, row*S)',
      'GIF89a LZW: Graphics Control Extension (0x21 0xF9) com Disposal Method = 2 e índice transparente 255',
    ],
    invariantsDo: [
      'Aplicar ctx.clip() estrito em cada célula antes de renderizar o quadro',
      'Usar Disposal Method = 2 no GIF89a para não acumular rastro entre frames transparentes',
    ],
    invariantsDont: ['Jamais deixar respingos centrífugos invadirem a célula vizinha da Sprite Sheet'],
    description:
      'Exporta grades 4×4 prontas para engines e GIFs animados transparentes sem dependências externas.',
  },
];

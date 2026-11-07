/**
 * Identificador de escola estética japonesa do `@sumi-forge/react`.
 * Cada escola fornece uma paleta calibrada (`SumiColors`) de nanquim, energia secundária, brilho central e acento.
 *
 * @example
 * const school: SchoolId = 'fuji_sakura';
 */
export type SchoolId =
  | 'fuji_sakura'
  | 'calligraphy_tide'
  | 'fungal_emerald'
  | 'toxic_venom'
  | 'abyssal_curse'
  | 'blood_shadow'
  | 'necro_phantom'
  | 'capoeira_dende'
  | 'abyssal_flame'
  | 'celestial_thunder'
  | 'astral_gold';

/**
 * Arquétipos de golpes e efeitos procedurais Sakuga de 16 quadros (`<SumiVFX />` e `renderVFXFrame`).
 *
 * @example
 * const archetype: ArchetypeId = 'sakura_tempest_slash';
 */
export type ArchetypeId =
  | 'hyb_slash_great_wave_katana'
  | 'hyb_slash_crimson_phoenix_arc'
  | 'hyb_slash_blood_moon_scythe'
  | 'crescent'
  | 'water_slash'
  | 'enso_sigil'
  | 'elem_fire_meteor_bolide'
  | 'elem_water_glacial_spikes'
  | 'solid_ref_fumaca'
  | 'elem_water_healing_fountain'
  | 'sakura_tempest_slash'
  | 'portal_abyssal_vortex';

/**
 * Canal de saída de renderização para efeitos Sakuga (`<SumiVFX />`).
 * - `'composite'`: Composição completa (nanquim + energia + partículas)
 * - `'ink_only'`: Somente camada caligráfica de nanquim Sumi-e
 * - `'energy_only'`: Somente aguada luminosa e acentos cromáticos
 * - `'shader_rgb_mask'`: Máscara técnica RGB para pipelines de jogos/shaders
 */
export type ChannelMode = 'composite' | 'ink_only' | 'energy_only' | 'shader_rgb_mask';

/**
 * Modo de fundo do canvas no estúdio de efeitos.
 * - `'washi'`: Papel artesanal japonês Washi (`#F4F1EA`)
 * - `'checker'`: Grade quadriculada de transparência
 * - `'dark'`: Fundo escuro de alto contraste (`#111113`)
 * - `'transparent'`: Alpha 100% transparente (ideal para exportação PNG/GIF)
 */
export type BgMode = 'washi' | 'checker' | 'dark' | 'transparent';

/**
 * Estilo de preenchimento vetorial para primitivas `rough.js`.
 */
export type RoughFillStyle = 'solid' | 'hachure' | 'cross-hatch' | 'zigzag';

/**
 * Ponto 2D amostrado ao longo de uma curva espinhal com vetor normal analítico unitário (`nx`, `ny`)
 * e parâmetro normalizado `t` (`0.0` no início do traço até `1.0` na ponta final).
 */
export interface Point2D {
  /** Coordenada X em pixels no canvas */
  x: number;
  /** Coordenada Y em pixels no canvas */
  y: number;
  /** Componente X do vetor normal unitário perpendicular à curva */
  nx: number;
  /** Componente Y do vetor normal unitário perpendicular à curva */
  ny: number;
  /** Progresso paramétrico ao longo da curva (0.0 a 1.0) */
  t: number;
}

/**
 * Paleta cromática de 4 canais usada pelos pincéis, paisagens do Monte Fuji e efeitos Sakuga.
 */
export interface SumiColors {
  /** Cor primária do nanquim escuro (ex: `'#141413'`) */
  inkPrimary: string;
  /** Cor de energia ou acento carmesim/mineral (ex: `'#C8232C'`) */
  energySecondary: string;
  /** Cor de brilho interno ou aguada luminosa (ex: `'#FFF5F5'`) */
  coreGlow: string;
  /** Cor de partículas secundárias, pólen ou espuma (ex: `'#4A4742'`) */
  sporeAccent: string;
}

/**
 * Parâmetros físicos do pincel caligráfico de bambu (*Fude*) para fitas Kasure.
 */
export interface SumiBrushConfig {
  /** Quantidade de cerdas individuais simuladas (recomendado: `8` a `44`, padrão: `26`) */
  bristleCount: number;
  /** Multiplicador de espessura máxima do traço (recomendado: `0.4` a `2.5`, padrão: `1.2`) */
  strokeThickness: number;
  /** Afilamento inicial do traço (0.0 a 1.0) */
  taperStart: number;
  /** Afilamento na ponta final do golpe (0.0 a 1.0) */
  taperEnd: number;
  /** Lacuna de pincel seco *Kasure / Flying-White* (0.0 = sólido, 0.85 = cerdas bem abertas) */
  dryBrushGap: number;
  /** Curvatura radial do golpe (0.4 a 1.6) */
  curvature: number;
  /** Ângulo de rotação em graus (-180 a 180) */
  angle: number;
  /** Abertura angular do arco (0.3 a 1.5) */
  arcSweep: number;
}

/**
 * Configuração de dinâmica fluida, erosão FBM 2D e gotas centrífugas.
 */
export interface SumiDynamicsConfig {
  /** Quantidade de gotas centrífugas de tinta (0 a 60) */
  splatterCount: number;
  /** Dispersão radial das gotas de tinta (0.2 a 2.0) */
  splatterSpread: number;
  /** Cristas secundárias de onda/chama ao longo da borda (0 a 12) */
  hookWaves: number;
  /** Força da dissolução/erosão celular por ruído FBM 2D (0.0 a 1.5) */
  erosionStrength: number;
  /** Escala de frequência do ruído de erosão (0.5 a 3.0) */
  erosionScale: number;
  /** Intensidade da mancha de aguada atmosférica *Tarashikomi* (0.0 a 1.5) */
  glowIntensity: number;
  /** Deslocamento cromático entre a camada de energia e o nanquim */
  colorOffset: number;
  /** Tremor orgânico manual ao longo da espinha dorsal (0.0 a 1.0) */
  jitterAmount: number;
}

/**
 * Configuração de traço arquitetônico/orgânico do `rough.js`.
 */
export interface SumiRoughConfig {
  /** Rugosidade do traço à mão (0.0 a 3.0) */
  roughness: number;
  /** Arqueamento das linhas (0.0 a 3.0) */
  bowing: number;
  /** Espessura do contorno em pixels (0.5 a 4.0) */
  outlineWidth: number;
  /** Estilo de hachura interna (`'solid'`, `'hachure'`, `'cross-hatch'`, `'zigzag'`) */
  fillStyle: RoughFillStyle;
  /** Quantidade de degraus de cel-shading (1 a 5) */
  celSteps: number;
}

/**
 * Controle granular de opacidade/intensidade das 6 camadas da obra procedural `<SumiLandscape />`.
 */
export interface SumiLayerIntensities {
  /** Intensidade do Sol Carmesim em mancha de aquarela *Tarashikomi* (0.0 a 1.5, padrão: `1.0`) */
  sunIntensity: number;
  /** Intensidade da encosta caligráfica e aguada do Monte Fuji (0.0 a 1.5, padrão: `1.0`) */
  mountainIntensity: number;
  /** Intensidade dos troncos e galhos de cerejeira em nanquim (0.0 a 1.5, padrão: `1.0`) */
  sakuraBranchIntensity: number;
  /** Quantidade/intensidade das flores e pétalas de Sakura ao vento (0.0 a 1.5, padrão: `1.0`) */
  sakuraPetalsIntensity: number;
  /** Intensidade dos reflexos na água e da ilha de pinheiros (0.0 a 1.5, padrão: `1.0`) */
  waterReflectionIntensity: number;
  /** Intensidade das nuvens estilizadas *Kumo* na encosta (0.0 a 1.5, padrão: `1.0`) */
  mistKumoIntensity: number;
}

/**
 * Configuração completa do motor Sakuga de 16 quadros (`<SumiVFX />` e `renderVFXFrame`).
 */
export interface VFXConfig {
  /** Arquétipo do golpe ou efeito visual */
  archetype: ArchetypeId;
  /** Escola cromática base */
  school: SchoolId;
  /** Cores ativas de nanquim, energia, brilho e partículas */
  colors: SumiColors;
  /** Modo de plano de fundo */
  bgMode: BgMode;
  /** Modo de canal de saída */
  channelMode: ChannelMode;
  /** Parâmetros de cerdas e geometria do pincel */
  brush: SumiBrushConfig;
  /** Parâmetros de erosão celular e partículas */
  dynamics: SumiDynamicsConfig;
  /** Parâmetros de acabamento `rough.js` */
  rough: SumiRoughConfig;
  /** Número total de quadros da animação (padrão: `16`) */
  totalFrames: number;
  /** Taxa de quadros por segundo (padrão: `12` ou `16`) */
  fps: number;
  /** Semente determinística Mulberry32 */
  seed: number;
  /** Resolução canônica de cada quadro em pixels (`96`, `128`, `192` ou `256`) */
  frameSize: 96 | 128 | 192 | 256;
}

/**
 * Metadados de uma Escola Estética (`MAGIC_SCHOOLS`).
 */
export interface MagicSchool {
  /** Identificador único da escola */
  id: SchoolId;
  /** Nome de exibição em português */
  name: string;
  /** Descrição poética/técnica do elemento visual */
  elementStyle: string;
  /** Paleta de 4 cores calibrada */
  colors: SumiColors;
}

/**
 * Especificação matemática e artística das 10 técnicas fundamentais do motor SumiForge (`TECHNIQUE_CATALOG`).
 */
export interface TechniqueSpec {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  origin: string;
  archetype: ArchetypeId;
  school: SchoolId;
  equations: string[];
  invariantsDo: string[];
  invariantsDont: string[];
  description: string;
}

/**
 * Pincéis interativos disponíveis no Atelier `<SumiBrushCanvas />`.
 * - `'sumi_kasure'`: Nanquim caligráfico multi-cerdas com efeito de pincel seco (*Kasure*)
 * - `'sakura_branch'`: Galho de cerejeira que faz desabrochar flores de Sakura conforme a velocidade
 * - `'hokusai_wave'`: Onda oriental *Ukiyo-e* com cristas de espuma
 * - `'suibokuga_flame'`: Labareda de tinta e carmesim
 * - `'kumo_cloud'`: Nuvens orientais em volutas (*Kumo*)
 * - `'tarashikomi_wash'`: Aguada de aquarela úmida com borda mineral
 * - `'rough_crystal'`: Cristais e selos facetados com `rough.js`
 */
export type InteractiveBrushType =
  | 'sumi_kasure'
  | 'sakura_branch'
  | 'hokusai_wave'
  | 'suibokuga_flame'
  | 'kumo_cloud'
  | 'tarashikomi_wash'
  | 'rough_crystal';

/**
 * Amostra individual capturada durante um traço do usuário (toque, caneta stylus ou mouse).
 */
export interface BrushPointSample {
  /** Coordenada X em pixels */
  x: number;
  /** Coordenada Y em pixels */
  y: number;
  /** Pressão normalizada (0.1 a 1.0) */
  pressure: number;
  /** Velocidade instantânea do movimento */
  velocity: number;
  /** Timestamp em milissegundos */
  timestamp: number;
}

/**
 * Traço completo gravado em uma das camadas do `<SumiBrushCanvas />`.
 */
export interface RecordedBrushStroke {
  id: string;
  brushType: InteractiveBrushType;
  points: BrushPointSample[];
  colors: SumiColors;
  thickness: number;
  bristleCount: number;
  dryBrushGap: number;
  seed: number;
  layerId: 'background' | 'midground' | 'foreground';
}

/**
 * Coreografias de pinceladas para revelação de imagens no `<SumiMaskReveal />`.
 * - `'fuji_masterpiece'`: Cerimônia em golpes amplos diagonais + arco lunar + detalhes de florada
 * - `'katana_slashes'`: Golpes cruzados rápidos de pincel largo
 * - `'enso_spiral'`: Círculo caligráfico Zen *Ensō* que se expande a partir do centro
 * - `'hokusai_tide'`: Correntes fluidas horizontais em S-curve
 * - `'interactive_brush'`: Inicia limpo para o usuário revelar a obra com o dedo ou mouse
 */
export type MaskChoreography =
  | 'fuji_masterpiece'
  | 'katana_slashes'
  | 'enso_spiral'
  | 'hokusai_tide'
  | 'interactive_brush';

/**
 * Composições clássicas para o gerador de paisagens `<SumiSansui />` (山水).
 * - `'panoramic_river'`: Rio Panorâmico & Promontório (*Senri Kōzan* · 千里江山)
 * - `'karst_peaks'`: Picos Escarpados & Barco Solitário (*Kihō Kaiseki* · 奇峰怪石)
 * - `'layered_valley'`: Vale das Cinco Neblinas (*Jūran Jōshō* · 重巒畳嶂)
 * - `'twin_gorges'`: Garganta das Montanhas Gêmeas (*Ryōgan Seizan* · 両岸青山)
 * - `'dense_pine_sanctuary'`: Bosque Denso & Pavilhão na Montanha (*Shinzan Yūkoku* · 深山幽谷)
 */
export type SansuiComposition =
  | 'panoramic_river'
  | 'karst_peaks'
  | 'layered_valley'
  | 'twin_gorges'
  | 'dense_pine_sanctuary';

/**
 * Temas cromáticos para `<SumiSansui />`.
 * Use `'auto'` para ler automaticamente as variáveis CSS `--sumi-bg`, `--sumi-ink`, `--sumi-wash` e a classe `.dark`.
 */
export type SansuiThemeId =
  | 'classic_washi'
  | 'jade_mineral'
  | 'night_obsidian'
  | 'crimson_dawn'
  | 'cobalt_porcelain'
  | 'auto';

/**
 * Paleta de 5 canais de uma pintura *Sansui* (`<SumiSansui />`).
 */
export interface SansuiColors {
  /** Cor do papel / céu e extensão das águas (ex: `'#EDE6D6'`) */
  background: string;
  /** Cor principal do nanquim / contorno caligráfico das cristas, árvores e barco (ex: `'#1D1B18'`) */
  ink: string;
  /** Cor da aguada mineral ou sombreado interno das montanhas (ex: `'#6E8276'`) */
  wash: string;
  /** Cor da neblina atmosférica que separa os planos de profundidade (ex: `'#EDE6D6'`) */
  mist: string;
  /** Cor de acento opcional para detalhes ou selo (ex: `'#C8232C'`) */
  accent: string;
}

/**
 * Definição de um tema predefinido de paisagem *Sansui* (`SANSUI_THEMES`).
 */
export interface SansuiThemePreset {
  id: Exclude<SansuiThemeId, 'auto'>;
  name: string;
  jp: string;
  romaji: string;
  subtitle: string;
  isDark?: boolean;
  colors: SansuiColors;
}

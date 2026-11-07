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

export type ChannelMode = 'composite' | 'ink_only' | 'energy_only' | 'shader_rgb_mask';
export type BgMode = 'washi' | 'checker' | 'dark' | 'transparent';
export type RoughFillStyle = 'solid' | 'hachure' | 'cross-hatch' | 'zigzag';

export interface Point2D {
  x: number;
  y: number;
  nx: number;
  ny: number;
  t: number;
}

export interface SumiColors {
  inkPrimary: string;
  energySecondary: string;
  coreGlow: string;
  sporeAccent: string;
}

export interface SumiBrushConfig {
  bristleCount: number;
  strokeThickness: number;
  taperStart: number;
  taperEnd: number;
  dryBrushGap: number;
  curvature: number;
  angle: number;
  arcSweep: number;
}

export interface SumiDynamicsConfig {
  splatterCount: number;
  splatterSpread: number;
  hookWaves: number;
  erosionStrength: number;
  erosionScale: number;
  glowIntensity: number;
  colorOffset: number;
  jitterAmount: number;
}

export interface SumiRoughConfig {
  roughness: number;
  bowing: number;
  outlineWidth: number;
  fillStyle: RoughFillStyle;
  celSteps: number;
}

export interface SumiLayerIntensities {
  sunIntensity: number;
  mountainIntensity: number;
  sakuraBranchIntensity: number;
  sakuraPetalsIntensity: number;
  waterReflectionIntensity: number;
  mistKumoIntensity: number;
}

export interface VFXConfig {
  archetype: ArchetypeId;
  school: SchoolId;
  colors: SumiColors;
  bgMode: BgMode;
  channelMode: ChannelMode;
  brush: SumiBrushConfig;
  dynamics: SumiDynamicsConfig;
  rough: SumiRoughConfig;
  totalFrames: number;
  fps: number;
  seed: number;
  frameSize: 96 | 128 | 192 | 256;
}

export interface MagicSchool {
  id: SchoolId;
  name: string;
  elementStyle: string;
  colors: SumiColors;
}

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

export type InteractiveBrushType =
  | 'sumi_kasure'
  | 'sakura_branch'
  | 'hokusai_wave'
  | 'suibokuga_flame'
  | 'kumo_cloud'
  | 'tarashikomi_wash'
  | 'rough_crystal';

export interface BrushPointSample {
  x: number;
  y: number;
  pressure: number;
  velocity: number;
  timestamp: number;
}

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

export type MaskChoreography =
  | 'fuji_masterpiece'
  | 'katana_slashes'
  | 'enso_spiral'
  | 'hokusai_tide'
  | 'interactive_brush';

export type SansuiComposition =
  | 'panoramic_river'
  | 'karst_peaks'
  | 'layered_valley'
  | 'twin_gorges'
  | 'dense_pine_sanctuary';

export type SansuiThemeId =
  | 'classic_washi'
  | 'jade_mineral'
  | 'night_obsidian'
  | 'crimson_dawn'
  | 'cobalt_porcelain'
  | 'auto';

export interface SansuiColors {
  /** Cor do papel / céu e extensão das águas */
  background: string;
  /** Cor principal do nanquim / contorno caligráfico das cristas, árvores e barco */
  ink: string;
  /** Cor da aguada mineral ou sombreado interno das montanhas */
  wash: string;
  /** Cor da neblina atmosférica que separa os planos de profundidade */
  mist: string;
  /** Cor de acento opcional (folhagem, sol discreto ou selo) */
  accent: string;
}

export interface SansuiThemePreset {
  id: Exclude<SansuiThemeId, 'auto'>;
  name: string;
  jp: string;
  romaji: string;
  subtitle: string;
  isDark?: boolean;
  colors: SansuiColors;
}


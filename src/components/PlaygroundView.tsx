import React, { useRef, useState } from 'react';
import {
  ARCHETYPE_CATALOG,
  ArchetypeId,
  ChannelMode,
  DEFAULT_FUJI_LAYERS,
  DEFAULT_VFX_CONFIG,
  encodeAnimatedGIF89a,
  InteractiveBrushType,
  JapaneseCalligraphy,
  MAGIC_SCHOOLS,
  MaskChoreography,
  renderVFXFrame,
  SchoolId,
  SumiBrushCanvas,
  SumiButton,
  SumiIcon,
  SumiLandscape,
  SumiLayerIntensities,
  SumiMaskReveal,
  SumiVFX,
  VFXConfig,
} from '../lib/sumi-forge';

interface PlaygroundViewProps {
  initialTab?: 'mask' | 'atelier' | 'vfx' | 'landscape';
  initialArchetype?: ArchetypeId;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  initialTab = 'mask',
  initialArchetype,
}) => {
  const [activeTab, setActiveTab] = useState<'mask' | 'atelier' | 'vfx' | 'landscape'>(initialTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ===========================================================================
  // ESTADO BANCADA 1: CSS MASK IMAGE REVEAL (<SumiMaskReveal />)
  // ===========================================================================
  const [maskImageSrc, setMaskImageSrc] = useState<string>('/assets/aistudio/image_8f7809d3.png');
  const [maskChoreography, setMaskChoreography] = useState<MaskChoreography>('fuji_masterpiece');
  const [maskDuration, setMaskDuration] = useState<number>(3.2);
  const [maskBristles, setMaskBristles] = useState<number>(26);
  const [maskDryGap, setMaskDryGap] = useState<number>(0.28);
  const [maskSeed, setMaskSeed] = useState<number>(8472);
  const [maskXRay, setMaskXRay] = useState<boolean>(false);
  const [maskLiveAccents, setMaskLiveAccents] = useState<boolean>(true);
  const [maskReplayTrigger, setMaskReplayTrigger] = useState<number>(1);

  // ===========================================================================
  // ESTADO BANCADA 2: ATELIER DE PINTURA COM PRESSÃO (<SumiBrushCanvas />)
  // ===========================================================================
  const [activeBrush, setActiveBrush] = useState<InteractiveBrushType>('sakura_branch');
  const [atelierSchool, setAtelierSchool] = useState<SchoolId>('fuji_sakura');
  const [brushThickness, setBrushThickness] = useState<number>(1.3);
  const [brushBristles, setBrushBristles] = useState<number>(26);
  const [brushDryGap, setBrushDryGap] = useState<number>(0.32);
  const [activeDrawLayer, setActiveDrawLayer] = useState<'background' | 'midground' | 'foreground'>(
    'foreground'
  );
  const [layerOpacities, setLayerOpacities] = useState({
    background: 1.0,
    midground: 1.0,
    foreground: 1.0,
  });
  const [showRefGuide, setShowRefGuide] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState({
    pressure: 0,
    velocity: 0,
    strokeCount: 4,
    isReplaying: false,
  });
  const atelierActionsRef = useRef<{
    replayStrokes: () => void;
    undoStroke: () => void;
    clearCanvas: () => void;
    loadFujiPresetStrokes: () => void;
    exportPng: () => void;
  } | null>(null);

  // ===========================================================================
  // ESTADO BANCADA 3: FORJA SAKUGA 16 QUADROS (<SumiVFX /> + GIF89a + 4x4)
  // ===========================================================================
  const [vfxConfig, setVfxConfig] = useState<VFXConfig>(() => {
    if (initialArchetype) {
      const archInfo = ARCHETYPE_CATALOG.find((a) => a.id === initialArchetype);
      const sch = archInfo ? MAGIC_SCHOOLS[archInfo.defaultSchool] : MAGIC_SCHOOLS.calligraphy_tide;
      return {
        ...DEFAULT_VFX_CONFIG,
        archetype: initialArchetype,
        school: sch.id,
        colors: { ...sch.colors },
      };
    }
    return { ...DEFAULT_VFX_CONFIG };
  });
  const [vfxPaused, setVfxPaused] = useState<boolean>(false);
  const [scrubFrame, setScrubFrame] = useState<number | null>(null);
  const [currentTickFrame, setCurrentTickFrame] = useState<number>(0);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);

  // ===========================================================================
  // ESTADO BANCADA 4: COMPOSITOR DE PAISAGEM (<SumiLandscape />)
  // ===========================================================================
  const [landscapeLayers, setLandscapeLayers] = useState<SumiLayerIntensities>({
    ...DEFAULT_FUJI_LAYERS,
  });
  const [landscapeWind, setLandscapeWind] = useState<number>(1.0);
  const [landscapeSeed, setLandscapeSeed] = useState<number>(8472);
  const [landscapeSchool, setLandscapeSchool] = useState<SchoolId>('fuji_sakura');

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMaskImageSrc(reader.result);
        setMaskReplayTrigger((t) => t + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSpriteSheetPNG = () => {
    const offCanvas = document.createElement('canvas');
    const fSize = vfxConfig.frameSize;
    offCanvas.width = fSize * 4;
    offCanvas.height = fSize * 4;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * fSize, row * fSize, fSize, fSize);
      ctx.clip();
      ctx.translate(col * fSize, row * fSize);
      renderVFXFrame(ctx, i, 16, fSize, fSize, vfxConfig, true);
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `${vfxConfig.archetype}-${vfxConfig.school}-${fSize}px-4x4.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
  };

  const handleDownloadAnimatedGIF89a = () => {
    setIsExportingGif(true);
    setTimeout(() => {
      try {
        const fSize = vfxConfig.frameSize;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = fSize;
        offCanvas.height = fSize;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return;

        const frames: ImageData[] = [];
        for (let i = 0; i < 16; i++) {
          ctx.clearRect(0, 0, fSize, fSize);
          renderVFXFrame(ctx, i, 16, fSize, fSize, vfxConfig, true);
          frames.push(ctx.getImageData(0, 0, fSize, fSize));
        }

        const gifBytes = encodeAnimatedGIF89a(frames, fSize, fSize, vfxConfig.fps);
        const blob = new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${vfxConfig.archetype}-${vfxConfig.school}.gif`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } finally {
        setIsExportingGif(false);
      }
    }, 30);
  };

  const handleDownloadPresetJSON = () => {
    const blob = new Blob([JSON.stringify(vfxConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sumi-preset-${vfxConfig.archetype}.json`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const generatedJSX =
    activeTab === 'mask'
      ? `import { SumiMaskReveal } from '@sumi-forge/react';

export function MyMaskedArtwork() {
  return (
    <SumiMaskReveal
      src="${maskImageSrc.startsWith('data:') ? '/custom-uploaded-image.png' : maskImageSrc}"
      choreography="${maskChoreography}"
      duration={${maskDuration}}
      bristleCount={${maskBristles}}
      dryBrushGap={${maskDryGap}}
      seed={${maskSeed}}
      showLiveInkAccents={${maskLiveAccents}}
      interactiveBrush
    />
  );
}`
      : activeTab === 'atelier'
        ? `import { SumiBrushCanvas, MAGIC_SCHOOLS } from '@sumi-forge/react';

export function InteractivePaintingPad() {
  return (
    <SumiBrushCanvas
      activeBrush="${activeBrush}"
      colors={MAGIC_SCHOOLS['${atelierSchool}'].colors}
      strokeThickness={${brushThickness}}
      bristleCount={${brushBristles}}
      dryBrushGap={${brushDryGap}}
      activeLayer="${activeDrawLayer}"
      layerOpacities={{
        background: ${layerOpacities.background},
        midground: ${layerOpacities.midground},
        foreground: ${layerOpacities.foreground},
      }}
    />
  );
}`
        : activeTab === 'vfx'
          ? `import { SumiVFX } from '@sumi-forge/react';

export function SakugaEffect() {
  return (
    <SumiVFX
      mode="player"
      size={256}
      config={${JSON.stringify(vfxConfig, null, 2)}}
    />
  );
}`
          : `import { SumiLandscape, MAGIC_SCHOOLS } from '@sumi-forge/react';

export function LivingFujiScene() {
  return (
    <SumiLandscape
      seed={${landscapeSeed}}
      windSpeed={${landscapeWind}}
      colors={MAGIC_SCHOOLS['${landscapeSchool}'].colors}
      layers={${JSON.stringify(landscapeLayers, null, 2)}}
    />
  );
}`;

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
      {/* Cabeçalho do Playground & Seletor de Bancadas com Botões Rough.js */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 sm:pb-6 mb-6 sm:mb-8 border-b border-[#D5CEC0]">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-[#3F3D39] mb-1">
            <JapaneseCalligraphy
              jp="道場"
              romaji="Dōjō"
              pt="Lugar de criação, prática e domínio da arte"
              variant="hanko"
              tooltipPlacement="bottom"
            />
            <span>Estúdio Criativo @sumi-forge/react</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#11100E]">
            Playground &amp; Forja de Componentes
          </h1>
        </div>

        {/* 4 Bancadas de Trabalho com Caixas Rough.js */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-[#E6DFD1]/80 border border-[#D5CEC0] rounded-xl">
          {(
            [
              { id: 'mask', label: '1. Revelar Imagens', icon: 'eye' as const },
              { id: 'atelier', label: '2. Atelier com Pressão', icon: 'brush' as const },
              { id: 'vfx', label: '3. Estúdio de Efeitos', icon: 'katana' as const },
              { id: 'landscape', label: '4. Camadas Monte Fuji', icon: 'mountain' as const },
            ] as const
          ).map((t, idx) => {
            const active = activeTab === t.id;
            return (
              <SumiButton
                key={t.id}
                variant={active ? 'ink' : 'washi'}
                size="sm"
                seed={200 + idx}
                active={active}
                onClick={() => setActiveTab(t.id)}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-[2px] p-0.5 ${
                    active ? 'bg-[#F7F3EB]' : ''
                  }`}
                >
                  <SumiIcon name={t.icon} size={18} color="#11100E" />
                </span>
                <span>{t.label}</span>
              </SumiButton>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          BANCADA 1: REVELAÇÃO DE IMAGENS (<SumiMaskReveal />)
          No mobile a tela de pintura vem primeiro (order-1 lg:order-2) para facilitar o toque imediato
          ===================================================================== */}
      {activeTab === 'mask' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="order-2 lg:order-1 lg:col-span-4 border border-[#D5CEC0] bg-[#E6DFD1]/55 rounded-xl p-4 sm:p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#11100E] mb-1">
                Pintura Animada de Imagens
              </h2>
              <p className="text-xs text-[#3F3D39]">
                Use a obra do Monte Fuji ou envie qualquer imagem do seu celular/computador para
                revelá-la com pinceladas ou com a ponta do dedo.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#11100E]">Imagem Alvo</label>
              <div className="flex flex-wrap items-center gap-2">
                <SumiButton
                  variant={
                    maskImageSrc === '/assets/aistudio/image_8f7809d3.png' ? 'crimson' : 'washi'
                  }
                  size="sm"
                  seed={210}
                  className="flex-1"
                  onClick={() => {
                    setMaskImageSrc('/assets/aistudio/image_8f7809d3.png');
                    setMaskReplayTrigger((t) => t + 1);
                  }}
                >
                  <span>Monte Fuji &amp; Sakura</span>
                </SumiButton>

                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={211}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <SumiIcon name="upload" size={18} color="#11100E" />
                  <span>Enviar Foto</span>
                </SumiButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCustomImage}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#11100E]">
                Coreografia das Pinceladas
              </label>
              <select
                value={maskChoreography}
                onChange={(e) => {
                  setMaskChoreography(e.target.value as MaskChoreography);
                  setMaskReplayTrigger((t) => t + 1);
                }}
                className="w-full px-3 py-2 text-xs rounded-[2px] border border-[#11100E] bg-[#F2EDE2] text-[#11100E]"
              >
                <option value="fuji_masterpiece">Coreografia Mestre Monte Fuji &amp; Sakura</option>
                <option value="katana_slashes">Golpes Cruzados de Pincel</option>
                <option value="enso_spiral">Espiral Caligráfica Zen Ensō</option>
                <option value="hokusai_tide">Correntes de Rio &amp; Ondas</option>
                <option value="interactive_brush">Pintar com o Dedo / Mouse (Do Zero)</option>
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#D5CEC0]">
              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Densidade de Cerdas</span>
                  <span className="font-tabular">{maskBristles}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={40}
                  value={maskBristles}
                  onChange={(e) => setMaskBristles(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Textura de Pincel Seco</span>
                  <span className="font-tabular">{maskDryGap.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.75}
                  step={0.02}
                  value={maskDryGap}
                  onChange={(e) => setMaskDryGap(parseFloat(e.target.value))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Duração da Pintura</span>
                  <span className="font-tabular">{maskDuration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={7.0}
                  step={0.2}
                  value={maskDuration}
                  onChange={(e) => setMaskDuration(parseFloat(e.target.value))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Variação Orgânica</span>
                  <span className="font-tabular">#{maskSeed}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={99999}
                  step={17}
                  value={maskSeed}
                  onChange={(e) => setMaskSeed(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C8232C]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-[#D5CEC0] text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maskLiveAccents}
                  onChange={(e) => setMaskLiveAccents(e.target.checked)}
                  className="accent-[#C8232C]"
                />
                <span>Animar pétalas de Sakura sobre a imagem revelada</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maskXRay}
                  onChange={(e) => setMaskXRay(e.target.checked)}
                  className="accent-[#C8232C]"
                />
                <span>Visualizar apenas as cerdas do pincel (Máscara Pura)</span>
              </label>
            </div>

            <SumiButton
              variant="crimson"
              size="md"
              seed={219}
              fullWidth
              onClick={() => setMaskReplayTrigger((t) => t + 1)}
            >
              <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                <SumiIcon name="replay" size={18} color="#11100E" />
              </span>
              <span>Executar Pintura Novamente</span>
            </SumiButton>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-8 space-y-4">
            {/* Barra rápida para Celular/Tablet acima da tela */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[#D5CEC0] bg-[#E6DFD1]/65">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'fuji_masterpiece', label: 'Abertura Fuji' },
                    { id: 'katana_slashes', label: 'Golpes' },
                    { id: 'hokusai_tide', label: 'Ondas' },
                    { id: 'enso_spiral', label: 'Ensō' },
                    { id: 'interactive_brush', label: 'Pintar com o Dedo' },
                  ] as const
                ).map((m, idx) => (
                  <SumiButton
                    key={m.id}
                    variant={
                      maskChoreography === m.id
                        ? 'ink'
                        : m.id === 'interactive_brush'
                          ? 'crimson'
                          : 'washi'
                    }
                    size="xs"
                    seed={310 + idx}
                    active={maskChoreography === m.id}
                    onClick={() => {
                      setMaskChoreography(m.id);
                      setMaskReplayTrigger((t) => t + 1);
                    }}
                  >
                    {m.label}
                  </SumiButton>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={318}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <SumiIcon name="upload" size={14} color="#11100E" />
                  <span>Sua Foto</span>
                </SumiButton>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={319}
                  onClick={() => setMaskReplayTrigger((t) => t + 1)}
                >
                  <SumiIcon name="replay" size={14} color="#11100E" />
                  <span>Repintar</span>
                </SumiButton>
              </div>
            </div>

            <div className="h-[320px] sm:h-[420px] lg:h-[480px] rounded-xl border border-[#D5CEC0] bg-[#F4F1EA] overflow-hidden relative shadow-xs">
              <SumiMaskReveal
                src={maskImageSrc}
                choreography={maskChoreography}
                duration={maskDuration}
                bristleCount={maskBristles}
                dryBrushGap={maskDryGap}
                seed={maskSeed}
                showLiveInkAccents={maskLiveAccents}
                maskOnlyPreview={maskXRay}
                replayTrigger={maskReplayTrigger}
                interactiveBrush
                showTouchControls
              />
            </div>

            <div className="border border-[#D5CEC0] rounded-xl bg-[#11100E] text-[#F2EDE2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-800 text-xs">
                <span className="font-tabular text-stone-400">
                  Componente React pronto para copiar
                </span>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={222}
                  onClick={() => handleCopy(generatedJSX, 'jsx-mask')}
                >
                  <SumiIcon
                    name={copiedId === 'jsx-mask' ? 'check' : 'copy'}
                    size={15}
                    color="#11100E"
                  />
                  <span>{copiedId === 'jsx-mask' ? 'Copiado!' : 'Copiar JSX'}</span>
                </SumiButton>
              </div>
              <pre className="text-xs font-tabular overflow-x-auto leading-relaxed">
                <code>{generatedJSX}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          BANCADA 2: ATELIER DE PINTURA LIVRE COM PRESSÃO (<SumiBrushCanvas />)
          No mobile a tela de pintura e o seletor rápido de pincéis aparecem primeiro
          ===================================================================== */}
      {activeTab === 'atelier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="order-2 lg:order-1 lg:col-span-4 border border-[#D5CEC0] bg-[#E6DFD1]/55 rounded-xl p-4 sm:p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#11100E] mb-1">
                Atelier de Pincéis &amp; Pressão
              </h2>
              <p className="text-xs text-[#3F3D39]">
                Desenhe com o dedo no celular, caneta ou mouse no papel Washi. O traço responde à
                pressão e à velocidade do movimento.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#11100E]">Estilo do Pincel</label>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { id: 'sakura_branch', label: 'Galho de Cerejeira & Flores de Sakura' },
                    { id: 'sumi_kasure', label: 'Pincel Caligráfico de Bambu (Nanquim)' },
                    { id: 'hokusai_wave', label: 'Ondas & Espuma do Mar Oriental' },
                    { id: 'suibokuga_flame', label: 'Pétalas de Fogo Aquareladas' },
                    { id: 'kumo_cloud', label: 'Volutas de Nuvem & Neblina' },
                    { id: 'tarashikomi_wash', label: 'Mancha de Aquarela Úmida' },
                  ] as const
                ).map((b, idx) => (
                  <SumiButton
                    key={b.id}
                    variant={activeBrush === b.id ? 'ink' : 'washi'}
                    size="sm"
                    seed={230 + idx}
                    active={activeBrush === b.id}
                    fullWidth
                    className="justify-start text-left"
                    onClick={() => setActiveBrush(b.id)}
                  >
                    <span>{b.label}</span>
                  </SumiButton>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#11100E]">Paleta de Cores</label>
              <select
                value={atelierSchool}
                onChange={(e) => setAtelierSchool(e.target.value as SchoolId)}
                className="w-full px-3 py-2 text-xs rounded-[2px] border border-[#11100E] bg-[#F2EDE2]"
              >
                {Object.values(MAGIC_SCHOOLS).map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#D5CEC0]">
              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Espessura do Pincel</span>
                  <span className="font-tabular">{brushThickness.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.4}
                  step={0.05}
                  value={brushThickness}
                  onChange={(e) => setBrushThickness(parseFloat(e.target.value))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Quantidade de Cerdas</span>
                  <span className="font-tabular">{brushBristles}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={38}
                  value={brushBristles}
                  onChange={(e) => setBrushBristles(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-xs mb-1">
                  <span>Abertura de Pincel Seco</span>
                  <span className="font-tabular">{brushDryGap.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={0.8}
                  step={0.02}
                  value={brushDryGap}
                  onChange={(e) => setBrushDryGap(parseFloat(e.target.value))}
                  className="w-full accent-[#C8232C]"
                />
              </label>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#D5CEC0]">
              <div className="text-xs font-medium text-[#11100E]">
                Camada Ativa &amp; Intensidade por Camada
              </div>
              {(
                [
                  { id: 'background', label: 'Camada 1: Fundo & Sol' },
                  { id: 'midground', label: 'Camada 2: Meio-Plano & Montanha' },
                  { id: 'foreground', label: 'Camada 3: Primeiro Plano & Sakura' },
                ] as const
              ).map((ly) => (
                <div
                  key={ly.id}
                  className={`p-2.5 rounded-[2px] border ${
                    activeDrawLayer === ly.id
                      ? 'border-[#C8232C] bg-[#F2EDE2]'
                      : 'border-[#D5CEC0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <button
                      onClick={() => setActiveDrawLayer(ly.id)}
                      className="font-medium text-left hover:text-[#C8232C] cursor-pointer"
                    >
                      {activeDrawLayer === ly.id ? `● ${ly.label}` : `○ ${ly.label}`}
                    </button>
                    <span className="font-tabular">
                      {Math.round(layerOpacities[ly.id] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layerOpacities[ly.id]}
                    onChange={(e) =>
                      setLayerOpacities((prev) => ({
                        ...prev,
                        [ly.id]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#C8232C]"
                  />
                </div>
              ))}

              <label className="flex items-center gap-2 text-xs pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRefGuide}
                  onChange={(e) => setShowRefGuide(e.target.checked)}
                  className="accent-[#C8232C]"
                />
                <span>Exibir guia translúcido da obra Monte Fuji &amp; Sakura</span>
              </label>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-8 space-y-4">
            {/* Seletor Rápido de Pincéis Visível no Mobile/Tablet acima da tela */}
            <div className="lg:hidden flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl border border-[#D5CEC0] bg-[#E6DFD1]/70">
              <span className="text-[11px] font-semibold text-[#11100E] mr-1">Pincel:</span>
              {(
                [
                  { id: 'sakura_branch', label: 'Sakura' },
                  { id: 'sumi_kasure', label: 'Nanquim' },
                  { id: 'hokusai_wave', label: 'Ondas' },
                  { id: 'suibokuga_flame', label: 'Fogo' },
                  { id: 'kumo_cloud', label: 'Nuvens' },
                  { id: 'tarashikomi_wash', label: 'Aquarela' },
                ] as const
              ).map((b, idx) => (
                <SumiButton
                  key={b.id}
                  variant={activeBrush === b.id ? 'ink' : 'washi'}
                  size="xs"
                  seed={340 + idx}
                  active={activeBrush === b.id}
                  onClick={() => setActiveBrush(b.id)}
                >
                  {b.label}
                </SumiButton>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-[#D5CEC0] bg-[#E6DFD1]/60">
              <div className="flex flex-wrap items-center gap-2">
                <SumiButton
                  variant="crimson"
                  size="sm"
                  seed={241}
                  onClick={() => atelierActionsRef.current?.replayStrokes()}
                >
                  <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                    <SumiIcon name="play" size={16} color="#11100E" />
                  </span>
                  <span>Replay Animado</span>
                </SumiButton>
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={242}
                  onClick={() => atelierActionsRef.current?.loadFujiPresetStrokes()}
                >
                  <SumiIcon name="sakura" size={16} color="#11100E" />
                  <span>Recarregar Fuji</span>
                </SumiButton>
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={243}
                  onClick={() => atelierActionsRef.current?.undoStroke()}
                >
                  <SumiIcon name="undo" size={16} color="#11100E" />
                  <span>Desfazer</span>
                </SumiButton>
                <SumiButton
                  variant="washi"
                  size="sm"
                  seed={244}
                  onClick={() => atelierActionsRef.current?.clearCanvas()}
                >
                  <SumiIcon name="trash" size={16} color="#11100E" />
                  <span>Limpar</span>
                </SumiButton>
              </div>

              <SumiButton
                variant="ink"
                size="sm"
                seed={245}
                onClick={() => atelierActionsRef.current?.exportPng()}
              >
                <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                  <SumiIcon name="download" size={16} color="#11100E" />
                </span>
                <span>Baixar PNG</span>
              </SumiButton>
            </div>

            <div className="h-[320px] sm:h-[420px] lg:h-[460px] rounded-xl border border-[#D5CEC0] bg-[#F4F1EA] overflow-hidden relative shadow-xs">
              <SumiBrushCanvas
                activeBrush={activeBrush}
                colors={MAGIC_SCHOOLS[atelierSchool].colors}
                strokeThickness={brushThickness}
                bristleCount={brushBristles}
                dryBrushGap={brushDryGap}
                activeLayer={activeDrawLayer}
                layerOpacities={layerOpacities}
                showReferenceGuide={showRefGuide}
                onTelemetryChange={setTelemetry}
                actionsRef={atelierActionsRef}
              />

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-tabular bg-[#F2EDE2]/90 border border-[#D5CEC0] rounded-lg px-3 py-1.5 pointer-events-none">
                <span>
                  Toque ou arraste para pintar · Pressão: {(telemetry.pressure * 100).toFixed(0)}%
                </span>
                <span>Traços: {telemetry.strokeCount}</span>
              </div>
            </div>

            <div className="border border-[#D5CEC0] rounded-xl bg-[#11100E] text-[#F2EDE2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-800 text-xs">
                <span className="font-tabular text-stone-400">
                  Componente &lt;SumiBrushCanvas /&gt; pronto para copiar
                </span>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={249}
                  onClick={() => handleCopy(generatedJSX, 'jsx-atelier')}
                >
                  <SumiIcon
                    name={copiedId === 'jsx-atelier' ? 'check' : 'copy'}
                    size={15}
                    color="#11100E"
                  />
                  <span>{copiedId === 'jsx-atelier' ? 'Copiado!' : 'Copiar JSX'}</span>
                </SumiButton>
              </div>
              <pre className="text-xs font-tabular overflow-x-auto leading-relaxed">
                <code>{generatedJSX}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          BANCADA 3: ESTÚDIO DE EFEITOS (<SumiVFX /> + GIF89a + 4x4)
          ===================================================================== */}
      {activeTab === 'vfx' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-5 border border-[#D5CEC0] bg-[#E6DFD1]/55 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#11100E]">Estúdio de Efeitos Animados</h2>
              <span className="text-xs font-tabular text-[#3F3D39]">16 Quadros</span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium">Estilo do Efeito</label>
              <select
                value={vfxConfig.archetype}
                onChange={(e) => {
                  const archId = e.target.value as ArchetypeId;
                  setVfxConfig((prev) => ({ ...prev, archetype: archId }));
                }}
                className="w-full px-3 py-2 text-xs rounded-[2px] border border-[#11100E] bg-[#F2EDE2]"
              >
                {ARCHETYPE_CATALOG.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">Paleta de Cores</label>
              <select
                value={vfxConfig.school}
                onChange={(e) => {
                  const sId = e.target.value as SchoolId;
                  const sch = MAGIC_SCHOOLS[sId];
                  setVfxConfig((prev) => ({
                    ...prev,
                    school: sId,
                    colors: { ...sch.colors },
                  }));
                }}
                className="w-full px-3 py-2 text-xs rounded-[2px] border border-[#11100E] bg-[#F2EDE2]"
              >
                {Object.values(MAGIC_SCHOOLS).map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {(
                  [
                    { key: 'inkPrimary', label: 'Tinta' },
                    { key: 'energySecondary', label: 'Acento' },
                    { key: 'coreGlow', label: 'Brilho' },
                  ] as const
                ).map((c) => (
                  <label
                    key={c.key}
                    className="flex flex-col gap-1 p-2 rounded-[2px] border border-[#D5CEC0] bg-[#F2EDE2] text-[11px]"
                  >
                    <span className="text-[#3F3D39]">{c.label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={vfxConfig.colors[c.key]}
                        onChange={(e) =>
                          setVfxConfig((prev) => ({
                            ...prev,
                            colors: { ...prev.colors, [c.key]: e.target.value },
                          }))
                        }
                        className="w-5 h-5 rounded cursor-pointer border-0 shrink-0"
                      />
                      <span className="font-tabular truncate">{vfxConfig.colors[c.key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Modo de Visualização de Camada</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'composite', label: 'Completo' },
                    { id: 'ink_only', label: 'Só Nanquim' },
                    { id: 'energy_only', label: 'Só Cor' },
                    { id: 'shader_rgb_mask', label: 'Canais Puros' },
                  ] as const
                ).map((cm, idx) => (
                  <SumiButton
                    key={cm.id}
                    variant={vfxConfig.channelMode === cm.id ? 'ink' : 'washi'}
                    size="xs"
                    seed={250 + idx}
                    active={vfxConfig.channelMode === cm.id}
                    onClick={() =>
                      setVfxConfig((prev) => ({ ...prev, channelMode: cm.id as ChannelMode }))
                    }
                  >
                    {cm.label}
                  </SumiButton>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D5CEC0] text-xs">
              <label className="block">
                <div className="flex justify-between mb-1">
                  <span>Cerdas do Pincel</span>
                  <span className="font-tabular">{vfxConfig.brush.bristleCount}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={38}
                  value={vfxConfig.brush.bristleCount}
                  onChange={(e) =>
                    setVfxConfig((p) => ({
                      ...p,
                      brush: { ...p.brush, bristleCount: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between mb-1">
                  <span>Textura Seca</span>
                  <span className="font-tabular">{vfxConfig.brush.dryBrushGap.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.02}
                  value={vfxConfig.brush.dryBrushGap}
                  onChange={(e) =>
                    setVfxConfig((p) => ({
                      ...p,
                      brush: { ...p.brush, dryBrushGap: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between mb-1">
                  <span>Dissolução Orgânica</span>
                  <span className="font-tabular">
                    {vfxConfig.dynamics.erosionStrength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={vfxConfig.dynamics.erosionStrength}
                  onChange={(e) =>
                    setVfxConfig((p) => ({
                      ...p,
                      dynamics: { ...p.dynamics, erosionStrength: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between mb-1">
                  <span>Gotas de Tinta</span>
                  <span className="font-tabular">{vfxConfig.dynamics.splatterCount}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={56}
                  value={vfxConfig.dynamics.splatterCount}
                  onChange={(e) =>
                    setVfxConfig((p) => ({
                      ...p,
                      dynamics: { ...p.dynamics, splatterCount: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-[#C8232C]"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-[#D5CEC0] space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SumiButton
                  variant="ink"
                  size="sm"
                  seed={261}
                  fullWidth
                  onClick={handleDownloadSpriteSheetPNG}
                >
                  <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                    <SumiIcon name="download" size={16} color="#11100E" />
                  </span>
                  <span>Sprite Sheet 4×4 PNG</span>
                </SumiButton>

                <SumiButton
                  variant="crimson"
                  size="sm"
                  seed={262}
                  fullWidth
                  disabled={isExportingGif}
                  onClick={handleDownloadAnimatedGIF89a}
                >
                  <span className="inline-flex items-center justify-center bg-[#F7F3EB] rounded-[2px] p-0.5">
                    <SumiIcon name="download" size={16} color="#11100E" />
                  </span>
                  <span>{isExportingGif ? 'Gerando GIF...' : 'Exportar GIF Animado'}</span>
                </SumiButton>
              </div>
              <SumiButton
                variant="washi"
                size="sm"
                seed={263}
                fullWidth
                onClick={handleDownloadPresetJSON}
              >
                <SumiIcon name="scroll" size={16} color="#11100E" />
                <span>Baixar Preset JSON</span>
              </SumiButton>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[#D5CEC0] bg-[#E6DFD1]/45 rounded-xl p-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs mb-3 font-tabular">
                  <span className="font-medium">Animação em Tempo Real</span>
                  <div className="flex items-center gap-1">
                    {(['washi', 'checker', 'dark'] as const).map((bg, idx) => (
                      <SumiButton
                        key={bg}
                        variant={vfxConfig.bgMode === bg ? 'ink' : 'ghost'}
                        size="xs"
                        seed={270 + idx}
                        active={vfxConfig.bgMode === bg}
                        onClick={() => setVfxConfig((p) => ({ ...p, bgMode: bg }))}
                      >
                        {bg}
                      </SumiButton>
                    ))}
                  </div>
                </div>

                <SumiVFX
                  config={vfxConfig}
                  mode="player"
                  size={250}
                  paused={vfxPaused}
                  fixedFrame={scrubFrame}
                  onFrameTick={setCurrentTickFrame}
                  className="rounded-lg border border-[#D5CEC0]"
                />

                <div className="w-full mt-4 pt-3 border-t border-[#D5CEC0]">
                  <div className="flex items-center justify-between text-xs font-tabular mb-2">
                    <SumiButton
                      variant="washi"
                      size="xs"
                      seed={275}
                      onClick={() => {
                        setScrubFrame(null);
                        setVfxPaused((p) => !p);
                      }}
                    >
                      <SumiIcon
                        name={vfxPaused || scrubFrame !== null ? 'play' : 'pause'}
                        size={14}
                        color="#11100E"
                      />
                      <span>
                        {vfxPaused || scrubFrame !== null ? 'Retomar Loop' : 'Pausar'}
                      </span>
                    </SumiButton>
                    <span>Quadro {(scrubFrame ?? currentTickFrame) + 1} / 16</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const active = (scrubFrame ?? currentTickFrame) === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setVfxPaused(true);
                            setScrubFrame(idx);
                          }}
                          className={`py-1 text-[11px] font-tabular rounded-[2px] border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#C8232C] text-white border-[#11100E]'
                              : 'border-[#D5CEC0] bg-[#FAF7F0] hover:border-[#11100E]'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border border-[#D5CEC0] bg-[#E6DFD1]/45 rounded-xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between text-xs mb-3 font-tabular">
                  <span className="font-medium">Folha Completa 4×4 (16 quadros)</span>
                  <span className="text-[#3F3D39]">
                    {vfxConfig.frameSize * 4}×{vfxConfig.frameSize * 4}px
                  </span>
                </div>

                <SumiVFX
                  config={vfxConfig}
                  mode="spritesheet"
                  className="w-[250px] h-[250px] rounded-lg border border-[#D5CEC0] checker-bg"
                />

                <div className="w-full mt-4 pt-3 border-t border-[#D5CEC0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#3F3D39]">Tamanho por Quadro:</span>
                  <div className="flex items-center gap-1 font-tabular">
                    {([96, 128, 192, 256] as const).map((sz, idx) => (
                      <SumiButton
                        key={sz}
                        variant={vfxConfig.frameSize === sz ? 'ink' : 'washi'}
                        size="xs"
                        seed={280 + idx}
                        active={vfxConfig.frameSize === sz}
                        onClick={() => setVfxConfig((p) => ({ ...p, frameSize: sz }))}
                      >
                        {sz}px
                      </SumiButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[#D5CEC0] rounded-xl bg-[#11100E] text-[#F2EDE2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-800 text-xs">
                <span className="font-tabular text-stone-400">
                  Componente &lt;SumiVFX /&gt; pronto para copiar
                </span>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={289}
                  onClick={() => handleCopy(generatedJSX, 'jsx-vfx')}
                >
                  <SumiIcon
                    name={copiedId === 'jsx-vfx' ? 'check' : 'copy'}
                    size={15}
                    color="#11100E"
                  />
                  <span>{copiedId === 'jsx-vfx' ? 'Copiado!' : 'Copiar JSX'}</span>
                </SumiButton>
              </div>
              <pre className="text-xs font-tabular max-h-56 overflow-y-auto leading-relaxed">
                <code>{generatedJSX}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          BANCADA 4: COMPOSITOR DE CENA MONTE FUJI & SAKURA (<SumiLandscape />)
          ===================================================================== */}
      {activeTab === 'landscape' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-4 border border-[#D5CEC0] bg-[#E6DFD1]/55 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#11100E] mb-1">
                Compositor Monte Fuji &amp; Sakura
              </h2>
              <p className="text-xs text-[#3F3D39]">
                Ajuste a intensidade de cada camada da paisagem e copie o componente configurado.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Paleta Atmosférica</label>
              <select
                value={landscapeSchool}
                onChange={(e) => setLandscapeSchool(e.target.value as SchoolId)}
                className="w-full px-3 py-2 text-xs rounded-[2px] border border-[#11100E] bg-[#F2EDE2]"
              >
                {Object.values(MAGIC_SCHOOLS).map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#D5CEC0] text-xs">
              {(
                [
                  { key: 'sunIntensity', label: 'Camada 1: Sol Carmesim & Reflexos' },
                  { key: 'mountainIntensity', label: 'Camada 2: Monte Fuji' },
                  { key: 'sakuraBranchIntensity', label: 'Camada 3: Tronco & Galhos de Sakura' },
                  { key: 'sakuraPetalsIntensity', label: 'Camada 4: Flores & Pétalas ao Vento' },
                  { key: 'waterReflectionIntensity', label: 'Camada 5: Lago & Ilha de Pinheiros' },
                  { key: 'mistKumoIntensity', label: 'Camada 6: Bancos de Neblina' },
                ] as const
              ).map((item) => (
                <label key={item.key} className="block">
                  <div className="flex justify-between mb-1">
                    <span>{item.label}</span>
                    <span className="font-tabular">
                      {Math.round(landscapeLayers[item.key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={landscapeLayers[item.key]}
                    onChange={(e) =>
                      setLandscapeLayers((p) => ({
                        ...p,
                        [item.key]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#C8232C]"
                  />
                </label>
              ))}

              <label className="block pt-2 border-t border-[#D5CEC0]">
                <div className="flex justify-between mb-1">
                  <span>Velocidade da Brisa</span>
                  <span className="font-tabular">{landscapeWind.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.1}
                  value={landscapeWind}
                  onChange={(e) => setLandscapeWind(parseFloat(e.target.value))}
                  className="w-full accent-[#C8232C]"
                />
              </label>

              <label className="block">
                <div className="flex justify-between mb-1">
                  <span>Variação da Paisagem</span>
                  <span className="font-tabular">#{landscapeSeed}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={99999}
                  step={23}
                  value={landscapeSeed}
                  onChange={(e) => setLandscapeSeed(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C8232C]"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="h-[320px] sm:h-[420px] lg:h-[480px] rounded-xl border border-[#D5CEC0] bg-[#F4F1EA] overflow-hidden relative shadow-xs">
              <SumiLandscape
                layers={landscapeLayers}
                colors={MAGIC_SCHOOLS[landscapeSchool].colors}
                seed={landscapeSeed}
                windSpeed={landscapeWind}
                animated
                interactive
              />
            </div>

            <div className="border border-[#D5CEC0] rounded-xl bg-[#11100E] text-[#F2EDE2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-800 text-xs">
                <span className="font-tabular text-stone-400">
                  Componente &lt;SumiLandscape /&gt; pronto para copiar
                </span>
                <SumiButton
                  variant="washi"
                  size="xs"
                  seed={299}
                  onClick={() => handleCopy(generatedJSX, 'jsx-landscape')}
                >
                  <SumiIcon
                    name={copiedId === 'jsx-landscape' ? 'check' : 'copy'}
                    size={15}
                    color="#11100E"
                  />
                  <span>{copiedId === 'jsx-landscape' ? 'Copiado!' : 'Copiar JSX'}</span>
                </SumiButton>
              </div>
              <pre className="text-xs font-tabular overflow-x-auto leading-relaxed">
                <code>{generatedJSX}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

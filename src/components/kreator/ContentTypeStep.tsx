import { useKreatorStore, type AIModel, type Format } from '@/store/useKreatorStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ModelSettings from './ModelSettings';


const imageModels: { value: AIModel; label: string }[] = [
  { value: 'nano-banana-2', label: 'Nano Banana 2 ⚡' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro 🎨' },
  { value: 'imagen-4', label: 'Imagen 4' },
  { value: 'imagen-4-ultra', label: 'Imagen 4 Ultra' },
  { value: 'imagen-4-fast', label: 'Imagen 4 Fast' },
  { value: 'gpt-image-5', label: 'GPT Image 5' },
  { value: 'gpt-image-5-mini', label: 'GPT Image 5 Mini' },
  { value: 'gpt-5.4-image-2', label: 'GPT 5.4 Image 2' },
  { value: 'grok-image', label: 'Grok AI 🤖' },
  { value: 'seedream-4.5', label: 'Seedream 4.5 🌱' },
];

const videoModels: { value: AIModel; label: string }[] = [
  { value: 'sora-2-t2v', label: 'Sora 2 — Text to Video' },
  { value: 'sora-2-i2v', label: 'Sora 2 — Image to Video' },
  { value: 'sora-2-pro-t2v', label: 'Sora 2 Pro — Text to Video' },
  { value: 'sora-2-pro-i2v', label: 'Sora 2 Pro — Image to Video' },
  { value: 'sora-2-pro-character', label: 'Sora 2 Pro — avec Personnage' },
  { value: 'veo-3', label: 'Veo 3' },
  { value: 'veo-3.1', label: 'Veo 3.1' },
  { value: 'grok-imagine-i2v', label: 'Grok Imagine — Image to Video' },
  { value: 'grok-imagine-t2v', label: 'Grok Imagine — Text to Video' },
  { value: 'bytedance/seedance-1.5-pro', label: 'Seedance 1.5 Pro' },
  { value: 'bytedance/seedance-2', label: 'Seedance 2.0' },
  { value: 'kling-2.1', label: 'Kling 2.1' },
  { value: 'kling-2.5', label: 'Kling 2.5' },
  { value: 'kling-2.6', label: 'Kling 2.6' },
  { value: 'kling-3.0', label: 'Kling 3.0' },
];


const formats: { value: Format; label: string; sublabel: string }[] = [
  { value: '1:1', label: '1:1', sublabel: 'Carré' },
  { value: '3:4', label: '3:4', sublabel: 'Portrait' },
  { value: '9:16', label: '9:16', sublabel: 'Story' },
  { value: '4:3', label: '4:3', sublabel: 'Paysage' },
  { value: '16:9', label: '16:9', sublabel: 'Écran large' },
];

const ContentTypeStep = () => {
  const {
    type, slides_count, setSlidesCount,
    ai_model, setAiModel,
    format, setFormat,
    sora_character_total_duration, setSoraCharacterTotalDuration,
    sora_character_scenes, setSoraCharacterScenes,
  } = useKreatorStore();

  const models = type === 'video' ? videoModels : imageModels;
  const isGptImage = ai_model === 'gpt-image-5' || ai_model === 'gpt-image-5-mini' || ai_model === 'gpt-5.4-image-2';
  const isSeedream = ai_model === 'seedream-4.5';
  const availableFormats = type === 'video'
    ? formats.filter((f) => f.value === '9:16' || f.value === '16:9')
    : isGptImage || isSeedream
    ? formats
    : formats.filter((f) => f.value === '1:1' || f.value === '9:16' || f.value === '16:9');

  const isSoraCharacter = type === 'video' && ai_model === 'sora-2-pro-character';
  const scenesTotal = sora_character_scenes.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const scenesValid = scenesTotal === sora_character_total_duration;

  const updateSceneCount = (count: number) => {
    const current = sora_character_scenes;
    if (count > current.length) {
      const toAdd = Array.from({ length: count - current.length }, () => ({ duration: 0 }));
      setSoraCharacterScenes([...current, ...toAdd]);
    } else {
      setSoraCharacterScenes(current.slice(0, count));
    }
  };

  const updateSceneDuration = (index: number, duration: number) => {
    const next = [...sora_character_scenes];
    next[index] = { duration };
    setSoraCharacterScenes(next);
  };

  return (
    <div className="w-full space-y-0">
      {/* Carousel: slides count */}
      {type === 'carousel' && (
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Nombre de slides</label>
          <div className="flex gap-3">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setSlidesCount(n)}
                className={`px-6 py-2 rounded-btn font-medium text-sm transition-all ${
                  slides_count === n
                    ? 'gradient-bg text-primary-foreground'
                    : 'bg-card border border-foreground/10 text-muted-foreground hover:border-secondary'
                }`}
              >
                {n} slides
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Model */}
      <div className="mb-6">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Modèle IA</label>
        <Select value={ai_model || undefined} onValueChange={(v) => setAiModel(v as AIModel)}>
          <SelectTrigger className="bg-card border-foreground/10 text-foreground">
            <SelectValue placeholder="Choisissez votre modèle d'IA" />
          </SelectTrigger>
          <SelectContent className="bg-card border-foreground/10">
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-foreground focus:bg-secondary/20">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Réglages spécifiques au modèle vidéo (Sora 2 / Veo) */}
      {type === 'video' && ai_model && (
        <div className="mb-6">
          <ModelSettings />
        </div>
      )}

      {/* Sora 2 Pro avec personnage — scènes dynamiques */}
      {isSoraCharacter && (
        <div className="mb-6 space-y-4 p-4 rounded-card border border-foreground/10 bg-card/50">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Durée totale de la vidéo</label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 25].map((d) => (
                <button
                  key={d}
                  onClick={() => setSoraCharacterTotalDuration(d as 10 | 15 | 25)}
                  className={`px-4 py-2 rounded-btn font-medium text-sm transition-all ${
                    sora_character_total_duration === d
                      ? 'gradient-bg text-primary-foreground'
                      : 'bg-card border border-foreground/10 text-muted-foreground hover:border-secondary'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Nombre de scènes</label>
            <Select
              value={String(sora_character_scenes.length)}
              onValueChange={(v) => updateSceneCount(parseInt(v, 10))}
            >
              <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-foreground focus:bg-secondary/20">
                    {n} scène{n > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {sora_character_scenes.map((scene, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-20">Scène {i + 1}</span>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={scene.duration || ''}
                    onChange={(e) => updateSceneDuration(i, parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 rounded-btn bg-card border border-foreground/10 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">s</span>
                </div>
              </div>
            ))}
          </div>

          {!scenesValid ? (
            <p className="text-sm font-medium text-destructive">
              ⚠️ La durée totale des scènes ({scenesTotal}s) doit être identique à la durée totale de la vidéo ({sora_character_total_duration}s).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              ✓ Durée totale : {scenesTotal}s
            </p>
          )}
        </div>
      )}

      {/* Format selector — masqué pour la vidéo (format géré par chaque modèle IA) */}
      {type !== 'video' && (
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Format</label>
          <Select value={format || undefined} onValueChange={(v) => setFormat(v as Format)}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <SelectValue placeholder="Choisissez un format" />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              {availableFormats.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-foreground focus:bg-secondary/20">
                  {f.label} — {f.sublabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

    </div>
  );
};

export default ContentTypeStep;

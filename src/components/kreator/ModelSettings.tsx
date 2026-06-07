import { useKreatorStore, type AIModel, type SoraAspect, type SoraDuration, type SoraProSize, type VeoSubMode, type VeoSubModel, type VeoAspect, type VeoResolution, type VeoDuration } from '@/store/useKreatorStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import FileDropUpload from './FileDropUpload';
import MultiFileUpload from './MultiFileUpload';
import { Textarea } from '@/components/ui/textarea';
import { Section, Field, PillGroup, AspectCards, SubModelTabs, IMAGE_HINT } from './model-settings/shared';
import { GrokT2V, GrokI2V } from './model-settings/GrokSettings';
import { Seedance15Pro, Seedance2 } from './model-settings/SeedanceSettings';
import { Kling21, Kling25, Kling26, Kling30 } from './model-settings/KlingSettings';
import { KlingO1, Hailuo23, Wan27 } from './model-settings/OpenRouterSettings';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { describeProductImages } from '@/lib/kreator-ai';
import { toast } from 'sonner';

// ---------- SORA ----------
const SoraT2V = ({ pro = false }: { pro?: boolean }) => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <Section>
      <Field label="Format">
        <PillGroup<SoraAspect>
          options={[{ value: 'portrait', label: 'Portrait' }, { value: 'paysage', label: 'Paysage' }]}
          value={model_settings.sora_aspect_ratio}
          onChange={(v) => setModelSetting('sora_aspect_ratio', v)}
        />
      </Field>
      <Field label="Durée">
        <PillGroup<SoraDuration>
          options={[{ value: 10, label: '10s' }, { value: 15, label: '15s' }]}
          value={model_settings.sora_n_frames}
          onChange={(v) => setModelSetting('sora_n_frames', v)}
        />
      </Field>
      {pro && (
        <Field label="Qualité" required>
          <PillGroup<SoraProSize>
            options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'Haute' }]}
            value={model_settings.sora_pro_size}
            onChange={(v) => setModelSetting('sora_pro_size', v)}
          />
        </Field>
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="rmwm" className="text-sm text-foreground">Retirer le watermark</Label>
        <Switch
          id="rmwm"
          checked={!!model_settings.sora_remove_watermark}
          onCheckedChange={(c) => setModelSetting('sora_remove_watermark', c)}
        />
      </div>
    </Section>
  );
};

const SoraI2V = ({ pro = false }: { pro?: boolean }) => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <Section>
      <FileDropUpload
        label="Image source"
        hint={IMAGE_HINT + ' (1 image max)'}
        value={model_settings.sora_image_url}
        onChange={(url) => setModelSetting('sora_image_url', url || undefined)}
        kind="image"
      />
      <Field label="Format">
        <PillGroup<SoraAspect>
          options={[{ value: 'portrait', label: 'Portrait' }, { value: 'paysage', label: 'Paysage' }]}
          value={model_settings.sora_aspect_ratio}
          onChange={(v) => setModelSetting('sora_aspect_ratio', v)}
        />
      </Field>
      <Field label="Durée">
        <PillGroup<SoraDuration>
          options={[{ value: 10, label: '10s' }, { value: 15, label: '15s' }]}
          value={model_settings.sora_n_frames}
          onChange={(v) => setModelSetting('sora_n_frames', v)}
        />
      </Field>
      {pro && (
        <Field label="Qualité" required>
          <PillGroup<SoraProSize>
            options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'Haute' }]}
            value={model_settings.sora_pro_size}
            onChange={(v) => setModelSetting('sora_pro_size', v)}
          />
        </Field>
      )}
      {!pro && (
        <div className="flex items-center justify-between">
          <Label htmlFor="rmwm-i" className="text-sm text-foreground">Retirer le watermark</Label>
          <Switch
            id="rmwm-i"
            checked={!!model_settings.sora_remove_watermark}
            onCheckedChange={(c) => setModelSetting('sora_remove_watermark', c)}
          />
        </div>
      )}
    </Section>
  );
};

// ---------- VEO ----------
const VeoSettings = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub: VeoSubMode = model_settings.veo_sub_mode || 't2v';
  const subModel: VeoSubModel = model_settings.veo_sub_model || 'veo-3.1-quality';

  const imgs = [
    model_settings.veo_start_image_url,
    model_settings.veo_end_image_url,
    ...(model_settings.veo_reference_image_urls || []),
  ].filter((u): u is string => !!u);
  const imgsKey = imgs.join('|');
  const lastAutoKeyRef = useRef<string | null>(null);
  const generatingRef = useRef(false);
  const [autoLoading, setAutoLoading] = useState(false);

  // Initialize: if a description already exists at mount, consider current key as "already handled"
  useEffect(() => {
    if (lastAutoKeyRef.current === null) {
      const existing = (model_settings.veo_reference_description || '').trim();
      lastAutoKeyRef.current = existing ? imgsKey : '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sub !== 'i2v' && sub !== 'reference') return;
    if (!imgsKey) return;
    if (lastAutoKeyRef.current === imgsKey) return;
    if (generatingRef.current) return;
    generatingRef.current = true;
    setAutoLoading(true);
    (async () => {
      try {
        const desc = await describeProductImages(imgs);
        setModelSetting('veo_reference_description', desc);
        lastAutoKeyRef.current = imgsKey;
      } catch (e) {
        console.error('[VeoSettings] auto-describe failed', e);
        toast.error("Impossible de générer la description automatiquement");
      } finally {
        generatingRef.current = false;
        setAutoLoading(false);
      }
    })();
  }, [imgsKey, sub]);

  return (
    <Section>
      <Field label="Type de génération" required>
        <SubModelTabs<VeoSubMode>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
            { value: 'reference', label: 'Référence' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('veo_sub_mode', v)}
        />
      </Field>

      <Field label="Modèle">
        <Select value={subModel} onValueChange={(v) => setModelSetting('veo_sub_model', v as VeoSubModel)}>
          <SelectTrigger className="bg-card border-foreground/10 text-foreground"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-foreground/10">
            <SelectItem value="veo-3.1-lite">Veo 3.1 Lite</SelectItem>
            <SelectItem value="veo-3.1-fast">Veo 3.1 Fast</SelectItem>
            <SelectItem value="veo-3.1-quality">Veo 3.1 Quality</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {sub === 'i2v' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileDropUpload
            label="Image de départ"
            hint={IMAGE_HINT}
            value={model_settings.veo_start_image_url}
            onChange={(url) => setModelSetting('veo_start_image_url', url || undefined)}
            kind="image"
          />
          <FileDropUpload
            label="Image de fin"
            hint={IMAGE_HINT}
            value={model_settings.veo_end_image_url}
            onChange={(url) => setModelSetting('veo_end_image_url', url || undefined)}
            kind="image"
          />
        </div>
      )}

      {sub === 'reference' && (
        <MultiFileUpload
          label="Images de référence"
          hint={IMAGE_HINT}
          values={model_settings.veo_reference_image_urls || []}
          onChange={(urls) => setModelSetting('veo_reference_image_urls', urls)}
          max={3}
          kind="image"
        />
      )}

      {(sub === 'i2v' || sub === 'reference') && (
        <Field
          label="Description fidèle de l'image de référence"
          required
          hint="\n"
        >
          <div className="relative">
            <Textarea
              value={model_settings.veo_reference_description || ''}
              onChange={(e) => setModelSetting('veo_reference_description', e.target.value)}
              placeholder={autoLoading ? "Génération automatique de la description en cours…" : "La description sera générée automatiquement dès qu'une image est insérée. Vous pouvez ensuite la modifier."}
              disabled={autoLoading}
              className="min-h-[120px] bg-card border-foreground/10 text-foreground"
            />
            {autoLoading && (
              <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyse de l'image…
              </div>
            )}
          </div>
        </Field>
      )}

      <Field label="Format" required>
        <AspectCards<VeoAspect>
          options={['16:9', '9:16']}
          value={model_settings.veo_aspect}
          onChange={(v) => setModelSetting('veo_aspect', v)}
        />
      </Field>

      <Field label="Résolution" required>
        <PillGroup<VeoResolution>
          options={[
            { value: '720p', label: '720p' },
            { value: '1080p', label: '1080p' },
            { value: '4K', label: '4K' },
          ]}
          value={model_settings.veo_resolution}
          onChange={(v) => setModelSetting('veo_resolution', v)}
        />
      </Field>

      <Field label="Durée" required>
        <PillGroup<VeoDuration>
          options={[
            { value: 4, label: '4s' },
            { value: 6, label: '6s' },
            { value: 8, label: '8s' },
          ]}
          value={model_settings.veo_duration}
          onChange={(v) => setModelSetting('veo_duration', v)}
        />
      </Field>
    </Section>
  );
};

// ---------- ROUTER ----------
const ModelSettings = () => {
  const { ai_model } = useKreatorStore();
  const m: AIModel = ai_model;

  if (m === 'sora-2-t2v') return <SoraT2V />;
  if (m === 'sora-2-i2v') return <SoraI2V />;
  if (m === 'sora-2-pro-t2v') return <SoraT2V pro />;
  if (m === 'sora-2-pro-i2v') return <SoraI2V pro />;
  if (m === 'veo-3' || m === 'veo-3.1') return <VeoSettings />;
  if (m === 'grok-imagine-t2v') return <GrokT2V />;
  if (m === 'grok-imagine-i2v') return <GrokI2V />;
  if (m === 'bytedance/seedance-1.5-pro') return <Seedance15Pro />;
  if (m === 'bytedance/seedance-2') return <Seedance2 />;
  if (m === 'kling-2.1') return <Kling21 />;
  if (m === 'kling-2.5') return <Kling25 />;
  if (m === 'kling-2.6') return <Kling26 />;
  if (m === 'kling-3.0') return <Kling30 />;
  if (m === 'kwaivgi/kling-video-o1') return <KlingO1 />;
  if (m === 'minimax/hailuo-2.3') return <Hailuo23 />;
  if (m === 'alibaba/wan-2.7') return <Wan27 />;

  return null;
};

export default ModelSettings;

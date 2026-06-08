import { useKreatorStore, type GrokAspect, type GrokMode, type GrokResolution, type Grok15Aspect, type Grok15Resolution } from '@/store/useKreatorStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiFileUpload from '../MultiFileUpload';
import FileDropUpload from '../FileDropUpload';
import { Section, Field, PillGroup, AspectCards, IMAGE_HINT } from './shared';

const ASPECTS: GrokAspect[] = ['2:3', '3:2', '1:1', '16:9', '9:16'];
const DURATIONS = Array.from({ length: 25 }, (_, i) => i + 6); // 6..30

const Common = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <>
      <Field label="Format">
        <AspectCards options={ASPECTS} value={model_settings.grok_aspect} onChange={(v) => setModelSetting('grok_aspect', v)} />
      </Field>
      <Field label="Mode">
        <PillGroup<GrokMode>
          options={[
            { value: 'amusant', label: 'Amusant' },
            { value: 'normale', label: 'Normale' },
            { value: 'epice', label: 'Épicé' },
          ]}
          value={model_settings.grok_mode}
          onChange={(v) => setModelSetting('grok_mode', v)}
        />
      </Field>
      <Field label="Durée">
        <Select
          value={String(model_settings.grok_duration ?? '')}
          onValueChange={(v) => setModelSetting('grok_duration', Number(v))}
        >
          <SelectTrigger className="bg-card border-foreground/10 text-foreground"><SelectValue placeholder="Choisir une durée" /></SelectTrigger>
          <SelectContent className="bg-card border-foreground/10 max-h-64">
            {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Résolution">
        <PillGroup<GrokResolution>
          options={[{ value: '480p', label: '480p' }, { value: '720p', label: '720p' }]}
          value={model_settings.grok_resolution}
          onChange={(v) => setModelSetting('grok_resolution', v)}
        />
      </Field>
    </>
  );
};

export const GrokT2V = () => (
  <Section><Common /></Section>
);

export const GrokI2V = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <Section>
      <MultiFileUpload
        label="Images source"
        hint={IMAGE_HINT + ' (max 7 images)'}
        values={model_settings.grok_image_urls || []}
        onChange={(urls) => setModelSetting('grok_image_urls', urls)}
        max={7}
        kind="image"
      />
      <Common />
    </Section>
  );
};

const GROK15_ASPECTS: Grok15Aspect[] = ['1:1', '16:9', '9:16'];
const GROK15_DURATIONS = Array.from({ length: 12 }, (_, i) => i + 4); // 4..15

export const GrokImagine15Preview = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <Section>
      <FileDropUpload
        label="Image d'entrée"
        hint={IMAGE_HINT + " — Téléversez 1 image à utiliser comme entrée pour l'API (1 max)"}
        value={model_settings.grok15_image_url}
        onChange={(url) => setModelSetting('grok15_image_url', url || undefined)}
        kind="image"
      />
      <Field label="Format">
        <AspectCards options={GROK15_ASPECTS} value={model_settings.grok15_aspect} onChange={(v) => setModelSetting('grok15_aspect', v)} />
      </Field>
      <Field label="Résolution">
        <PillGroup<Grok15Resolution>
          options={[{ value: '480p', label: '480p' }, { value: '720p', label: '720p' }]}
          value={model_settings.grok15_resolution}
          onChange={(v) => setModelSetting('grok15_resolution', v)}
        />
      </Field>
      <Field label="Durée">
        <Select
          value={String(model_settings.grok15_duration ?? 8)}
          onValueChange={(v) => setModelSetting('grok15_duration', Number(v))}
        >
          <SelectTrigger className="bg-card border-foreground/10 text-foreground"><SelectValue placeholder="Choisir une durée" /></SelectTrigger>
          <SelectContent className="bg-card border-foreground/10 max-h-64">
            {GROK15_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </Section>
  );
};

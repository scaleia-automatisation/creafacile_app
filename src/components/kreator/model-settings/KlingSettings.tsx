import { useKreatorStore, type Kling21SubModel, type Kling25SubModel, type Kling26SubModel, type Kling30Mode, type Kling30SubMode, type Kling30Aspect, type KlingAspect, type KlingDuration } from '@/store/useKreatorStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import FileDropUpload from '../FileDropUpload';
import { Section, Field, PillGroup, AspectCards, SubModelTabs, IMAGE_HINT, IMAGE_HINT_WEBP } from './shared';

const ASPECTS: KlingAspect[] = ['16:9', '9:16', '1:1'];

const DurationField = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  return (
    <Field label="Durée" hint="Durée de la vidéo générée en secondes">
      <PillGroup<KlingDuration>
        options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]}
        value={model_settings.kling21_duration}
        onChange={(v) => setModelSetting('kling21_duration', v)}
      />
    </Field>
  );
};

export const Kling21 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.kling21_sub_model || 'master-t2v';
  const showImage = sub !== 'master-t2v';
  const showAspect = sub === 'master-t2v' || sub === 'image-to-video';

  return (
    <Section>
      <Field label="Type de modèle" required>
        <SubModelTabs<Kling21SubModel>
          options={[
            { value: 'master-t2v', label: 'V2.1 Master T2V' },
            { value: 'image-to-video', label: 'V2.1 Image vers vidéo' },
            { value: 'pro', label: 'V2.1 Pro' },
            { value: 'standard', label: 'V2.1 Standard' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('kling21_sub_model', v)}
        />
      </Field>
      {showImage && (
        <FileDropUpload
          label="Image source"
          hint={IMAGE_HINT}
          value={model_settings.kling21_image_url}
          onChange={(url) => setModelSetting('kling21_image_url', url || undefined)}
          kind="image"
        />
      )}
      <DurationField />
      {showAspect && (
        <Field label="Format" hint="Format de l'image vidéo générée">
          <AspectCards options={ASPECTS} value={model_settings.kling21_aspect} onChange={(v) => setModelSetting('kling21_aspect', v)} />
        </Field>
      )}
    </Section>
  );
};

export const Kling25 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.kling25_sub_model || 'turbo-t2v-pro';
  return (
    <Section>
      <Field label="Type de modèle" required>
        <SubModelTabs<Kling25SubModel>
          options={[
            { value: 'turbo-t2v-pro', label: 'V2.5 Turbo T2V Pro' },
            { value: 'turbo-i2v-pro', label: 'V2.5 Turbo I2V Pro' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('kling25_sub_model', v)}
        />
      </Field>
      {sub === 'turbo-i2v-pro' && (
        <>
          <FileDropUpload
            label="Image source"
            hint={IMAGE_HINT_WEBP}
            value={model_settings.kling25_image_url}
            onChange={(url) => setModelSetting('kling25_image_url', url || undefined)}
            kind="image"
          />
          <FileDropUpload
            label="URL de l'image de la queue (optionnel)"
            hint={IMAGE_HINT_WEBP}
            value={model_settings.kling25_tail_image_url}
            onChange={(url) => setModelSetting('kling25_tail_image_url', url || undefined)}
            kind="image"
          />
        </>
      )}
      <Field label="Durée" hint="Durée de la vidéo générée en secondes">
        <PillGroup<KlingDuration>
          options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]}
          value={model_settings.kling25_duration}
          onChange={(v) => setModelSetting('kling25_duration', v)}
        />
      </Field>
      {sub === 'turbo-t2v-pro' && (
        <Field label="Format" hint="Format de l'image vidéo générée">
          <AspectCards options={ASPECTS} value={model_settings.kling25_aspect} onChange={(v) => setModelSetting('kling25_aspect', v)} />
        </Field>
      )}
    </Section>
  );
};

export const Kling26 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.kling26_sub_model || 't2v';
  return (
    <Section>
      <Field label="Type de modèle" required>
        <SubModelTabs<Kling26SubModel>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('kling26_sub_model', v)}
        />
      </Field>
      {sub === 'i2v' && (
        <FileDropUpload
          label="Image source"
          hint={IMAGE_HINT}
          value={model_settings.kling26_image_url}
          onChange={(url) => setModelSetting('kling26_image_url', url || undefined)}
          kind="image"
        />
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="k26-audio" className="text-sm text-foreground">Son actif</Label>
        <Switch
          id="k26-audio"
          checked={!!model_settings.kling26_audio_enabled}
          onCheckedChange={(c) => setModelSetting('kling26_audio_enabled', c)}
        />
      </div>
      {sub === 't2v' && (
        <Field label="Format" hint="Format de l'image vidéo générée">
          <AspectCards options={ASPECTS} value={model_settings.kling26_aspect} onChange={(v) => setModelSetting('kling26_aspect', v)} />
        </Field>
      )}
      <Field label="Durée" hint="Durée de la vidéo générée en secondes">
        <PillGroup<KlingDuration>
          options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]}
          value={model_settings.kling26_duration}
          onChange={(v) => setModelSetting('kling26_duration', v)}
        />
      </Field>
    </Section>
  );
};

export const Kling30 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const dur = model_settings.kling30_duration ?? 5;
  const sub: Kling30SubMode = model_settings.kling30_sub_model || 't2v';
  return (
    <Section>
      <Field label="Type de génération" required>
        <SubModelTabs<Kling30SubMode>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('kling30_sub_model', v)}
        />
      </Field>
      {sub === 'i2v' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileDropUpload
            label="Cadre de départ"
            hint={IMAGE_HINT}
            value={model_settings.kling30_start_image_url}
            onChange={(url) => setModelSetting('kling30_start_image_url', url || undefined)}
            kind="image"
          />
          <FileDropUpload
            label="Cadre d'extrémité (optionnel)"
            hint={IMAGE_HINT}
            value={model_settings.kling30_end_image_url}
            onChange={(url) => setModelSetting('kling30_end_image_url', url || undefined)}
            kind="image"
          />
        </div>
      )}
      {sub === 't2v' && (
        <Field label="Format" hint="Format de la vidéo générée">
          <AspectCards<Kling30Aspect>
            options={['16:9', '9:16', '1:1']}
            value={model_settings.kling30_aspect}
            onChange={(v) => setModelSetting('kling30_aspect', v)}
          />
        </Field>
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="k30-audio" className="text-sm text-foreground">Son actif</Label>
        <Switch
          id="k30-audio"
          checked={!!model_settings.kling30_audio_enabled}
          onCheckedChange={(c) => setModelSetting('kling30_audio_enabled', c)}
        />
      </div>
      <Field label={`Durée : ${dur}s`} hint="De 3 à 15 secondes">
        <Slider
          min={3}
          max={15}
          step={1}
          value={[dur]}
          onValueChange={(v) => setModelSetting('kling30_duration', v[0])}
        />
      </Field>
      <Field label="Mode" required hint="Standard (résolution standard) ou Pro (résolution supérieure)">
        <PillGroup<Kling30Mode>
          options={[{ value: 'std', label: 'Standard' }, { value: 'pro', label: 'Pro' }]}
          value={model_settings.kling30_mode}
          onChange={(v) => setModelSetting('kling30_mode', v)}
        />
      </Field>
    </Section>
  );
};

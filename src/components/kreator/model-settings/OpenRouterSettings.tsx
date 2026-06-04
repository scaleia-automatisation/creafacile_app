import {
  useKreatorStore,
  type KlingO1SubModel, type KlingO1Aspect, type KlingO1Duration,
  type HailuoSubModel, type HailuoAspect, type HailuoDuration, type HailuoResolution,
  type WanSubMode, type WanAspect, type WanDuration, type WanResolution,
} from '@/store/useKreatorStore';
import FileDropUpload from '../FileDropUpload';
import MultiFileUpload from '../MultiFileUpload';
import { Section, Field, PillGroup, AspectCards, SubModelTabs, IMAGE_HINT } from './shared';

const KO1_ASPECTS: KlingO1Aspect[] = ['16:9', '9:16', '1:1'];
const HAILUO_ASPECTS: HailuoAspect[] = ['16:9', '9:16', '1:1'];
const WAN_ASPECTS: WanAspect[] = ['16:9', '9:16', '1:1'];

export const KlingO1 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.klingo1_sub_model || 't2v';
  return (
    <Section>
      <Field label="Type de génération" required>
        <SubModelTabs<KlingO1SubModel>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('klingo1_sub_model', v)}
        />
      </Field>
      {sub === 'i2v' && (
        <FileDropUpload
          label="Image source"
          hint={IMAGE_HINT}
          value={model_settings.klingo1_image_url}
          onChange={(url) => setModelSetting('klingo1_image_url', url || undefined)}
          kind="image"
        />
      )}
      <Field label="Format" hint="Format de la vidéo générée">
        <AspectCards options={KO1_ASPECTS} value={model_settings.klingo1_aspect} onChange={(v) => setModelSetting('klingo1_aspect', v)} />
      </Field>
      <Field label="Durée" hint="Durée de la vidéo en secondes">
        <PillGroup<KlingO1Duration>
          options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]}
          value={model_settings.klingo1_duration}
          onChange={(v) => setModelSetting('klingo1_duration', v)}
        />
      </Field>
    </Section>
  );
};

export const Hailuo23 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.hailuo_sub_model || 't2v';
  return (
    <Section>
      <Field label="Type de génération" required>
        <SubModelTabs<HailuoSubModel>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('hailuo_sub_model', v)}
        />
      </Field>
      {sub === 'i2v' && (
        <FileDropUpload
          label="Image source"
          hint={IMAGE_HINT}
          value={model_settings.hailuo_image_url}
          onChange={(url) => setModelSetting('hailuo_image_url', url || undefined)}
          kind="image"
        />
      )}
      <Field label="Format">
        <AspectCards options={HAILUO_ASPECTS} value={model_settings.hailuo_aspect} onChange={(v) => setModelSetting('hailuo_aspect', v)} />
      </Field>
      <Field label="Durée">
        <PillGroup<HailuoDuration>
          options={[{ value: 6, label: '6s' }, { value: 10, label: '10s' }]}
          value={model_settings.hailuo_duration}
          onChange={(v) => setModelSetting('hailuo_duration', v)}
        />
      </Field>
      <Field label="Résolution">
        <PillGroup<HailuoResolution>
          options={[{ value: '768p', label: '768p' }, { value: '1080p', label: '1080p' }]}
          value={model_settings.hailuo_resolution}
          onChange={(v) => setModelSetting('hailuo_resolution', v)}
        />
      </Field>
    </Section>
  );
};

export const Wan27 = () => {
  const { model_settings, setModelSetting } = useKreatorStore();
  const sub = model_settings.wan_sub_mode || 't2v';
  return (
    <Section>
      <Field label="Type de génération" required>
        <SubModelTabs<WanSubMode>
          options={[
            { value: 't2v', label: 'Texte vers vidéo' },
            { value: 'i2v', label: 'Image vers vidéo' },
            { value: 'reference', label: 'Référence' },
          ]}
          value={sub}
          onChange={(v) => setModelSetting('wan_sub_mode', v)}
        />
      </Field>
      {sub === 'i2v' && (
        <FileDropUpload
          label="Image source"
          hint={IMAGE_HINT}
          value={model_settings.wan_image_url}
          onChange={(url) => setModelSetting('wan_image_url', url || undefined)}
          kind="image"
        />
      )}
      {sub === 'reference' && (
        <MultiFileUpload
          label="Images de référence"
          hint={IMAGE_HINT + ' (max 4 images)'}
          values={model_settings.wan_reference_image_urls || []}
          onChange={(urls) => setModelSetting('wan_reference_image_urls', urls)}
          max={4}
          kind="image"
        />
      )}
      <Field label="Format">
        <AspectCards options={WAN_ASPECTS} value={model_settings.wan_aspect} onChange={(v) => setModelSetting('wan_aspect', v)} />
      </Field>
      <Field label="Durée">
        <PillGroup<WanDuration>
          options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]}
          value={model_settings.wan_duration}
          onChange={(v) => setModelSetting('wan_duration', v)}
        />
      </Field>
      <Field label="Résolution">
        <PillGroup<WanResolution>
          options={[
            { value: '480p', label: '480p' },
            { value: '720p', label: '720p' },
            { value: '1080p', label: '1080p' },
          ]}
          value={model_settings.wan_resolution}
          onChange={(v) => setModelSetting('wan_resolution', v)}
        />
      </Field>
    </Section>
  );
};
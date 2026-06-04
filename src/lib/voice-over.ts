import type { AIModel, ModelSettings } from '@/store/useKreatorStore';

// Modèles vidéo qui acceptent une voix off (parole/dialogue audio)
export const VOICE_OVER_MODELS: AIModel[] = [
  'sora-2-t2v',
  'sora-2-i2v',
  'sora-2-pro-t2v',
  'sora-2-pro-i2v',
  'sora-2-pro-character',
  'veo-3',
  'veo-3.1',
  'kling-2.6',
  'kling-3.0',
  'bytedance/seedance-2',
];

export const supportsVoiceOver = (model: AIModel) =>
  VOICE_OVER_MODELS.includes(model);

/** Durée vidéo (en secondes) selon modèle + réglages. Défaut 8s. */
export const getVideoDurationSec = (
  model: AIModel,
  s: ModelSettings = {}
): number => {
  if (model.startsWith('sora-2')) return s.sora_n_frames ?? 10;
  if (model.startsWith('veo-3')) return 8;
  if (model === 'kling-2.1') return s.kling21_duration ?? 5;
  if (model === 'kling-2.5') return s.kling25_duration ?? 5;
  if (model === 'kling-2.6') return s.kling26_duration ?? 5;
  if (model === 'kling-3.0') return s.kling30_duration ?? 5;
  if (model === 'bytedance/seedance-1.5-pro') return s.seedance_duration ?? 8;
  if (model === 'bytedance/seedance-2') return s.seedance2_duration ?? 8;
  if (model.startsWith('grok-imagine')) return s.grok_duration ?? 6;
  if (model === 'kwaivgi/kling-video-o1') return s.klingo1_duration ?? 5;
  if (model === 'minimax/hailuo-2.3') return s.hailuo_duration ?? 6;
  if (model === 'alibaba/wan-2.7') return s.wan_duration ?? 5;
  return 8;
};
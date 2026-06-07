import { create } from 'zustand';

export type ContentType = 'image' | 'carousel' | 'video';
export type Format = '9:16' | '16:9' | '1:1' | '3:4' | '4:3';
export type AIModel =
  | 'nano-banana-2' | 'nano-banana-pro'
  | 'gpt-5.4-image-2' | 'grok-image'
  | 'sora-2-t2v' | 'sora-2-i2v' | 'sora-2-pro-i2v' | 'sora-2-pro-t2v' | 'sora-2-pro-character'
  // legacy/alt
  | 'veo-3' | 'veo-3.1'
  | 'grok-imagine-i2v' | 'grok-imagine-t2v'
  | 'bytedance/seedance-1.5-pro' | 'bytedance/seedance-2'
  | 'kling-2.1' | 'kling-2.5' | 'kling-2.6' | 'kling-3.0'
  // OpenRouter additions
  | 'kwaivgi/kling-video-o1'
  | 'minimax/hailuo-2.3'
  | 'alibaba/wan-2.7';
export type VideoResolution = '720p' | '1080p';
export type UserMode = 'beginner' | 'expert';
export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';
export type SoraCharacterScene = { duration: number };

// Réglages spécifiques par modèle vidéo (flexible, par clé de modèle)
export type SoraAspect = 'portrait' | 'paysage';
export type SoraDuration = 10 | 15;
export type SoraProSize = 'standard' | 'high';
export type VeoSubMode = 't2v' | 'i2v' | 'reference';
export type VeoSubModel = 'veo-3.1-lite' | 'veo-3.1-fast' | 'veo-3.1-quality';
export type VeoAspect = '16:9' | '9:16';
export type VeoResolution = '720p' | '1080p' | '4K';
export type VeoDuration = 4 | 6 | 8;

// Grok
export type GrokAspect = '2:3' | '3:2' | '1:1' | '16:9' | '9:16';
export type GrokMode = 'amusant' | 'normale' | 'epice';
export type GrokResolution = '480p' | '720p';

// Seedance
export type SeedanceAspect = '1:1' | '21:9' | '4:3' | '3:4' | '16:9' | '9:16';
export type SeedanceResolution = '480p' | '720p' | '1080p';
export type Seedance2SubModel = 'seedance-2' | 'seedance-2-fast';

// Kling
export type KlingAspect = '16:9' | '9:16' | '1:1';
export type KlingDuration = 5 | 10;
export type Kling21SubModel = 'master-t2v' | 'image-to-video' | 'pro' | 'standard';
export type Kling25SubModel = 'turbo-t2v-pro' | 'turbo-i2v-pro';
export type Kling26SubModel = 't2v' | 'i2v';
export type Kling30Mode = 'std' | 'pro';

// Kling Video O1 (OpenRouter)
export type KlingO1SubModel = 't2v' | 'i2v';
export type KlingO1Aspect = '16:9' | '9:16' | '1:1';
export type KlingO1Duration = 5 | 10;

// Hailuo 2.3 (OpenRouter - Minimax)
export type HailuoSubModel = 't2v' | 'i2v';
export type HailuoAspect = '16:9' | '9:16' | '1:1';
export type HailuoDuration = 6 | 10;
export type HailuoResolution = '768p' | '1080p';

// Wan 2.7 (OpenRouter - Alibaba)
export type WanSubMode = 't2v' | 'i2v' | 'reference';
export type WanAspect = '16:9' | '9:16' | '1:1';
export type WanDuration = 5 | 10;
export type WanResolution = '480p' | '720p' | '1080p';

export interface ModelSettings {
  // Sora 2 / Sora 2 Pro
  sora_aspect_ratio?: SoraAspect;
  sora_n_frames?: SoraDuration;
  sora_remove_watermark?: boolean;
  sora_image_url?: string;
  sora_pro_size?: SoraProSize;
  // Veo 3 / 3.1
  veo_sub_mode?: VeoSubMode;
  veo_sub_model?: VeoSubModel;
  veo_aspect?: VeoAspect;
  veo_resolution?: VeoResolution;
  veo_start_image_url?: string;
  veo_end_image_url?: string;
  veo_reference_image_urls?: string[];
  // Grok Imagine
  grok_aspect?: GrokAspect;
  grok_mode?: GrokMode;
  grok_duration?: number; // 6..30
  grok_resolution?: GrokResolution;
  grok_image_urls?: string[]; // i2v max 7
  // Seedance 1.5 Pro
  seedance_image_urls?: string[]; // max 2
  seedance_aspect?: SeedanceAspect;
  seedance_resolution?: SeedanceResolution;
  seedance_duration?: 4 | 8 | 12;
  seedance_audio_enabled?: boolean;
  // Seedance 2 / 2 Fast
  seedance2_sub_model?: Seedance2SubModel;
  seedance2_first_frame_url?: string;
  seedance2_last_frame_url?: string;
  seedance2_reference_image_urls?: string[]; // max 9
  seedance2_reference_video_urls?: string[]; // max 3 / total 15s
  seedance2_reference_audio_url?: string;
  seedance2_generate_audio?: boolean;
  seedance2_resolution?: SeedanceResolution;
  seedance2_aspect?: SeedanceAspect;
  seedance2_duration?: number; // 4..15
  // Kling 2.1
  kling21_sub_model?: Kling21SubModel;
  kling21_image_url?: string;
  kling21_duration?: KlingDuration;
  kling21_aspect?: KlingAspect;
  // Kling 2.5
  kling25_sub_model?: Kling25SubModel;
  kling25_image_url?: string;
  kling25_tail_image_url?: string;
  kling25_duration?: KlingDuration;
  kling25_aspect?: KlingAspect;
  // Kling 2.6
  kling26_sub_model?: Kling26SubModel;
  kling26_image_url?: string;
  kling26_audio_enabled?: boolean;
  kling26_duration?: KlingDuration;
  kling26_aspect?: KlingAspect;
  // Kling 3.0
  kling30_start_image_url?: string;
  kling30_end_image_url?: string;
  kling30_audio_enabled?: boolean;
  kling30_duration?: number; // 3..15
  kling30_mode?: Kling30Mode;
  // Kling Video O1
  klingo1_sub_model?: KlingO1SubModel;
  klingo1_image_url?: string;
  klingo1_aspect?: KlingO1Aspect;
  klingo1_duration?: KlingO1Duration;
  // Hailuo 2.3
  hailuo_sub_model?: HailuoSubModel;
  hailuo_image_url?: string;
  hailuo_aspect?: HailuoAspect;
  hailuo_duration?: HailuoDuration;
  hailuo_resolution?: HailuoResolution;
  // Wan 2.7
  wan_sub_mode?: WanSubMode;
  wan_image_url?: string;
  wan_reference_image_urls?: string[]; // max 4
  wan_aspect?: WanAspect;
  wan_duration?: WanDuration;
  wan_resolution?: WanResolution;
}

interface KreatorOptions {
  show_text: boolean;
  text_content: string;
  palette_enabled: boolean;
  palette_hex: string[];
  ton: string;
  objective: string;
  visual_style: string;
  // Logo (image / carousel)
  logo_enabled: boolean;
  logo_url: string;
  logo_position:
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-left'
    | 'top-right'
    | 'top-center'
    | 'middle-left'
    | 'middle-right';
  // Video-only: when the logo appears in the script
  logo_appearance: 'start' | 'middle' | 'end';
  // Text overlay positioning + font (image / carousel / video)
  text_position: 'top-center' | 'middle-center' | 'bottom-center';
  text_font: string;
  // Video-only: text color
  text_color: string;
  // Video-only: second on-screen text + per-text duration (seconds, 2..6)
  text_2_enabled: boolean;
  text_content_2: string;
  text_duration_1: number;
  text_duration_2: number;
  text_start_1: number;
  text_start_2: number;
  text_position_2: 'top-center' | 'middle-center' | 'bottom-center';
  text_font_2: string;
  text_color_2: string;
  // Carousel-only: per-slide texts (up to 4). Index 0 mirrors text_content for legacy.
  slide_texts: string[];
}

interface KreatorState {
  user_mode: UserMode;
  setUserMode: (mode: UserMode) => void;

  type: ContentType;
  setType: (type: ContentType) => void;
  slides_count: number;
  setSlidesCount: (count: number) => void;
  ai_model: AIModel;
  setAiModel: (model: AIModel) => void;
  objective: string;
  setObjective: (obj: string) => void;
  render_style: string;
  setRenderStyle: (val: string) => void;
  video_render_style: string;
  setVideoRenderStyle: (val: string) => void;
  video_resolution: VideoResolution;
  setVideoResolution: (val: VideoResolution) => void;
  sora_character_total_duration: 10 | 15 | 25;
  setSoraCharacterTotalDuration: (val: 10 | 15 | 25) => void;
  sora_character_scenes: SoraCharacterScene[];
  setSoraCharacterScenes: (scenes: SoraCharacterScene[]) => void;
  model_settings: ModelSettings;
  setModelSetting: <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => void;
  resetModelSettings: () => void;
  company_activity: string;
  setCompanyActivity: (val: string) => void;
  company_sector: string;
  setCompanySector: (val: string) => void;
  product_service: string;
  setProductService: (val: string) => void;
  product_description: string;
  setProductDescription: (val: string) => void;
  product_image_url: string;
  setProductImageUrl: (val: string) => void;
  product_image_urls_extra: string[];
  setProductImageUrlsExtra: (val: string[]) => void;
  market: string;
  setMarket: (val: string) => void;
  offer_type: string;
  setOfferType: (val: string) => void;
  target_persona: string;
  setTargetPersona: (val: string) => void;
  marketing_angle: string;
  setMarketingAngle: (val: string) => void;
  offer_nature: string;
  setOfferNature: (val: string) => void;
  visual_style_brief: string;
  setVisualStyleBrief: (val: string) => void;
  use_case: string;
  setUseCase: (val: string) => void;
  voice_over_enabled: boolean;
  setVoiceOverEnabled: (val: boolean) => void;
  voice_over_text: string;
  setVoiceOverText: (val: string) => void;
  voice_over_language: string;
  setVoiceOverLanguage: (val: string) => void;

  format: Format;
  setFormat: (format: Format) => void;

  input_image_url: string;
  setInputImageUrl: (url: string) => void;
  input_image_description: string;
  setInputImageDescription: (desc: string) => void;
  input_photos: { url: string; description: string }[];
  setInputPhotos: (photos: { url: string; description: string }[]) => void;
  input_text: string;
  setInputText: (text: string) => void;
  idea_chosen: string;
  setIdeaChosen: (idea: string) => void;

  starting_choice: '' | 'scratch' | 'perf' | 'idea' | 'simple';
  setStartingChoice: (val: '' | 'scratch' | 'perf' | 'idea' | 'simple') => void;

  simple_images: { url: string; description: string }[];
  setSimpleImages: (images: { url: string; description: string }[]) => void;

  manual_idea_mode: boolean;
  setManualIdeaMode: (val: boolean) => void;
  manual_idea_text: string;
  setManualIdeaText: (val: string) => void;

  options: KreatorOptions;
  setOptions: (opts: Partial<KreatorOptions>) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;

  prompt_fr: string;
  setPromptFr: (p: string) => void;
  prompt_en: string;
  setPromptEn: (p: string) => void;
  prompt_en_final: string;
  setPromptEnFinal: (p: string) => void;

  status: GenerationStatus;
  setStatus: (s: GenerationStatus) => void;
  result_url: string;
  setResultUrl: (url: string) => void;
  result_urls: string[];
  setResultUrls: (urls: string[]) => void;
  credits_used: number;
  setCreditsUsed: (c: number) => void;

  resetProject: () => void;
}

const initialState = {
  user_mode: 'beginner' as UserMode,
  type: 'image' as ContentType,
  slides_count: 2,
  ai_model: '' as AIModel,
  objective: '',
  render_style: '',
  company_activity: '',
  company_sector: '',
  product_service: '',
  product_description: '',
  product_image_url: '',
  product_image_urls_extra: [] as string[],
  market: '',
  offer_type: '',
  target_persona: '',
  marketing_angle: '',
  offer_nature: '',
  visual_style_brief: '',
  use_case: '',
  voice_over_enabled: false,
  voice_over_text: '',
  voice_over_language: 'Français',
  video_render_style: '',
  video_resolution: '1080p' as VideoResolution,
  sora_character_total_duration: 10 as 10 | 15 | 25,
  sora_character_scenes: [{ duration: 10 }] as SoraCharacterScene[],
  model_settings: {} as ModelSettings,
  format: '9:16' as Format,
  input_image_url: '',
  input_image_description: '',
  input_photos: [] as { url: string; description: string }[],
  input_text: '',
  idea_chosen: '',
  starting_choice: '' as '' | 'scratch' | 'perf' | 'idea' | 'simple',
  simple_images: [] as { url: string; description: string }[],
  manual_idea_mode: false,
  manual_idea_text: '',
  options: {
    show_text: false,
    text_content: '',
    palette_enabled: false,
    palette_hex: ['#FF2D73', '#FF6A3D', '#000000'],
    ton: '',
    objective: '',
    visual_style: '',
    logo_enabled: false,
    logo_url: '',
    logo_position: 'bottom-center' as const,
    logo_appearance: 'start' as const,
    text_position: 'bottom-center' as const,
    text_font: 'Montserrat',
    text_color: '#FFFFFF',
    text_2_enabled: false,
    text_content_2: '',
    text_duration_1: 3,
    text_duration_2: 3,
    text_start_1: 0,
    text_start_2: 0,
    text_position_2: 'bottom-center' as const,
    text_font_2: 'Montserrat',
    text_color_2: '#FFFFFF',
    slide_texts: ['', '', '', ''],
  },
  showAdvanced: false,
  prompt_fr: '',
  prompt_en: '',
  prompt_en_final: '',
  status: 'idle' as GenerationStatus,
  result_url: '',
  result_urls: [],
  credits_used: 0,
};

export const useKreatorStore = create<KreatorState>((set) => ({
  ...initialState,
  setUserMode: (mode) => set({ user_mode: mode }),
  setType: (type) => {
    const format = type === 'video' ? '9:16' as Format : '9:16' as Format;
    set({ type, ai_model: '' as AIModel, model_settings: {}, format });
  },
  setSlidesCount: (count) => set({ slides_count: count }),
  setAiModel: (model) => set({ ai_model: model, model_settings: {} }),
  setModelSetting: (key, value) =>
    set((state) => ({ model_settings: { ...state.model_settings, [key]: value } })),
  resetModelSettings: () => set({ model_settings: {} }),
  setObjective: (obj) => set({ objective: obj }),
  setRenderStyle: (val) => set({ render_style: val }),
  setVideoRenderStyle: (val) => set({ video_render_style: val }),
  setVideoResolution: (val) => set({ video_resolution: val }),
  setSoraCharacterTotalDuration: (val) => set({ sora_character_total_duration: val }),
  setSoraCharacterScenes: (scenes) => set({ sora_character_scenes: scenes }),
  setCompanyActivity: (val) => set({ company_activity: val }),
  setCompanySector: (val) => set({ company_sector: val }),
  setProductService: (val) => set({ product_service: val }),
  setProductDescription: (val) => set({ product_description: val }),
  setProductImageUrl: (val) => set({ product_image_url: val }),
  setProductImageUrlsExtra: (val) => set({ product_image_urls_extra: val }),
  setMarket: (val) => set({ market: val }),
  setOfferType: (val) => set({ offer_type: val }),
  setTargetPersona: (val) => set({ target_persona: val }),
  setMarketingAngle: (val) => set({ marketing_angle: val }),
  setOfferNature: (val) => set({ offer_nature: val }),
  setVisualStyleBrief: (val) => set({ visual_style_brief: val }),
  setUseCase: (val) => set({ use_case: val }),
  setVoiceOverEnabled: (val) => set({ voice_over_enabled: val }),
  setVoiceOverText: (val) => set({ voice_over_text: val }),
  setVoiceOverLanguage: (val) => set({ voice_over_language: val }),
  setFormat: (format) => set({
    format,
    prompt_fr: '',
    prompt_en: '',
    prompt_en_final: '',
    status: 'idle' as GenerationStatus,
  }),
  setInputImageUrl: (url) => set({ input_image_url: url }),
  setInputImageDescription: (desc) => set({ input_image_description: desc }),
  setInputPhotos: (photos) => set({ input_photos: photos }),
  setInputText: (text) => set({ input_text: text }),
  setIdeaChosen: (idea) => set({ idea_chosen: idea }),
  setStartingChoice: (val) => set({ starting_choice: val }),
  setSimpleImages: (images) => set({ simple_images: images }),
  setManualIdeaMode: (val) => set({ manual_idea_mode: val }),
  setManualIdeaText: (val) => set({ manual_idea_text: val }),
  setOptions: (opts) => set((state) => ({ options: { ...state.options, ...opts } })),
  setShowAdvanced: (show) => set({ showAdvanced: show }),
  setPromptFr: (p) => set({ prompt_fr: p }),
  setPromptEn: (p) => set({ prompt_en: p }),
  setPromptEnFinal: (p) => set({ prompt_en_final: p }),
  setStatus: (s) => set({ status: s }),
  setResultUrl: (url) => set({ result_url: url }),
  setResultUrls: (urls) => set({ result_urls: urls }),
  setCreditsUsed: (c) => set({ credits_used: c }),
  resetProject: () => set({ ...initialState }),
}));

const KEY = 'kreator:pending_video_v1';

export interface PendingVideo {
  taskId: string;
  aiModel: string;
  format: string;
  modelSettings: unknown;
  soraCharacterScenes: unknown[];
  voiceOver?: { text: string; language: string };
  prompt: string;
  captionParams: Record<string, unknown>;
  type: string;
  creditsNeeded: number;
  startedAt: number;
}

export const savePendingVideo = (p: PendingVideo) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ }
};

export const getPendingVideo = (): PendingVideo | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) as PendingVideo : null;
  } catch { return null; }
};

export const clearPendingVideo = () => {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
};
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

/** Lazy-load ffmpeg.wasm (single-thread, pas de COOP/COEP requis). */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ff = new FFmpeg();
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    ]);
    await ff.load({ coreURL, wasmURL });
    ffmpegInstance = ff;
    return ff;
  })();
  return loadPromise;
}

/**
 * Mixe une vidéo distante avec un MP3 (base64) de voix off.
 * Voix off décalée de 1s au début, troncature à durée vidéo - 1s à la fin.
 * Remplace toute piste audio existante.
 */
export async function muxVideoWithVoiceOver(params: {
  videoUrl: string;
  voiceOverMp3Base64: string;
  videoDurationSec: number;
}): Promise<Blob> {
  const { videoUrl, voiceOverMp3Base64, videoDurationSec } = params;
  const ff = await getFFmpeg();

  // 1) Récupérer la vidéo (essayer fetch direct, fallback no-cors via Image n'est pas applicable
  //    pour binaires — si CORS bloque, l'utilisateur verra l'erreur et on retournera tel quel).
  const videoData = await fetchFile(videoUrl);
  const audioData = await fetchFile(`data:audio/mpeg;base64,${voiceOverMp3Base64}`);

  await ff.writeFile('in.mp4', videoData);
  await ff.writeFile('vo.mp3', audioData);

  const endTime = Math.max(1, videoDurationSec - 1);

  // Décale la voix off de 1s, tronque à (durée - 1s), puis pad/clamp à la durée totale,
  // et ré-encode la vidéo en h264 (le -c:v copy peut échouer si conteneur diffère).
  await ff.exec([
    '-y',
    '-i', 'in.mp4',
    '-i', 'vo.mp3',
    '-filter_complex',
    `[1:a]adelay=1000|1000,atrim=0:${endTime},apad,atrim=0:${videoDurationSec},asetpts=N/SR/TB[aout]`,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    'out.mp4',
  ]);

  const data = (await ff.readFile('out.mp4')) as Uint8Array;
  // Nettoyage
  try { await ff.deleteFile('in.mp4'); } catch { /* noop */ }
  try { await ff.deleteFile('vo.mp3'); } catch { /* noop */ }
  try { await ff.deleteFile('out.mp4'); } catch { /* noop */ }

  // Copie dans un ArrayBuffer dédié pour éviter les contraintes de typage SharedArrayBuffer
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  return new Blob([ab], { type: 'video/mp4' });
}
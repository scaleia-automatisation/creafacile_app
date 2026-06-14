// Lightweight dominant-color extractor used to detect a product's exact
// brand colors from its reference photo, so the generation prompt can ask
// the model to reproduce them 1:1 (color name + #HEX).
//
// Pure client-side: downsamples the image on a canvas, quantizes pixels into
// coarse buckets, then returns the most frequent buckets as #RRGGBB.

const toHex = (n: number) => n.toString(16).padStart(2, '0');

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export async function extractDominantColors(
  url: string,
  maxColors = 5,
): Promise<string[]> {
  if (!url) return [];
  try {
    const img = await loadImage(url);
    const size = 96;
    const canvas = document.createElement('canvas');
    const ratio = img.width / img.height || 1;
    const w = ratio >= 1 ? size : Math.max(1, Math.round(size * ratio));
    const h = ratio >= 1 ? Math.max(1, Math.round(size / ratio)) : size;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Quantize to 5-bit per channel buckets (32 levels) for stability.
    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue; // skip transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Skip near-white / near-black background noise to keep PRODUCT colors.
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 245 && min > 235) continue; // pure white bg
      if (max < 18) continue; // pure black bg
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);

    // Merge perceptually-close colors (Euclidean distance in RGB).
    const picked: { r: number; g: number; b: number; n: number }[] = [];
    const minDist = 48;
    for (const c of sorted) {
      const r = Math.round(c.r / c.n);
      const g = Math.round(c.g / c.n);
      const b = Math.round(c.b / c.n);
      const tooClose = picked.some(p => {
        const dr = p.r - r, dg = p.g - g, db = p.b - b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < minDist;
      });
      if (!tooClose) {
        picked.push({ r, g, b, n: c.n });
        if (picked.length >= maxColors) break;
      }
    }

    return picked.map(p => rgbToHex(p.r, p.g, p.b));
  } catch (err) {
    console.warn('[extractDominantColors] failed', err);
    return [];
  }
}

// Friendly French color name from a hex value, for prompts like
// "rouge bordeaux (#7A1F2B)".
export function hexToFrenchName(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255));

  if (s < 0.08) {
    if (l > 0.92) return 'blanc';
    if (l > 0.75) return 'gris très clair';
    if (l > 0.55) return 'gris clair';
    if (l > 0.35) return 'gris';
    if (l > 0.15) return 'gris foncé';
    return 'noir';
  }
  const tone = l < 0.25 ? ' très foncé' : l < 0.4 ? ' foncé' : l > 0.75 ? ' très clair' : l > 0.6 ? ' clair' : '';
  let base = 'couleur';
  if (h < 15 || h >= 345) base = 'rouge';
  else if (h < 40) base = 'orange';
  else if (h < 65) base = 'jaune';
  else if (h < 90) base = 'jaune-vert';
  else if (h < 160) base = 'vert';
  else if (h < 200) base = 'cyan';
  else if (h < 250) base = 'bleu';
  else if (h < 290) base = 'violet';
  else if (h < 330) base = 'magenta';
  else base = 'rose';
  return `${base}${tone}`;
}

export function describeColorsForPrompt(hexes: string[]): string {
  return hexes
    .map(h => `${hexToFrenchName(h)} (${h.toUpperCase()})`)
    .join(', ');
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResp = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const jsonError = (status: number, error: string) => jsonResp({ error }, status);
const jsonFallback = (error: string, details?: object) => jsonResp({ error, fallback: true, ...(details || {}) }, 200);

const normalizeAspectRatio = (value: unknown): "1:1" | "3:4" | "9:16" | "4:3" | "16:9" => {
  const raw = String(value || "").trim();
  if (["1:1", "3:4", "9:16", "4:3", "16:9"].includes(raw)) return raw as any;
  if (["1024x1792", "1024x1536"].includes(raw)) return "9:16";
  if (["1792x1024", "1536x1024"].includes(raw)) return "16:9";
  return "1:1";
};

const aspectLabel = (aspect: string) => aspect === "9:16"
  ? "vertical 9:16 story"
  : aspect === "3:4"
  ? "vertical 3:4 portrait"
  : aspect === "16:9"
  ? "horizontal 16:9 widescreen"
  : aspect === "4:3"
  ? "horizontal 4:3 landscape"
  : "square 1:1";

const gatewaySizeFromAspect = (aspect: string) => aspect === "9:16" || aspect === "3:4"
  ? "1024x1536"
  : aspect === "16:9" || aspect === "4:3"
  ? "1536x1024"
  : "1024x1024";

// Wrap fetch with an AbortController so a slow upstream cannot hold the
// edge function open until the 150s platform IDLE_TIMEOUT (504).
const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
  timeoutMs = 120_000,
): Promise<Response> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, messages, system_prompt, model, prompt, size, dalle_size, quality, ai_model, image_base64s, operation_name, task_id, input_image_url, logo_url, model_settings, sora_character_scenes } = await req.json();

    const isNanoBananaModel = ["nano-banana-2", "nano-banana-pro"].includes(ai_model || "");

    const isVertexModel = [
      "veo-2", "veo-3", "veo-3-fast"
    ].includes(ai_model || "");

    const isVeoModel = ["veo-2", "veo-3", "veo-3-fast"].includes(ai_model || "");

    // === Nano Banana 2 / Pro image generation (Vertex AI / Gemini API) ===
    if (action === "generate_image" && isNanoBananaModel) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const nanoBananaModelMap: Record<string, string> = {
        "nano-banana-2": "google/gemini-3.1-flash-image-preview",
        "nano-banana-pro": "google/gemini-3-pro-image-preview",
      };
      const geminiModel = nanoBananaModelMap[ai_model] || "google/gemini-3.1-flash-image-preview";

      const selectedAspect = normalizeAspectRatio(size);
      const selectedAspectLabel = aspectLabel(selectedAspect);
      const gatewaySize = gatewaySizeFromAspect(selectedAspect);
      const hasInputImg = !!input_image_url;
      const logoOrderLabel = logo_url ? (hasInputImg ? "second" : "first") : "";
      const logoInstr = logo_url
        ? `\n\nIMPORTANT: The ${logoOrderLabel} reference image attached is the user's brand logo (PNG, transparent background). You MUST integrate this EXACT logo into the generated image — do NOT invent, redraw, restyle, recolor, retype, or substitute any other logo, monogram, lettering, icon or brand. Reproduce it pixel-identical (same shapes, colors, typography, proportions), keep its transparent background, do not crop or rotate it, place it discreetly without covering the main subject.`
        : "";
      const enhancedPrompt = `Generate an image STRICTLY in aspect ratio ${selectedAspect} (${selectedAspectLabel}), output canvas ${gatewaySize}. IMPORTANT: this aspect ratio comes from the user's Format field and MUST be respected exactly — do NOT output a square or any other ratio. Compose the entire scene to fit a ${selectedAspectLabel} ${selectedAspect} canvas. ${prompt || ""}${logoInstr}`;

      const userParts: any[] = [{ type: "text", text: enhancedPrompt }];
      if (input_image_url) userParts.push({ type: "image_url", image_url: { url: input_image_url } });
      if (logo_url) userParts.push({ type: "image_url", image_url: { url: logo_url } });

      const nbRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: geminiModel,
          messages: [{ role: "user", content: userParts.length === 1 ? enhancedPrompt : userParts }],
          modalities: ["image", "text"],
          stream: false,
        }),
      });

      if (!nbRes.ok) {
        const errText = await nbRes.text();
        console.error("Nano Banana (gateway) error:", nbRes.status, errText);
        if (nbRes.status === 429) return jsonError(429, "Limite de requêtes atteinte. Réessayez dans quelques instants.");
        if (nbRes.status === 402) return jsonError(402, "Crédits IA épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.");
        return jsonError(500, "Erreur lors de la génération d'image");
      }

      const nbData = await nbRes.json();
      const item = nbData?.data?.[0];
      const b64 = item?.b64_json;
      const url = item?.url;
      if (b64) return jsonResp({ image_url: `data:image/png;base64,${b64}` });
      if (url) return jsonResp({ image_url: url });

      console.error("Nano Banana: no image in response", JSON.stringify(nbData).substring(0, 500));
      return jsonError(500, "Pas d'image générée");
    }

    // === OpenAI image generation via Lovable AI Gateway ===
    if (action === "generate_image" && !isNanoBananaModel) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const selectedAspect = normalizeAspectRatio(size);
      const gatewaySize = gatewaySizeFromAspect(selectedAspect);
      const hasRefImg = !!input_image_url;
      const hasLogo = !!logo_url;

      // When a reference product image is provided, GPT Image (OpenAI) cannot
      // accept it via /v1/images/generations. Route through Gemini image
      // (gemini-3-pro-image-preview) which faithfully reproduces the product.
      if (hasRefImg || hasLogo) {
        const logoOrderLabel = hasLogo ? (hasRefImg ? "second" : "first") : "";
        const productInstr = hasRefImg
          ? `\n\nABSOLUTE PRIORITY: The ${hasLogo ? "first" : "first"} reference image attached is the user's REAL product/service. You MUST reproduce this EXACT product with perfect fidelity in the generated visual — same shape, same colors, same packaging, same labels, same proportions, same materials, same details. Do NOT invent a different product, do NOT restyle it, do NOT change its branding. The generated image must be visually IDENTICAL to the reference product, only the scene/context/lighting around it changes.`
          : "";
        const logoInstr = hasLogo
          ? `\n\nIMPORTANT: The ${logoOrderLabel} reference image is the user's brand logo. Integrate this EXACT logo (pixel-identical) into the generated image — do NOT redraw or substitute it. Keep its transparent background, do not crop or rotate it, place it discreetly without covering the main subject.`
          : "";
        const enhancedPrompt = `Generate an image STRICTLY in aspect ratio ${selectedAspect} (${aspectLabel(selectedAspect)}), output canvas ${gatewaySize}. ${prompt || ""}${productInstr}${logoInstr}`;

        const userParts: any[] = [{ type: "text", text: enhancedPrompt }];
        if (hasRefImg) userParts.push({ type: "image_url", image_url: { url: input_image_url } });
        if (hasLogo) userParts.push({ type: "image_url", image_url: { url: logo_url } });

        const refRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: userParts }],
            modalities: ["image", "text"],
            stream: false,
          }),
        });
        if (!refRes.ok) {
          const errText = await refRes.text();
          console.error("GPT-image-2 ref→Gemini error:", refRes.status, errText);
          if (refRes.status === 429) return jsonError(429, "Limite de requêtes atteinte.");
          if (refRes.status === 402) return jsonError(402, "Crédits IA épuisés.");
          return jsonError(500, "Erreur lors de la génération d'image avec référence");
        }
        const refData = await refRes.json();
        const refItem = refData?.data?.[0];
        const refUrl = refItem?.b64_json ? `data:image/png;base64,${refItem.b64_json}` : refItem?.url || null;
        if (!refUrl) return jsonError(500, "Pas d'image générée");
        return jsonResp({ image_url: refUrl });
      }

      const callGptImage = () => fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-2",
          prompt: `Generate strictly in aspect ratio ${selectedAspect}. ${prompt || ""}`,
          n: 1,
          size: gatewaySize,
          quality: "low",
        }),
      });
      let imageRes = await callGptImage();
      if (imageRes.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500));
        imageRes = await callGptImage();
      }

      if (!imageRes.ok) {
        const errText = await imageRes.text();
        console.error("OpenAI image generation error:", imageRes.status, errText);
        const isModeration = /moderation_blocked|safety system|content_policy/i.test(errText);
        if (isModeration) {
          return jsonError(400, "Votre prompt a été refusé par le filtre de sécurité OpenAI. Reformulez votre description (évitez marques, personnes réelles, contenus sensibles) puis réessayez.");
        }
        if (imageRes.status === 429) return jsonError(429, "Limite de génération d'image atteinte.");
        if (imageRes.status === 401 || imageRes.status === 402) return jsonError(imageRes.status, "Problème d'authentification ou de crédits sur la passerelle IA.");
        if (imageRes.status >= 500) {
          return jsonFallback("Le modèle GPT Image est temporairement indisponible. Bascule automatique vers un modèle image alternatif.", {
            provider_status: imageRes.status,
            fallback_model: "nano-banana-pro",
          });
        }
        return jsonError(imageRes.status, `Erreur génération image (${imageRes.status})`);
      }

      const imageData = await imageRes.json();
      const item = imageData?.data?.[0];
      const imageUrl = item?.url
        ? item.url
        : item?.b64_json
          ? `data:image/png;base64,${item.b64_json}`
          : null;
      return jsonResp({ image_url: imageUrl });
    }


    // === Sora 2 video generation (OpenAI) ===
    if (action === "generate_video" && !isVeoModel) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

      const soraRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sora-2",
          prompt: prompt || "",
          n: 1,
          size: size || "1920x1080",
        }),
      });

      if (!soraRes.ok) {
        const errText = await soraRes.text();
        console.error("Sora 2 error:", soraRes.status, errText);
        return jsonError(soraRes.status === 429 ? 429 : 500, soraRes.status === 429 ? "Limite de requêtes OpenAI atteinte." : "Erreur Sora 2");
      }

      const soraData = await soraRes.json();
      return jsonResp({ video_url: soraData?.data?.[0]?.url });
    }

    // === Veo: Helper to get OAuth2 access token from service account ===
    const getVeoAccessToken = async () => {
      const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");

      let sa: any;
      try {
        sa = JSON.parse(serviceAccountJson);
      } catch {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
      }

      const b64url = (data: Uint8Array | string) => {
        const str = typeof data === "string" ? data : String.fromCharCode(...data);
        return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      };

      const now = Math.floor(Date.now() / 1000);
      const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const jwtPayload = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }));

      const pemBody = sa.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\n/g, "");
      const binaryKey = Uint8Array.from(atob(pemBody), (c: string) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const sigInput = new TextEncoder().encode(`${header}.${jwtPayload}`);
      const sigBytes = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, sigInput));
      const signedJwt = `${header}.${jwtPayload}.${b64url(sigBytes)}`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedJwt}`,
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("OAuth2 token error:", errText);
        throw new Error("Impossible d'obtenir un token OAuth2");
      }

      const { access_token } = await tokenRes.json();
      return { access_token, project_id: sa.project_id };
    };

    // === Veo: START video generation (returns operation name immediately) ===
    if (action === "start_video" && isVeoModel) {
      const { access_token, project_id } = await getVeoAccessToken();

      const veoModelMap: Record<string, string> = {
        "veo-2": "veo-2.0-generate-001",
        "veo-3": "veo-3.0-generate-001",
        "veo-3-fast": "veo-3.0-fast-generate-001",
      };

      const veoModel = veoModelMap[ai_model] || "veo-3.0-generate-001";
      const aspectRatio = size === "9:16" ? "9:16" : "16:9";

      const generateUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${project_id}/locations/us-central1/publishers/google/models/${veoModel}:predictLongRunning`;

      const generateRes = await fetch(generateUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt: prompt || "" }],
          parameters: { aspectRatio, sampleCount: 1 },
        }),
      });

      if (!generateRes.ok) {
        const errText = await generateRes.text();
        console.error("Veo start error:", generateRes.status, errText);
        let msg = "Erreur Veo";
        try {
          const parsed = JSON.parse(errText);
          msg = parsed?.error?.message || msg;
        } catch { msg = errText || msg; }
        return jsonError(generateRes.status === 429 ? 429 : 500, msg);
      }

      const generateData = await generateRes.json();

      // Check immediate result
      const immediateUrl = generateData?.predictions?.[0]?.video?.uri;
      if (immediateUrl) {
        return jsonResp({ video_url: immediateUrl, done: true });
      }

      // Return operation name + model endpoint for client-side polling
      if (generateData?.name) {
        const modelEndpoint = `projects/${project_id}/locations/us-central1/publishers/google/models/${veoModel}`;
        return jsonResp({ operation_name: generateData.name, model_endpoint: modelEndpoint, done: false });
      }

      return jsonError(500, "Aucune opération retournée par Veo");
    }

    // === Veo: POLL video generation status ===
    if (action === "poll_video") {
      if (!operation_name) return jsonError(400, "Missing operation_name");
      const { access_token } = await getVeoAccessToken();

      // Extract model endpoint from the operation name
      // Format: projects/{p}/locations/{l}/publishers/google/models/{m}/operations/{id}
      const modelMatch = operation_name.match(/^(projects\/[^/]+\/locations\/[^/]+\/publishers\/google\/models\/[^/]+)\/operations\/(.+)$/);
      
      let pollUrl: string;
      if (modelMatch) {
        // Use fetchPredictOperation for publisher model operations
        pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${modelMatch[1]}:fetchPredictOperation`;
      } else {
        // Fallback to standard operations endpoint
        pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${operation_name}`;
      }

      const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operationName: operation_name }),
      });

      if (!pollRes.ok) {
        const pollErr = await pollRes.text();
        console.error("Veo poll error:", pollRes.status, pollErr);
        return jsonError(pollRes.status, "Erreur lors du polling Veo");
      }

      const pollData = await pollRes.json();
      console.log("Veo poll response:", JSON.stringify(pollData).substring(0, 2000));

      if (pollData.done) {
        // Check for error in the operation result
        if (pollData.error) {
          console.error("Veo operation error:", JSON.stringify(pollData.error));
          return jsonError(500, pollData.error.message || "Erreur Veo lors de la génération");
        }

        // 1. Check for video URL (uri-based responses)
        const videoUrl = pollData?.response?.predictions?.[0]?.video?.uri
                      || pollData?.response?.generatedVideos?.[0]?.video?.uri
                      || pollData?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
                      || pollData?.response?.videos?.[0]?.uri
                      || pollData?.response?.generatedSamples?.[0]?.video?.uri;
        
        if (videoUrl) {
          return jsonResp({ video_url: videoUrl, done: true });
        }

        // 2. Check for base64-encoded video (Veo returns bytesBase64Encoded)
        const b64Video = pollData?.response?.videos?.[0]?.bytesBase64Encoded
                      || pollData?.response?.generatedVideos?.[0]?.bytesBase64Encoded
                      || pollData?.response?.predictions?.[0]?.bytesBase64Encoded
                      || pollData?.response?.generatedSamples?.[0]?.video?.bytesBase64Encoded;

        if (b64Video) {
          return jsonResp({ video_url: `data:video/mp4;base64,${b64Video}`, done: true });
        }

        // 3. Deep search for any uri or base64
        const findMedia = (obj: any): { type: string; value: string } | null => {
          if (!obj || typeof obj !== 'object') return null;
          if (typeof obj.uri === 'string' && obj.uri.startsWith('http')) return { type: 'uri', value: obj.uri };
          if (typeof obj.gcsUri === 'string') return { type: 'uri', value: obj.gcsUri };
          if (typeof obj.bytesBase64Encoded === 'string' && obj.bytesBase64Encoded.length > 100) {
            return { type: 'b64', value: obj.bytesBase64Encoded };
          }
          for (const key of Object.keys(obj)) {
            const found = findMedia(obj[key]);
            if (found) return found;
          }
          return null;
        };

        const media = findMedia(pollData);
        if (media) {
          const url = media.type === 'uri' ? media.value : `data:video/mp4;base64,${media.value}`;
          return jsonResp({ video_url: url, done: true });
        }

        console.error("Veo done but no video found. Keys:", JSON.stringify(Object.keys(pollData?.response || {})));
        return jsonError(500, "Opération terminée mais aucune vidéo générée");
      }

    }

    // === kie.ai: START video generation ===
    if (action === "kie_start_video") {
      // ---- OpenAI Sora routing: T2V / I2V (Standard + Pro). "Character" reste sur kie.ai. ----
      const OPENAI_SORA_MODELS: Record<string, "sora-2" | "sora-2-pro"> = {
        "sora-2-t2v": "sora-2",
        "sora-2-i2v": "sora-2",
        "sora-2-pro-t2v": "sora-2-pro",
        "sora-2-pro-i2v": "sora-2-pro",
        "sora-2-pro-character": "sora-2-pro",
      };
      if (ai_model && OPENAI_SORA_MODELS[ai_model]) {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) return jsonError(500, "OPENAI_API_KEY non configurée");

        const ms = (model_settings || {}) as Record<string, any>;
        const isPro = ai_model.includes("pro");
        const isCharacter = ai_model === "sora-2-pro-character";
        const isI2V = ai_model.includes("i2v") || isCharacter;
        const oaiModel = OPENAI_SORA_MODELS[ai_model];

        // Orientation : sora_aspect_ratio (portrait/paysage) > size (9:16/16:9/1:1)
        const orient = ms.sora_aspect_ratio === "portrait"
          ? "portrait"
          : ms.sora_aspect_ratio === "paysage"
          ? "landscape"
          : size === "9:16" ? "portrait" : "landscape";

        // Tailles OpenAI Sora supportées : 720x1280, 1280x720 (standard) ; pro/high → 1024x1792, 1792x1024
        const highRes = isPro && ms.sora_pro_size === "high";
        const oaiSize = orient === "portrait"
          ? (highRes ? "1024x1792" : "720x1280")
          : (highRes ? "1792x1024" : "1280x720");

        // Durée : n_frames (10/15) → seconds ("8"/"12"). Défaut "8".
        // Pour Sora 2 Pro Character, on utilise la durée totale demandée (10/15/25s) plafonnée à 12s par appel OpenAI.
        let seconds = ms.sora_n_frames === 15 ? "12" : ms.sora_n_frames === 10 ? "8" : "8";
        if (isCharacter) {
          const total = Number((model_settings as any)?.sora_character_total_duration) || 10;
          seconds = total >= 12 ? "12" : total >= 8 ? "8" : "4";
        }

        // Pour le mode Character, on enrichit le prompt avec la description des scènes
        let effectivePrompt = prompt || "";
        if (isCharacter && Array.isArray(sora_character_scenes) && sora_character_scenes.length > 0) {
          const scenesDesc = sora_character_scenes
            .map((s: any, i: number) => `Scène ${i + 1} (${Number(s.duration) || 0}s)`)
            .join(" → ");
          effectivePrompt = `${effectivePrompt}\n\nStructure narrative en plusieurs scènes : ${scenesDesc}. Maintenir la cohérence du personnage principal sur toutes les scènes.`;
        }

        let body: BodyInit;
        const headers: Record<string, string> = { Authorization: `Bearer ${OPENAI_API_KEY}` };

        if (isI2V) {
          const imgUrl = ms.sora_image_url || input_image_url;
          if (!imgUrl) return jsonError(400, "Sora I2V requiert une image source.");
          const imgRes = await fetch(imgUrl);
          if (!imgRes.ok) return jsonError(400, "Impossible de récupérer l'image source.");
          const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
          // Sora exige que l'image input_reference corresponde EXACTEMENT à size (width x height).
          // On redimensionne en cover, on ré-encode en PNG, puis on vérifie l'IHDR du PNG avant l'envoi.
          const [targetW, targetH] = oaiSize.split("x").map((n) => parseInt(n, 10));
          let finalBytes: Uint8Array = imgBuf;
          let finalMime = "image/png";
          let finalName = "ref.png";
          try {
            const { Image } = await import("https://deno.land/x/imagescript@1.2.17/mod.ts");
            const img = await Image.decode(imgBuf);
            const resized = img.cover(targetW, targetH);
            finalBytes = await resized.encode();
            const view = new DataView(finalBytes.buffer, finalBytes.byteOffset, finalBytes.byteLength);
            const pngW = view.getUint32(16);
            const pngH = view.getUint32(20);
            console.log(`[sora_i2v_reference] source=${img.width}x${img.height} target=${targetW}x${targetH} output=${pngW}x${pngH} bytes=${finalBytes.byteLength}`);
            if (pngW !== targetW || pngH !== targetH) {
              throw new Error(`PNG output mismatch ${pngW}x${pngH}, expected ${targetW}x${targetH}`);
            }
          } catch (e) {
            console.error("Sora I2V resize error:", (e as Error)?.message);
            return jsonError(400, "Impossible de redimensionner l'image source pour Sora.");
          }
          const fd = new FormData();
          fd.append("model", oaiModel);
          fd.append("prompt", effectivePrompt);
          fd.append("seconds", seconds);
          fd.append("size", oaiSize);
          fd.append("input_reference", new File([finalBytes], finalName, { type: finalMime }));
          body = fd;
        } else {
          headers["Content-Type"] = "application/json";
          body = JSON.stringify({ model: oaiModel, prompt: effectivePrompt, seconds, size: oaiSize });
        }

        console.log(`[openai_sora_start] ai_model=${ai_model} model=${oaiModel} size=${oaiSize} seconds=${seconds} i2v=${isI2V}`);

        const startRes = await fetch("https://api.openai.com/v1/videos", { method: "POST", headers, body });
        const startText = await startRes.text();
        if (!startRes.ok) {
          console.error("OpenAI Sora start error:", startRes.status, startText);
          const fallbackable = startRes.status >= 500 || /unavailable|maintenance|temporarily|overloaded/i.test(startText);
          if (fallbackable) {
            return jsonFallback(`Sora (OpenAI) est temporairement indisponible. Merci d'en choisir un autre (Veo 3.1, Kling, Seedance ou Grok Imagine).`, { provider_status: startRes.status, provider: "openai" });
          }
          return jsonError(startRes.status === 429 ? 429 : 400, `Erreur OpenAI Sora: ${startText.slice(0, 300)}`);
        }
        let startJson: any;
        try { startJson = JSON.parse(startText); } catch { return jsonError(500, "Réponse OpenAI Sora invalide"); }
        const oaiId = startJson?.id;
        if (!oaiId) return jsonError(500, "OpenAI Sora n'a pas retourné d'id");
        // Préfixe pour router le polling vers OpenAI
        return jsonResp({ task_id: `oai:${oaiId}`, done: false });
      }

      const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
      if (!KIE_AI_API_KEY) return jsonError(500, "KIE_AI_API_KEY non configurée");

      const ms = (model_settings || {}) as Record<string, any>;
      const aspectFromFormat = size === "9:16" ? "9:16" : size === "1:1" ? "1:1" : "16:9";
      const soraAspect = ms.sora_aspect_ratio === "portrait" ? "portrait" : ms.sora_aspect_ratio === "paysage" ? "landscape" : (size === "9:16" ? "portrait" : "landscape");

      // Build kie.ai model id + input per family
      let kieModel = "";
      const input: Record<string, any> = { prompt: prompt || "" };

      switch (ai_model) {
        // ---------- SORA ----------
        case "sora-2-t2v":
          kieModel = "sora-2-text-to-video";
          input.aspect_ratio = soraAspect;
          if (ms.sora_n_frames) input.n_frames = ms.sora_n_frames;
          if (typeof ms.sora_remove_watermark === "boolean") input.remove_watermark = ms.sora_remove_watermark;
          break;
        case "sora-2-i2v":
          kieModel = "sora-2-image-to-video";
          {
            const img = ms.sora_image_url || input_image_url;
            if (!img) return jsonError(400, "Sora 2 I2V requiert une image source. Ajoutez-la dans les réglages du modèle ou via l'image de référence.");
            input.image_urls = [img];
          }
          input.aspect_ratio = soraAspect;
          if (ms.sora_n_frames) input.n_frames = ms.sora_n_frames;
          if (typeof ms.sora_remove_watermark === "boolean") input.remove_watermark = ms.sora_remove_watermark;
          break;
        case "sora-2-pro-t2v":
          kieModel = "sora-2-pro-text-to-video";
          input.aspect_ratio = soraAspect;
          if (ms.sora_n_frames) input.n_frames = ms.sora_n_frames;
          input.size = ms.sora_pro_size || "standard";
          if (typeof ms.sora_remove_watermark === "boolean") input.remove_watermark = ms.sora_remove_watermark;
          break;
        case "sora-2-pro-i2v":
          kieModel = "sora-2-pro-image-to-video";
          {
            const img = ms.sora_image_url || input_image_url;
            if (!img) return jsonError(400, "Sora 2 Pro I2V requiert une image source. Ajoutez-la dans les réglages du modèle ou via l'image de référence.");
            input.image_urls = [img];
          }
          input.aspect_ratio = soraAspect;
          if (ms.sora_n_frames) input.n_frames = ms.sora_n_frames;
          input.size = ms.sora_pro_size || "standard";
          break;
        case "sora-2-pro-character": {
          kieModel = "sora-2-pro-character";
          {
            const img = ms.sora_image_url || input_image_url;
            if (!img) return jsonError(400, "Sora 2 Pro Character requiert une image source.");
            input.image = img;
          }
          if (!ms.sora_aspect_ratio) return jsonError(400, "Sora 2 Pro Character requiert un format.");
          input.aspect_ratio = soraAspect;
          input.n_frames = ms.sora_n_frames || 10;
          if (Array.isArray(sora_character_scenes) && sora_character_scenes.length > 0) {
            input.scenes = sora_character_scenes.map((s: any) => ({ duration: Number(s.duration) || 0 }));
          }
          break;
        }

        // ---------- VEO 3 / 3.1 (via OpenRouter) ----------
        case "veo-3":
        case "veo-3.1": {
          const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
          if (!OPENROUTER_API_KEY) return jsonError(500, "OPENROUTER_API_KEY non configurée");

          // Map app model IDs to OpenRouter model IDs
          let orModel = "google/veo-3.1";
          if (ai_model === "veo-3") {
            orModel = "google/veo-3.1-fast";
          } else {
            const sub = (ms.veo_sub_model || "").toString();
            if (sub.includes("fast")) orModel = "google/veo-3.1-fast";
            else if (sub.includes("lite")) orModel = "google/veo-3.1-lite";
            else orModel = "google/veo-3.1";
          }

          const veoAspect = ms.veo_aspect || (size === "9:16" ? "9:16" : "16:9");
          const veoSubMode = ms.veo_sub_mode || "t2v";

          const orBody: Record<string, any> = {
            model: orModel,
            prompt: prompt || "",
            aspect_ratio: veoAspect,
          };
          if (ms.veo_resolution) orBody.resolution = ms.veo_resolution;
          if (ms.veo_duration) orBody.duration = ms.veo_duration;

          if (veoSubMode === "i2v") {
            if (!ms.veo_start_image_url) return jsonError(400, "Veo I2V requiert une image de départ.");
            orBody.image_url = ms.veo_start_image_url;
            if (ms.veo_end_image_url) orBody.last_frame_image_url = ms.veo_end_image_url;
          } else if (veoSubMode === "reference") {
            const refs = Array.isArray(ms.veo_reference_image_urls) ? ms.veo_reference_image_urls.filter(Boolean) : [];
            if (refs.length === 0) return jsonError(400, "Veo Référence requiert au moins une image.");
            orBody.reference_image_urls = refs;
          }

          console.log(`[openrouter_veo_start] ai_model=${ai_model} → ${orModel}`, JSON.stringify(orBody).substring(0, 400));

          const orRes = await fetch("https://openrouter.ai/api/v1/videos", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orBody),
          });
          const orText = await orRes.text();
          if (!orRes.ok) {
            console.error("OpenRouter Veo start error:", orRes.status, orText);
            const fallbackable = orRes.status >= 500 || /unavailable|maintenance|temporarily|overloaded/i.test(orText);
            if (fallbackable) {
              return jsonFallback(`Veo (OpenRouter) est temporairement indisponible. Merci d'en choisir un autre (Sora 2 Pro, Kling, Seedance ou Grok Imagine).`, { provider_status: orRes.status, provider: "openrouter" });
            }
            return jsonError(orRes.status === 429 ? 429 : 400, `Erreur OpenRouter Veo: ${orText.slice(0, 300)}`);
          }
          let orJson: any;
          try { orJson = JSON.parse(orText); } catch { return jsonError(500, "Réponse OpenRouter invalide"); }
          const orId = orJson?.id;
          const pollingUrl = orJson?.polling_url;
          if (!pollingUrl) return jsonError(500, "OpenRouter n'a pas retourné de polling_url");
          // Encode polling URL into task_id so the poll endpoint can use it without DB.
          const tid = `or:${btoa(pollingUrl)}`;
          return jsonResp({ task_id: tid, done: false, provider_id: orId });
        }

        // ---------- GROK IMAGINE VIDEO (via OpenRouter) ----------
        case "grok-imagine-t2v":
        case "grok-imagine-i2v":
        case "grok-imagine-1.5-preview": {
          const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
          if (!OPENROUTER_API_KEY) return jsonError(500, "OPENROUTER_API_KEY non configurée");

          const orModel = "x-ai/grok-imagine-video";

          // Determine aspect / resolution / duration / images based on sub-model
          let grokAspect: string | undefined;
          let grokResolution: string | undefined;
          let grokDuration: number | undefined;
          let primaryImage: string | undefined;
          let referenceImages: string[] = [];

          if (ai_model === "grok-imagine-t2v") {
            grokAspect = ms.grok_aspect || aspectFromFormat;
            grokResolution = ms.grok_resolution || "720p";
            grokDuration = ms.grok_duration;
          } else if (ai_model === "grok-imagine-i2v") {
            const refs = Array.isArray(ms.grok_image_urls) ? ms.grok_image_urls.filter(Boolean) : [];
            if (refs.length === 0) return jsonError(400, "Grok Imagine I2V requiert au moins une image.");
            if (refs.length === 1) primaryImage = refs[0];
            else referenceImages = refs.slice(0, 7);
            grokAspect = ms.grok_aspect || aspectFromFormat;
            grokResolution = ms.grok_resolution || "720p";
            grokDuration = ms.grok_duration;
          } else {
            // grok-imagine-1.5-preview → maps to same OpenRouter video model
            if (!ms.grok15_image_url) {
              return jsonError(400, "Grok Imagine 1.5 Preview requiert une image d'entrée.");
            }
            primaryImage = ms.grok15_image_url;
            grokAspect = ms.grok15_aspect || aspectFromFormat || "16:9";
            grokResolution = ms.grok15_resolution || "720p";
            grokDuration = ms.grok15_duration ?? 8;
          }

          // OpenRouter Grok Imagine Video supports aspects: 1:1,16:9,9:16,4:3,3:4,3:2,2:3
          const allowedAspects = new Set(["1:1","16:9","9:16","4:3","3:4","3:2","2:3"]);
          if (!grokAspect || !allowedAspects.has(grokAspect)) grokAspect = "16:9";

          let grokPrompt = typeof prompt === "string" ? prompt : "";
          // OpenRouter / Grok Imagine prompt safety: cap well under 4096
          if (grokPrompt.length > 3900) grokPrompt = grokPrompt.slice(0, 3900);

          // I2V fidelity: Grok Imagine génère un plan continu et a tendance à
          // inventer un produit si le prompt ne l'ancre pas explicitement sur
          // l'image de référence. On force la fidélité visuelle au produit fourni.
          if (primaryImage || referenceImages.length > 0) {
            const fidelityPrefix =
              "RÉFÉRENCE VISUELLE OBLIGATOIRE : Le produit, l'emballage, la forme, les couleurs, le logo, l'étiquette et tous les détails visibles dans l'image de référence fournie doivent être reproduits À L'IDENTIQUE dans la vidéo. Ne remplace JAMAIS le produit par un autre. La vidéo doit montrer EXACTEMENT ce produit, sous le même angle de départ que l'image, sans inventer un produit différent.\n\n";
            grokPrompt = (fidelityPrefix + grokPrompt).slice(0, 3900);
          }

          const orBody: Record<string, any> = {
            model: orModel,
            prompt: grokPrompt,
            aspect_ratio: grokAspect,
            resolution: grokResolution,
          };
          if (grokDuration) orBody.duration = grokDuration;
          if (primaryImage) orBody.image_url = primaryImage;
          if (referenceImages.length > 0) orBody.reference_image_urls = referenceImages;

          console.log(`[openrouter_grok_start] ai_model=${ai_model} → ${orModel}`, JSON.stringify(orBody).substring(0, 400));

          let orRes: Response;
          try {
            orRes = await fetchWithTimeout("https://openrouter.ai/api/v1/videos", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(orBody),
            }, 60_000);
          } catch (err) {
            if ((err as any)?.name === "AbortError") {
              return jsonFallback("Grok Imagine (OpenRouter) ne répond pas. Merci de réessayer ou de choisir un autre modèle.", { provider: "openrouter", timeout: true });
            }
            throw err;
          }
          const orText = await orRes.text();
          if (!orRes.ok) {
            console.error("OpenRouter Grok Imagine start error:", orRes.status, orText);
            const fallbackable = orRes.status >= 500 || /unavailable|maintenance|temporarily|overloaded/i.test(orText);
            if (fallbackable) {
              return jsonFallback(`Grok Imagine (OpenRouter) est temporairement indisponible. Merci d'en choisir un autre (Sora 2 Pro, Veo 3.1, Kling, Seedance).`, { provider_status: orRes.status, provider: "openrouter" });
            }
            return jsonError(orRes.status === 429 ? 429 : 400, `Erreur OpenRouter Grok Imagine: ${orText.slice(0, 300)}`);
          }
          let orJson: any;
          try { orJson = JSON.parse(orText); } catch { return jsonError(500, "Réponse OpenRouter invalide"); }
          const orId = orJson?.id;
          const pollingUrl = orJson?.polling_url;
          if (!pollingUrl) return jsonError(500, "OpenRouter n'a pas retourné de polling_url");
          const tid = `or:${btoa(pollingUrl)}`;
          return jsonResp({ task_id: tid, done: false, provider_id: orId });
        }

        // ---------- SEEDANCE ----------
        case "bytedance/seedance-1.5-pro": {
          kieModel = "bytedance/seedance-1.5-pro";
          const refs = Array.isArray(ms.seedance_image_urls) ? ms.seedance_image_urls.filter(Boolean) : [];
          if (refs.length > 0) input.image_urls = refs;
          input.aspect_ratio = ms.seedance_aspect || aspectFromFormat;
          if (ms.seedance_resolution) input.resolution = ms.seedance_resolution;
          if (ms.seedance_duration) input.duration = String(ms.seedance_duration);
          input.audio = !!ms.seedance_audio_enabled;
          break;
        }
        case "bytedance/seedance-2": {
          const sub = ms.seedance2_sub_model || "seedance-2";
          kieModel = sub === "seedance-2-fast" ? "bytedance/seedance-2-fast" : "bytedance/seedance-2";
          if (ms.seedance2_first_frame_url) input.first_frame_url = ms.seedance2_first_frame_url;
          if (ms.seedance2_last_frame_url) input.last_frame_url = ms.seedance2_last_frame_url;
          const refImgs = Array.isArray(ms.seedance2_reference_image_urls) ? ms.seedance2_reference_image_urls.filter(Boolean) : [];
          if (refImgs.length > 0) input.reference_image_urls = refImgs;
          const refVids = Array.isArray(ms.seedance2_reference_video_urls) ? ms.seedance2_reference_video_urls.filter(Boolean) : [];
          if (refVids.length > 0) input.reference_video_urls = refVids;
          if (ms.seedance2_reference_audio_url) input.reference_audio_url = ms.seedance2_reference_audio_url;
          input.generate_audio = !!ms.seedance2_generate_audio;
          if (ms.seedance2_resolution) input.resolution = ms.seedance2_resolution;
          input.aspect_ratio = ms.seedance2_aspect || aspectFromFormat;
          if (ms.seedance2_duration) input.duration = String(ms.seedance2_duration);
          break;
        }

        // ---------- KLING ----------
        case "kling-2.1": {
          const sub = ms.kling21_sub_model || "master-t2v";
          const kling21Map: Record<string, string> = {
            "master-t2v": "kling/2.1-master-text-to-video",
            "image-to-video": "kling/2.1-image-to-video",
            "pro": "kling/2.1-pro",
            "standard": "kling/2.1-standard",
          };
          kieModel = kling21Map[sub] || "kling/2.1-master-text-to-video";
          if (sub !== "master-t2v") {
            if (!ms.kling21_image_url) return jsonError(400, "Ce modèle Kling 2.1 requiert une image source.");
            input.image_url = ms.kling21_image_url;
          }
          if (ms.kling21_duration) input.duration = String(ms.kling21_duration);
          if ((sub === "master-t2v" || sub === "image-to-video") && ms.kling21_aspect) {
            input.aspect_ratio = ms.kling21_aspect;
          }
          break;
        }
        case "kling-2.5": {
          const sub = ms.kling25_sub_model || "turbo-t2v-pro";
          kieModel = sub === "turbo-i2v-pro"
            ? "kling/2.5-turbo-image-to-video-pro"
            : "kling/2.5-turbo-text-to-video-pro";
          if (sub === "turbo-i2v-pro") {
            if (!ms.kling25_image_url) return jsonError(400, "Kling 2.5 I2V Pro requiert une image source.");
            input.image_url = ms.kling25_image_url;
            if (ms.kling25_tail_image_url) input.tail_image_url = ms.kling25_tail_image_url;
          } else if (ms.kling25_aspect) {
            input.aspect_ratio = ms.kling25_aspect;
          }
          if (ms.kling25_duration) input.duration = String(ms.kling25_duration);
          break;
        }
        case "kling-2.6": {
          const sub = ms.kling26_sub_model || "t2v";
          kieModel = sub === "i2v" ? "kling/2.6-image-to-video" : "kling/2.6-text-to-video";
          if (sub === "i2v") {
            if (!ms.kling26_image_url) return jsonError(400, "Kling 2.6 I2V requiert une image source.");
            input.image_url = ms.kling26_image_url;
          } else if (ms.kling26_aspect) {
            input.aspect_ratio = ms.kling26_aspect;
          }
          input.audio = !!ms.kling26_audio_enabled;
          if (ms.kling26_duration) input.duration = String(ms.kling26_duration);
          break;
        }
        case "kling-3.0": {
          kieModel = "kling/3.0";
          if (ms.kling30_start_image_url) input.start_image_url = ms.kling30_start_image_url;
          if (ms.kling30_end_image_url) input.end_image_url = ms.kling30_end_image_url;
          input.audio = !!ms.kling30_audio_enabled;
          if (ms.kling30_duration) input.duration = String(ms.kling30_duration);
          if (ms.kling30_mode) input.mode = ms.kling30_mode;
          break;
        }

        default: {
          const kieModelMap: Record<string, string> = {
            "veo-3": "veo3",
            "veo-3.1": "veo3.1",
            "kling-2.1": "kling/2.1",
            "kling-2.5": "kling/2.5",
            "kling-2.6": "kling/2.6",
            "kling-3.0": "kling/3.0",
            "grok-imagine": "grok/imagine",
            "bytedance/seedance-2-fast": "bytedance/seedance-2-fast",
            "bytedance/seedance-2": "bytedance/seedance-2",
          };
          kieModel = kieModelMap[ai_model || ""] || ai_model;
          input.aspect_ratio = aspectFromFormat;
        }
      }

      console.log(`[kie_start_video] ai_model=${ai_model} → kieModel=${kieModel}`, JSON.stringify(input).substring(0, 500));

      // Safety: kie.ai (notably Grok Imagine 1.5) rejects prompts > 4096 chars.
      if (typeof input.prompt === "string" && input.prompt.length > 3900) {
        input.prompt = input.prompt.slice(0, 3900);
      }

      const startRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KIE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: kieModel, input }),
      });

      const startText = await startRes.text();
      if (!startRes.ok) {
        console.error("kie.ai start error:", startRes.status, startText);
        const isFallbackable = startRes.status >= 500 || /paused|unavailable|maintenance|temporarily/i.test(startText);
        if (isFallbackable) {
          return jsonFallback(`Le modèle vidéo sélectionné (${ai_model}) est temporairement indisponible chez le fournisseur. Merci d'en choisir un autre (Sora 2 Pro, Veo 3.1, Kling, Seedance ou Grok Imagine).`, {
            provider_status: startRes.status,
            provider: "kie.ai",
          });
        }
        return jsonError(startRes.status === 429 ? 429 : 400, `Erreur kie.ai: ${startText.slice(0, 300)}`);
      }

      let startJson: any;
      try { startJson = JSON.parse(startText); } catch { return jsonError(500, "Réponse kie.ai invalide"); }

      const taskId = startJson?.data?.taskId || startJson?.taskId || startJson?.data?.id || startJson?.id;
      if (!taskId) {
        console.error("kie.ai no taskId:", startText);
        const apiMsg = startJson?.msg || startJson?.message || startJson?.error;
        const apiCode = startJson?.code;
        const paused = typeof apiMsg === "string" && /paused|unavailable|maintenance/i.test(apiMsg);
        if (paused) {
          return jsonFallback(`Le modèle vidéo sélectionné (${ai_model}) est temporairement indisponible chez le fournisseur. Merci d'en choisir un autre (Sora 2 Pro, Veo 3.1, Kling, Seedance ou Grok Imagine).`, {
            provider_code: apiCode,
            provider: "kie.ai",
          });
        }
        return jsonError(400, apiMsg ? `kie.ai: ${apiMsg}${apiCode ? ` (code ${apiCode})` : ""}` : "kie.ai n'a pas retourné de taskId");
      }

      return jsonResp({ task_id: taskId, done: false });
    }

    // === kie.ai: POLL video generation ===
    if (action === "kie_poll_video") {
      // ---- OpenAI Sora polling ----
      if (typeof task_id === "string" && task_id.startsWith("oai:")) {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) return jsonError(500, "OPENAI_API_KEY non configurée");
        const oaiId = task_id.slice(4);

        let pollRes: Response;
        try {
          pollRes = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(oaiId)}`, {
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          });
        } catch (e) {
          console.warn("OpenAI Sora poll transient fetch error, will retry:", (e as Error)?.message);
          return jsonResp({ done: false });
        }
        const pollText = await pollRes.text();
        if (!pollRes.ok) {
          console.warn("OpenAI Sora poll non-OK, will retry:", pollRes.status, pollText.slice(0, 200));
          // Transient upstream errors (503/504/connection timeout) → retry next tick
          if (pollRes.status >= 500 || pollRes.status === 408 || pollRes.status === 429) {
            return jsonResp({ done: false });
          }
          return jsonError(pollRes.status, `Erreur polling OpenAI Sora: ${pollText.slice(0, 200)}`);
        }
        let pollJson: any;
        try { pollJson = JSON.parse(pollText); } catch { return jsonError(500, "Réponse OpenAI Sora invalide"); }
        const status = (pollJson?.status || "").toLowerCase();

        if (["failed", "error", "cancelled", "canceled"].includes(status)) {
          const msg = pollJson?.error?.message || pollJson?.last_error?.message || "Échec de la génération OpenAI Sora";
          return jsonError(500, msg);
        }
        if (status === "completed") {
          // Récupère le binaire vidéo
          let contentRes: Response;
          try {
            contentRes = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(oaiId)}/content`, {
              headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            });
          } catch (e) {
            console.warn("Sora content fetch transient error (retry):", (e as Error)?.message);
            return jsonResp({ done: false });
          }
          if (!contentRes.ok) {
            const t = await contentRes.text();
            console.warn("Sora content non-OK (retry):", contentRes.status, t.slice(0, 200));
            if (contentRes.status >= 500 || contentRes.status === 408 || contentRes.status === 429) {
              return jsonResp({ done: false });
            }
            return jsonError(contentRes.status, "Téléchargement vidéo OpenAI Sora échoué");
          }
          let videoBuf: Uint8Array;
          try {
            videoBuf = new Uint8Array(await contentRes.arrayBuffer());
          } catch (e) {
            console.warn("Sora content read transient error (retry):", (e as Error)?.message);
            return jsonResp({ done: false });
          }

          // Upload vers Supabase Storage (bucket public)
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
          const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
            || Deno.env.get("SUPABASE_SECRET_KEYS");
          if (!SUPABASE_URL || !SERVICE_ROLE) return jsonError(500, "Storage non configuré");
          const objectPath = `sora/${oaiId}.mp4`;
          try {
            const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
            const { error: upErr } = await adminClient.storage
              .from("kreator-uploads")
              .upload(objectPath, videoBuf, { contentType: "video/mp4", upsert: true });
            if (upErr) {
              console.warn("Sora upload storage error (will retry on next poll):", upErr.message);
              return jsonResp({ done: false });
            }
          } catch (e) {
            console.warn("Sora upload exception (will retry on next poll):", (e as Error)?.message);
            return jsonResp({ done: false });
          }
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/kreator-uploads/${objectPath}`;
          return jsonResp({ video_url: publicUrl, done: true });
        }
        return jsonResp({ done: false });
      }

      // ---- OpenRouter Veo polling ----
      if (typeof task_id === "string" && task_id.startsWith("or:")) {
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
        if (!OPENROUTER_API_KEY) return jsonError(500, "OPENROUTER_API_KEY non configurée");
        let pollingUrl: string;
        try { pollingUrl = atob(task_id.slice(3)); } catch { return jsonError(400, "task_id OpenRouter invalide"); }

        let orRes: Response;
        try {
          orRes = await fetch(pollingUrl, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
        } catch (e) {
          console.warn("OpenRouter Veo poll transient error, retry:", (e as Error)?.message);
          return jsonResp({ done: false });
        }
        const orText = await orRes.text();
        if (!orRes.ok) {
          console.warn("OpenRouter Veo poll non-OK:", orRes.status, orText.slice(0, 200));
          if (orRes.status >= 500 || orRes.status === 408 || orRes.status === 429) return jsonResp({ done: false });
          return jsonError(orRes.status, `Erreur polling OpenRouter: ${orText.slice(0, 200)}`);
        }
        let orJson: any;
        try { orJson = JSON.parse(orText); } catch { return jsonError(500, "Réponse OpenRouter invalide"); }
        const status = (orJson?.status || "").toString().toLowerCase();
        if (status === "failed" || status === "error" || status === "cancelled") {
          const msg = orJson?.error?.message || orJson?.error || "Échec génération OpenRouter Veo";
          return jsonError(500, typeof msg === "string" ? msg : JSON.stringify(msg));
        }
        if (status === "completed" || status === "succeeded" || status === "success") {
          const urls: string[] = orJson?.unsigned_urls || orJson?.urls || [];
          const videoUrl = urls[0] || orJson?.video_url || orJson?.output?.[0]?.url;
          if (!videoUrl) {
            console.error("OpenRouter completed but no video URL:", orText.slice(0, 500));
            return jsonError(500, "Génération terminée mais URL vidéo introuvable (OpenRouter)");
          }
          // OpenRouter unsigned URLs require Authorization header → not playable directly in <video>.
          // Download server-side and re-upload to Supabase Storage so the browser can play it.
          const needsAuth = /openrouter\.ai\//i.test(videoUrl);
          if (!needsAuth) {
            return jsonResp({ video_url: videoUrl, done: true });
          }
          let contentRes: Response;
          try {
            contentRes = await fetch(videoUrl, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
          } catch (e) {
            console.warn("OpenRouter video fetch transient error (retry):", (e as Error)?.message);
            return jsonResp({ done: false });
          }
          if (!contentRes.ok) {
            const t = await contentRes.text();
            console.warn("OpenRouter video non-OK (retry):", contentRes.status, t.slice(0, 200));
            if (contentRes.status >= 500 || contentRes.status === 408 || contentRes.status === 429) {
              return jsonResp({ done: false });
            }
            return jsonError(contentRes.status, "Téléchargement vidéo OpenRouter échoué");
          }
          let videoBuf: Uint8Array;
          try {
            videoBuf = new Uint8Array(await contentRes.arrayBuffer());
          } catch (e) {
            console.warn("OpenRouter video read transient error (retry):", (e as Error)?.message);
            return jsonResp({ done: false });
          }
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
          const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
            || Deno.env.get("SUPABASE_SECRET_KEYS");
          if (!SUPABASE_URL || !SERVICE_ROLE) return jsonError(500, "Storage non configuré");
          const orRefId = (orJson?.id || orJson?.generation_id || crypto.randomUUID()).toString().replace(/[^a-zA-Z0-9_-]/g, "");
          const objectPath = `openrouter-veo/${orRefId}.mp4`;
          try {
            const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
            const { error: upErr } = await adminClient.storage
              .from("kreator-uploads")
              .upload(objectPath, videoBuf, { contentType: "video/mp4", upsert: true });
            if (upErr) {
              console.warn("OpenRouter upload storage error (retry):", upErr.message);
              return jsonResp({ done: false });
            }
          } catch (e) {
            console.warn("OpenRouter upload exception (retry):", (e as Error)?.message);
            return jsonResp({ done: false });
          }
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/kreator-uploads/${objectPath}`;
          return jsonResp({ video_url: publicUrl, done: true });
        }
        return jsonResp({ done: false });
      }

      const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
      if (!KIE_AI_API_KEY) return jsonError(500, "KIE_AI_API_KEY non configurée");
      if (!task_id) return jsonError(400, "Missing task_id");

      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(task_id)}`, {
        headers: { Authorization: `Bearer ${KIE_AI_API_KEY}` },
      });

      const pollText = await pollRes.text();
      if (!pollRes.ok) {
        console.error("kie.ai poll error:", pollRes.status, pollText);
        return jsonError(500, `Erreur polling kie.ai: ${pollText.slice(0, 200)}`);
      }

      let pollJson: any;
      try { pollJson = JSON.parse(pollText); } catch { return jsonError(500, "Réponse polling kie.ai invalide"); }

      const data = pollJson?.data || pollJson;
      const state = (data?.state || data?.status || "").toString().toLowerCase();

      // Failure states
      if (["fail", "failed", "error"].includes(state)) {
        const msg = data?.failMsg || data?.message || "Échec de la génération kie.ai";
        return jsonError(500, msg);
      }

      // Success states
      if (["success", "succeed", "succeeded", "completed", "complete"].includes(state)) {
        // Search common fields then deep-search
        const direct = data?.resultJson?.videoUrl
                    || data?.resultJson?.video_url
                    || data?.resultUrl
                    || data?.videoUrl
                    || data?.video_url
                    || data?.output?.video_url
                    || data?.output?.[0]?.url;

        const findUrl = (obj: any): string | null => {
          if (!obj || typeof obj !== "object") return null;
          for (const k of Object.keys(obj)) {
            const v = (obj as any)[k];
            if (typeof v === "string" && /^https?:\/\/.+\.(mp4|mov|webm)/i.test(v)) return v;
            if (typeof v === "string" && /^https?:\/\//i.test(v) && /video|mp4/i.test(k)) return v;
            const nested = findUrl(v);
            if (nested) return nested;
          }
          return null;
        };

        const videoUrl = direct || findUrl(data);
        if (videoUrl) return jsonResp({ video_url: videoUrl, done: true });

        console.error("kie.ai done but no video found:", pollText.slice(0, 500));
        return jsonError(500, "Génération terminée mais URL vidéo introuvable");
      }

      return jsonResp({ done: false });
    }

    // === kie.ai: START image generation (nano-banana) ===
    if (action === "kie_start_image") {
      const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
      if (!KIE_AI_API_KEY) return jsonError(500, "KIE_AI_API_KEY non configurée");
      // Note: a dedicated `openrouter_generate_image` action handles models routed via OpenRouter.

      const hasInputImage = !!input_image_url;
      // Map app model IDs to kie.ai model IDs (depends on whether an input image is provided)
      const kieImageModelMap: Record<string, string> = {
        "nano-banana-2": "nano-banana-2",
        "nano-banana-pro": "nano-banana-pro",
      };

      const kieModel = kieImageModelMap[ai_model || ""] || ai_model;
      const aspectRatio = size === "9:16" ? "9:16" : size === "1:1" ? "1:1" : "16:9";

      // If a logo is provided, prepend an explicit instruction so the model
      // reuses the EXACT logo image instead of inventing/redesigning one.
      const hasInputImageKie = !!input_image_url;
      const logoOrderLabelKie = logo_url ? (hasInputImageKie ? "second" : "first") : "";
      const logoPromptKie = logo_url
        ? `IMPORTANT: The ${logoOrderLabelKie} reference image is the user's brand logo (PNG, transparent background). You MUST integrate this EXACT logo into the generated image — do NOT invent, redraw, restyle, recolor, retype, or substitute any other logo, monogram, lettering, icon or brand. Reproduce it pixel-identical (same shapes, colors, typography, proportions), keep its transparent background, do not crop or rotate it, place it discreetly without covering the main subject.\n\n`
        : "";
      const promptWithLogo = `${logoPromptKie}${prompt || ""}`;

      // Build input — qwen/image-edit and ideogram/character require an input image
      const input: Record<string, any> = {
        prompt: promptWithLogo,
        aspect_ratio: aspectRatio,
      };
      const needsImage = false;
      const refImages: string[] = [];
      if (input_image_url) refImages.push(input_image_url);
      if (logo_url) refImages.push(logo_url);
      if (refImages.length > 0) {
        // kie.ai nano-banana-2 / nano-banana-pro expect `image_urls` (array of public URLs)
        if (kieModel === "nano-banana-2" || kieModel === "nano-banana-pro") {
          input.image_urls = refImages;
        } else {
          input.image_url = refImages[0];
          input.image = refImages[0];
          input.image_input = refImages;
        }
      } else if (needsImage) {
        return jsonError(400, `Le modèle ${ai_model} nécessite une image de référence en entrée.`);
      }

      const startRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KIE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: kieModel, input }),
      });

      const startText = await startRes.text();
      if (!startRes.ok) {
        console.error("kie.ai image start error:", startRes.status, startText);
        return jsonError(startRes.status === 429 ? 429 : 500, `Erreur kie.ai: ${startText.slice(0, 300)}`);
      }

      let startJson: any;
      try { startJson = JSON.parse(startText); } catch { return jsonError(500, "Réponse kie.ai invalide"); }

      const taskId = startJson?.data?.taskId || startJson?.taskId || startJson?.data?.id || startJson?.id;
      if (!taskId) {
        console.error("kie.ai image no taskId:", startText);
        const apiMsg = startJson?.msg || startJson?.message || startJson?.error;
        const apiCode = startJson?.code;
        return jsonError(400, apiMsg ? `kie.ai: ${apiMsg}${apiCode ? ` (code ${apiCode})` : ""}` : "kie.ai n'a pas retourné de taskId");
      }

      return jsonResp({ task_id: taskId, done: false });
    }

    // === kie.ai: POLL image generation ===
    if (action === "kie_poll_image") {
      const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
      if (!KIE_AI_API_KEY) return jsonError(500, "KIE_AI_API_KEY non configurée");
      if (!task_id) return jsonError(400, "Missing task_id");

      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(task_id)}`, {
        headers: { Authorization: `Bearer ${KIE_AI_API_KEY}` },
      });

      const pollText = await pollRes.text();
      if (!pollRes.ok) {
        console.error("kie.ai image poll error:", pollRes.status, pollText);
        return jsonError(500, `Erreur polling kie.ai: ${pollText.slice(0, 200)}`);
      }

      let pollJson: any;
      try { pollJson = JSON.parse(pollText); } catch { return jsonError(500, "Réponse polling kie.ai invalide"); }

      const data = pollJson?.data || pollJson;
      const state = (data?.state || data?.status || "").toString().toLowerCase();

      if (["fail", "failed", "error"].includes(state)) {
        const msg = data?.failMsg || data?.message || "Échec de la génération kie.ai";
        return jsonError(500, msg);
      }

      if (["success", "succeed", "succeeded", "completed", "complete"].includes(state)) {
        // kie.ai often returns resultJson as a JSON-encoded string
        let resultJson: any = data?.resultJson;
        if (typeof resultJson === "string") {
          try { resultJson = JSON.parse(resultJson); } catch { /* keep as string */ }
        }

        const findImageUrl = (obj: any): string | null => {
          if (!obj || typeof obj !== "object") return null;
          for (const k of Object.keys(obj)) {
            const v = (obj as any)[k];
            if (typeof v === "string" && /^https?:\/\/.+\.(png|jpe?g|webp)/i.test(v)) return v;
            if (typeof v === "string" && /^https?:\/\//i.test(v) && /image|img|url/i.test(k) && !/video/i.test(v)) return v;
            const nested = findImageUrl(v);
            if (nested) return nested;
          }
          return null;
        };

        const firstOf = (v: any): string | null => {
          if (!v) return null;
          if (typeof v === "string") return v;
          if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : (v[0]?.url || v[0]?.imageUrl || v[0]?.image_url || null);
          return null;
        };

        const direct = firstOf(resultJson?.resultUrls)
                    || firstOf(resultJson?.image_urls)
                    || firstOf(resultJson?.images)
                    || resultJson?.imageUrl
                    || resultJson?.image_url
                    || firstOf(data?.resultUrls)
                    || data?.resultUrl
                    || data?.imageUrl
                    || data?.image_url
                    || data?.output?.image_url
                    || (Array.isArray(data?.output) ? data.output[0]?.url : null);

        const imageUrl = direct || findImageUrl(resultJson) || findImageUrl(data);
        if (imageUrl) return jsonResp({ image_url: imageUrl, done: true });

        console.error("kie.ai image done but no url:", pollText.slice(0, 500));
        return jsonError(500, "Génération terminée mais URL image introuvable");
      }

      return jsonResp({ done: false });
    }

    // === OpenRouter: synchronous image generation (Nano Banana, GPT Image, Grok) ===
    if (action === "openrouter_generate_image") {
      const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
      if (!OPENROUTER_API_KEY) return jsonError(500, "OPENROUTER_API_KEY non configurée");

      const orModelMap: Record<string, string> = {
        "nano-banana-2": "google/gemini-2.5-flash-image",
        "nano-banana-pro": "google/gemini-3-pro-image-preview",
        "grok-image": "x-ai/grok-imagine-image-quality",
      };
      const orModel = orModelMap[ai_model || ""];
      if (!orModel) return jsonError(400, `Modèle OpenRouter non mappé: ${ai_model}`);
      const imageOnlyOpenRouterModels = new Set(["x-ai/grok-imagine-image-quality"]);
      const outputModalities = imageOnlyOpenRouterModels.has(orModel) ? ["image"] : ["image", "text"];

      const aspectLabel = size === "9:16"
        ? "vertical 9:16 story"
        : size === "16:9"
        ? "horizontal 16:9 widescreen"
        : size === "3:4"
        ? "vertical 3:4 portrait"
        : size === "4:3"
        ? "horizontal 4:3 landscape"
        : "square 1:1";
      const hasInput = !!input_image_url;
      const logoInstruction = logo_url
        ? `\n\nIMPORTANT: The ${hasInput ? "second" : "first"} reference image is the user's brand logo. You MUST integrate this EXACT logo into the generated image — do NOT invent, redraw, restyle or substitute any other logo. Reproduce it identically (same shapes, colors, typography, proportions), keep its transparent background, do not crop or rotate it, and place it discreetly without covering the main subject.`
        : "";
      const productInstruction = hasInput
        ? `\n\nABSOLUTE PRIORITY: The first reference image attached is the user's REAL product/service. You MUST reproduce this EXACT product with perfect fidelity in the generated visual — same shape, same colors, same packaging, same labels, same proportions, same materials, same details. Do NOT invent a different product, do NOT restyle it, do NOT change its branding. The generated image must be visually IDENTICAL to the reference product, only the scene, lighting, context and composition around it change.`
        : "";
      const aspectRatioParam = size === "9:16" || size === "16:9" || size === "1:1" || size === "3:4" || size === "4:3" ? size : "1:1";
      const framingInstruction = ` IMPORTANT: strictly respect the ${aspectRatioParam} aspect ratio coming from the user's "format" field. Frame the scene so that ALL essential elements (the plate/dish, product, subject, logo, text) are FULLY VISIBLE within the frame — never crop, cut off, or hide any essential element. Leave safe margins around the subject. Compose the shot specifically for a ${aspectLabel} canvas.`;
      const enhancedPrompt = `Generate an image with aspect ratio ${aspectRatioParam} (${aspectLabel}).${framingInstruction} ${prompt || ""}${productInstruction}${logoInstruction}`;

      let orRes: Response;
      try {
        orRes = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://creafacile.com",
          "X-Title": "CréaFacile",
        },
        body: JSON.stringify({
          model: orModel,
          modalities: outputModalities,
          aspect_ratio: aspectRatioParam,
          extra_body: { aspect_ratio: aspectRatioParam },
          messages: [
            (() => {
              const parts: any[] = [{ type: "text", text: enhancedPrompt }];
              if (input_image_url) parts.push({ type: "image_url", image_url: { url: input_image_url } });
              if (logo_url) parts.push({ type: "image_url", image_url: { url: logo_url } });
              return parts.length === 1
                ? { role: "user", content: enhancedPrompt }
                : { role: "user", content: parts };
            })(),
          ],
        }),
        }, 120_000);
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          return jsonError(504, "OpenRouter a mis trop de temps à générer l'image. Réessayez ou changez de modèle.");
        }
        throw err;
      }

      const orText = await orRes.text();
      if (!orRes.ok) {
        console.error("OpenRouter image error:", orRes.status, orText.slice(0, 500));
        if (orRes.status === 429) return jsonError(429, "Limite OpenRouter atteinte. Réessayez.");
        if (orRes.status === 402) {
          // Crédits OpenRouter épuisés — bascule automatique vers kie.ai pour les modèles compatibles
          const kieFallbackModels = new Set(["nano-banana-2", "nano-banana-pro"]);
          if (kieFallbackModels.has(ai_model || "")) {
            return jsonFallback("Crédits OpenRouter épuisés. Bascule automatique vers un fournisseur alternatif.", {
              fallback_provider: "kie",
            });
          }
          return jsonFallback("Crédits OpenRouter épuisés. Merci de réessayer plus tard ou de choisir un autre modèle.", {});
        }
        return jsonError(500, `Erreur OpenRouter: ${orText.slice(0, 300)}`);
      }

      let orJson: any;
      try { orJson = JSON.parse(orText); } catch { return jsonError(500, "Réponse OpenRouter invalide"); }

      const msg = orJson?.choices?.[0]?.message;
      const imgFromImages = msg?.images?.[0]?.image_url?.url;
      let imgFromContent: string | undefined;
      if (Array.isArray(msg?.content)) {
        for (const part of msg.content) {
          if (part?.type === "image_url" && part?.image_url?.url) {
            imgFromContent = part.image_url.url;
            break;
          }
        }
      }
      const imageUrl = imgFromImages || imgFromContent;
      if (!imageUrl) {
        console.error("OpenRouter no image in response:", orText.slice(0, 500));
        const kieFallbackModels = new Set(["nano-banana-2", "nano-banana-pro"]);
        if (kieFallbackModels.has(ai_model || "")) {
          return jsonFallback("Aucune image renvoyée par OpenRouter. Bascule automatique vers un fournisseur alternatif.", {
            fallback_provider: "kie",
          });
        }
        return jsonFallback("Aucune image renvoyée par le modèle. Essayez un autre modèle.", {
          fallback_model: "nano-banana-pro",
        });
      }
      return jsonResp({ image_url: imageUrl });
    }

    // === OpenAI Chat Completions for prompts, ideas, captions ===
    if (!messages) {
      return jsonError(400, "Missing messages");
    }

    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").trim();
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const selectedModel = model || "gpt-4o";

    const builtMessages: any[] = [];
    if (system_prompt) {
      builtMessages.push({ role: "system", content: system_prompt });
    }

    if (image_base64s && image_base64s.length > 0) {
      const userContent: any[] = [];
      for (const b64 of image_base64s) {
        userContent.push({
          type: "image_url",
          image_url: { url: b64, detail: "low" },
        });
      }
      const textContent = messages.map((m: any) => m.content).join('\n');
      userContent.push({ type: "text", text: textContent });
      builtMessages.push({ role: "user", content: userContent });
    } else {
      builtMessages.push(...messages);
    }

    let response: Response;
    try {
      response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: builtMessages,
          max_tokens: 2000,
        }),
      }, 110_000);
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        return jsonError(504, "Le service OpenAI a mis trop de temps à répondre. Réessayez.");
      }
      throw err;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      if (response.status === 429) return jsonError(429, "Limite de requêtes OpenAI atteinte.");
      if (response.status === 431) return jsonError(500, "Requête OpenAI trop volumineuse (header). Réessayez sans images de référence ou avec un prompt plus court.");
      if (response.status >= 500) return jsonFallback("Le service OpenAI est temporairement indisponible. Réessayez dans un instant.", { provider_status: response.status });
      return jsonError(response.status, `Erreur OpenAI (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    return jsonResp(data);
  } catch (e) {
    console.error("kreator-ai error:", e);
    return jsonError(500, e instanceof Error ? e.message : "Erreur inconnue");
  }
});

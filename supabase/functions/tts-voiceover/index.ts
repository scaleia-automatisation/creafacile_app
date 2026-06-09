import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Génère un MP3 de voix off via OpenAI TTS (tts-1-hd).
// Body: { text: string, language?: string, voice?: string }
// Réponse: { audio_base64: string, mime: 'audio/mpeg' }

const ALLOWED_VOICES = new Set(['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']);

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text || '').toString().trim();
    const language = (body?.language || 'Français').toString();
    const voice = ALLOWED_VOICES.has(body?.voice) ? body.voice : 'nova';

    if (!text) {
      return new Response(JSON.stringify({ error: 'text vide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: 'text > 4000 caractères' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OpenAI TTS détecte automatiquement la langue — on prépend un indice pour
    // les langues non-EN afin de stabiliser la prononciation.
    const speechText =
      /fran(ç|c)ais/i.test(language) || /^fr/i.test(language)
        ? text
        : text;

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice,
        input: speechText,
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('[tts-voiceover] OpenAI error', ttsRes.status, errText.slice(0, 400));
      return new Response(
        JSON.stringify({ error: `OpenAI TTS error ${ttsRes.status}: ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const audioBuf = await ttsRes.arrayBuffer();
    const audio_base64 = base64FromArrayBuffer(audioBuf);

    return new Response(
      JSON.stringify({ audio_base64, mime: 'audio/mpeg' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[tts-voiceover] uncaught', err);
    return new Response(JSON.stringify({ error: (err as Error).message || 'erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
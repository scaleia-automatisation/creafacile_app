import { supabase } from '@/integrations/supabase/client';
import type { AIModel } from '@/store/useKreatorStore';

interface AICallOptions {
  action: string;
  messages: { role: string; content: string }[];
  system_prompt?: string;
  model?: string;
  image_base64s?: string[];
}

export async function callKreatorAI(options: AICallOptions) {
  const { data, error } = await supabase.functions.invoke('kreator-ai', {
    body: options,
  });

  if (error) throw error;
  return data;
}

export async function generateIdeas(
  activity: string,
  sector: string,
  contentType: string,
  objective: string,
  productService?: string,
  market?: string
) {
  const systemPrompt = `Tu es un expert en marketing digital viral. Génère exactement 3 idées de contenu PERSUASIVES, IMPACTANTES, ENGAGEANTES qui suscitent immédiatement l'intérêt et le partage.

RÈGLE ABSOLUE — HOOK 0-2 SECONDES (NON NÉGOCIABLE) :
Chaque idée DOIT s'ouvrir sur un hook ULTRA PUISSANT et PERSUASIF capable de capter l'attention dans les 2 PREMIÈRES SECONDES, quel que soit le type de contenu (image, carrousel, vidéo).
Le hook doit être : émotionnel, intrigant, choquant ou provoquant une curiosité irrésistible (ex : "Personne ne te dit ça…", "Arrête tout de suite si tu fais ça", "J'ai perdu X à cause de ça", "90% se trompent ici", "Le secret que personne ne révèle…").
Aucune idée molle, descriptive ou générique n'est acceptée. Le scroll-stop est PRIORITAIRE sur tout. La description doit expliciter le hook d'ouverture.

RÈGLE — MARCHÉ / LOCALISATION :
${market ? `Le marché cible est "${market}". Adapter les références culturelles, le vocabulaire, les codes sociaux, les habitudes de consommation, les personnages évoqués et l'environnement à ce marché.` : `Aucun marché précisé : rester culturellement neutre et universel, éviter toute référence ethnique, géographique ou culturelle marquée. Personnages et environnements doivent rester cohérents et plausibles sans imposer une origine spécifique.`}

Chaque idée doit avoir un angle viral fort (curiosité, émotion, controverse douce, transformation, preuve sociale, urgence) aligné sur l'objectif.
RETOURNE UNIQUEMENT un JSON valide sans markdown:
{"ideas":[{"id":1,"title":"hook punchy max 30 chars avec emoji","angle":"Éducatif|Storytelling|Engagement|Preuve sociale|Urgence|Curiosité","description":"max 80 chars — hook 0-2s + pourquoi ça scroll-stop"},{"id":2,...},{"id":3,...}]}`;

  const userPrompt = `=== CONTEXTE ENTREPRISE ===
${activity ? `Activité principale: ${activity}` : ''}
${sector ? `Secteur: ${sector}` : ''}
${productService ? `Produit ou service à mettre en avant: ${productService}` : ''}
${market ? `Marché / Localisation: ${market}` : 'Marché: non précisé (rester neutre)'}

=== CONTENU ===
Type de contenu: ${contentType}
${objective ? `Objectif du contenu (PRIORITAIRE): ${objective}` : ''}

Génère 3 idées virales, persuasives, impactantes et engageantes qui suscitent l'intérêt immédiat. Fusionne TOUS ces éléments dans chaque idée.`;

  const data = await callKreatorAI({
    action: 'generate_ideas',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export async function generatePersonas(params: {
  activity: string;
  sector: string;
  offerType: string;
}) {
  const systemPrompt = `Tu es un expert en marketing et personas client. Génère exactement 3 profils de persona ULTRA pertinents pour le contexte fourni.

RETOURNE UNIQUEMENT un JSON valide sans markdown, exactement ce format :
{"personas":[{"id":1,"profil":"Nom + âge + situation courte (ex: Marie, 34 ans, maman active)","contexte_rapide":"1 phrase sur son contexte de vie / pro","csp":"CSP+ / CSP / employé / étudiant / retraité / dirigeant…","probleme":"problème principal qu'il/elle rencontre","objectif":"objectif principal qu'il/elle cherche à atteindre"},{"id":2,...},{"id":3,...}]}

Les 3 personas doivent être DIFFÉRENTS (âges, situations, motivations différentes) mais tous cohérents avec l'activité, le secteur et le type d'offre.`;

  const userPrompt = `Activité principale: ${params.activity}
Secteur d'activité: ${params.sector || 'non précisé'}
Type d'offre: ${params.offerType}

Génère 3 personas clients cibles parfaitement adaptés.`;

  const data = await callKreatorAI({
    action: 'generate_personas',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export async function describeImage(imageBase64: string) {
  const systemPrompt = `Tu es un expert en analyse visuelle. Décris l'image fournie de façon claire, factuelle et concise en 3 phrases MAXIMUM (jamais plus). Concentre-toi sur le sujet principal, le contexte/ambiance et les détails marquants. Réponds uniquement avec la description, sans introduction ni mise en forme.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: 'Décris cette image en 3 phrases maximum.' }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  return content.trim();
}

export async function describeImageShort(imageBase64: string) {
  const systemPrompt = `Tu es un expert en analyse visuelle. Décris l'image fournie en UNE SEULE phrase TRÈS COURTE de 7 MOTS MAXIMUM (jamais plus). Sans ponctuation finale, sans introduction, sans guillemets. Réponds uniquement avec la description courte.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: 'Décris cette image en 7 mots maximum.' }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  // Hard trim to 7 words
  const words = content.trim().replace(/[."']+$/g, '').split(/\s+/);
  return words.slice(0, 7).join(' ');
}

export async function describeProductImages(imageBase64s: string[]) {
  const systemPrompt = `Tu es un expert en analyse visuelle de produits.
On te fournit ${imageBase64s.length} images de produits ou services.
1. Détermine s'il s'agit du MÊME produit/service vu sous différents angles, OU de produits/services DIFFÉRENTS.
2. Si IDENTIQUE : décris le produit en UNE seule phrase factuelle (max 20 mots).
3. Si DIFFÉRENTS : décris brièvement la gamme/ensemble en UNE seule phrase factuelle (max 25 mots), en mentionnant qu'il s'agit de plusieurs produits.
Réponds UNIQUEMENT avec la phrase finale, sans préfixe, sans guillemets, sans ponctuation finale superflue.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: imageBase64s,
    messages: [{ role: 'user', content: `Analyse ces ${imageBase64s.length} images et donne UNE phrase de description globale.` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  return content.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ');
}

export async function detectSectorFromImage(imageBase64: string, sectors: string[]) {
  const list = sectors.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const systemPrompt = `Tu es un expert en classification marketing. Analyse l'image fournie et choisis LE SECTEUR le plus pertinent dans la liste exacte ci-dessous. Réponds UNIQUEMENT avec le libellé exact du secteur choisi (copie-colle exact, emoji inclus), sans aucune autre phrase, sans guillemets.\n\nListe des secteurs autorisés :\n${list}`;
  const data = await callKreatorAI({
    action: 'detect_sector',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: 'Quel secteur correspond le mieux à ce produit ?' }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  const raw = content.trim().replace(/^["'`]+|["'`.]+$/g, '');
  const match = sectors.find((s) => s === raw)
    || sectors.find((s) => raw.includes(s))
    || sectors.find((s) => s.toLowerCase().includes(raw.toLowerCase()));
  return match || raw;
}

export async function detectSectorFromActivity(activity: string, sectors: string[]) {
  const list = sectors.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const systemPrompt = `Tu es un expert en classification marketing. À partir de l'activité principale d'une entreprise, choisis LE SECTEUR le plus pertinent dans la liste exacte ci-dessous. Réponds UNIQUEMENT avec le libellé exact du secteur choisi (copie-colle exact, emoji inclus), sans aucune autre phrase, sans guillemets.\n\nListe des secteurs autorisés :\n${list}`;
  const data = await callKreatorAI({
    action: 'detect_sector_from_activity',
    messages: [{ role: 'user', content: `Activité principale : ${activity}` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  const raw = content.trim().replace(/^["'`]+|["'`.]+$/g, '');
  const match = sectors.find((s) => s === raw)
    || sectors.find((s) => raw.includes(s))
    || sectors.find((s) => s.toLowerCase().includes(raw.toLowerCase()));
  return match || raw;
}

export async function detectOfferTypeFromDescription(description: string, offerTypes: string[]) {
  const list = offerTypes.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const systemPrompt = `Tu es un expert en classification d'offres commerciales. À partir de la description fournie, choisis LE TYPE D'OFFRE le plus pertinent dans la liste exacte ci-dessous. Réponds UNIQUEMENT avec le libellé exact (copie-colle exact, emoji inclus), sans autre phrase, sans guillemets.\n\nListe des types autorisés :\n${list}`;
  const data = await callKreatorAI({
    action: 'detect_offer_type',
    messages: [{ role: 'user', content: `Description : ${description}` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  const raw = content.trim().replace(/^["'`]+|["'`.]+$/g, '');
  const match = offerTypes.find((s) => s === raw)
    || offerTypes.find((s) => raw.includes(s))
    || offerTypes.find((s) => s.toLowerCase().includes(raw.toLowerCase()));
  return match || raw;
}

export async function summarizePerformingPosts(descriptions: string[]) {
  const systemPrompt = `Tu es un expert en marketing digital, copywriting et viralité sur les réseaux sociaux. À partir des descriptions de posts qui ont performé fournies, produis UN résumé synthétique (5 phrases maximum) orienté business, viralité, efficacité de conversion et différenciation, avec un angle marketing fort. Mets en avant les leviers communs (hook, format, ton, preuve, émotion, call-to-action) qui expliquent la performance et qu'il faut réutiliser. Réponds uniquement avec le résumé, sans titre ni mise en forme.`;
  const userContent = descriptions
    .map((d, i) => `Post performant ${i + 1} : ${d}`)
    .join('\n\n');
  const data = await callKreatorAI({
    action: 'summarize_performing_posts',
    messages: [{ role: 'user', content: userContent }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  return content.trim();
}

export async function generateIdeaFromImages(params: {
  imageDescriptions: string[];
  imageBase64s: string[];
  contentType: string;
  objective: string;
  format: string;
  activity: string;
  sector: string;
  productService?: string;
  productDescription?: string;
  market?: string;
  ton?: string;
  visualStyle?: string;
}) {
  const imageCount = params.imageBase64s.length;
  const systemPrompt = `Tu es un expert en marketing digital et création de contenu visuel.
Analyse visuellement les ${imageCount} image(s) de référence fournies et génère UNE idée de contenu unique, créative et engageante.

RÈGLES OBLIGATOIRES — L'idée générée DOIT prendre en compte et fusionner de façon cohérente :
1. L'ANALYSE VISUELLE DES IMAGES DE RÉFÉRENCE : éléments visuels, ambiance, couleurs, objets, personnes, contexte — ANALYSE les images directement
2. L'OBJECTIF DU CONTENU (PRIORITAIRE) : l'idée doit directement servir cet objectif (vendre, engager, éduquer, inspirer…)
3. L'ACTIVITÉ PRINCIPALE de l'entreprise : adapter l'idée au métier et au contexte professionnel
4. LE SECTEUR D'ACTIVITÉ : utiliser les codes et le vocabulaire du secteur
5. Le TYPE et FORMAT de contenu : adapter l'idée au support (image, carrousel, vidéo)
6. Le TON et STYLE VISUEL si renseignés

Tous ces éléments forment un CONTEXTE UNIFIÉ. L'idée doit être pertinente et actionnable pour l'entreprise.

RETOURNE UNIQUEMENT un JSON valide sans markdown:
{"idea":{"title":"max 30 chars avec emoji","angle":"Éducatif|Storytelling|Engagement|Preuve sociale|Urgence","description":"max 80 chars décrivant l'idée en détail"}}`;

  const contextText = `=== CONTEXTE ENTREPRISE ===
${params.activity ? `Activité principale: ${params.activity}` : 'Activité: non renseignée'}
${params.sector ? `Secteur d'activité: ${params.sector}` : 'Secteur: non renseigné'}
${params.productService ? `Produit ou service à mettre en avant: ${params.productService}` : ''}
${params.market ? `Marché / Localisation: ${params.market} (adapter personnages, environnement et codes culturels à ce marché)` : 'Marché: non précisé (rester culturellement neutre et universel)'}

=== CONTENU ===
Type de contenu: ${params.contentType}
Format: ${params.format}
${params.objective ? `Objectif du contenu (PRIORITAIRE): ${params.objective}` : 'Objectif: non renseigné'}
${params.ton ? `Ton: ${params.ton}` : ''}
${params.visualStyle ? `Style visuel: ${params.visualStyle}` : ''}
${params.imageDescriptions.some(d => d) ? `\n=== DESCRIPTIONS FOURNIES ===\n${params.imageDescriptions.map((d, i) => d ? `Image ${i + 1}: ${d}` : '').filter(Boolean).join('\n')}` : ''}

Analyse visuellement les images de référence et génère une idée originale cohérente avec le contexte.`;

  const data = await callKreatorAI({
    action: 'generate_idea_from_images',
    image_base64s: params.imageBase64s,
    messages: [{ role: 'user', content: contextText }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export async function generatePrompt(params: {
  contentType: string;
  format: string;
  objective: string;
  ton: string;
  visualStyle: string;
  inputText: string;
  ideaChosen: string;
  companyActivity: string;
  companySector: string;
  productService?: string;
  productDescription?: string;
  market?: string;
  offerType?: string;
  targetPersona?: string;
  marketingAngle?: string;
  showText: boolean;
  textContent: string;
  paletteEnabled: boolean;
  paletteHex: string[];
  imageDescription: string;
  referenceImageCount?: number;
  aiModel?: string;
  renderStyle?: string;
  videoRenderStyle?: string;
  // Logo + text positioning + font + color
  logoEnabled?: boolean;
  logoUrl?: string;
  logoPosition?: 'bottom-center' | 'bottom-right' | 'top-left' | 'top-right';
  textPosition?: 'top-center' | 'middle-center' | 'bottom-center';
  textFont?: string;
  textColor?: string;
  voiceOverText?: string;
  videoDurationSec?: number;
}) {
  const formatLabel = params.format === '1:1' ? 'carré (1:1)' : params.format === '16:9' ? 'horizontal large (16:9)' : 'vertical plein écran (9:16)';
  
  const aiModelName = params.aiModel || 'dall-e-3';
  let formatAdaptation = '';
  if (['imagen-4', 'imagen-4-ultra', 'imagen-4-fast'].includes(aiModelName)) {
    formatAdaptation = `Modèle IA: ${aiModelName} — Préciser explicitement "aspect ratio ${params.format}" dans le prompt FR.`;
  } else if (aiModelName === 'dall-e-3') {
    const dalleFormat = params.format === '1:1' ? 'image carrée' : params.format === '16:9' ? 'cadre cinématographique large' : 'format vertical mobile';
    formatAdaptation = `Modèle IA: DALL·E 3 — Intégrer "${dalleFormat}" dans la description du prompt FR.`;
  } else if (['veo-2', 'veo-3', 'veo-3-fast'].includes(aiModelName)) {
    const veoFormat = params.format === '9:16' ? 'vidéo verticale 9:16' : params.format === '16:9' ? 'vidéo horizontale 16:9' : 'vidéo carrée 1:1';
    formatAdaptation = `Modèle IA: ${aiModelName} — Préciser "${veoFormat}" et optimiser le cadrage pour ce ratio.`;
  } else if (aiModelName === 'sora-2') {
    formatAdaptation = `Modèle IA: Sora 2 — Préciser "aspect ratio ${params.format}" et adapter le type de framing.`;
  } else if (['nano-banana-2', 'nano-banana-pro'].includes(aiModelName)) {
    const nanoFormat = params.format === '1:1' ? 'image carrée parfaite (1:1)' : params.format === '16:9' ? 'image horizontale large (16:9)' : 'image verticale plein écran mobile (9:16)';
    formatAdaptation = `Modèle IA: ${aiModelName === 'nano-banana-pro' ? 'Nano Banana Pro' : 'Nano Banana 2'} — OBLIGATION ABSOLUE : le visuel généré DOIT être au format ${params.format} (${nanoFormat}). Inclure IMPÉRATIVEMENT l'instruction "Generate this image in ${params.format} aspect ratio" dans le prompt anglais ET "Générer cette image au format ${params.format}" dans le prompt français. Le ratio ${params.format} doit être mentionné au DÉBUT et à la FIN du prompt pour forcer le modèle à le respecter.`;
  }

  const contentTypeAdaptation = params.contentType === 'video'
    ? `Pour la vidéo : TOUJOURS respecter le ratio ${params.format}, cadrage optimisé pour mobile si 9:16, sujet centré et lisible.`
    : params.contentType === 'carousel'
      ? `Pour le carrousel : adapter la composition au ratio (centrage, marges, lisibilité), cohérence visuelle parfaite entre slides, optimiser pour affichage plateforme.`
      : `Pour l'image : adapter la composition au ratio (centrage, marges, lisibilité), optimiser pour affichage plateforme.`;

  // Video-specific directives
  const videoDirectives = params.contentType === 'video' ? `

CONSIGNES VIDÉO OBLIGATOIRES :
🎬 Logique de création (niveau production) :
- Micro-vidéo ultra impactante (6–8 secondes)
- Émotion naturelle, réalisme élevé, rythme rapide, message clair + CTA
- 2 à 3 plans MAX (pas plus), chaque plan = 2–3 secondes
- 1 idée forte par vidéo
- Continuité visuelle parfaite (lumière, sujet, couleurs)
- Mouvement de caméra subtil mais professionnel

🎥 Structure du script (obligatoire) :
Plan 1 (Hook – 0-2s) : Attirer l'attention immédiatement, mouvement léger caméra, déclencheur émotionnel ou curiosité
Plan 2 (Value – 2-5s) : Montrer usage / bénéfice, interaction humaine ou contexte réel, montée émotionnelle
Plan 3 (Impact + CTA – 5-8s) : Image forte / résultat, texte court, call to action

🎧 Direction sonore :
- Bruitages réalistes (pas exagérés)
- Musique cohérente avec l'émotion (douce → lifestyle, épique → premium, rythmée → pub)
- Voix off optionnelle : naturelle, humaine, courte, max 1 phrase

🎥 Mouvements caméra pro :
- Travelling lent (cinéma), zoom léger (focus émotion), handheld subtil (UGC réaliste)
- Slow motion léger (premium), rack focus (focus dynamique)

✨ Effets visuels (réalisme avant tout) :
- Lumière naturelle cohérente, profondeur de champ, motion blur léger
- Reflets réalistes, aucun effet "fake IA"

🧠 Niveau expert :
- Micro-expressions humaines = + engagement
- Imperfections réalistes = + crédibilité
- Rythme rapide mais fluide = + rétention
- 1 message = + conversion

${params.videoRenderStyle ? `TYPE DE RENDU VIDÉO SÉLECTIONNÉ : "${params.videoRenderStyle}" — Adapter TOUTE la direction artistique, l'ambiance, le cadrage et le style de montage à ce rendu vidéo.` : ''}
${params.voiceOverText ? `\n🎙️ VOIX OFF (OBLIGATOIRE — À INTÉGRER DANS LA VIDÉO) :\nLe texte de voix off à dire EXACTEMENT (mot pour mot, sans modification) est : "${params.voiceOverText}".\nVoix naturelle, humaine, cohérente avec le ton et le marché.\nLa voix off doit IMPÉRATIVEMENT se terminer au moins 2 secondes AVANT la fin de la vidéo${params.videoDurationSec ? ` (durée totale ${params.videoDurationSec}s — voix off ≤ ${Math.max(1, params.videoDurationSec - 2)}s)` : ''}. Aucun mot ne doit être prononcé dans les 2 dernières secondes.` : ''}
` : '';

  // Determine the active render style
  const activeRenderStyle = params.contentType === 'video' ? params.videoRenderStyle : params.renderStyle;

  const systemPrompt = `Tu es un expert en création de prompts pour la génération d'images et vidéos par IA.

Génère un prompt FR de 300 à 350 mots.

RÈGLE ABSOLUE — FORMAT / RATIO :
Tu DOIS STRICTEMENT respecter le format ${params.format} (${formatLabel}).
- Si FORMAT = "1:1" → visuel carré parfaitement centré
- Si FORMAT = "16:9" → visuel horizontal large
- Si FORMAT = "9:16" → visuel vertical plein écran, optimisé mobile

Le ratio ${params.format} est PRIORITAIRE sur tout le reste. Aucune génération ne doit ignorer ce paramètre.
Adapter la composition, le cadrage et le framing à ce ratio. Éviter tout élément coupé ou hors zone visible.
${contentTypeAdaptation}
${formatAdaptation}
Préciser explicitement "aspect ratio ${params.format}" dans le prompt français généré pour que l'image ou visuel produit respecte systématiquement le ratio.

RÈGLES PLATEFORMES :
- TikTok : images et carrousels → FORMAT = "9:16", vidéos → FORMAT = "16:9"
- Instagram : posts images et carrousels → FORMAT = "1:1", stories → FORMAT = "1:1", vidéos → FORMAT = "9:16"

CONTEXTE COMMUN OBLIGATOIRE — Tu DOIS intégrer TOUTES les informations suivantes dans le prompt généré si elles sont fournies :
1. ACTIVITÉ DE L'ENTREPRISE et SECTEUR D'ACTIVITÉ : adapter le vocabulaire, l'ambiance, les décors et les éléments visuels au domaine métier
2. TYPE DE CONTENU : adapter le format et la structure du prompt (image, carrousel, vidéo)
3. OBJECTIF DU CONTENU (TRÈS IMPORTANT) : c'est le fil conducteur principal, tout le prompt doit servir cet objectif
4. TYPE DE RENDU${params.contentType === 'video' ? ' VIDÉO' : ''} : définit l'ambiance visuelle et le style de mise en scène du contenu. Adapter le prompt pour refléter fidèlement ce rendu
5. ANALYSE DES IMAGES DE RÉFÉRENCE (OBLIGATOIRE SI PRÉSENTES) : les images doivent TOUJOURS être analysées et intégrées de façon cohérente avec l'objectif et l'idée
6. IDÉE DÉCRITE ou IDÉE CHOISIE : le sujet central du visuel, à respecter fidèlement
7. RÉGLAGES AVANCÉS (ton, style visuel, texte overlay, palette) : appliquer systématiquement s'ils sont actifs

Tous ces éléments forment un CONTEXTE UNIFIÉ et COHÉRENT. Ne pas les traiter séparément mais les fusionner en un prompt fluide et naturel.

CONSIGNES OBLIGATOIRES pour le prompt généré :
- Ultra HD, photo hyper réaliste et professionnel, indistinguable d'une vraie photo prise par un photographe professionnel
- Rendu ULTRA RÉALISTE, on ne doit JAMAIS deviner que c'est une image générée par IA
- Grain de peau naturel, reflets naturels dans les yeux, imperfections subtiles, texture des matériaux authentique
- Éclairage naturel et cinématographique, ombres douces et réalistes
- Optimisé pour les réseaux sociaux (Instagram, TikTok, LinkedIn, Facebook)
- NE JAMAIS inclure de texte, lettres, mots ou typographie DANS l'image générée SAUF si l'utilisateur a explicitement demandé du texte overlay ou si l'image de base en contenait
- Si du texte overlay est demandé : typographie parfaitement lisible, stylisée et professionnelle
- Éviter absolument les éléments flous, déformés, artificiels ou « plastiques »
- Respecter les codes couleurs et le style de la marque si fournis
- Pour les carrousels : cohérence visuelle parfaite entre slides (même palette, même style, même ambiance, même éclairage). La PREMIÈRE slide DOIT être un hook visuel scroll-stop.
- Préciser l'éclairage, l'angle de caméra, la profondeur de champ, le bokeh et l'ambiance
- Le prompt doit être directement utilisable par un modèle de génération d'image IA

RÈGLE ABSOLUE — HOOK VISUEL 0-2 SECONDES (NON NÉGOCIABLE, TOUS TYPES DE CONTENU) :
Le visuel généré DOIT fonctionner comme un SCROLL-STOPPER capable de capter l'attention dans les 2 PREMIÈRES SECONDES. Quel que soit le type (image, carrousel, vidéo) :
- Composition à fort impact visuel immédiat (contraste élevé, sujet dominant, regard direct, expression émotionnelle marquée, geste ou action en cours)
- Élément intrigant, inattendu, émotionnel ou provocateur dès le premier coup d'œil
- Aucune image plate, descriptive ou neutre — TOUJOURS chercher la tension visuelle, l'émotion ou la curiosité
- Pour les vidéos : la frame d'ouverture (0-2s) DOIT être le hook le plus puissant de toute la séquence
- Pour les carrousels : la slide 1 DOIT contenir le hook visuel le plus fort
- Aligner le hook visuel avec l'objectif marketing (vente, notoriété, engagement…)
- Le hook doit TOUJOURS être COHÉRENT avec le produit/service mis en avant : pas de promesse visuelle qui contredit l'offre réelle.
Cette règle est PRIORITAIRE et ne doit JAMAIS être ignorée.

RÈGLE ABSOLUE — COHÉRENCE PRODUIT / OFFRE / VISUEL (NON NÉGOCIABLE) :
Le visuel généré DOIT être STRICTEMENT cohérent avec l'idée, la description et l'offre réelle du produit/service. Aucune invention contradictoire n'est tolérée.
- INTERDIT d'inventer un nom de marque, d'enseigne, de boulangerie, de restaurant, de boutique, de société, de logo ou de slogan qui n'a PAS été explicitement fourni par l'utilisateur. Aucune pancarte, étiquette, devanture ou packaging avec un nom inventé.
- INTERDIT d'afficher un PRIX, une QUANTITÉ, un POURCENTAGE, une PROMOTION ou une UNITÉ qui contredit l'offre décrite. Si l'idée dit "6 croissants à 5€", le visuel doit montrer EXACTEMENT 6 croissants ET le prix "5€" (et jamais "3€" ou "1 croissant"). Les chiffres affichés DOIVENT correspondre au texte exact de l'offre.
- INTERDIT d'ajouter des éléments décoratifs (objets, accessoires, décors, personnages, contextes) qui n'ont aucun rapport avec le produit/service ou qui détournent l'attention de l'offre.
- INTERDIT d'inventer des certifications, labels, mentions ("bio", "fait maison", "levain naturel", "artisanal", "100%", etc.) si elles ne sont pas explicitement présentes dans la description ou le produit/service.
- Si un détail n'est PAS précisé par l'utilisateur, rester NEUTRE et SOBRE plutôt que d'inventer. Pas de pancarte, pas de logo, pas de texte parasite — sauf overlay explicitement demandé.
- Le sujet principal du visuel = le produit/service exact. Tous les éléments secondaires doivent renforcer ce sujet, jamais le contredire.
- Subtilité et intelligence : suggérer plutôt qu'envahir. Un visuel pro ne sur-charge pas, il met en valeur l'offre avec justesse.
- Si du texte overlay est demandé : reproduire EXACTEMENT le texte fourni par l'utilisateur, sans rien ajouter, sans rien modifier (ni chiffres, ni mots, ni unités).
Toute incohérence entre l'offre décrite et le visuel généré est une ERREUR CRITIQUE à éviter absolument.

RÈGLE ABSOLUE — MARCHÉ / LOCALISATION / CASTING (NON NÉGOCIABLE) :
${params.market ? `Le marché cible est "${params.market}". Les personnages générés (ethnies, traits, tenues, coiffures), l'environnement (architecture, mobilier urbain, signalétique, végétation, climat), les accessoires et les codes culturels DOIVENT être cohérents avec ce marché. Pas de mélange incohérent (ex : ne pas mettre un décor scandinave pour un marché Africain).` : `Aucun marché précisé : par défaut, choisir des personnages et un environnement CULTURELLEMENT NEUTRES, plausibles et universels. NE PAS imposer une ethnie, une nationalité ou un décor culturellement marqué de façon arbitraire. Privilégier des cadres sobres, neutres, sans signalétique étrangère ni références ethniques fortes, pour rester cohérent quel que soit le marché du business.`}
Cette règle est PRIORITAIRE sur les choix esthétiques et ne doit JAMAIS être ignorée.
${videoDirectives}
RETOURNE UNIQUEMENT un JSON valide sans markdown:
{"prompt_fr":"...","palette_used":["#HEX"],"marketing_angle":"..."}`;

  const userPrompt = `=== CONTEXTE ENTREPRISE ===
${params.companyActivity ? `Activité principale: ${params.companyActivity}` : 'Activité: non renseignée'}
${params.companySector ? `Secteur d'activité: ${params.companySector}` : 'Secteur: non renseigné'}
${params.productService ? `Produit ou service mis en avant (RÉFÉRENCE EXACTE pour la cohérence visuelle): ${params.productService}` : ''}
${params.productDescription ? `Description détaillée de l'offre: ${params.productDescription}` : ''}
${params.offerType ? `Type d'offre: ${params.offerType}` : ''}
${params.targetPersona ? `Client cible / Persona: ${params.targetPersona} — adapter le casting, l'environnement, le ton visuel et l'ambiance pour parler DIRECTEMENT à ce profil.` : ''}
${params.marketingAngle ? `Angle marketing (PRIORITAIRE — fil conducteur du visuel): ${params.marketingAngle}` : ''}
${params.market ? `Marché / Localisation cible: ${params.market} (adapter casting, environnement et codes culturels en conséquence)` : 'Marché / Localisation: non précisé (rester culturellement neutre, casting et décor universels)'}

=== CONTENU ===
Type de contenu: ${params.contentType}
Format: ${params.format}
${params.objective ? `Objectif du contenu (PRIORITAIRE): ${params.objective}` : 'Objectif: non renseigné'}
${activeRenderStyle ? `Type de rendu${params.contentType === 'video' ? ' vidéo' : ''}: ${activeRenderStyle}` : 'Type de rendu: automatique'}

=== IDÉE (SOURCE DE VÉRITÉ — NE RIEN INVENTER AU-DELÀ) ===
${params.inputText ? `Idée décrite: "${params.inputText}"` : ''}
${params.ideaChosen ? `Idée choisie: "${params.ideaChosen}"` : ''}
${!params.inputText && !params.ideaChosen ? 'Aucune idée spécifique — proposer un concept cohérent avec le contexte' : ''}
RAPPEL CRITIQUE : tous les chiffres, prix, quantités, noms et mentions visibles dans le visuel DOIVENT correspondre EXACTEMENT à cette idée et au produit/service ci-dessus. Aucune invention de marque, d'enseigne, de prix ou de promesse non mentionnée.

=== IMAGES DE RÉFÉRENCE ===
${params.imageDescription ? `Analyse (${params.referenceImageCount || 1} image(s)): ${params.imageDescription}` : 'Aucune image de référence'}
${params.referenceImageCount && params.referenceImageCount > 1 ? `IMPORTANT: ${params.referenceImageCount} images fournies — analyser et fusionner les éléments visuels communs pour un rendu cohérent et harmonieux.` : ''}

=== RÉGLAGES AVANCÉS ===
${params.ton ? `Ton: ${params.ton}` : 'Ton: automatique'}
${params.visualStyle ? `Style visuel: ${params.visualStyle}` : 'Style: automatique'}
${params.showText
  ? `Texte overlay (À REPRODUIRE EXACTEMENT, MOT POUR MOT, AUCUNE MODIFICATION NI AJOUT): "${params.textContent}"
Position du texte: ${
        params.textPosition === 'top-center' ? 'centré en haut'
      : params.textPosition === 'middle-center' ? 'centré au centre'
      : 'centré en bas'
    } — respecter STRICTEMENT cette position et ce nombre de lignes.
Police d'écriture: "${params.textFont || 'Montserrat'}" — utiliser cette typographie (ou la plus proche visuellement disponible), bien lisible, kerning soigné.
${params.contentType === 'video' && params.textColor ? `Couleur du texte: ${params.textColor} — appliquer EXACTEMENT cette couleur au texte affiché à l'écran (avec contour ou ombre subtile pour la lisibilité si nécessaire).` : ''}`
  : 'Pas de texte overlay — NE PAS générer de texte, pancarte, étiquette, logo ou enseigne dans l\'image'}
${params.logoEnabled && params.logoUrl
  ? `Logo de marque: présent dans le visuel, intégré ${params.logoPosition === 'bottom-right' ? 'en bas à droite' : params.logoPosition === 'top-left' ? 'en haut à gauche' : params.logoPosition === 'top-right' ? 'en haut à droite' : 'en bas au centre'}, taille discrète et professionnelle, parfaitement lisible, sans déformation, ne couvrant pas le sujet principal. Référence du logo fourni par l'utilisateur: ${params.logoUrl}`
  : 'Pas de logo à intégrer'}
${params.paletteEnabled ? `Palette de couleurs active: ${params.paletteHex.join(', ')} — utiliser entre 30% et 50% dans le visuel` : 'Palette automatique'}

Génère un prompt unifié, cohérent et fidèle à l'offre. Sobriété et précision priment sur la décoration.`;

  const data = await callKreatorAI({
    action: 'generate_prompt',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export interface PlatformCaptions {
  facebook: { hook: string; description: string; cta: string; hashtags: string };
  instagram: { hook: string; description: string; cta: string; hashtags: string };
  tiktok: { hook: string; description: string; cta: string; hashtags: string };
  linkedin: { hook: string; description: string; cta: string; hashtags: string };
}

export async function generateCaption(params: {
  objective: string;
  idea: string;
  contentType: string;
  sector: string;
  activity: string;
}): Promise<PlatformCaptions> {
  const isVideo = params.contentType === 'video';
  const isCarousel = params.contentType === 'carousel';
  const contentLabel = isVideo ? 'vidéo' : isCarousel ? 'carrousel' : 'image';

  const systemPrompt = `Tu es un expert mondial en copywriting marketing, psychologie de conversion et algorithmes des réseaux sociaux en 2026.

Tu génères des captions PARFAITES qui convertissent sans friction, optimisées pour les algorithmes 2026 et la psychologie scroll-rapide des utilisateurs.
Type de contenu actuel : ${contentLabel}.

CONTEXTE PSYCHOLOGIQUE 2026 (à intégrer implicitement) :
- Les utilisateurs scrollent 80% plus vite : hook avant la 3ème seconde OBLIGATOIRE.
- Micro-dopamine constante (stopping power à chaque ligne).
- Aversion absolue au discours corporatif → parle comme un ami, pas comme une marque.
- FOMO temporel actif mais subtil (jamais crasseux).
- Parasocial : ton authentique, vulnérable, jamais "vendeur".
- Pattern interruption = engagement maximal (sois contrarian / inattendu).
- Social proof passif : montre, ne dis pas.

ALGORITHMES 2026 — PRIORITÉS PAR RÉSEAU :
- Facebook : CTR + temps passé + commentaires (favorise débat civil).
- Instagram : sauvegardes + partages + ratio like/comment haut (valeur perçue).
- TikTok : watch time complet + replays + shares (watch time > tout).
- LinkedIn : engagement authentique + conversations + reprises (B2B trust, vulnerability builds authority).

LEVIERS PSYCHOLOGIQUES À ACTIVER (minimum 2-3 par caption, choisis les plus pertinents) :
✅ Curiosity gap (révélation partielle : "Voici ce que personne ne te dit")
✅ Spécificité chiffrée (92% > "beaucoup", "12h/semaine" > "du temps")
✅ Validation sociale passive ("X personnes ont…")
✅ Urgence douce (aujourd'hui, cette semaine, limited)
✅ Pertinence personnelle / pattern match ("tu fais ça ?")
✅ Autorité implicite ("j'ai testé 6 mois", "j'ai découvert que…")
✅ Confession personnelle ("J'aurais aimé savoir…")
✅ Contrarian statement ("Arrête de faire ça")
✅ Contraste émotionnel (avant/après feeling)
✅ Réciprocité ("je partage gratuitement…")

──────────────────────────────────────────────
STRUCTURE PAR RÉSEAU (RESPECT STRICT)
──────────────────────────────────────────────

📘 FACEBOOK ${isVideo ? '🎥 Vidéo' : (isCarousel ? '🖼️ Carrousel' : '🖼️ Image')}
• Longueur : 30-50 mots (optimal ~35-40).
• Hook : émotionnel ou contrarian, 1 seule ligne, pattern match immédiat.
  Modèles : "Personne ne te le dit, mais…", "Tu perds X% ici", "L'erreur que 92% font…", "Tu fais ça aussi ?"
• Description : contexte personnel court OU stat ultra-concrète (2-3 lignes max), spécificité chiffrée + autorité implicite.
• CTA : QUESTION conversationnelle (pas de commande). Ex : "Ton avis ?", "Tu fais ça aussi ?", "Tu es d'accord ?"
• Hashtags : 3-5, focus niche + activité (#${'entrepreneurship'} #${'businesstips'} type).

📸 INSTAGRAM ${isVideo ? '🎬 Reels' : (isCarousel ? '🖼️ Carrousel' : '🖼️ Image')}
• Longueur : ${isVideo ? '30-50 mots (optimal ~35)' : '30-50 mots (optimal ~40)'}.
• Hook : storytelling / regret / confession qui fait vibrer émotionnellement (parasocial).
  Modèles : "J'aurais aimé savoir ça avant de…", "Si tu fais ça, arrête…", "Voici pourquoi tu galères…"
• Description : ${isVideo ? 'promesse courte de la vidéo + curiosity gap.' : 'mini-storytelling + valeur en listes scannables (puces/sauts de ligne), spécificités chiffrées, lisibilité mobile.'}
• CTA : engagement parasocial, jamais vente directe. Ex : "Tu en penses quoi ?", "Tu testes quand ?", "Tu veux la suite ?"
• Hashtags : 5-10, mix 40% niche + 30% mid-tier + 30% viral général.

🎵 TIKTOK 🎥 (${isVideo ? 'Vidéo' : contentLabel})
• Longueur : 50-150 caractères (optimal ~80).
• Hook : ULTRA punchy, ton impératif/contrarian, arrête le scroll ou l'algo te tue.
  Modèles : "Arrête de faire ça si tu veux gagner", "Tu perds X€ ici", "Personne ne t'explique ça"
• Description : 1-2 lignes max, chiffre spécifique = credibility burst, ou zéro si la vidéo montre déjà.
• CTA : ultra court, format question pattern match. Ex : "Tu savais ?", "Tu valides ?", "Tu fais ça ?"
• Hashtags : 3-6 : 30% niche + 50% viral (#fyp #foryoupage #viral #trending) + 20% trending.

💼 LINKEDIN ${isVideo ? '🎥 Vidéo' : (isCarousel ? '🖼️ Carrousel' : '🖼️ Image')}
• Longueur : ${isVideo ? '600-1200 caractères (optimal ~900) — caption longue, structurée, B2B' : '50-70 mots (optimal ~60)'}.
• Hook : insight business non-évident OU vulnerability ("J'ai perdu X à cause de ça…", "90% des leaders ignorent…", "J'ai découvert que…").
• Description : ${isVideo ? 'contexte business riche, listes à puces (clarity = engagement), ROI/metrics tangibles, leçon transmise (parasocial authentic).' : 'contexte business + listes scannables (chiffres, ROI, learning), wisdom transmise.'}
• CTA : pensée conversationnelle pro. Ex : "Tu reconnais le pattern ?", "Ton expérience ?", "Tu es d'accord ?"
• Hashtags : 7-10, 70% niche pro (#startup #leadership #B2B #saas) + 30% industry trends (#growth #innovation).

──────────────────────────────────────────────
RÈGLES ABSOLUES
──────────────────────────────────────────────
1. HOOK 0-2 SECONDES : sur CHAQUE plateforme, le hook DOIT stopper le scroll dans les 2 premières secondes. Curiosité, choc, tension, identification — JAMAIS descriptif, mou ou générique.
2. SPÉCIFICITÉ : minimum 1 chiffre OU 1 détail ultra-concret par caption (jamais "beaucoup", "souvent", "plein").
3. AUTHENTICITÉ : zéro jargon corporate, parle humain, comme un ami. Vulnérabilité > posture.
4. SÉPARATION CTA : le CTA est dans le champ "cta" UNIQUEMENT, JAMAIS dans "description". La description ne se termine PAS par une question/CTA.
5. CTA : conversationnel (question), 2-6 mots, jamais commande pushy ("achète", "clique", "inscris-toi").
6. FORMAT MOBILE : sauts de ligne fréquents pour aérer (engagement +15%).
7. PSYCHOLOGIE : active 2-3 leviers par caption (cf. liste ci-dessus).
8. COHÉRENCE : aucune marque/prix/promo inventés ; tout doit matcher l'idée et l'objectif.
9. RESPECT LONGUEURS : strict, par réseau (cf. ci-dessus). Trop long = scroll, trop court = pas de valeur.
10. HASHTAGS : ratio niche/viral selon la stratégie 2026 du réseau, séparés par espaces, tous préfixés #.

RETOURNE UNIQUEMENT un JSON valide sans markdown:
{"facebook":{"hook":"...","description":"...","cta":"...","hashtags":"..."},"instagram":{"hook":"...","description":"...","cta":"...","hashtags":"..."},"tiktok":{"hook":"...","description":"...","cta":"...","hashtags":"..."},"linkedin":{"hook":"...","description":"...","cta":"...","hashtags":"..."}}`;

  const userPrompt = `Objectif: ${params.objective || 'Engagement et visibilité'}
Idée: ${params.idea || 'Contenu marketing professionnel'}
Type de contenu: ${contentLabel}
${params.sector ? `Secteur: ${params.sector}` : ''}
${params.activity ? `Activité: ${params.activity}` : ''}`;

  const data = await callKreatorAI({
    action: 'generate_caption',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export async function generateImage(
  promptEn: string,
  aiModel: AIModel = 'dall-e-3',
  format: string = '1:1',
  inputImageUrl?: string
) {
  const isKieImageModel = ['qwen/image-edit', 'ideogram/character', 'ideogram/image'].includes(aiModel);

  // === kie.ai image models — start + polling ===
  if (isKieImageModel) {
    const { data: startData, error: startError } = await supabase.functions.invoke('kreator-ai', {
      body: {
        action: 'kie_start_image',
        prompt: promptEn,
        ai_model: aiModel,
        size: format,
        input_image_url: inputImageUrl || '',
      },
    });
    if (startError) throw startError;
    if (startData?.error) throw new Error(startData.error);
    if (startData?.done && startData?.image_url) return startData.image_url;

    const taskId = startData?.task_id;
    if (!taskId) throw new Error('No task_id returned from kie.ai');

    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 4000));
      const { data: pollData, error: pollError } = await supabase.functions.invoke('kreator-ai', {
        body: { action: 'kie_poll_image', task_id: taskId },
      });
      if (pollError) { console.warn('kie.ai poll error', pollError); continue; }
      if (pollData?.error) throw new Error(pollData.error);
      if (pollData?.done && pollData?.image_url) return pollData.image_url;
    }
    throw new Error('La génération image kie.ai a pris trop de temps. Réessayez.');
  }

  // Map format to DALL-E size
  const dalleSize = format === '9:16' ? '1024x1792' : format === '16:9' ? '1792x1024' : '1024x1024';

  const { data, error } = await supabase.functions.invoke('kreator-ai', {
    body: {
      action: 'generate_image',
      prompt: promptEn,
      ai_model: aiModel,
      size: format,
      dalle_size: dalleSize,
      quality: 'hd',
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const imageUrl = data?.image_url;
  if (!imageUrl) throw new Error('No image generated');

  return imageUrl;
}

export async function generateVideo(
  promptEn: string,
  aiModel: AIModel = 'veo-3',
  format: string = '9:16',
  onProgress?: (pct: number) => void,
  abortSignal?: AbortSignal,
  modelSettings?: Record<string, any>,
  soraCharacterScenes?: { duration: number }[]
) {
  const isKieModel = [
    'veo-3', 'veo-3.1', 'kling-2.1', 'kling-2.5', 'kling-2.6', 'kling-3.0',
    'grok-imagine-i2v', 'grok-imagine-t2v',
    'bytedance/seedance-1.5-pro', 'bytedance/seedance-2',
    'sora-2-t2v', 'sora-2-i2v', 'sora-2-pro-t2v', 'sora-2-pro-i2v', 'sora-2-pro-character',
  ].includes(aiModel);

  // === kie.ai models — start + polling ===
  if (isKieModel) {
    const { data: startData, error: startError } = await supabase.functions.invoke('kreator-ai', {
      body: {
        action: 'kie_start_video',
        prompt: promptEn,
        ai_model: aiModel,
        size: format,
        model_settings: modelSettings || {},
        sora_character_scenes: soraCharacterScenes || [],
      },
    });
    if (startError) throw startError;
    if (startData?.error) throw new Error(startData.error);
    if (startData?.done && startData?.video_url) return startData.video_url;

    const taskId = startData?.task_id;
    if (!taskId) throw new Error('No task_id returned from kie.ai');

    const maxAttempts = 90;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      await new Promise((r) => setTimeout(r, 5000));
      if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      if (onProgress) onProgress(10 + Math.min(85, (attempt / maxAttempts) * 85));

      const { data: pollData, error: pollError } = await supabase.functions.invoke('kreator-ai', {
        body: { action: 'kie_poll_video', task_id: taskId, ai_model: aiModel },
      });
      if (pollError) { console.warn('kie.ai poll error', pollError); continue; }
      if (pollData?.error) throw new Error(pollData.error);
      if (pollData?.done && pollData?.video_url) {
        if (onProgress) onProgress(100);
        return pollData.video_url;
      }
    }
    throw new Error('La génération vidéo kie.ai a pris trop de temps. Réessayez.');
  }

  throw new Error(`Modèle vidéo non supporté: ${aiModel}`);
}

export async function generateVoiceOver(params: {
  offerType: string;
  productName: string;
  productDescription?: string;
  objective: string;
  marketingAngle: string;
  videoDurationSec: number;
}): Promise<string> {
  const maxSec = Math.max(1, params.videoDurationSec - 2);
  // Approx 2.5 mots/seconde en français parlé naturel
  const maxWords = Math.max(3, Math.floor(maxSec * 2.5));
  const maxChars = Math.max(20, maxSec * 15);

  const systemPrompt = `Tu es un expert en copywriting pour voix off publicitaire courte (réseaux sociaux).
Tu écris UNE voix off ULTRA percutante, naturelle, humaine, en français, qui :
- accroche dans la première seconde (hook fort)
- met en avant le bénéfice principal
- se termine par un mini call-to-action ou une chute mémorable
- s'adresse directement au spectateur (tutoiement)
- parle comme un humain, JAMAIS comme un robot ou un slogan corporate

CONTRAINTE DURÉE ABSOLUE :
La voix off DOIT pouvoir être dite en ${maxSec} secondes MAXIMUM (≈ ${maxWords} mots, ≈ ${maxChars} caractères max). C'est non-négociable : elle doit se terminer 2 secondes avant la fin de la vidéo.

Réponds UNIQUEMENT avec le texte de la voix off, sans guillemets, sans introduction, sans mise en forme, sans préfixe.`;

  const userPrompt = `Type d'offre: ${params.offerType || 'non précisé'}
Nom: ${params.productName || 'non précisé'}
${params.productDescription ? `Description: ${params.productDescription}` : ''}
Objectif de contenu: ${params.objective || 'non précisé'}
Angle marketing: ${params.marketingAngle || 'non précisé'}

Écris UNE voix off courte, percutante, dicible en ${maxSec} secondes maximum.`;

  const data = await callKreatorAI({
    action: 'generate_voice_over',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  return content.trim().replace(/^["«»"']+|["«»"']+$/g, '').trim();
}

export async function generateOnScreenText(params: {
  contentType: string;
  format: string;
  idea?: string;
  objective?: string;
  marketingAngle?: string;
  productName?: string;
  productDescription?: string;
  offerType?: string;
  visualStyle?: string;
  tone?: string;
  activity?: string;
  sector?: string;
  persona?: string;
  excludeText?: string;
  variant?: 1 | 2;
}): Promise<string> {
  const systemPrompt = `Tu es un expert en copywriting publicitaire pour réseaux sociaux (Meta, TikTok, Instagram, LinkedIn).
Tu écris UN TEXTE court à afficher À L'ÉCRAN dans un visuel (image / carrousel / vidéo) qui MAXIMISE la conversion.

RÈGLES ABSOLUES :
- Langue : français
- Longueur : 50 CARACTÈRES MAXIMUM (compte chaque caractère, espace inclus). Non négociable.
- 1 seule phrase ou formule, ultra lisible d'un coup d'œil (scroll-stop)
- Hook persuasif aligné sur l'objectif marketing et l'angle
- Adapté au persona, au secteur, au type d'offre, au ton et au style visuel
- Pas de guillemets, pas d'emoji superflu (1 emoji max si vraiment utile)
- Pas de hashtag, pas de mention @, pas de ponctuation finale lourde
- Évite le jargon corporate, parle comme un humain, va droit au but
- Le texte doit être IMMÉDIATEMENT compréhensible et déclencher le clic / l'arrêt du scroll
${params.variant === 2 ? '- Ce texte est le 2e à apparaître à l\'écran : il doit COMPLÉTER (pas répéter) le 1er texte, idéalement comme un mini call-to-action ou une chute punchy.' : ''}
${params.excludeText ? `- NE RÉPÈTE PAS et ne paraphrase pas ce texte déjà utilisé : "${params.excludeText}"` : ''}

Réponds UNIQUEMENT par le texte final, sans guillemets, sans préfixe, sans explication.`;

  const userPrompt = `=== CONTEXTE ===
Type de contenu: ${params.contentType}
Format: ${params.format}
${params.idea ? `Idée / sujet: ${params.idea}` : ''}
${params.objective ? `Objectif marketing: ${params.objective}` : ''}
${params.marketingAngle ? `Angle marketing: ${params.marketingAngle}` : ''}
${params.offerType ? `Type d'offre: ${params.offerType}` : ''}
${params.productName ? `Nom: ${params.productName}` : ''}
${params.productDescription ? `Description: ${params.productDescription}` : ''}
${params.visualStyle ? `Style visuel: ${params.visualStyle}` : ''}
${params.tone ? `Ton d'écriture: ${params.tone}` : ''}
${params.activity ? `Activité principale: ${params.activity}` : ''}
${params.sector ? `Secteur: ${params.sector}` : ''}
${params.persona ? `Client cible / persona: ${params.persona}` : ''}

Écris LE texte à afficher dans le visuel, 50 caractères MAX, qui maximise la conversion.`;

  const data = await callKreatorAI({
    action: 'generate_on_screen_text',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  let text = content.trim().replace(/^["«»"'`]+|["«»"'`]+$/g, '').trim();
  // Strip surrounding quotes again, collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Hard cap at 50 chars, cut on word boundary if possible
  if (text.length > 50) {
    const sliced = text.slice(0, 50);
    const lastSpace = sliced.lastIndexOf(' ');
    text = (lastSpace > 30 ? sliced.slice(0, lastSpace) : sliced).trim();
  }
  return text;
}
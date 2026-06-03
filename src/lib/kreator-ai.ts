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

export interface ContentIdea {
  id: number;
  hook: string;
  concept: string;
  angle: string;
}

export async function generateContentIdeas(input: {
  contentType: 'image' | 'carousel' | 'video';
  objective?: string;
  offerType?: string;
  productName?: string;
  productDescription?: string;
  activity?: string;
  sector?: string;
  persona?: string;
  market?: string;
  useCase?: string;
  tone?: string;
}): Promise<{ ideas: ContentIdea[] }> {
  const systemPrompt = `Tu es un expert en marketing digital viral et copywriting de conversion (Facebook, Instagram, TikTok, LinkedIn — recommandations algorithmes 2026).

OBJECTIF : Générer EXACTEMENT 3 idées de contenu ULTIMES, IDÉALES, qui CONVERTISSENT LE PLUS, avec un ANGLE MARKETING PUISSANT ET FORT chacune.
Les 3 idées doivent être TRÈS DIFFÉRENTES avec des angles radicalement distincts (ex : douleur / transformation / curiosité ; ou preuve sociale / urgence / éducation). Jamais 2 angles similaires.
Chaque idée doit être en COHÉRENCE PARFAITE avec : type d'offre, nom de l'offre, description, activité/métier, persona cible, objectif du contenu, type de contenu (image / carousel / vidéo), et cas d'utilisation.

STRUCTURE STRICTE de chaque idée :
- hook : phrase d'accroche scroll-stop 0-2s, ultra punchy, max 70 caractères, avec emoji en début.
- concept : description SIMPLE, claire et concise de l'idée (ce qu'on voit / entend / lit), STRICTEMENT ENTRE 15 ET 20 MOTS (jamais moins de 15, jamais plus de 20), orientée conversion, STRICTEMENT en lien avec le nom de l'offre, la description, l'objectif du contenu et SURTOUT le cas d'utilisation choisi.
- angle : nom court de l'angle marketing (1 à 3 mots), sans explication supplémentaire.

RÈGLE HOOK — ABSOLUE :
Le hook DOIT être directement dans le SENS de l'OBJECTIF DU CONTENU et respecter EXACTEMENT le TON D'ÉCRITURE demandé (vocabulaire, niveau de langue, énergie, rythme). C'est non négociable : un hook qui s'écarte de l'objectif ou du ton est invalide.

RÈGLES :
- Toujours STRICTEMENT COHÉRENT avec TOUS les éléments fournis : type d'offre, nom, description, activité/métier, secteur, marché, persona, objectif, type de contenu, cas d'utilisation et ton d'écriture.
- Respecter scrupuleusement le cas d'utilisation choisi (ex : Avant/Après, UGC, Témoignage, Démonstration, Comparatif, FAQ, etc.) — c'est le format narratif obligatoire de chaque idée.
- Le hook doit IMPÉRATIVEMENT refléter l'objectif du contenu et adopter le ton d'écriture demandé.
- concept = entre 15 et 20 mots, simple, clair, concis, STRICTEMENT en cohérence avec nom + description + objectif + cas d'utilisation (le cas d'utilisation est le format narratif obligatoire).
- Optimisé conversion + recommandations algorithmes 2026 (rétention, partage, commentaires).
- Tous les angles doivent sonner NATURELS, fluides, humains — jamais robotiques, jamais "vendeurs", jamais clichés marketing.
- Français, sans markdown, sans guillemets superflus.

RÈGLE ANTI-IA (ABSOLUE, NON NÉGOCIABLE) :
Tout doit sonner 100% NATUREL, AUTHENTIQUE, HUMAIN, RÉEL, comme écrit par une vraie personne qui parle à un ami. JAMAIS aucune expression, tournure, structure ou vocabulaire typique de l'IA. INTERDIT formellement : "plongez dans", "découvrez", "à l'ère du", "dans un monde où", "imaginez un instant", "et si je vous disais que", "révolutionnaire", "incontournable", "véritable game-changer", "n'attendez plus", "ne cherchez plus", "voici comment", "le secret pour", "transformez votre", "boostez votre", "élevez votre", "libérez votre potentiel", "synonyme de", "au cœur de", "à l'image de", énumérations parfaitement parallèles ("plus X, plus Y, plus Z"), adjectifs empilés à 3 ("simple, rapide, efficace"), formulations trop équilibrées, transitions scolaires, métaphores grandiloquentes. Pas de structure trop propre, pas de symétrie suspecte, pas de ton corporate ni pseudo-inspirant. Écris comme un humain réel : irrégulier, vivant, direct, parfois familier, avec du relief — pas une IA polie.

RETOURNE UNIQUEMENT un JSON valide, exactement ce format :
{"ideas":[{"id":1,"hook":"…","concept":"…","angle":"…"},{"id":2,"hook":"…","concept":"…","angle":"…"},{"id":3,"hook":"…","concept":"…","angle":"…"}]}`;

  const userPrompt = `=== CONTEXTE ===
Type de contenu : ${input.contentType}
${input.objective ? `Objectif du contenu (PRIORITAIRE) : ${input.objective}` : ''}
${input.offerType ? `Type d'offre : ${input.offerType}` : ''}
${input.productName ? `Nom de l'offre : ${input.productName}` : ''}
${input.productDescription ? `Description : ${input.productDescription}` : ''}
${input.activity ? `Activité principale / Métier : ${input.activity}` : ''}
${input.sector ? `Secteur : ${input.sector}` : ''}
${input.persona ? `Client cible / Persona : ${input.persona}` : ''}
${input.market ? `Marché : ${input.market}` : ''}
${input.useCase ? `Cas d'utilisation (format narratif OBLIGATOIRE) : ${input.useCase}` : ''}
${input.tone ? `Ton d'écriture : ${input.tone}` : ''}

Génère 3 idées de contenu ULTIMES qui convertissent le plus, avec des angles marketing puissants et TRÈS différents, en cohérence parfaite avec TOUT ce contexte (notamment le cas d'utilisation et le type de contenu).`;

  const data = await callKreatorAI({
    action: 'generate_content_ideas',
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
{"personas":[{"id":1,"profil":"Nom + âge + situation courte (ex: Marie, 34 ans, maman active)","contexte_rapide":"1 phrase sur son contexte de vie / pro","csp":"CSP+ / CSP / employé / étudiant / retraité / dirigeant…","probleme":"problème principal qu'il/elle rencontre","objectif":"objectif principal qu'il/elle cherche à atteindre"},{"id":2,...},{"id":3,...}],"best_id":1,"best_reason":"raison courte"}

Les 3 personas doivent être DIFFÉRENTS (âges, situations, motivations différentes) mais tous cohérents avec l'activité, le secteur et le type d'offre.

ANALYSE OBLIGATOIRE : après avoir généré les 3 personas, compare-les et désigne dans "best_id" le persona qui :
1) convertit le plus (intention d'achat la plus forte),
2) a la douleur la plus intense et la plus urgente à résoudre,
3) génère le plus de revenus (panier moyen × fréquence × LTV la plus élevée).
Le champ "best_id" doit correspondre EXACTEMENT à l'id (1, 2 ou 3) du meilleur persona. "best_reason" : 1 phrase courte qui justifie le choix.`;

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

export async function refineIdea(input: {
  idea: string;
  offerType?: string;
  productName: string;
  productDescription: string;
  activity?: string;
  sector?: string;
  market?: string;
  persona?: string;
  objective?: string;
  marketingAngle?: string;
}) {
  const systemPrompt = `Tu es un expert en marketing de contenu et copywriting de conversion. Reformule et structure l'idée de contenu fournie pour la rendre claire, concrète, percutante, avec un ANGLE MARKETING FORT aligné sur l'offre, l'objectif de contenu et l'angle marketing fournis (si présents), tout en respectant strictement le sens et l'intention de l'idée d'origine. Réponds en FRANÇAIS, en 2 PHRASES MAXIMUM (jamais plus), sans introduction, sans guillemets, sans liste, sans markdown. Supprime le superflu, ajoute uniquement les précisions utiles tirées du contexte.`;
  const userPrompt = `=== IDÉE BRUTE ===
${input.idea}

=== CONTEXTE OFFRE ===
Nom: ${input.productName}
Description: ${input.productDescription}
${input.offerType ? `Type d'offre: ${input.offerType}` : ''}
${input.activity ? `Activité / Métier: ${input.activity}` : ''}
${input.sector ? `Secteur: ${input.sector}` : ''}
${input.market ? `Marché / Localisation: ${input.market}` : ''}
${input.persona ? `Client cible / Persona: ${input.persona}` : ''}
${input.objective ? `Objectif de contenu: ${input.objective}` : ''}
${input.marketingAngle ? `Angle marketing: ${input.marketingAngle}` : ''}

Reformule cette idée en 2 phrases maximum, dans le SENS de l'idée d'origine, avec un angle marketing fort.`;
  const data = await callKreatorAI({
    action: 'refine_idea',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  return content.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ');
}

export async function describeImageShort(imageBase64: string) {
  const systemPrompt = `Tu es un directeur artistique expert en UI/visual design. Analyse UNIQUEMENT l'UI design / direction artistique de l'image fournie (pas son sujet).
Décris en français, en 3 à 4 phrases MAXIMUM, les éléments de design suivants : palette de couleurs dominantes, style visuel (minimaliste, premium, organique, brutaliste, etc.), typographie si visible, composition / mise en page, ambiance lumineuse, textures et matières, traitement photo (flat, 3D, illustration, photo réelle), niveau de contraste et hiérarchie visuelle.
Objectif : permettre de reproduire EXACTEMENT la même direction UI design sur un autre visuel.
Pas d'introduction, pas de guillemets, pas de liste, pas de mention du sujet de l'image. Uniquement les caractéristiques de design.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: "Décris l'UI design / direction artistique de cette image en 3 à 4 phrases maximum (couleurs, style, typo, composition, ambiance, traitement). Ne décris pas le sujet." }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  let s = content.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

export async function describeProductImages(imageBase64s: string[]) {
  const single = imageBase64s.length <= 1;
  const systemPrompt = `Tu es un expert en analyse visuelle de produits avec un œil de designer industriel et de directeur artistique packaging.
On te fournit ${imageBase64s.length} image(s) d'un produit (ou d'une gamme).
Objectif : produire une description 100% AUTHENTIQUE et FIDÈLE au produit réel visible, suffisamment précise pour qu'un autre visuel puisse reproduire le produit À L'IDENTIQUE (forme, proportions, matériaux, finitions, couleurs exactes, textures, typographie/logo visibles, étiquette/packaging, éléments distinctifs).
Règles STRICTES :
- Réponds en FRANÇAIS, ${single ? 'en UNE SEULE PHRASE simple, claire et complète (jamais plus d\'une phrase)' : 'en 2 à 3 PHRASES MAXIMUM (jamais plus, jamais moins de 2)'}.
- 100% factuel : ne JAMAIS inventer une marque, un ingrédient, une matière, une couleur ou un détail non visible. Si un détail n'est pas certain, reste générique sur ce point.
- Si plusieurs images = MÊME produit sous différents angles : décris UN seul produit en intégrant les détails vus sur chaque angle.
- Si plusieurs images = produits DIFFÉRENTS : décris la gamme en précisant le nombre et les variantes visibles.
- Pas de marketing, pas d'adjectifs subjectifs ("magnifique", "premium"...), pas d'introduction, pas de guillemets, pas de liste, pas de markdown. Uniquement les phrases descriptives finales.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: imageBase64s,
    messages: [{ role: 'user', content: `Analyse ${single ? "cette image" : `ces ${imageBase64s.length} images`} et donne une description 100% fidèle du produit ${single ? "en UNE SEULE phrase simple" : "en 2 ou 3 phrases"} permettant de le reproduire à l'identique (forme, matériaux, couleurs, typographie/logo, packaging, détails distinctifs visibles).` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  let s = content.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
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

export async function detectActivityFromDescription(description: string): Promise<string> {
  const systemPrompt = `Tu es un expert en classification d'activités professionnelles. À partir de la description d'une offre (produit ou service), déduis L'ACTIVITÉ PRINCIPALE ou LE MÉTIER de l'entreprise qui la propose.
RÈGLES STRICTES :
- Réponds UNIQUEMENT par 1 à 4 mots (ex : "Boulangerie artisanale", "Coach sportif", "Agence marketing", "Cabinet d'avocats").
- Pas de phrase, pas de ponctuation finale, pas de guillemets, pas d'emoji.
- Utilise le français, au singulier, sans article ("Boulangerie" et non "Une boulangerie").`;
  const data = await callKreatorAI({
    action: 'detect_activity_from_description',
    messages: [{ role: 'user', content: `Description de l'offre : ${description}` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return '';
  return content.trim().replace(/^["'`]+|["'`.]+$/g, '').split('\n')[0].trim();
}

export async function summarizePerformingPosts(descriptions: string[]) {
  const systemPrompt = `Tu es un expert en marketing digital et viralité sur les réseaux sociaux. À partir de la description du post fournie, explique pourquoi ce post est devenu viral.
RÈGLES STRICTES :
- Réponds UNIQUEMENT sous forme d'une liste à puces (utilise "- " en début de chaque ligne).
- 3 à 4 puces maximum.
- Phrases courtes et simples (max ~15 mots chacune).
- Concentre-toi sur les leviers de viralité (hook, émotion, format, ton, preuve sociale, call-to-action, originalité).
- Pas de titre, pas d'introduction, pas de conclusion. Juste les puces.`;
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

export async function analyzeViralPost(imageBase64: string) {
  const systemPrompt = `Tu es un expert en marketing digital et viralité sur les réseaux sociaux. Analyse l'image d'un post qui a performé et explique EN FRANÇAIS pourquoi ce post est devenu viral.

RÈGLES STRICTES :
- Réponds en 3 à 4 phrases MAXIMUM (jamais plus, jamais moins de 3).
- Pas de liste à puces, pas de titre, pas d'introduction, pas de conclusion : uniquement des phrases courtes et simples.
- Analyse de façon factuelle et synthétique :
  • l'UI design du visuel (couleurs, composition, hiérarchie, typographie, style, ambiance, contrastes, focal point)
  • le hook visuel et/ou textuel (ce qui scroll-stop dans les 0-2s)
  • la caption si visible (description, ton, structure)
  • le call-to-action et les hashtags si présents
  • tout autre levier de viralité (émotion, preuve sociale, curiosité, transformation, urgence, originalité)
- Fais ressortir la QUINTESSENCE de la viralité du post — les éléments réutilisables pour reproduire un visuel cohérent.
- Ne décris pas le sujet pour le décrire : chaque phrase doit expliquer POURQUOI cet élément contribue à la viralité.`;
  const data = await callKreatorAI({
    action: 'analyze_viral_post',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: "Analyse ce post viral et explique en 3 à 4 phrases pourquoi il a performé (UI design, hook, caption, CTA, hashtags, leviers de viralité)." }],
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
  useCase?: string;
  showText: boolean;
  textContent: string;
  slideTexts?: string[];
  slidesCount?: number;
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
  logoPosition?:
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-left'
    | 'top-right'
    | 'top-center'
    | 'middle-left'
    | 'middle-right';
  logoAppearance?: 'start' | 'middle' | 'end';
  textPosition?: 'top-center' | 'middle-center' | 'bottom-center';
  textFont?: string;
  textColor?: string;
  // Second on-screen text (video)
  text2Enabled?: boolean;
  textContent2?: string;
  textPosition2?: 'top-center' | 'middle-center' | 'bottom-center';
  textFont2?: string;
  textColor2?: string;
  textDuration1?: number;
  textDuration2?: number;
  textStart1?: number;
  textStart2?: number;
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

  // === Direction artistique premium spécifique au cas d'utilisation ===
  const useCaseKey = (params.useCase || '').toLowerCase();
  const useCaseDirectiveMap: Array<{ match: RegExp; type: 'image' | 'carousel' | 'video'; label: string; body: string }> = [
    // PHOTO / IMAGE
    { match: /publicit[ée]|premium/, type: 'image', label: 'PHOTO — PUBLICITÉ PREMIUM', body: 'Campagne publicitaire premium centrée sur le produit/service. Direction artistique luxueuse, éclairages professionnels, mise en scène sophistiquée, composition digne des plus grandes marques internationales. Valoriser fortement qualité, bénéfices et valeur perçue.' },
    { match: /lifestyle/, type: 'image', label: 'PHOTO — LIFESTYLE', body: 'Mettre en scène le produit/service dans une situation réelle, naturelle et aspirante. Scène authentique permettant à la cible de se projeter. Émotions positives, ambiance immersive, esthétique moderne.' },
    { match: /promo|réduc|offre flash|solde/, type: 'image', label: 'PHOTO — PROMOTION', body: 'Visuel promotionnel premium. Mettre en évidence l\'offre commerciale avec forte visibilité tout en conservant une image haut de gamme. Sentiment d\'urgence sans dégrader la perception de qualité.' },
    { match: /avant.?apr[èe]s|before.?after|transformation/, type: 'image', label: 'PHOTO — AVANT / APRÈS', body: 'Illustrer clairement une transformation spectaculaire. Séparation visuelle évidente entre avant et après. Mettre en valeur le résultat obtenu grâce au produit/service.' },
    { match: /avis|t[ée]moignage client|review/, type: 'image', label: 'PHOTO — AVIS CLIENT', body: 'Mettre en avant la satisfaction client avec un design rassurant, crédible et professionnel. Valoriser les résultats obtenus et renforcer la confiance.' },
    { match: /expertise|autorit[ée]|savoir.?faire/, type: 'image', label: 'PHOTO — EXPERTISE', body: 'Positionner l\'entreprise ou le professionnel comme une référence dans son domaine. Visuel incarnant autorité, crédibilité et savoir-faire.' },
    { match: /r[ée]sultat client|case|cas client/, type: 'image', label: 'PHOTO — RÉSULTAT CLIENT', body: 'Mettre visuellement en scène les bénéfices concrets obtenus grâce au service. Le résultat doit être immédiatement compréhensible.' },
    { match: /offre de service|service offert|prestation/, type: 'image', label: 'PHOTO — OFFRE DE SERVICE', body: 'Présenter l\'offre de manière claire et attractive. Mettre en avant bénéfices principaux, transformation promise et proposition de valeur.' },
    // CARROUSEL
    { match: /5 b[ée]n[ée]fices|b[ée]n[ée]fices/, type: 'carousel', label: 'CARROUSEL — BÉNÉFICES', body: 'Carrousel professionnel avec progression logique. Chaque slide développe un bénéfice majeur. Design cohérent, moderne, premium, optimisé lecture mobile.' },
    { match: /comparatif|versus|vs /, type: 'carousel', label: 'CARROUSEL — COMPARATIF', body: 'Comparatif visuellement impactant. Mettre en évidence les différences majeures entre la solution proposée et les alternatives. Faciliter la prise de décision.' },
    { match: /erreurs?|à éviter|a eviter/, type: 'carousel', label: 'CARROUSEL — ERREURS À ÉVITER', body: 'Contenu éducatif révélant les erreurs fréquentes du marché. Visuels pédagogiques et titres accrocheurs favorisant sauvegardes et partages.' },
    { match: /faq|objection|question/, type: 'carousel', label: 'CARROUSEL — FAQ', body: 'Répondre aux principales objections dans un format clair, rassurant et structuré. Chaque slide apporte une réponse simple et convaincante.' },
    { match: /[ée]tude de cas|case study/, type: 'carousel', label: 'CARROUSEL — ÉTUDE DE CAS', body: 'Présenter un cas réel : contexte, problématique, solution appliquée, résultat obtenu. Narration progressive et preuves visuelles.' },
    { match: /m[ée]thode|[ée]tape|step.?by.?step|process/, type: 'carousel', label: 'CARROUSEL — MÉTHODE ÉTAPE PAR ÉTAPE', body: 'Décomposer clairement le processus utilisé. Chaque étape simple à comprendre, démontre l\'expertise de l\'entreprise.' },
    { match: /t[ée]moignage/, type: 'carousel', label: 'CARROUSEL — TÉMOIGNAGE CLIENT', body: 'Raconter le parcours d\'un client avant, pendant et après l\'utilisation de la solution. Renforcer preuve sociale et crédibilité.' },
    // VIDÉO
    { match: /hook|viral/, type: 'video', label: 'VIDÉO — HOOK VIRAL', body: 'Captiver immédiatement dans les 3 premières secondes : scène forte, promesse percutante ou situation intrigante. Rythme dynamique jusqu\'à la fin.' },
    { match: /ugc/, type: 'video', label: 'VIDÉO — UGC', body: 'Reproduire l\'esthétique authentique des contenus générés par les utilisateurs tout en conservant une qualité professionnelle. Fort sentiment de proximité et confiance.' },
    { match: /d[ée]monstration produit|demo produit/, type: 'video', label: 'VIDÉO — DÉMONSTRATION PRODUIT', body: 'Mettre en scène le produit sous plusieurs angles. Montrer utilisation, fonctionnalités et bénéfices de manière claire et attractive.' },
    { match: /probl[èe]me.?solution|pain/, type: 'video', label: 'VIDÉO — PROBLÈME → SOLUTION', body: 'Commencer par illustrer la frustration/problème de la cible. Introduire progressivement la solution puis démontrer les bénéfices obtenus.' },
    { match: /storytelling|histoire/, type: 'video', label: 'VIDÉO — STORYTELLING', body: 'Construire une histoire émotionnelle autour du produit/service. Créer une connexion forte avec le spectateur tout en mettant en valeur la transformation obtenue.' },
    { match: /[ée]tude.*vid|case.*video/, type: 'video', label: 'VIDÉO — ÉTUDE DE CAS', body: 'Présenter une situation réelle : défis rencontrés, solution apportée, résultats obtenus. Narration engageante et crédible.' },
    { match: /d[ée]monstration m[ée]thode|m[ée]thode/, type: 'video', label: 'VIDÉO — DÉMONSTRATION MÉTHODE', body: 'Montrer étape par étape la méthode utilisée afin de démontrer l\'expertise et la valeur du service.' },
  ];
  const matchedUseCase = useCaseKey
    ? useCaseDirectiveMap.find(d => d.type === params.contentType && d.match.test(useCaseKey))
      || useCaseDirectiveMap.find(d => d.match.test(useCaseKey))
    : undefined;
  const useCaseDirectiveBlock = params.useCase
    ? `\n━━━━━━━━━━━━━━━━━━\nCAS D'UTILISATION — COHÉRENCE 100% OBLIGATOIRE\n━━━━━━━━━━━━━━━━━━\nCas d'utilisation sélectionné : "${params.useCase}". L'ensemble du contenu (concept narratif, mise en scène, hiérarchie visuelle, textes, CTA, ambiance) DOIT être à 100% cohérent avec ce cas d'utilisation. C'est le format narratif OBLIGATOIRE — toute déviation est invalide.\n${matchedUseCase ? `\nDIRECTIVE SPÉCIFIQUE (${matchedUseCase.label}) :\n${matchedUseCase.body}` : ''}\n`
    : '';
  const toneCoherenceBlock = params.ton
    ? `\n━━━━━━━━━━━━━━━━━━\nTON D'ÉCRITURE — COHÉRENCE 100% OBLIGATOIRE\n━━━━━━━━━━━━━━━━━━\nTon d'écriture imposé : "${params.ton}". TOUS les textes visibles (titres, sous-titres, overlays, CTA, captions de slide, voix off) DOIVENT respecter EXACTEMENT ce ton : vocabulaire, niveau de langue, rythme, énergie, registre. Aucun écart toléré.\n`
    : '';
  const premiumDirectionBlock = `
━━━━━━━━━━━━━━━━━━
STRUCTURE PROMPT (MOTEUR PREMIUM — ORDRE OBLIGATOIRE)
━━━━━━━━━━━━━━━━━━
1) Objectif marketing → 2) Type d'offre → 3) Cas d'utilisation → 4) Direction artistique → 5) Mise en page → 6) Gestion des textes → 7) Style visuel → 8) Adaptation secteur → 9) Contraintes qualité.

━━━━━━━━━━━━━━━━━━
DIRECTION ARTISTIQUE PREMIUM (BLOC GLOBAL — TOUTES IMAGES / CARROUSEL / VIDÉO)
━━━━━━━━━━━━━━━━━━
Créer un contenu publicitaire haut de gamme digne d'une agence créative internationale. Adapter automatiquement l'univers visuel au secteur, au produit/service, à la cible et au positionnement de la marque. Composition professionnelle, moderne, impactante. Respecter les codes visuels du marché tout en conservant une identité premium et différenciante.

DESIGN & MISE EN PAGE : hiérarchie visuelle forte, regard guidé naturellement vers l'élément principal, contrastes efficaces, disposition équilibrée, lisibilité excellente, design pensé réseaux sociaux.

GESTION DES TEXTES : intégration élégante et professionnelle, typographie premium adaptée au secteur, hiérarchie claire entre titre principal / sous-titre / bénéfices / CTA. Aucun effet amateur ni surcharge.

ADAPTATION AUTOMATIQUE À L'OFFRE : style graphique adapté au nom de l'offre, à la description, au secteur, au métier, au produit/service et à la cible. Le contenu doit sembler avoir été conçu spécifiquement pour cette activité.

QUALITÉ VISUELLE : qualité publicitaire professionnelle, éclairage maîtrisé, couleurs harmonieuses, composition haut de gamme, profondeur visuelle, niveau de détail élevé, esthétique premium. Aucun rendu amateur.
${params.contentType === 'video' ? `
━━━━━━━━━━━━━━━━━━
BLOC CINÉMATOGRAPHIQUE (TOUTES VIDÉOS)
━━━━━━━━━━━━━━━━━━
Produire une vidéo publicitaire premium digne des plus grandes agences créatives internationales. Mouvements de caméra fluides, cadrages professionnels, éclairages cinématographiques, profondeur de champ maîtrisée, transitions naturelles, étalonnage couleur haut de gamme, rythme dynamique, storytelling visuel puissant, qualité publicitaire de niveau international. Chaque scène renforce émotion, crédibilité et désir. Optimisation verticale réseaux sociaux, qualité cinéma, rendu ultra réaliste, esthétique publicitaire premium.
` : ''}${useCaseDirectiveBlock}${toneCoherenceBlock}`;

  const systemPrompt = `Tu es un système expert en direction artistique publicitaire, marketing émotionnel, storytelling visuel, branding premium, psychologie de conversion et génération de prompts IA ultra avancés.

Ta mission : générer automatiquement un prompt FINAL optimisé pour créer une image publicitaire premium, un carrousel marketing ultra engageant, ou une vidéo publicitaire cinématographique ultra virale, à partir des informations utilisateur, du point d'entrée choisi, des réglages avancés activés et du modèle IA sélectionné.

Le prompt généré doit être : prêt à envoyer directement à l'API du modèle IA, ultra cohérent, premium, photoréaliste, naturel, émotionnel, pensé conversion, pensé engagement, pensé rétention, impossible à distinguer d'une vraie production humaine.

━━━━━━━━━━━━━━━━━━
MISSION PRINCIPALE
━━━━━━━━━━━━━━━━━━
Créer automatiquement des prompts capables de produire des contenus qui stoppent immédiatement le scroll, adaptés au produit/service réel, cohérents avec l'objectif marketing, crédibles pour le secteur, publiables immédiatement, dignes d'une agence créative premium. Le système doit comprendre le besoin implicite utilisateur, le niveau de gamme, les émotions du persona, les déclencheurs psychologiques, les codes du marché, les mécaniques virales adaptées au secteur.

━━━━━━━━━━━━━━━━━━
RÈGLE DE PRIORITÉ ABSOLUE
━━━━━━━━━━━━━━━━━━
Utiliser les informations utilisateur dans cet ordre :
1. Réglages avancés activés
2. Point d'entrée choisi
3. Type d'offre
4. Image produit si présente
5. Nom de l'offre
6. Description
7. Persona
8. Objectif du contenu
9. Angle marketing
10. Style visuel
11. Ton d'écriture
12. Activité / métier
13. Secteur
14. Marché / localisation
Si une donnée manque : la déduire intelligemment, rester crédible, cohérent, compatible avec le secteur et l'objectif marketing. Ne jamais extrapoler excessivement.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — FORMAT / RATIO
━━━━━━━━━━━━━━━━━━
Tu DOIS STRICTEMENT respecter le format ${params.format} (${formatLabel}).
- Si FORMAT = "1:1" → visuel carré parfaitement centré
- Si FORMAT = "16:9" → visuel horizontal large
- Si FORMAT = "9:16" → visuel vertical plein écran, optimisé mobile
Le ratio ${params.format} est PRIORITAIRE. Adapter composition, cadrage, framing. Éviter tout élément coupé. Préciser explicitement "aspect ratio ${params.format}" dans le prompt généré.
${contentTypeAdaptation}
${formatAdaptation}

RÈGLES PLATEFORMES :
- TikTok : images et carrousels → 9:16, vidéos → 16:9
- Instagram : posts/carrousels/stories → 1:1, vidéos → 9:16

━━━━━━━━━━━━━━━━━━
GESTION DU POINT D'ENTRÉE
━━━━━━━━━━━━━━━━━━
CAS 1 — J'AI UNE IDÉE : respecter fidèlement l'idée utilisateur. Améliorer uniquement exécution créative, qualité marketing, viralité, conversion, sans modifier l'intention.
CAS 2 — CRÉER À PARTIR D'UNE IMAGE : reproduire l'ADN visuel, composition, ambiance, hiérarchie, couleurs, rythme, émotions de l'image source, en adaptant à l'offre utilisateur.
CAS 3 — S'INSPIRER D'UN POST VIRAL : analyser hook, structure, émotions, CTA, narration, éléments de viralité, composition, hiérarchie visuelle ; adapter ces mécaniques au produit/service sans copier le contenu.
CAS 4 — JE N'AI PAS D'IDÉE : transformer l'idée choisie en contenu viral, crédible, premium, orienté conversion, ultra cohérent avec l'offre.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — RÉGLAGES AVANCÉS PRIORITAIRES (NON NÉGOCIABLE)
━━━━━━━━━━━━━━━━━━
Si l'utilisateur a activé/renseigné un quelconque réglage avancé (palette, ton, style visuel, texte overlay et contenu, position, police, couleur, second texte, durées/timings, logo, position/timing logo, voix off, paramètres modèle), TOUS ces paramètres sont STRICTEMENT PRIORITAIRES sur toute suggestion automatique, sur l'analyse d'images de référence et sur les choix esthétiques par défaut. Ils DOIVENT être intégrés FIDÈLEMENT et VISIBLEMENT.
- Palette active : couleurs fournies dominent 60-80% du visuel.
- Ton, style visuel, texte overlay, logo, police, couleur : appliquer EXACTEMENT.
- En cas de conflit avec l'analyse d'image, la palette et les réglages avancés GAGNENT TOUJOURS.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — VISUEL ORIENTÉ CONVERSION
━━━━━━━━━━━━━━━━━━
Tout visuel est un OUTIL DE CONVERSION : hook scroll-stop 0–2s, mise en valeur claire du produit/service et de sa promesse (bénéfice > caractéristique), preuve implicite (résultat, usage, satisfaction), direction du regard vers sujet et CTA, lisibilité PARFAITE des overlays sur mobile, aucun élément parasite.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — HOOK VISUEL 0-2 SECONDES
━━━━━━━━━━━━━━━━━━
Scroll-stopper systématique : contraste élevé, sujet dominant, expression émotionnelle marquée, action en cours, élément intrigant/inattendu. Vidéos : frame d'ouverture = hook le plus puissant. Carrousels : slide 1 = hook le plus fort. Hook toujours cohérent avec l'offre.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — COHÉRENCE PRODUIT / OFFRE / VISUEL
━━━━━━━━━━━━━━━━━━
- INTERDIT d'inventer nom de marque, enseigne, boulangerie, restaurant, boutique, société, logo, slogan non fourni. Aucune pancarte, étiquette, devanture, packaging avec nom inventé.
- INTERDIT d'afficher prix, quantité, pourcentage, promotion, unité contredisant l'offre. Les chiffres affichés DOIVENT correspondre EXACTEMENT au texte de l'offre.
- INTERDIT d'ajouter éléments décoratifs sans rapport, ou de détourner du sujet.
- INTERDIT d'inventer certifications/labels ("bio", "fait maison", "levain naturel", "artisanal", "100%"...) non présents.
- Si détail non précisé : rester NEUTRE et SOBRE. Pas de pancarte, logo, texte parasite (sauf overlay explicitement demandé).
- Sujet principal = produit/service exact. Subtilité, suggérer plutôt qu'envahir.
- Texte overlay demandé : reproduire EXACTEMENT le wording fourni.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — MARCHÉ / LOCALISATION / CASTING
━━━━━━━━━━━━━━━━━━
${params.market ? `Marché cible "${params.market}" : personnages (ethnies, traits, tenues, coiffures), environnement (architecture, mobilier, signalétique, végétation, climat), accessoires, codes culturels DOIVENT être cohérents. Pas de mélange incohérent.` : `Aucun marché précisé : par défaut casting et environnement CULTURELLEMENT NEUTRES, universels, sans signalétique étrangère ni références ethniques marquées.`}

━━━━━━━━━━━━━━━━━━
COHÉRENCE SECTEUR
━━━━━━━━━━━━━━━━━━
Adapter automatiquement lumière, palette, ambiance, décor, typographie, rythme, montage, émotions, niveau de luxe selon le secteur. Exemples : SaaS B2B → propre, moderne, productivité ; Beauté → peau réaliste, élégance ; Food → désir immédiat, chaleur ; Immobilier → aspiration, lumière ; Formation premium → autorité, transformation ; Fitness → énergie, intensité.

━━━━━━━━━━━━━━━━━━
RÉALISME ABSOLU
━━━━━━━━━━━━━━━━━━
Rendu photoréaliste, naturel, premium, organique, émotionnel, crédible, cinématographique. Toujours : lumière réaliste, ombres naturelles, textures détaillées, grain photo, peau naturelle, imperfections subtiles, profondeur cohérente, matériaux réalistes. INTERDIT : rendu fake IA, peau plastique, saturation excessive, anatomie incohérente, texte illisible, composition amateur, esthétique générique IA.

━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION
━━━━━━━━━━━━━━━━━━
Ne jamais inventer fonctionnalités inexistantes, bénéfices irréalistes, promesses impossibles, scènes incohérentes, personnages incompatibles, contextes absurdes. Si une donnée manque : déduire uniquement le strict nécessaire.

━━━━━━━━━━━━━━━━━━
FIDÉLITÉ PRODUIT
━━━━━━━━━━━━━━━━━━
Si produit : ADN intouchable, proportions exactes, couleurs exactes, branding exact, jamais coupé, toujours central, immédiatement identifiable.

━━━━━━━━━━━━━━━━━━
VIRALITÉ
━━━━━━━━━━━━━━━━━━
Le contenu doit pouvoir arrêter le scroll, augmenter rétention, sauvegardes, partages, commentaires, clics, conversion. Utiliser curiosité, tension, surprise, preuve sociale, contraste fort, dopamine visuelle, transformation, relatable, émotion forte.
${premiumDirectionBlock}
━━━━━━━━━━━━━━━━━━
TEXTE ÉCRAN
━━━━━━━━━━━━━━━━━━
Ultra lisibles mobile, parfaitement intégrés, jamais coupés, cohérents avec secteur/ton/style. VIDÉO : max 6 mots par texte. CARROUSEL : max 12 mots par slide.

━━━━━━━━━━━━━━━━━━
SPÉCIFIQUE IMAGE
━━━━━━━━━━━━━━━━━━
Prompt image : max 180 mots, sauts de ligne, fluide, sans markdown ni listes.
EXIGENCE PREMIUM NON NÉGOCIABLE — niveau "agence créative top mondiale / graphiste senior / directeur artistique award-winning (Behance / Dribbble / Awwwards / Cannes Lions)". JAMAIS de visuel plat, simpliste, amateur, générique ou "template gratuit".
Le visuel DOIT contenir une vraie RECHERCHE de design : composition travaillée (grille, règle des tiers, équilibre asymétrique maîtrisé, layering, profondeur), HIÉRARCHIE typographique forte (titre massif impactant + sous-éléments contrastés en taille/poids), TYPOGRAPHIE display moderne (sans-serif condensé bold, serif éditorial, ou display script selon le secteur — JAMAIS d'Arial/Times basique), MIX de polices intelligent (1 display + 1 sans-serif neutre).
ÉLÉMENTS GRAPHIQUES OBLIGATOIRES (sélectionner ceux qui SERVENT le produit, sans surcharger) : formes organiques ou géométriques d'accentuation (étoiles brutalistes, splash, blob, badge prix circulaire, ruban, bulle BD, tag oblique), textures subtiles (papier, grain, halftone, noise), ombres portées réalistes longues, lueurs / éclats, micro-particules (sésame, sauce qui coule, fumée, vapeur, ingrédients en lévitation, éclaboussures), traits manuscrits / soulignés / cercles dessinés à la main pour souligner un mot-clé, flèches stylisées.
TYPOGRAPHIE : titres en MAJUSCULES massifs, possibilité de jeu typographique (mot répété en arrière-plan en transparence, texte qui suit la forme du produit, lettrage qui passe devant/derrière le produit pour créer de la profondeur, contour ou ombre décalée colorée).
PALETTE : 2 à 3 couleurs maximum + 1 accent vif contrastant (jaune néon, orange électrique, rouge sang, vert citron) pour les badges / CTA. Couleurs saturées et assumées, jamais fades.
PRODUIT : toujours en hero (40-60% de la surface), parfaitement détouré ou en mise en scène léchée, lumière studio premium, ombres portées dramatiques, micro-détails appétissants/désirables (gouttes, brillance, texture, ingrédients qui volent autour).
RENDU FINAL : doit ressembler à une AFFICHE PUBLICITAIRE PRO digne d'une marque internationale (style des références fournies : burger Coca-Cola, Tropic Addict, XO Chinese, Jimbo, Hey grapefruit, Special Pizza, Luosifen). Choisir intelligemment la référence la plus adaptée au produit/secteur et s'en inspirer dans la structure (sans copier).
INTERDIT ABSOLU : fond uni plat sans texture ni élément graphique, produit seul centré sans contexte, typographie unique fade, absence totale de badge/accent/forme décorative, look "post Canva basique", composition symétrique ennuyeuse, palette pastel sans contraste.

━━━━━━━━━━━━━━━━━━
CADRAGE & VISIBILITÉ DES ÉLÉMENTS ESSENTIELS (RÈGLE ABSOLUE)
━━━━━━━━━━━━━━━━━━
INTERDICTION FORMELLE de produire un visuel où des éléments essentiels (produit, assiette, plat, packaging, sujet humain, logo, texte clé, CTA) sont coupés, tronqués, recadrés, sortis du cadre ou partiellement masqués. Tout élément essentiel DOIT apparaître ENTIÈREMENT dans le cadre, avec des marges de sécurité confortables autour. Cadrer la scène en fonction du format ${params.format} pour garantir cette visibilité intégrale. Si un doute existe sur l'espace disponible, reculer le plan / dézoomer plutôt que de couper. Aucun élément essentiel ne doit toucher ni dépasser les bords.

━━━━━━━━━━━━━━━━━━
MISE EN PAGE TEXTE & LOGO — UI / DESIGN ARTISTIQUE (RÈGLE ABSOLUE)
━━━━━━━━━━━━━━━━━━
Composition à pensée de directeur artistique senior. Le visuel DOIT respecter STRICTEMENT les règles suivantes — toute violation = visuel à rejeter et régénérer :
1) TEXTE OVERLAY — JAMAIS écrit PAR-DESSUS le sujet principal (visage, produit hero, packaging, plat, assiette, personnage). Le texte DOIT être placé dans une ZONE NÉGATIVE dédiée (ciel, fond flou, mur uni, sol, espace vide volontairement laissé dans la composition). Cadrer la scène en CONSÉQUENCE pour réserver une bande de respiration (haut, bas ou côté selon la position demandée) où le texte vit sans toucher ni masquer le sujet. Contraste fort garanti (fond sombre → texte clair, fond clair → texte sombre), légère ombre portée ou contour fin uniquement si la lisibilité l'exige. Aucune lettre ne doit chevaucher le sujet, la nourriture, le visage, le produit ou les zones de détail importantes.
2) HIÉRARCHIE & LISIBILITÉ — taille du texte adaptée au format mobile : titre principal entre 6% et 12% de la hauteur du visuel (jamais gigantesque au point d'écraser le sujet, jamais minuscule au point d'être illisible). Marges latérales minimum 6% du bord. Interlignage aéré. Kerning soigné. Le texte est INTÉGRÉ NATIVEMENT à la composition, pas plaqué comme un sticker.
3) LOGO — TOUJOURS DISCRET ET PROFESSIONNEL : taille maximale ≈ 8% de la plus petite dimension du visuel (signature, jamais hero). Placé strictement dans le coin/position demandée, avec une marge de sécurité d'au moins 4% du bord. Le logo NE DOIT JAMAIS : être surdimensionné, couvrir une partie du sujet principal, se superposer au texte overlay, dupliquer ou concurrencer le texte, être centré quand une position de coin est demandée, être déformé/rogné/recoloré. Il reste un filigrane de marque élégant, parfaitement net, fond transparent préservé.
4) SÉPARATION TEXTE / LOGO / SUJET — les trois zones (sujet hero, texte overlay, logo signature) sont CLAIREMENT DISTINCTES dans la composition, sans chevauchement, sans collision, sans ambiguïté visuelle. Penser la composition AVANT le rendu : où va vivre le sujet, où va vivre le texte, où va vivre le logo — chacun a sa zone réservée.
5) PROPORTIONS GLOBALES — équilibre type affiche pro : sujet hero domine (40-60% de la surface utile), texte occupe une zone calme et lisible (10-20% de la surface), logo reste signature discrète (≈3-8%). Aucun élément graphique parasite ne vient écraser cette hiérarchie.
RAPPEL FINAL : si la scène imaginée ne permet pas naturellement de placer le texte hors du sujet, REPENSER LA COMPOSITION (recul, plongée/contre-plongée, décentrement du sujet, ajout d'une zone de respiration) — JAMAIS écrire sur le sujet par défaut.

━━━━━━━━━━━━━━━━━━
SPÉCIFIQUE CARROUSEL
━━━━━━━━━━━━━━━━━━
Prompt carrousel : max 400 mots, storytelling cohérent, continuité visuelle ABSOLUE entre slides (même univers graphique, même palette, même typographie, même traitement lumière, même style d'éléments décoratifs — SYSTÈME DE DESIGN unifié comme une vraie campagne d'agence).
MÊME EXIGENCE PREMIUM QUE L'IMAGE (voir ci-dessus) appliquée à CHAQUE slide : composition travaillée, typographie display impactante, éléments graphiques (badges, formes, textures, splash, ombres, particules), palette saturée 2-3 couleurs + accent vif, produit hero parfaitement mis en scène.
SLIDE 1 : hook scroll-stop immédiat (titre énorme percutant + produit hero + accent graphique fort). SLIDE 2 : émotion, problème ou bénéfice (visuel narratif, typographie expressive). SLIDE 3 : preuve, résultat ou transformation (mise en scène crédible, détail produit, micro-textures). SLIDE 4 : CTA subtil premium (call-to-action visuel élégant, badge action, flèche stylisée).
S'inspirer des références fournies (XO Chinese, Jimbo, Coca-Cola burger series) pour la cohérence de série. JAMAIS de slides simplistes, plates ou amateur. Chaque slide doit pouvoir être publiée seule comme une affiche pro.

━━━━━━━━━━━━━━━━━━
SPÉCIFIQUE VIDÉO
━━━━━━━━━━━━━━━━━━
Prompt vidéo : max 300 mots, 3 à 5 scènes, hook ultra fort dans les 2 premières secondes, changement de plan max toutes les 3s, transitions naturelles, mouvements réalistes, forte rétention. Toujours intégrer mouvements caméra, lumière cohérente, micro expressions, overlays dynamiques, sound design léger, rythme mobile-first, voix off humaine naturelle.

━━━━━━━━━━━━━━━━━━
VOIX OFF
━━━━━━━━━━━━━━━━━━
Naturelle, fluide, humaine, émotionnelle, conversationnelle, agréable. Éviter ton robotique, phrases longues, mots compliqués, diction artificielle.
${videoDirectives}
━━━━━━━━━━━━━━━━━━
AUTO-CONTRÔLE AVANT OUTPUT
━━━━━━━━━━━━━━━━━━
Vérifier : 1) Contenu créé spécifiquement pour cette offre ? 2) Point d'entrée respecté ? 3) Produit/service immédiatement compréhensible ? 4) Premium et crédible ? 5) Publiable réellement ? 6) Réglages avancés prioritaires ? 7) Persona se reconnaît ? 8) Pourrait performer ? 9) Semble créé par une agence ? 10) Aucune incohérence visuelle ou marketing ? Si NON quelque part : corriger avant output.

━━━━━━━━━━━━━━━━━━
FORMAT DE SORTIE
━━━━━━━━━━━━━━━━━━
Le champ "prompt_fr" doit contenir UNIQUEMENT le prompt final, en français, prêt à envoyer au modèle IA. Sans markdown, sans listes à puces, sans commentaires, sans explications.

STRUCTURE OBLIGATOIRE du prompt_fr (avec sauts de ligne RÉELS \\n\\n entre chaque bloc, dans cet ordre exact) :

Scène & sujet principal :
[description fluide du visuel/scène, sujet, cadrage, composition, ambiance, lumière, émotion, hook visuel 0-2s — adapté au format ${params.format} et au type ${params.contentType}]

Produit / offre mis en avant :
[présentation fidèle du produit ou service, intégration naturelle dans la scène, bénéfice implicite, cohérence avec persona et marché]

${params.contentType === 'video' ? `Déroulé / scènes :
[plan 1 hook, plan 2 valeur, plan 3 impact + CTA — mouvements caméra, transitions, rythme]

` : params.contentType === 'carousel' ? `Déroulé des slides :
[slide 1 hook, slide 2 émotion/problème, slide 3 preuve/résultat, slide 4 CTA — cohérence visuelle entre slides]

` : ''}Personnalisation (réglages avancés prioritaires) :
[lister ICI de façon fluide UNIQUEMENT les réglages avancés activés par l'utilisateur et les appliquer STRICTEMENT : palette de couleurs exactes (dominer 60-80% du visuel), ton d'écriture, style visuel, type de rendu, texte(s) overlay avec wording exact + position + police + couleur + durée + timing, logo avec URL + position + timing d'apparition, voix off avec texte exact, paramètres modèle IA. Si un réglage n'est pas activé, NE PAS l'inventer ni le mentionner. Cette section doit être clairement séparée et reconnaissable.]

Format & rendu technique :
[aspect ratio ${params.format}, modèle IA ${aiModelName}, qualité photoréaliste premium, contraintes techniques spécifiques]

${params.contentType === 'image' || params.contentType === 'carousel' ? `Direction artistique premium (OBLIGATOIRE — RÉDIGER SUR-MESURE, JAMAIS COPIER-COLLER UN GÉNÉRIQUE) :
[Rédige ICI un paragraphe de direction artistique 100% SUR-MESURE, dérivé STRICTEMENT des inputs utilisateur (type d'offre = ${params.offerType || 'n/c'}, produit/service = ${params.productService || 'n/c'}, description = ${params.productDescription || 'n/c'}, secteur = ${params.companySector || 'n/c'}, activité = ${params.companyActivity || 'n/c'}, objectif = ${params.objective || 'n/c'}, persona = ${params.targetPersona || 'n/c'}, marché = ${params.market || 'n/c'}, réglages avancés activés). RÈGLES DE PRIORITÉ ABSOLUE :
1) Les INPUTS UTILISATEUR sont PRIORITAIRES sur toute consigne stylistique générique. Si un réglage avancé impose une palette, un style de rendu, un ton, une typographie, un texte overlay, un logo → respecter à 100% sans contradiction.
2) Adapter chaque élément (composition, palette, typographie, éléments graphiques, textures, accents, mise en scène produit, références culturelles, codes de marché) au SECTEUR + ACTIVITÉ + TYPE D'OFFRE (produit physique vs service immatériel vs digital vs formation) et à l'OBJECTIF marketing du contenu (notoriété, conversion, engagement, éducation, lancement, promo).
3) Pour un SERVICE/digital/formation/B2B : pas de mise en scène produit hero "packaging", mais composition éditoriale / dataviz / scène d'usage / portrait persona / interface, codes visuels du secteur (SaaS = propre moderne, finance = trust premium sobre, beauté = peau réaliste élégance, food = désir chaleur, immobilier = aspiration lumière, fitness = énergie intensité, luxe = espace minimal noir/or, etc.). Pour un PRODUIT physique : hero 40-60% surface avec mise en scène léchée et micro-détails contextuels cohérents avec le produit réel (jamais inventer des éléments non liés).
4) Niveau d'exigence : agence créative top mondiale (Behance / Awwwards / Cannes Lions), composition réfléchie (grille, équilibre asymétrique, layering, hiérarchie), typographie display cohérente avec le secteur (jamais Arial/Times basique), éléments graphiques choisis SELON le produit (badge prix uniquement si promo, splash/textures uniquement si pertinent, etc. — ne pas surcharger un service B2B premium), palette dérivée du réglage avancé si fourni sinon dérivée des codes du secteur, lumière et matières crédibles.
5) INTERDITS : contredire un réglage avancé utilisateur, plaquer un style food sur un service B2B (ou inversement), inventer des éléments hors brief, "template Canva basique", composition plate sans hiérarchie, palette en contradiction avec la palette fournie par l'utilisateur, références culturelles incohérentes avec le marché ciblé, surcharge graphique inadaptée au secteur.
Le paragraphe doit être DENSE, SPÉCIFIQUE au produit/service exact, et lisiblement personnalisé — pas une liste générique réutilisable pour n'importe quel brief.]${params.contentType === 'carousel' ? `\nAjouter pour le CARROUSEL : système de design UNIFIÉ sur les ${params.slidesCount || 4} slides (même palette, typographie, éléments décoratifs, lumière), chaque slide publiable seule comme une affiche pro, cohérence visuelle stricte avec les inputs utilisateur.` : ''}

` : ''}Chaque bloc DOIT être séparé par une ligne vide (\\n\\n). Les titres de bloc (ex: "Scène & sujet principal :") DOIVENT apparaître tels quels suivis d'un saut de ligne puis du contenu.

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
${params.offerType === '📦 Produit' && params.referenceImageCount && params.referenceImageCount > 0 ? `
=== FIDÉLITÉ PRODUIT (RÈGLE ABSOLUE — NON NÉGOCIABLE) ===
Le produit affiché dans le visuel généré DOIT être STRICTEMENT le MÊME que celui de l'image de référence fournie : forme exacte, proportions, couleurs, matière, texture, packaging, étiquette, logo, typographie de l'étiquette, motifs, finitions, accessoires visibles. Aucune variation de design, aucune réinterprétation, aucune substitution. Le client doit reconnaître INSTANTANÉMENT son produit au premier coup d'œil.
TRAITEMENT AUTORISÉ — UNIQUEMENT amélioration photographique légère (entre +10% et +40% selon la qualité initiale de la photo de référence) :
• Nettoyer les imperfections (poussières, rayures parasites, reflets disgracieux, flou de mise au point, bruit numérique, balance des blancs).
• Améliorer la netteté, la définition des micro-détails, le rendu des matières, la profondeur, le contraste local.
• Optimiser la lumière (douce, sculptante, professionnelle) et les ombres réalistes cohérentes avec la scène.
• Conserver les couleurs RÉELLES du produit (pas de virage colorimétrique, pas de saturation excessive qui changerait la teinte d'origine).
Si la photo de référence est déjà très qualitative → amélioration proche de +10%. Si elle est moyenne/amateur → amélioration jusqu'à +40% maxi. JAMAIS au-delà : on ne redessine pas, on ne stylise pas, on ne "recrée" pas le produit.
INTERDITS STRICTS : changer la forme, la couleur, le packaging, l'étiquette ou le logo du produit ; remplacer par un produit générique ressemblant ; inventer des éléments absents (texte, mention, label, certification, parfum, variante) ; modifier les proportions ; styliser/illustrer/cartooniser le produit ; produire un rendu visiblement différent où le client ne reconnaîtrait pas son propre produit.
` : ''}

=== RÉGLAGES AVANCÉS ===
${params.ton ? `Ton: ${params.ton}` : 'Ton: automatique'}
${params.visualStyle ? `Style visuel: ${params.visualStyle}` : 'Style: automatique'}
${params.useCase ? `Cas d'utilisation (format narratif OBLIGATOIRE — cohérence 100%) : ${params.useCase}` : ''}
${params.showText
  ? (params.contentType === 'carousel' && params.slideTexts && params.slideTexts.filter(Boolean).length > 0
    ? `Textes des slides du carrousel (À REPRODUIRE EXACTEMENT MOT POUR MOT — UN texte PAR slide, dans l'ordre, AUCUNE modification ni ajout) :
${(params.slideTexts.slice(0, Math.max(1, Math.min(4, params.slidesCount || params.slideTexts.length))))
  .map((t, i) => `Slide ${i + 1}: "${(t || '').trim()}"`).join('\n')}
Position du texte (IDENTIQUE sur TOUTES les slides): ${
        params.textPosition === 'top-center' ? 'centré en haut'
      : params.textPosition === 'middle-center' ? 'centré au centre'
      : 'centré en bas'
    }.
Police d'écriture (IDENTIQUE sur TOUTES les slides): "${params.textFont || 'Montserrat'}".
${params.textColor ? `🎨 Couleur du texte (IDENTIQUE sur TOUTES les slides — OBLIGATOIRE) : ${params.textColor} (code hexadécimal exact). Tous les textes affichés DOIVENT être rendus EXACTEMENT dans cette couleur, sans variation entre slides. Ajouter uniquement un léger contour/ombre subtil pour la lisibilité si nécessaire, sans altérer la teinte.` : ''}
⚡ HARMONIE PARFAITE OBLIGATOIRE entre TOUTES les slides du carrousel : même typographie, même taille relative, même position, même hiérarchie visuelle, même palette, même traitement (ombre/contour si nécessaire), même rythme et même style éditorial — comme un seul système de design cohérent du début à la fin. Lisibilité maximale sur mobile, contraste fort, intégration native dans la composition (pas un simple sticker collé). Rendu digne d'un grand directeur artistique, optimisé pour la conversion. La slide 1 doit porter le hook le plus puissant ; les slides suivantes développent et culminent sur un call-to-action implicite ou explicite. Ne JAMAIS modifier le wording fourni.`
    : `Texte overlay (À REPRODUIRE EXACTEMENT, MOT POUR MOT, AUCUNE MODIFICATION NI AJOUT): "${params.textContent}"
Position du texte: ${
        params.textPosition === 'top-center' ? 'centré en haut'
      : params.textPosition === 'middle-center' ? 'centré au centre'
      : 'centré en bas'
    } — respecter STRICTEMENT cette position et ce nombre de lignes.
Police d'écriture: "${params.textFont || 'Montserrat'}" — utiliser cette typographie (ou la plus proche visuellement disponible), bien lisible, kerning soigné.
${params.textColor ? `🎨 Couleur du texte (OBLIGATOIRE — PRIORITÉ ABSOLUE) : ${params.textColor} (code hexadécimal exact). Le texte affiché DOIT être rendu EXACTEMENT dans cette couleur, sans dérive, sans variation de teinte, sans dégradé, sans effet de couleur additionnel. Ajouter UNIQUEMENT un léger contour ou une ombre portée subtile si nécessaire pour garantir la lisibilité sur le fond, sans altérer la couleur du texte.` : ''}
${(params.contentType === 'video' || params.contentType === 'image') && params.text2Enabled && params.textContent2
  ? `\n--- TEXTE À L'ÉCRAN N°2 — À REPRODUIRE EXACTEMENT MOT POUR MOT : "${params.textContent2}"
⚡ CONTINUITÉ NARRATIVE OBLIGATOIRE : ce Texte 2 est la SUITE COHÉRENTE et NATURELLE du Texte 1 ("${params.textContent}"). Les deux forment UN MÊME message en deux temps (hook → chute / call-to-action), sans répétition. ${params.contentType === 'image' ? 'Les deux textes sont visibles SIMULTANÉMENT dans l\'image, hiérarchisés visuellement (Texte 1 = accroche principale, Texte 2 = punchline / CTA secondaire). Chacun fait entre 3 et 7 mots MAXIMUM — JAMAIS plus.' : ''}
Position du texte 2: ${
        params.textPosition2 === 'top-center' ? 'centré en haut'
      : params.textPosition2 === 'middle-center' ? 'centré au centre'
      : 'centré en bas'
    } — respecter STRICTEMENT cette position.
Police d'écriture 2: "${params.textFont2 || 'Montserrat'}".
${params.textColor2 ? `🎨 Couleur du texte 2 (OBLIGATOIRE) : ${params.textColor2} (code hexadécimal exact) — appliquer EXACTEMENT cette couleur, sans dérive ni variation. Léger contour/ombre subtil autorisé uniquement pour la lisibilité.` : ''}
${params.contentType === 'video' ? `Timing à l'écran : Texte 1 apparaît à ${params.textStart1 ?? 0}s pendant ${params.textDuration1 ?? 3}s, puis Texte 2 apparaît à ${params.textStart2 ?? 0}s pendant ${params.textDuration2 ?? 3}s.` : ''}
⚡ HARMONIE OBLIGATOIRE entre Texte 1 et Texte 2 : cohérence typographique parfaite (même famille ou pair harmonieux), hiérarchie visuelle claire (poids/taille), palette cohérente, espacements équilibrés, rythme de lecture professionnel. Rendu digne d'un grand directeur artistique — composition équilibrée, lisibilité maximale, aucun chevauchement. Convertir avec impact, sans surcharge.`
  : ''}`)
  : 'Pas de texte overlay — NE PAS générer de texte, pancarte, étiquette, logo ou enseigne dans l\'image'}
${params.logoEnabled && params.logoUrl
  ? `🏷️ LOGO DE MARQUE (OBLIGATOIRE — PRIORITÉ ABSOLUE) : intégrer EXACTEMENT ce logo fourni par l'utilisateur, et AUCUN AUTRE. URL du logo (image de référence à utiliser telle quelle, fond déjà transparent) : ${params.logoUrl}\n• INTERDICTION ABSOLUE d'inventer, dessiner, recréer, redessiner, styliser, reinterpréter ou substituer un autre logo, monogramme, lettrage, icône, emblème ou marque. Reproduire À L'IDENTIQUE le logo fourni (formes, couleurs, typographie, proportions exactes).\n• Position : ${params.logoPosition === 'bottom-right' ? 'en bas à droite' : params.logoPosition === 'bottom-left' ? 'en bas à gauche' : params.logoPosition === 'top-left' ? 'en haut à gauche' : params.logoPosition === 'top-right' ? 'en haut à droite' : params.logoPosition === 'top-center' ? 'en haut au centre' : params.logoPosition === 'middle-left' ? 'au milieu à gauche' : params.logoPosition === 'middle-right' ? 'au milieu à droite' : 'en bas au centre'}. Taille discrète et professionnelle, parfaitement net, sans déformation, sans rotation, sans effet, sans recadrage du logo, sans ajout de texte autour, fond transparent préservé, ne couvre jamais le sujet principal.${params.contentType === 'video' ? `\n• Apparition dans la vidéo : ${params.logoAppearance === 'middle' ? "AU MILIEU de la vidéo (apparition à mi-parcours, environ à la moitié de la durée)" : params.logoAppearance === 'end' ? "À LA FIN de la vidéo (apparition sur les dernières secondes, comme signature de marque finale)" : "AU DÉBUT de la vidéo (apparition dès les premières secondes, dès l'ouverture)"} — le script et le storyboard DOIVENT explicitement indiquer ce timing d'apparition du logo, sans exception.` : ''}`
  : 'Pas de logo à intégrer'}
${params.paletteEnabled ? `🎨 PALETTE DE COULEURS ACTIVE (PRIORITÉ ABSOLUE — domine 60-80% du visuel, prévaut sur toute autre suggestion couleur y compris l'analyse d'images de référence): ${params.paletteHex.join(', ')}` : 'Palette automatique'}

⚠️ RAPPEL FINAL — Les RÉGLAGES AVANCÉS ci-dessus (palette, ton, style visuel, texte overlay, logo, position, police, couleur) renseignés par l'utilisateur sont STRICTEMENT PRIORITAIRES sur toute autre source (analyse d'images, suggestions automatiques). Appliquer EXACTEMENT comme demandé.

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
  aiModel?: string;
  format?: string;
  slidesCount?: number;
  offerType?: string;
  offerName?: string;
  offerDescription?: string;
  persona?: string;
  market?: string;
  marketingAngle?: string;
  ton?: string;
  visualStyle?: string;
  freeDescription?: string;
  promptValide?: string;
  advancedSettings?: string;
  productImageUrl?: string;
  productAnalysis?: string;
  viralAnalysis?: string;
  text1?: string;
  text2?: string;
  slideTexts?: string[];
}): Promise<PlatformCaptions> {
  const isVideo = params.contentType === 'video';
  const isCarousel = params.contentType === 'carousel';
  const contentLabel = isVideo ? 'vidéo' : isCarousel ? 'carrousel' : 'image';

  const systemPrompt = `Tu es le moteur intelligent de génération finale de contenu de CréaFacile.

Mission : lorsque l'utilisateur clique sur "Générer le visuel", tu génères automatiquement des captions optimisées 2026 pour Facebook, Instagram, TikTok et LinkedIn, parfaitement cohérentes avec le visuel généré, le ton, le style, le persona, le marché, l'objectif marketing et les textes présents dans le visuel.

Le PROMPT_VALIDE qui sert à générer le visuel est traité STRICTEMENT IDENTIQUE par le modèle IA (jamais reformulé, résumé ou nettoyé). Ta tâche ici porte uniquement sur les captions.

Type de contenu actuel : ${contentLabel}.

━━━━━━━━━━━━━━━━━━
MISSION DES CAPTIONS
━━━━━━━━━━━━━━━━━━
Chaque caption doit :
- sembler écrite par une vraie personne (jamais détectable comme IA),
- être naturelle, émotionnelle, fluide, crédible,
- cohérente avec le visuel généré, le ton, le style visuel, le secteur, le persona, l'objectif marketing, le marché ciblé et les textes présents dans le visuel,
- augmenter engagement, commentaires, sauvegardes, partages, watch time, clics, conversion.

━━━━━━━━━━━━━━━━━━
ANTI-DÉTECTION IA OBLIGATOIRE
━━━━━━━━━━━━━━━━━━
Toujours : variations naturelles, rythme irrégulier, phrases courtes + longues, vocabulaire simple, émotions naturelles, micro imperfections humaines, spontanéité crédible.
Autorisé : "franchement", "honnêtement", "en vrai", "bon", "tu savais ?", "tu fais ça aussi ?", "qu'est-ce que t'en penses ?".
INTERDIT : "dans le paysage numérique actuel", "plongeons dans", "sans plus attendre", "il est important de noter", "à l'ère digitale", et tout jargon corporate.

━━━━━━━━━━━━━━━━━━
STRUCTURE OBLIGATOIRE (par caption)
━━━━━━━━━━━━━━━━━━
HOOK — accroche ultra forte qui stoppe le scroll immédiatement (0-2s).
DESCRIPTION — texte humain cohérent avec le visuel et le contexte.
CTA — naturel, jamais agressif, format conversationnel/question.
HASHTAGS — SEO 2026 : mix niche + activité + secteur + marché + intention + tendance + branding, séparés par espaces, tous préfixés #.

SÉPARATION STRICTE : le CTA va UNIQUEMENT dans le champ "cta". Il ne doit JAMAIS apparaître dans "description". La description ne se termine pas par une question/CTA.

━━━━━━━━━━━━━━━━━━
RÈGLES ALGORITHMES 2026 PAR RÉSEAU
━━━━━━━━━━━━━━━━━━

📘 FACEBOOK — Objectif : commentaires longs, réactions émotionnelles, partages.
• Style : conversationnel, humain, chaleureux, relatable.
• Longueur : 40 à 80 mots.
• CTA : encourager commentaire ou partage.
• Hashtags : 3 à 8 max.

📸 INSTAGRAM — Objectif : sauvegardes, partages story, commentaires, SEO interne 2026.
• Style : aspirationnel, authentique, expert ou lifestyle selon secteur.
• Longueur : 150 à 300 mots max.
• Hook qui stoppe le scroll immédiatement.
• CTA : sauvegarde, partage story, commentaire mot-clé, lien bio subtil.
• Hashtags : 3 à 8 max.

🎵 TIKTOK — Objectif : rétention, commentaires, SEO TikTok, partages, rewatch.
• Style : brut, direct, spontané, conversationnel.
• Longueur : 50 à 150 caractères max.
• CTA : commentaire, stitch, duet, lien bio subtil.
• Hashtags : 3 à 8 max, mix niche + viral (#fyp, #pourtoi…) + trending.

💼 LINKEDIN — Objectif : dwell time, conversations, crédibilité, commentaires longs, expertise.
• Style : professionnel humain, storytelling business, expertise naturelle.
• Longueur : 150 à 300 mots.
• CTA : ouvrir une discussion.
• Hashtags : 3 à 8 max.

${isCarousel ? `━━━━━━━━━━━━━━━━━━
CARROUSEL — CAPTIONS PAR SLIDE
━━━━━━━━━━━━━━━━━━
Le contenu est un CARROUSEL de ${params.slidesCount || 4} slides. Tu DOIS aussi générer une caption par slide (slide_1, slide_2, slide_3, slide_4 selon le nombre) :
- slide 1 : hook fort + curiosité immédiate,
- slide 2 : continuité + teasing slide suivante,
- slide 3 : preuve, émotion ou bénéfice,
- slide 4 : CTA subtil ou conclusion mémorable.
Chaque caption slide : 20 à 40 mots max, cohérente avec le texte slide et le visuel, pensée pour augmenter le swipe rate.
` : ''}
${isVideo ? `━━━━━━━━━━━━━━━━━━
VIDÉO — RENFORTS
━━━━━━━━━━━━━━━━━━
Les captions doivent renforcer la rétention, créer la curiosité avant lecture, être cohérentes avec le hook vidéo, amplifier émotion et tension. Utiliser : curiosité, contradiction, relatable, frustration, émotion, preuve, bénéfice immédiat.
` : ''}

━━━━━━━━━━━━━━━━━━
ADAPTATION MARCHÉ / LOCALISATION
━━━━━━━━━━━━━━━━━━
Si un marché/localisation est renseigné : adapter expressions, références culturelles, habitudes sociales, vocabulaire, ton émotionnel et CTA. Sinon, rester universel et neutre.

━━━━━━━━━━━━━━━━━━
RÈGLES HASHTAGS 2026
━━━━━━━━━━━━━━━━━━
Mixer hashtags niche + intention + activité + secteur + tendance + branding. Jamais spammer, jamais > 8, jamais incohérents.

━━━━━━━━━━━━━━━━━━
VALIDATION QUALITÉ AVANT OUTPUT
━━━━━━━━━━━━━━━━━━
✓ hook stop-scroll fort ✓ cohérence visuel/objectif/persona/ton/angle ✓ captions naturelles ✓ aucune structure IA visible ✓ CTA naturel ✓ hashtags cohérents ✓ cohérence avec textes écran/slides ✓ optimisation algorithme 2026 ✓ émotion présente ✓ potentiel engagement élevé. Si une condition échoue, régénérer mentalement avant d'écrire.

━━━━━━━━━━━━━━━━━━
OUTPUT — JSON STRICT
━━━━━━━━━━━━━━━━━━
Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour), exclusivement en français, naturel, humain, émotionnel, optimisé conversion/engagement/algorithmes 2026, impossible à détecter comme IA.

Format strict :
{"facebook":{"hook":"...","description":"...","cta":"...","hashtags":"#..."},"instagram":{"hook":"...","description":"...","cta":"...","hashtags":"#..."},"tiktok":{"hook":"...","description":"...","cta":"...","hashtags":"#..."},"linkedin":{"hook":"...","description":"...","cta":"...","hashtags":"#..."}${isCarousel ? ',"slides":{"slide_1":"...","slide_2":"...","slide_3":"...","slide_4":"..."}' : ''}}`;

  const userPrompt = `INPUTS DISPONIBLES

TYPE_DE_CONTENU : ${contentLabel}
MODELE_IA : ${params.aiModel || 'non précisé'}
FORMAT : ${params.format || 'non précisé'}
${isCarousel ? `NOMBRE_DE_SLIDES : ${params.slidesCount || 4}` : ''}

TYPE_OFFRE : ${params.offerType || 'non précisé'}
NOM_OFFRE : ${params.offerName || 'non précisé'}
DESCRIPTION_OFFRE : ${params.offerDescription || 'non précisé'}

ACTIVITE_PRINCIPALE : ${params.activity || 'non précisé'}
SECTEUR_ACTIVITE : ${params.sector || 'non précisé'}
CLIENT_CIBLE_PERSONA : ${params.persona || 'non précisé'}
MARCHE_LOCALISATION : ${params.market || 'non précisé'}

OBJECTIF_CONTENU : ${params.objective || 'engagement et visibilité'}
ANGLE_MARKETING : ${params.marketingAngle || 'non précisé'}
TON_ECRITURE : ${params.ton || 'non précisé'}
STYLE_VISUEL : ${params.visualStyle || 'non précisé'}

IDEE_CONTENU_RETENUE : ${params.idea || 'non précisé'}
DESCRIPTION_LIBRE : ${params.freeDescription || 'non précisé'}

PROMPT_VALIDE (utilisé tel quel pour le visuel — pour information uniquement) :
${params.promptValide || 'non fourni'}

REGLAGES_AVANCES : ${params.advancedSettings || 'aucun'}

${params.productImageUrl || params.productAnalysis ? `SI PRODUIT ANALYSÉ
IMAGE_PRODUIT : ${params.productImageUrl || 'non fourni'}
PRODUIT_ANALYSE : ${params.productAnalysis || 'non fourni'}
` : ''}
${params.viralAnalysis ? `SI POST VIRAL ANALYSÉ
ANALYSE_VIRAL : ${params.viralAnalysis}
` : ''}

TEXTES VISUELS
TEXTE_ECRAN_1 : ${params.text1 || '—'}
TEXTE_ECRAN_2 : ${params.text2 || '—'}
${isCarousel ? `TEXTE_SLIDE_1 : ${params.slideTexts?.[0] || '—'}
TEXTE_SLIDE_2 : ${params.slideTexts?.[1] || '—'}
TEXTE_SLIDE_3 : ${params.slideTexts?.[2] || '—'}
TEXTE_SLIDE_4 : ${params.slideTexts?.[3] || '—'}` : ''}

Génère maintenant les captions Facebook, Instagram, TikTok et LinkedIn${isCarousel ? ' + les captions par slide' : ''} en respectant STRICTEMENT toutes les règles ci-dessus, et retourne UNIQUEMENT le JSON demandé.`;

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
  inputImageUrl?: string,
  abortSignal?: AbortSignal,
  logoUrl?: string,
) {
  // === OpenRouter models (Nano Banana, GPT Image 5, Grok) ===
  // NOTE: Imagen 4 variants are NOT on OpenRouter — they route through kie.ai below.
  const openRouterModels: AIModel[] = [
    'nano-banana-2', 'nano-banana-pro',
    'gpt-image-5', 'gpt-image-5-mini', 'grok-image',
    'seedream-4.5',
  ];
  if (openRouterModels.includes(aiModel)) {
    if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
    const { data, error } = await supabase.functions.invoke('kreator-ai', {
      body: {
        action: 'openrouter_generate_image',
        prompt: promptEn,
        ai_model: aiModel,
        size: format,
        input_image_url: inputImageUrl || '',
        logo_url: logoUrl || '',
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const imageUrl = data?.image_url;
    if (!imageUrl) throw new Error('No image generated (OpenRouter)');
    return imageUrl;
  }

  // All image models are now routed through kie.ai
  const isKieImageModel = [
    'qwen/image-edit', 'ideogram/character', 'ideogram/image',
    'dall-e-3', 'nano-banana-2', 'nano-banana-pro',
    'imagen-4', 'imagen-4-ultra', 'imagen-4-fast',
  ].includes(aiModel);

  // === kie.ai image models — start + polling ===
  if (isKieImageModel) {
    if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
    const { data: startData, error: startError } = await supabase.functions.invoke('kreator-ai', {
      body: {
        action: 'kie_start_image',
        prompt: promptEn,
        ai_model: aiModel,
        size: format,
        input_image_url: inputImageUrl || '',
        logo_url: logoUrl || '',
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
      if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      const { data: pollData, error: pollError } = await supabase.functions.invoke('kreator-ai', {
        body: { action: 'kie_poll_image', task_id: taskId },
      });
      if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
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
  marketingAngle?: string;
  tone?: string;
  persona?: string;
  useCase?: string;
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
- ANTI-IA ABSOLU : 100% naturel, authentique, humain, réel. INTERDIT : "découvrez", "plongez dans", "révolutionnaire", "incontournable", "boostez", "transformez", "libérez", "n'attendez plus", "le secret", "voici comment", "à l'ère du", "dans un monde où", formulations trop équilibrées/symétriques, ton corporate ou pseudo-inspirant. Écris comme un vrai humain qui parle à un ami : direct, vivant, irrégulier, jamais détectable comme IA.

CONTRAINTE DURÉE ABSOLUE :
La voix off DOIT pouvoir être dite en ${maxSec} secondes MAXIMUM (≈ ${maxWords} mots, ≈ ${maxChars} caractères max). C'est non-négociable : elle doit se terminer 2 secondes avant la fin de la vidéo.

Réponds UNIQUEMENT avec le texte de la voix off, sans guillemets, sans introduction, sans mise en forme, sans préfixe.`;

  const userPrompt = `INPUTS PRIORITAIRES — à respecter STRICTEMENT pour rédiger la voix off :

• Type d'offre (PRIORITÉ HAUTE) : ${params.offerType || 'non précisé'}
• Nom (PRIORITÉ HAUTE) : ${params.productName || 'non précisé'}
• Description (PRIORITÉ HAUTE) : ${params.productDescription || 'non précisée'}
• Ton d'écriture (PRIORITÉ TRÈS HAUTE — adopte EXACTEMENT ce ton, vocabulaire, rythme et registre) : ${params.tone || 'non précisé'}
• Client cible / persona (PRIORITÉ HAUTE — parle DIRECTEMENT à cette personne, avec ses mots) : ${params.persona || 'non précisé'}
• Objectif du contenu (PRIORITÉ TRÈS HAUTE — la voix off doit servir cet objectif marketing) : ${params.objective || 'non précisé'}
• Cas d'utilisation (PRIORITÉ TRÈS HAUTE — respecte le format et l'intention de ce cas d'usage) : ${params.useCase || 'non précisé'}
${params.marketingAngle ? `• Angle marketing (contexte secondaire) : ${params.marketingAngle}` : ''}

Écris UNE voix off courte, percutante, dicible en ${maxSec} secondes maximum, en respectant STRICTEMENT le ton, le persona, l'objectif et le cas d'utilisation ci-dessus.`;

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
  maxWords?: number;
}): Promise<string> {
  const maxWords = Math.max(1, Math.min(7, params.maxWords ?? 7));
  const systemPrompt = `Tu es un expert en copywriting publicitaire pour réseaux sociaux (Meta, TikTok, Instagram, LinkedIn).
Tu écris UN TEXTE court à afficher À L'ÉCRAN dans un visuel (image / carrousel / vidéo) qui MAXIMISE la conversion.

RÈGLES ABSOLUES :
- Langue : français
- Longueur : ENTRE 3 ET ${maxWords} MOTS MAXIMUM (compte chaque mot). Non négociable.
- 1 seule phrase ou formule, ultra lisible d'un coup d'œil (scroll-stop)
- Hook persuasif aligné sur l'objectif marketing et l'angle
- Adapté au persona, au secteur, au type d'offre, au ton et au style visuel
- Pas de guillemets, pas d'emoji superflu (1 emoji max si vraiment utile)
- Pas de hashtag, pas de mention @, pas de ponctuation finale lourde
- Évite le jargon corporate, parle comme un humain, va droit au but
- Le texte doit être IMMÉDIATEMENT compréhensible et déclencher le clic / l'arrêt du scroll
- ANTI-IA ABSOLU : 100% naturel, authentique, humain, réel. INTERDIT : "découvrez", "plongez dans", "révolutionnaire", "incontournable", "boostez", "transformez", "libérez", "n'attendez plus", "le secret", "voici comment", "à l'ère du", "dans un monde où", formulations trop équilibrées/symétriques, ton corporate ou pseudo-inspirant. Écris comme un vrai humain parle, direct, vivant, sans tournure d'IA.
${params.variant === 2 ? `- Ce texte est le 2e à apparaître dans le visuel : il DOIT être une SUITE COHÉRENTE et NATURELLE du 1er texte (continuité narrative directe, même fil de pensée), qui le complète sans le répéter — idéalement une chute punchy, une révélation ou un mini call-to-action qui découle logiquement du 1er.` : ''}
${params.excludeText ? `- 1ER TEXTE (à prolonger sans répéter ni paraphraser) : "${params.excludeText}". Ton texte doit s'enchaîner naturellement après celui-ci, comme la suite d'une même phrase ou idée.` : ''}

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

Écris LE texte à afficher dans le visuel, entre 3 et ${maxWords} mots MAX, qui maximise la conversion.`;

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
  // Hard cap at maxWords words
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(' ');
  }
  // Strip trailing punctuation
  text = text.replace(/[.,;:!?]+$/g, '').trim();
  return text;
}

export async function generateSlideTexts(params: {
  count: number;
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
  maxWords?: number;
}): Promise<string[]> {
  const count = Math.max(1, Math.min(4, params.count || 2));
  const maxWords = Math.max(1, Math.min(7, params.maxWords ?? 7));
  const systemPrompt = `Tu es un expert en copywriting publicitaire pour carrousels Instagram/TikTok/LinkedIn.
Tu génères ${count} textes courts à afficher à l'écran, UN PAR SLIDE d'un carrousel de ${count} slides, parfaitement HARMONIEUX entre eux, qui maximisent la conversion.

RÈGLES ABSOLUES :
- Langue : français.
- Chaque texte : ENTRE 3 ET ${maxWords} MOTS MAXIMUM. Compte chaque mot. Non négociable.
- Un seul texte par slide (pas de retour à la ligne).
- HARMONIE / COHÉRENCE NARRATIVE PARFAITE entre les ${count} slides : même ton, même registre, même rythme, même style éditorial — comme s'il s'agissait d'un seul mini-script découpé.
- Progression narrative orientée conversion :
  • Slide 1 = HOOK 0-2s ultra puissant (scroll-stop, curiosité/émotion/promesse).
  • Slides intermédiaires = développement, preuve, bénéfice ou tension.
  • Slide ${count} = CALL-TO-ACTION ou chute mémorable qui pousse à l'action.
- Aucune répétition d'un mot fort entre les slides (sauf si effet voulu).
- Pas de guillemets, pas de hashtag, pas d'emoji superflu (1 emoji max sur l'ensemble), pas de ponctuation finale lourde.
- Pas de jargon corporate, on parle humain, direct, percutant.
- ANTI-IA ABSOLU : 100% naturel, authentique, humain, réel. INTERDIT : "découvrez", "plongez dans", "révolutionnaire", "incontournable", "boostez", "transformez", "libérez", "n'attendez plus", "le secret", "voici comment", "à l'ère du", "dans un monde où", formulations trop symétriques/équilibrées, ton corporate ou pseudo-inspirant. Écris comme un vrai humain parle.

RETOURNE UNIQUEMENT un JSON valide sans markdown :
{"slides":["texte slide 1","texte slide 2"${count >= 3 ? ',"texte slide 3"' : ''}${count >= 4 ? ',"texte slide 4"' : ''}]}`;

  const userPrompt = `=== CONTEXTE ===
Type de contenu: carrousel
Nombre de slides: ${count}
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

Écris les ${count} textes à afficher dans chaque slide (1 à ${maxWords} mots chacun), 100% cohérents entre eux et optimisés pour la conversion.`;

  const data = await callKreatorAI({
    action: 'generate_slide_texts',
    messages: [{ role: 'user', content: userPrompt }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');
  let parsed: { slides?: string[] } = {};
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response');
  }
  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let t = (slides[i] || '').toString().trim();
    t = t.replace(/^["«»"'`]+|["«»"'`]+$/g, '').trim().replace(/\s+/g, ' ');
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) t = words.slice(0, maxWords).join(' ');
    t = t.replace(/[.,;:!?]+$/g, '').trim();
    out.push(t);
  }
  return out;
}
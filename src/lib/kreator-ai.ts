import { supabase } from '@/integrations/supabase/client';
import type { AIModel, ModelSettings } from '@/store/useKreatorStore';

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

/**
 * Ensure the generated French prompt is aerated with real line breaks
 * between every "[SECTION ...]" block, even when the LLM returns it as
 * a single dense line.
 */
function formatPromptWithLineBreaks(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  let txt = raw.replace(/\r\n/g, '\n');
  // Convert literal "\n" sequences (when LLM returns them escaped) into real newlines
  txt = txt.replace(/\\n/g, '\n');
  // Insert a blank line before every [SECTION ...] / [SECTION FINALE] marker
  txt = txt.replace(/\s*(\[SECTION[^\]]*\])\s*/g, '\n\n$1\n');
  // After the section title (ends with ":"), ensure the content starts on a new line
  txt = txt.replace(/(\[SECTION[^\]]*\][^:\n]*:)[ \t]*/g, '$1\n');
  // Also break before other well-known section headers the master prompt produces,
  // in case the LLM emits them without the [SECTION] bracket prefix.
  const headers = [
    'Scène & sujet principal',
    'Produit / offre mis en avant',
    'BACKGROUND PUISSANT & ANGLE MARKETING',
    'Déroulé / scènes',
    'Déroulé des slides',
    'Personnalisation',
    'Format & rendu technique',
    'Positions exactes des éléments',
    'Direction artistique premium',
    'Instructions négatives',
  ];
  for (const h of headers) {
    const re = new RegExp(`\\s*(${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n:]{0,80}:)\\s*`, 'g');
    txt = txt.replace(re, '\n\n$1\n');
  }
  // Collapse 3+ blank lines to exactly one blank line
  txt = txt.replace(/\n{3,}/g, '\n\n');
  // Trim trailing/leading whitespace
  return txt.trim();
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
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.prompt_fr === 'string') {
      parsed.prompt_fr = formatPromptWithLineBreaks(parsed.prompt_fr);
    }
    return parsed;
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
  marketingAngle?: string;
  slidesCount?: number;
}): Promise<{ ideas: ContentIdea[] }> {
  const systemPrompt = `Tu es un expert en marketing digital viral et copywriting de conversion (Facebook, Instagram, TikTok, LinkedIn — recommandations algorithmes 2026).

RÈGLE LANGUE — ABSOLUE, NON NÉGOCIABLE, PRIORITÉ MAXIMALE :
Tu rédiges EXCLUSIVEMENT en FRANÇAIS. TOUTE la réponse — hook, concept, angle, chaque mot, chaque expression — doit être 100% en français. ZERO mot anglais, ZERO expression anglaise, ZERO anglicisme, ZERO terme technique non traduit. Si un concept existe en anglais, tu le traduis en français naturel et courant. Cette règle prime sur absolument tout le reste.

OBJECTIF : Générer EXACTEMENT 3 idées de contenu SIMPLES, CLAIRES, CONCISES, qui vont DROIT À L'ESSENTIEL, 100% orientées CONVERSION et RÉSULTAT, et TOUJOURS parfaitement COHÉRENTES avec l'OBJECTIF DU CONTENU choisi et le TYPE DE CONTENU choisi (image / carousel / vidéo).
Les 3 idées doivent être TRÈS DIFFÉRENTES dans leur exécution (hook, mise en scène, accroche), MAIS si un ANGLE MARKETING est fourni, elles doivent TOUTES les 3 respecter STRICTEMENT cet angle imposé (fil conducteur narratif obligatoire).
Chaque idée doit être en COHÉRENCE PARFAITE avec : type d'offre, nom de l'offre, description, activité/métier, persona cible, objectif du contenu, TYPE DE CONTENU (image / carousel / vidéo) et cas d'utilisation. Aucun blabla, aucune phrase décorative : que de l'utile, orienté action et résultat mesurable.

STRUCTURE STRICTE de chaque idée :
- hook : phrase d'accroche scroll-stop 0-2s, ultra punchy, simple et directe, max 60 caractères, avec emoji en début. Doit refléter directement l'OBJECTIF DU CONTENU.
- concept : description SIMPLE, CLAIRE, CONCISE de l'idée (ce qu'on voit / entend / lit), STRICTEMENT ENTRE 12 ET 18 MOTS, va DROIT À L'ESSENTIEL, 100% orientée CONVERSION et RÉSULTAT, STRICTEMENT cohérente avec l'OBJECTIF DU CONTENU, le TYPE DE CONTENU choisi, le nom de l'offre, la description et le cas d'utilisation. Zéro mot inutile, zéro tournure littéraire.
- angle : nom court de l'angle marketing (1 à 3 mots), sans explication supplémentaire.

RÈGLE TYPE DE CONTENU — ABSOLUE (NON NÉGOCIABLE, PRIORITÉ MAXIMALE) :
Les 3 idées DOIVENT être pensées, formulées et exécutables NATIVEMENT dans le TYPE DE CONTENU sélectionné (image, carousel ou vidéo). Aucune idée ne peut être hors-format.
- SI TYPE = image : chaque idée doit être une SCÈNE FIXE unique, lisible instantanément en une seule photo/visuel (un seul moment, un seul cadrage, un seul message visuel fort). Interdit : "scène 1 / scène 2", "puis", déroulé temporel, slides, narration multi-étapes, voix-off, mouvement.
- SI TYPE = carousel : chaque idée doit être un PARCOURS multi-slides avec une progression logique slide après slide (slide 1 = hook, slides intermédiaires = développement, dernière slide = chute / CTA). Le concept doit clairement laisser entendre cette structure en slides ET être CONÇU EXACTEMENT pour le NOMBRE DE SLIDES indiqué dans le contexte (ni plus, ni moins). La structure narrative doit tenir précisément dans ce nombre de slides imposé. Interdit : narration vidéo (mouvement, voix-off, scènes filmées) ou simple image unique.
- SI TYPE = vidéo : chaque idée doit être une SÉQUENCE filmée et animée avec hook 0-2s, déroulé en plans/scènes, rythme et chute. Le concept doit refléter le mouvement, la voix, l'action, le timing. Interdit : description d'image fixe ou de slides statiques.
Le hook et le concept doivent rendre OBVIOUS le type de contenu visé sans qu'il soit nécessaire de le préciser. Une idée qui pourrait aussi bien être un autre type est INVALIDE.

RÈGLE HOOK — ABSOLUE (NON NÉGOCIABLE) :
Le hook DOIT être ULTRA PUISSANT, scroll-stop immédiat (0-2s), émotionnel/intrigant/choquant/provoquant une curiosité irrésistible, JAMAIS mou, descriptif ni générique. Il doit être directement dans le SENS de l'OBJECTIF DU CONTENU et respecter EXACTEMENT le TON D'ÉCRITURE demandé (vocabulaire, niveau de langue, énergie, rythme, registre). Un hook qui s'écarte de l'objectif, du ton ou du cas d'utilisation est INVALIDE.

RÈGLE CAS D'UTILISATION — ABSOLUE (NON NÉGOCIABLE) :
Les 3 idées DOIVENT être en ACCORD PARFAIT À 100% avec le CAS D'UTILISATION choisi (format narratif obligatoire : Avant/Après, UGC, Témoignage, Démonstration, Comparatif, FAQ, Hook Viral, etc.), QUEL QUE SOIT le TYPE DE CONTENU (image, carrousel, vidéo). Aucune idée hors-format n'est tolérée. Le hook lui-même doit refléter ce cas d'utilisation.

RÈGLE ANGLE MARKETING — ABSOLUE (NON NÉGOCIABLE, PRIORITÉ MAXIMALE) :
Si un ANGLE MARKETING est fourni en contexte, il est PRIORITAIRE sur tout le reste (avant même le cas d'utilisation). Les 3 idées DOIVENT impérativement décliner cet angle exact (ex : "Avant / Après", "Comparatif", "Témoignage client", "Démonstration produit", "Offre spéciale", "Storytelling", etc.). Le champ "angle" de chaque idée DOIT reprendre littéralement le nom de cet angle imposé. Toute idée qui s'écarte de l'angle marketing fourni est INVALIDE.
SI AUCUN ANGLE MARKETING N'EST FOURNI : tu DOIS déduire toi-même UN SEUL angle marketing à partir de l'OBJECTIF DU CONTENU et du TYPE DE CONTENU (image / carousel / vidéo), puis l'appliquer STRICTEMENT et IDENTIQUEMENT aux 3 idées (fil conducteur unique). Référentiel de déduction obligatoire selon l'objectif :
- "🧲 Attirer" → angles type : "Hook Viral", "Curiosité", "Avant / Après", "Lifestyle aspirationnel".
- "📚 Éduquer" → angles type : "Pédagogique", "Mythe vs Réalité", "Étapes clés", "Erreurs à éviter".
- "🤝 Convaincre" → angles type : "Preuve sociale", "Témoignage client", "Étude de cas", "Comparatif".
- "💰 Vendre" → angles type : "Offre spéciale", "Bénéfices clés", "Démonstration produit", "Urgence / Rareté".
- "🔁 Fidéliser" → angles type : "Coulisses", "Communauté", "Astuce exclusive", "Storytelling de marque".
Choisis UN angle dans la liste correspondant à l'objectif (ou un angle équivalent ultra pertinent) et applique-le aux 3 idées. Le champ "angle" de chaque idée DOIT reprendre littéralement ce même nom d'angle déduit.

RÈGLE OBJECTIF DU CONTENU — ABSOLUE (NON NÉGOCIABLE) :
Les 3 idées doivent être COHÉRENTES À 100 % avec l'OBJECTIF DU CONTENU choisi. L'intention de chaque hook et de chaque concept doit servir directement cet objectif (attirer = scroll-stop curieux ; éduquer = transmettre une info claire ; convaincre = lever un doute / apporter une preuve ; vendre = pousser à l'achat avec bénéfice + déclencheur ; fidéliser = renforcer le lien et la préférence). Toute idée hors-objectif est INVALIDE.

RÈGLE SYNTHÈSE CONTEXTE — ABSOLUE (NON NÉGOCIABLE, PRIORITÉ MAXIMALE) :
Chacune des 3 idées DOIT être la SYNTHÈSE FIDÈLE de TOUS les champs renseignés en contexte, sans en oublier un seul. Elle doit obligatoirement :
1) parler explicitement et nommément du produit/service tel qu'il est nommé (champ "Nom de l'offre") et fidèle à sa description (champ "Description") — jamais d'un produit générique ;
2) être pensée pour le TYPE DE CONTENU exact (image / carousel / vidéo) ;
3) suivre À LA LETTRE l'ANGLE MARKETING fourni (ou déduit) comme format narratif imposé ;
4) servir directement l'OBJECTIF DU CONTENU ;
5) viser explicitement la cible définie dans "Client cible / Persona" ;
6) être écrite intégralement dans le TON D'ÉCRITURE imposé (vocabulaire, niveau de langue, rythme, énergie) ;
7) être plausible et crédible pour quelqu'un qui exerce l'ACTIVITÉ / MÉTIER dans le SECTEUR indiqué (point de vue émetteur = "je suis / je fais [activité] dans [secteur]").
EXEMPLES de raisonnement attendu (à appliquer systématiquement, jamais à recopier littéralement) :
- Si offre = produit, nom = "bissap juice", description = "jus de bissap sain et naturel", activité = X, secteur = Y, persona = Z, objectif = "🧲 Attirer", ton = "direct / cash", type = "image", angle = "Avant / Après" → les 3 idées doivent être 3 visuels FIXES "Avant / Après mon bissap juice", qui parlent du bissap juice (jus de bissap sain et naturel), s'adressent à Z, sont formulées en ton direct / cash, et ont pour but d'attirer Z en arrêtant le scroll. AUCUNE idée ne peut être hors-produit, hors-angle, hors-objectif, hors-persona, hors-ton ou hors-format.
- Si offre = service, nom = "coaching fitness en ligne", description = "programme personnalisé pour perdre 5 kg en 30 jours sans salle de sport", activité = X, secteur = Y, persona = Z, objectif = "🧲 Attirer", ton = "direct / cash", type = "image", angle = "Avant / Après" → les 3 idées doivent être 3 visuels FIXES "Avant / Après mon coaching fitness en ligne", qui parlent du coaching fitness (programme personnalisé pour perdre 5 kg en 30 jours sans salle), s'adressent à Z, sont formulées en ton direct / cash, et ont pour but d'attirer Z en arrêtant le scroll. AUCUNE idée ne peut être hors-service, hors-angle, hors-objectif, hors-persona, hors-ton ou hors-format.
Toute idée qui ne synthétise pas TOUS ces champs simultanément est INVALIDE et doit être réécrite.

RÈGLES :
- Toujours STRICTEMENT COHÉRENT avec TOUS les éléments fournis : type d'offre, nom, description, activité/métier, secteur, marché, persona, objectif, type de contenu, cas d'utilisation et ton d'écriture.
- Respecter scrupuleusement le cas d'utilisation choisi (ex : Avant/Après, UGC, Témoignage, Démonstration, Comparatif, FAQ, etc.) — c'est le format narratif obligatoire de chaque idée.
- Le hook doit IMPÉRATIVEMENT refléter l'objectif du contenu et adopter le ton d'écriture demandé.
- concept = entre 12 et 18 mots, simple, clair, concis, STRICTEMENT en cohérence avec nom + description + objectif + cas d'utilisation (le cas d'utilisation est le format narratif obligatoire).
- Optimisé conversion + recommandations algorithmes 2026 (rétention, partage, commentaires).
- Tous les angles doivent sonner NATURELS, fluides, humains — jamais robotiques, jamais "vendeurs", jamais clichés marketing.
- FRANÇAIS EXCLUSIF, sans markdown, sans guillemets superflus.

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
${input.contentType === 'carousel' && input.slidesCount ? `Nombre de slides du carrousel (OBLIGATOIRE — chaque idée doit être structurée EXACTEMENT en ${input.slidesCount} slides) : ${input.slidesCount}` : ''}
${input.marketingAngle ? `Angle marketing (PRIORITAIRE — fil conducteur OBLIGATOIRE des 3 idées) : ${input.marketingAngle}` : ''}
${input.tone ? `Ton d'écriture : ${input.tone}` : ''}

Génère 3 idées de contenu ULTIMES qui convertissent le plus, avec des angles marketing puissants et TRÈS différents, en cohérence parfaite avec TOUT ce contexte. RAPPEL CRITIQUE : les 3 idées doivent être NATIVEMENT et EXCLUSIVEMENT pensées pour le TYPE DE CONTENU = "${input.contentType}" (${input.contentType === 'image' ? 'une seule scène fixe lisible en une image' : input.contentType === 'carousel' ? 'un parcours multi-slides avec progression' : 'une séquence filmée animée avec hook, plans et chute'}). Aucune idée hors-format n'est tolérée.`;

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
  productService?: string;
  productDescription?: string;
}) {
  const systemPrompt = `Tu es un expert en marketing et personas client. Génère exactement 3 profils de persona ULTRA pertinents pour le contexte fourni.

RETOURNE UNIQUEMENT un JSON valide sans markdown, exactement ce format :
{"personas":[{"id":1,"profil":"Nom + âge + situation courte (ex: Marie, 34 ans, maman active)","contexte_rapide":"1 phrase sur son contexte de vie / pro","csp":"CSP+ / CSP / employé / étudiant / retraité / dirigeant…","probleme":"problème principal qu'il/elle rencontre","objectif":"objectif principal qu'il/elle cherche à atteindre"},{"id":2,...},{"id":3,...}],"best_id":1,"best_reason":"raison courte"}

Les 3 personas doivent être DIFFÉRENTS (âges, situations, motivations différentes) mais tous cohérents avec l'activité, le secteur et le type d'offre.

RÈGLE ABSOLUE DE COHÉRENCE D'AUDIENCE (priorité maximale) :
- Analyse la description et le nom de l'offre pour détecter toute contrainte démographique implicite ou explicite : genre (femmes / hommes uniquement), tranche d'âge (enfants, ados, seniors), état (femmes enceintes, jeunes mamans, retraités, étudiants, sportifs, professionnels d'un métier précis…), etc.
- Si l'offre s'adresse à un genre ou une catégorie spécifique (ex : coaching pour femmes enceintes → UNIQUEMENT des femmes enceintes ; soins barbe → UNIQUEMENT des hommes ; produits seniors → UNIQUEMENT des 60+), les 3 personas DOIVENT TOUS respecter cette contrainte. Aucun persona hors cible n'est autorisé, même pour "varier".
- Choisis prénoms, âges, situations et pronoms strictement compatibles avec cette audience cible.

ANALYSE OBLIGATOIRE : après avoir généré les 3 personas, compare-les et désigne dans "best_id" le persona qui :
1) convertit le plus (intention d'achat la plus forte),
2) a la douleur la plus intense et la plus urgente à résoudre,
3) génère le plus de revenus (panier moyen × fréquence × LTV la plus élevée).
Le champ "best_id" doit correspondre EXACTEMENT à l'id (1, 2 ou 3) du meilleur persona. "best_reason" : 1 phrase courte qui justifie le choix.`;

  const userPrompt = `Activité principale: ${params.activity}
Secteur d'activité: ${params.sector || 'non précisé'}
Type d'offre: ${params.offerType}
${params.productService ? `Nom de l'offre: ${params.productService}` : ''}
${params.productDescription ? `Description de l'offre: ${params.productDescription}` : ''}

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

export async function describeSubjectShort(imageBase64: string) {
  const systemPrompt = `Tu es un expert en analyse visuelle. On te fournit UNE image.
Décris en FRANÇAIS, en UNE SEULE PHRASE simple et claire (max ~25 mots), le sujet principal (produit, élément ou personne) : apparence visible, attitude/posture et ce qu'il/elle fait.
Règles : 100% factuel (rien d'inventé), pas de marketing, pas d'adjectifs subjectifs, pas d'introduction, pas de guillemets, pas de liste, pas de markdown. Uniquement la phrase finale.`;
  const data = await callKreatorAI({
    action: 'describe_image',
    image_base64s: [imageBase64],
    messages: [{ role: 'user', content: "Décris en UNE phrase le sujet principal de cette image : apparence, attitude et ce qu'il fait." }],
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

export async function generateServiceDescription(name: string): Promise<string> {
  const systemPrompt = `Tu es un expert en copywriting. À partir du NOM d'un service, rédige UNE SEULE phrase courte, claire et concrète qui décrit ce service.
RÈGLES STRICTES :
- UNE seule phrase (max ~20 mots), en français, se terminant par un point.
- Pas de guillemets, pas d'emoji, pas de liste, pas de retour à la ligne.
- Reste factuel et simple, sans superlatifs marketing.`;
  const data = await callKreatorAI({
    action: 'generate_service_description',
    messages: [{ role: 'user', content: `Nom du service : ${name}` }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return '';
  const oneLine = content.trim().replace(/[\r\n]+/g, ' ').replace(/^["'`]+|["'`]+$/g, '').trim();
  return /[.!?]$/.test(oneLine) ? oneLine : oneLine + '.';
}

export async function detectBestTone(params: {
  tones: string[];
  objective?: string;
  offerType?: string;
  productName?: string;
  productDescription?: string;
  sector?: string;
  activity?: string;
}): Promise<string> {
  const list = params.tones.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const systemPrompt = `Tu es un expert en copywriting et stratégie marketing. À partir des informations fournies (produit/service, description, secteur, activité, objectif de contenu), choisis LE TON D'ÉCRITURE le plus adapté pour CONVERTIR au maximum et générer le plus de viralité auprès de la cible la plus large et la plus rentable.
RÈGLES :
- Réponds UNIQUEMENT avec le libellé exact d'un ton de la liste ci-dessous (copie-colle exact).
- Aucune autre phrase, aucun guillemet, aucune explication.

Liste des tons autorisés :
${list}`;
  const userMsg = [
    params.offerType && `Type d'offre : ${params.offerType}`,
    params.productName && `Nom : ${params.productName}`,
    params.productDescription && `Description : ${params.productDescription}`,
    params.activity && `Activité : ${params.activity}`,
    params.sector && `Secteur : ${params.sector}`,
    params.objective && `Objectif du contenu : ${params.objective}`,
  ].filter(Boolean).join('\n');
  const data = await callKreatorAI({
    action: 'detect_best_tone',
    messages: [{ role: 'user', content: userMsg }],
    system_prompt: systemPrompt,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return '';
  const raw = content.trim().replace(/^["'`]+|["'`.]+$/g, '');
  const match = params.tones.find((t) => t === raw)
    || params.tones.find((t) => raw.includes(t))
    || params.tones.find((t) => t.toLowerCase().includes(raw.toLowerCase()));
  return match || raw;
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
  voiceOverEnabled?: boolean;
  voiceOverText?: string;
  videoDurationSec?: number;
  voiceOverLanguage?: string;
  variant?: boolean;
  productColorsHex?: string[];
  productColorsDescription?: string;
}) {
  const formatLabel = params.format === '1:1' ? 'carré (1:1)' : params.format === '16:9' ? 'horizontal large (16:9)' : 'vertical plein écran (9:16)';

  const aiModelName = params.aiModel || 'nano-banana-2';
  let formatAdaptation = '';

  const videoModels = [
    'veo-2', 'veo-3', 'veo-3-fast', 'veo-3.1',
    'sora-2', 'sora-2-t2v', 'sora-2-i2v', 'sora-2-pro-i2v', 'sora-2-pro-t2v', 'sora-2-pro-character',
    'grok-imagine-i2v', 'grok-imagine-t2v', 'grok-imagine-1.5-preview',
    'bytedance/seedance-1.5-pro', 'bytedance/seedance-2',
    'kling-2.1', 'kling-2.5', 'kling-2.6', 'kling-3.0',
    'kwaivgi/kling-video-o1',
    'minimax/hailuo-2.3',
    'alibaba/wan-2.7',
  ];

  const isVideoModel = videoModels.includes(aiModelName);

  if (params.contentType === 'video' || isVideoModel) {
    const videoFormat = params.format === '9:16' ? 'vidéo verticale 9:16 (1080×1920)'
      : params.format === '16:9' ? 'vidéo horizontale 16:9 (1920×1080)'
      : params.format === '1:1' ? 'vidéo carrée 1:1 (1080×1080)'
      : `vidéo au format ${params.format}`;

    if (aiModelName.startsWith('veo-')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "${videoFormat}" dans le prompt. Adapter le cadrage, la composition et le framing pour ce ratio.`;
    } else if (aiModelName.startsWith('sora-')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter le type de framing, la composition et les mouvements de caméra pour ce ratio.`;
    } else if (aiModelName.startsWith('grok-imagine')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter le cadrage, la composition verticale/horizontale et les mouvements de caméra pour ce ratio.`;
    } else if (aiModelName.includes('seedance')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter la composition, le framing et la direction artistique pour ce ratio.`;
    } else if (aiModelName.includes('kling') || aiModelName === 'kwaivgi/kling-video-o1') {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter le cadrage, la composition et les mouvements de caméra pour ce ratio.`;
    } else if (aiModelName.includes('hailuo')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter la composition et le framing pour ce ratio.`;
    } else if (aiModelName.includes('wan')) {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter la composition et le framing pour ce ratio.`;
    } else if (params.contentType === 'video') {
      formatAdaptation = `Modèle IA: ${aiModelName} — OBLIGATION ABSOLUE : générer une ${videoFormat}. Préciser explicitement "aspect ratio ${params.format}" dans le prompt. Adapter le cadrage, la composition et le framing pour ce ratio.`;
    }
  }

  if (['nano-banana-2', 'nano-banana-pro'].includes(aiModelName)) {
    const nanoFormat = params.format === '1:1' ? 'image carrée parfaite (1:1)' : params.format === '16:9' ? 'image horizontale large (16:9)' : 'image verticale plein écran mobile (9:16)';
    formatAdaptation = `Modèle IA: ${aiModelName === 'nano-banana-pro' ? 'Nano Banana Pro' : 'Nano Banana 2'} — OBLIGATION ABSOLUE : le visuel généré DOIT être au format ${params.format} (${nanoFormat}). Inclure IMPÉRATIVEMENT l'instruction "Generate this image in ${params.format} aspect ratio" dans le prompt anglais ET "Générer cette image au format ${params.format}" dans le prompt français. Le ratio ${params.format} doit être mentionné au DÉBUT et à la FIN du prompt pour forcer le modèle à le respecter.`;
  }

  const contentTypeAdaptation = params.contentType === 'video'
    ? `Pour la vidéo : TOUJOURS respecter le ratio ${params.format}, cadrage optimisé pour mobile si 9:16, sujet centré et lisible.`
    : params.contentType === 'carousel'
      ? `Pour le carrousel : adapter la composition au ratio (centrage, marges, lisibilité), cohérence visuelle parfaite entre slides, optimiser pour affichage plateforme.`
      : `Pour l'image : adapter la composition au ratio (centrage, marges, lisibilité), optimiser pour affichage plateforme.`;

  const videoDuration = params.videoDurationSec ?? 8;
  // Nombre de scènes adapté à la durée : 6–10s → 2–3 scènes, 10–15s → 3–4 scènes
  const videoSceneCount =
    videoDuration <= 6 ? 2 :
    videoDuration <= 10 ? 3 :
    4;
  // Limites de mots voix off : 18 mots / 8s, 25 mots / 10s, 35 mots / 15s
  const voiceOverMaxWords =
    videoDuration <= 8 ? 18 :
    videoDuration <= 10 ? 25 :
    35;
  const hasVoiceOver = !!(params.voiceOverEnabled ?? !!params.voiceOverText);
  const hasVoiceOverText = !!(params.voiceOverText && params.voiceOverText.trim());
  const voLang = (params.voiceOverLanguage || 'Français').toUpperCase();

  // Video-specific directives — nouveau prompt maître (script publicitaire premium)
  const videoDirectives = '';

  // Determine the active render style
  const activeRenderStyle = params.contentType === 'video' ? params.videoRenderStyle : params.renderStyle;

  // === Direction artistique premium spécifique au cas d'utilisation ===
  const useCaseKey = (params.useCase || '').toLowerCase();
  const useCaseDirectiveMap: Array<{ match: RegExp; type: 'image' | 'carousel' | 'video'; label: string; body: string }> = [
    // PHOTO / IMAGE
    { match: /publicit[ée]|premium/, type: 'image', label: 'PHOTO — PUBLICITÉ PREMIUM', body: 'Campagne publicitaire premium centrée sur le produit/service. Direction artistique luxueuse, éclairages professionnels, mise en scène sophistiquée, composition digne des plus grandes marques internationales. Valoriser fortement qualité, bénéfices et valeur perçue.' },
    { match: /lifestyle/, type: 'image', label: 'PHOTO — LIFESTYLE', body: 'Mettre en scène le produit/service dans une situation réelle, naturelle et aspirante. Scène authentique permettant à la cible de se projeter. Émotions positives, ambiance immersive, esthétique moderne.' },
    { match: /promo|réduc|offre flash|solde/, type: 'image', label: 'PHOTO — PROMOTION', body: 'Visuel promotionnel premium. Mettre en évidence l\'offre commerciale avec forte visibilité tout en conservant une image haut de gamme. Sentiment d\'urgence sans dégrader la perception de qualité.' },
    { match: /avant.?apr[èe]s|before.?after|transformation/, type: 'image', label: 'PHOTO — AVANT / APRÈS', body: 'Illustrer clairement une transformation spectaculaire. Séparation visuelle évidente entre AVANT et APRÈS.\n⚠️ RÈGLE ABSOLUE — CÔTÉ "AVANT" : NE JAMAIS afficher, suggérer ou faire référence à NOTRE produit/service actuel dans la partie AVANT. Le visuel AVANT doit représenter un AUTRE produit / service / solution alternative (concurrent générique, ancienne méthode, solution dépassée, version artisanale, produit basique de la même catégorie) — différent de notre offre mais appartenant STRICTEMENT au même secteur / univers / catégorie d\'usage (ex : si notre produit est une boisson → montrer une autre boisson en AVANT ; si c\'est un soin cosmétique → montrer un autre soin ; si c\'est un service de coaching → montrer une autre méthode de coaching). Aucun logo, packaging, couleur, forme ou élément identitaire de notre produit ne doit apparaître dans le AVANT.\n✅ CÔTÉ "APRÈS" : mettre exclusivement NOTRE produit/service réel, parfaitement reconnaissable, mis en valeur comme la solution supérieure qui produit le résultat impressionnant.' },
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
    { match: /[ée]tude de cas|case study/, type: 'video', label: 'VIDÉO — ÉTUDE DE CAS', body: 'Présenter une situation réelle : défis rencontrés, solution apportée, résultats obtenus. Narration engageante et crédible.' },
    { match: /d[ée]monstration m[ée]thode|m[ée]thode/, type: 'video', label: 'VIDÉO — DÉMONSTRATION MÉTHODE', body: 'Montrer étape par étape la méthode utilisée afin de démontrer l\'expertise et la valeur du service.' },
    { match: /t[ée]moignage/, type: 'video', label: 'VIDÉO — TÉMOIGNAGE CLIENT', body: 'Mettre en avant une expérience client authentique et inspirante. Renforcer la confiance grâce à des résultats concrets, visages et émotions sincères.' },
    { match: /avant.?apr[èe]s|before.?after|transformation/, type: 'video', label: 'VIDÉO — AVANT / APRÈS', body: 'Mettre en scène une transformation spectaculaire en split-screen ou montage rapide.\n⚠️ RÈGLE ABSOLUE — SÉQUENCE "AVANT" : NE JAMAIS montrer, nommer ou évoquer NOTRE produit/service actuel dans la séquence AVANT. Utiliser un AUTRE produit/service/solution existant ou utilisé auparavant (concurrent générique, méthode ancienne, solution dépassée, alternative artisanale) appartenant STRICTEMENT au même secteur/univers (ex : boisson → autre boisson ; cosmétique → autre cosmétique ; service → autre service du même domaine). Aucun élément identitaire (logo, packaging, couleurs, forme) de notre produit ne doit apparaître dans l\'AVANT — uniquement la frustration / l\'état initial avec cette solution alternative.\n✅ SÉQUENCE "APRÈS" : NOTRE produit/service réel apparaît clairement et devient le héros qui apporte la transformation et le résultat impressionnant.' },
  ];
  const matchedUseCase = useCaseKey
    ? useCaseDirectiveMap.find(d => d.type === params.contentType && d.match.test(useCaseKey))
    : undefined;
  const useCaseDirectiveBlock = params.useCase
    ? `\n━━━━━━━━━━━━━━━━━━\nCAS D'UTILISATION — COHÉRENCE 100% OBLIGATOIRE\n━━━━━━━━━━━━━━━━━━\nCas d'utilisation sélectionné : "${params.useCase}". L'ensemble du contenu (concept narratif, mise en scène, hiérarchie visuelle, textes, CTA, ambiance) DOIT être à 100% cohérent avec ce cas d'utilisation. C'est le format narratif OBLIGATOIRE — toute déviation est invalide.\n${matchedUseCase ? `\nDIRECTIVE SPÉCIFIQUE (${matchedUseCase.label}) :\n${matchedUseCase.body}` : ''}\n`
    : '';
  const toneCoherenceBlock = params.ton
    ? `\n━━━━━━━━━━━━━━━━━━\nTON D'ÉCRITURE & ALIGNEMENT CONTENU — COHÉRENCE 100% OBLIGATOIRE\n━━━━━━━━━━━━━━━━━━\nTon d'écriture imposé : "${params.ton}". TOUS les textes visibles ET parlés (texte overlay dans le visuel, textes des slides du carrousel, texte à l'écran de la vidéo, texte de la voix off, titres, sous-titres, CTA) DOIVENT :\n1) Être écrits/dits À 100% DANS LE TON imposé ci-dessus (vocabulaire, niveau de langue, rythme, énergie, registre, ponctuation). Aucun écart toléré.\n2) Être en ADÉQUATION TOTALE et PRIORITAIRE avec le NOM de l'offre${params.productService ? ` ("${params.productService}")` : ''} et sa DESCRIPTION${params.productDescription ? ` ("${params.productDescription}")` : ''} — chaque texte doit refléter fidèlement ce que l'offre est, ce qu'elle fait et ce qu'elle promet, sans inventer de fonctionnalités ni dévier du positionnement.\n3) Respecter À 100% l'ANGLE MARKETING choisi${params.marketingAngle ? ` ("${params.marketingAngle}")` : ''} — l'angle conditionne le message, l'accroche et la promesse de CHAQUE texte (overlay visuel, slides, texte à l'écran vidéo, voix off).\nCette règle s'applique de manière IDENTIQUE et NON NÉGOCIABLE à : le texte intégré dans le visuel, les textes de chaque slide du carrousel, le texte à l'écran de la vidéo, ET le texte de la voix off. Tout texte qui s'écarte du nom, de la description, de l'angle marketing ou du ton est INVALIDE.\n`
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

━━━━━━━━━━━━━━━━━━
🎨 DIRECTION ARTISTIQUE OBLIGATOIRE — UNIVERSELLE (IMAGE / CARROUSEL / VIDÉO — TOUS MODÈLES IA)
━━━━━━━━━━━━━━━━━━
Quelle que soit le type de contenu (image, carrousel, vidéo) et quel que soit le modèle IA utilisé (Nano Banana, GPT Image, Grok, Sora, Veo, Seedance, Kling, Hailuo, Wan, etc.), CHAQUE génération DOIT être construite à partir d'une DIRECTION ARTISTIQUE PREMIUM EXPLICITEMENT CHOISIE et DÉCLARÉE en amont, cohérente avec le type d'offre / produit / service, le persona et l'univers de marque. C'est une OBLIGATION SYSTÉMATIQUE, non négociable, valable sur 100% des générations.

La direction artistique DOIT être déclarée explicitement dans la sortie (section "🎨 SYSTÈME DE DESIGN UNIFIÉ" pour image/carrousel, ou intégrée à la "DIRECTION ARTISTIQUE / LOOK & FEEL" pour la vidéo) et contenir :
• Nom de la direction (ex : "Bold Editorial Orange", "Luxe Dark Gradient", "Vibrant Lime Energy", "Soft Pastel Grid", "Brutalist Mono", "Premium Fintech Clean", "Tropical Premium", "Beverage 3D Hero", "Cinematic Warm Sunset", "Editorial Noir", "Clean Tech Minimal"...)
• Mood / énergie (premium, audacieux, vibrant, minimal, luxueux, éditorial, brutaliste, organique, futuriste, cinématographique...)
• Palette HEX (2 à 4 couleurs dominantes + 1 accent contrasté) — réutilisée IDENTIQUEMENT sur toute la création (toutes les slides d'un carrousel, toutes les scènes d'une vidéo, l'intégralité d'une image)
• Typographie : 1 display ULTRA bold (titres XXL, possibles outlines/italiques/mots-clés colorés) + 1 sans-serif support (sous-titres / corps) — noms précis
• Éléments graphiques signature : 2-3 éléments répétés (blob organique, gros chiffres en filigrane, badges arrondis, stickers/ovales, grilles, lignes manuscrites, formes liquides, halos, gradients radiaux, traits soulignés, flèches, étoiles, accolades, etc.)
• Traitement photo / sujet : photo réelle premium, sujet humain expressif quand pertinent, ombres douces, mise en scène éditoriale, NON IA générique
• Composition : asymétrie volontaire, hiérarchie typographique forte, espaces négatifs maîtrisés, accents colorés sur mots-clés
• Pour la vidéo : ajouter également l'étalonnage (color grading), la grammaire de cadrage, le style de transitions et la signature de mouvement caméra — IDENTIQUES sur 100% des scènes

RÉFÉRENCES VISUELLES DE NIVEAU À ATTEINDRE : posts marketing premium type @joshgrafiqs, UrbanTechtz Rate Cards, Sir Lasa Tech, PraiseUCdesigns, Nubiq fintech ads, Settle CPG carousels, Heineken/Spaten beverage hero shots, films publicitaires Apple / Nike / L'Oréal / McDonald's. JAMAIS de rendus plats, génériques, "PowerPoint", template Canva basique, ni style IA détectable.

RÈGLE DE COHÉRENCE ABSOLUE : la MÊME direction artistique (palette + typo + éléments signature + traitement + étalonnage) s'applique IDENTIQUEMENT à 100% de la création (toutes les slides, toutes les scènes, toute l'image). Variation autorisée uniquement sur la composition interne, JAMAIS sur le système. Cette règle prévaut sur le modèle IA utilisé et doit être respectée même si le modèle a tendance à dériver stylistiquement.
${params.contentType === 'image' || params.contentType === 'carousel' ? `
━━━━━━━━━━━━━━━━━━
🎨 UX/UI DESIGN PREMIUM (IMAGES & CARROUSELS — OBLIGATOIRE)
━━━━━━━━━━━━━━━━━━
Premium advertising layout, award-winning creative agency design, editorial typography, luxury commercial poster, perfect text rendering, mobile-first visual hierarchy, Behance & Awwwards quality.

Typography premium parfaitement lisible, texte naturel et humanisé, hiérarchie visuelle forte, titres impactants, CTA clair, mise en page éditoriale moderne, composition équilibrée, espaces de respiration, contrastes optimisés, éléments graphiques élégants et minimalistes, rendu publicitaire haut de gamme, esthétique grande marque internationale.

Ne jamais inventer d'informations non fournies (prix, téléphone, email, adresse, réseaux sociaux, statistiques, avis, promotions ou certifications). Aucun texte déformé, aucun faux contenu, aucun watermark, aucun rendu IA visible, lisibilité mobile parfaite, design premium orienté conversion.
` : ''}${params.contentType === 'video' ? `
━━━━━━━━━━━━━━━━━━
BLOC CINÉMATOGRAPHIQUE (TOUTES VIDÉOS)
━━━━━━━━━━━━━━━━━━
Produire une vidéo publicitaire premium digne des plus grandes agences créatives internationales. Mouvements de caméra fluides, cadrages professionnels, éclairages cinématographiques, profondeur de champ maîtrisée, transitions naturelles, étalonnage couleur haut de gamme, rythme dynamique, storytelling visuel puissant, qualité publicitaire de niveau international. Chaque scène renforce émotion, crédibilité et désir. Optimisation verticale réseaux sociaux, qualité cinéma, rendu ultra réaliste, esthétique publicitaire premium.
` : ''}${useCaseDirectiveBlock}${toneCoherenceBlock}`;


  const masterImagePrompt = `🖼️ PROMPT MAÎTRE — IMAGE PUBLICITAIRE VIRALE PREMIUM

Génère une image publicitaire ultra réaliste, premium, digne d'une grande agence marketing internationale, conçue pour maximiser l'impact et la conversion dès la première seconde.
Style : publicité grand compte (food, SaaS ou service), esthétique moderne, propre, stratégique, aucun rendu IA visible.

📥 INPUTS À UTILISER (si renseignés, sinon déduire intelligemment, jamais inventer hors brief)
Type d'offre, Nom de l'offre, Description, Idée (champ "Insérer mon idée" OU idée validée cliquée par l'utilisateur), Objectif du contenu, Ton d'écriture, Angle marketing, Nature de l'offre, Activité/métier, Secteur, Marché/localisation, Persona, Image de référence + description, Textes activés (texte 1, position ; idem texte 2 si activé — police et couleur TOUJOURS déduites intelligemment), Palette de couleurs (prioritaire si fournie).

🎯 OBJECTIF CRÉATIF — viral, scroll-stop, orienté conversion, lisible mobile, cohérent persona/offre, zéro surcharge, zéro éléments fictifs trompeurs (pas de faux numéros, fausses adresses, faux comptes).

🎨 DIRECTION ARTISTIQUE — photographie ultra réaliste (studio + publicité mondiale), éclairage premium (cinéma/studio/naturel), composition propre hiérarchisée stratégique, mise en avant claire du produit/service, profondeur de champ maîtrisée, couleurs cohérentes avec branding ou palette déduite, style "big brand ads" (McDonald's / Apple / Nike / SaaS premium).

🧩 COMPOSITION — sujet principal ultra mis en avant, arrière-plan maîtrisé légèrement flou si pertinent, éléments graphiques dynamiques mais minimalistes, hiérarchie stricte : Hook visuel → Offre/valeur → Détail secondaire → CTA.

📝 TEXTE DANS LE VISUEL — si activé : reproduire EXACTEMENT le wording fourni à la position demandée. La POLICE et la COULEUR du texte ne sont JAMAIS choisies par l'utilisateur : elles DOIVENT être déduites par l'IA pour produire un design typographique moderne, stylé, puissant, ultra accrocheur, niveau UI/agence premium, parfaitement cohérent avec le produit/service, la palette/branding et la direction artistique choisie (contraste élevé, lisibilité mobile, hiérarchie forte, traitement éditorial — bold, italic, brush, premium ou minimal selon ce qui sert le mieux le message et l'univers).

🎨 RÈGLE COULEUR DU TEXTE — CONTRASTE OBLIGATOIRE (ABSOLUE, NON NÉGOCIABLE) : la couleur retenue pour CHAQUE texte affiché doit toujours offrir un CONTRASTE FORT et IMMÉDIAT avec la zone d'arrière-plan exacte située sous le texte (ratio WCAG ≥ 4.5:1 minimum, viser 7:1). INTERDIT d'utiliser la même couleur que le fond ou une couleur proche (même famille, même luminosité, faible delta). Si le fond est clair → texte sombre profond ; si le fond est sombre → texte clair lumineux. Si le fond est complexe / texturé / multicolore, ajouter un léger surlignage, un voile ou une ombre portée subtile sous le texte pour garantir une lisibilité parfaite — sans jamais altérer l'esthétique premium. La lisibilité instantanée prime sur tout effet de style. Cette règle vaut pour image, carrousel ET vidéo (Texte 1, Texte 2, sous-titres, CTA).

✍️ RÈGLE TEXTE — LONGUEUR & INTÉGRITÉ (ABSOLUE, NON NÉGOCIABLE) : tout texte affiché dans le visuel (Texte 1, Texte 2) DOIT contenir entre 5 et 15 MOTS (jamais en caractères — uniquement en mots), bornes incluses. Chaque texte est UNE PHRASE COMPLÈTE, autonome, lisible à voix haute du premier au dernier mot, JAMAIS tronqué, coupé, suspendu, abrégé, amputé ou inachevé. AUCUN mot coupé en deux, AUCUNE syllabe manquante, AUCUNE fin de phrase escamotée. Si la phrase ne tient pas, on la raccourcit en restant ≥ 5 mots et ≤ 15 mots — JAMAIS on ne tronque un mot.

⚠️ CONTRAINTES — lisibilité mobile parfaite, contraste élevé texte/fond, aucun surdesign inutile, aucun élément fictif trompeur, zéro rendu IA visible, aucun watermark.

🚀 RÉSULTAT ATTENDU — image prête à publier (Instagram/Facebook/TikTok), niveau agence haut de gamme, capable de générer clic et conversion dès le scroll.

━━━━━━━━━━━━━━━━━━
🖼️ STRUCTURE DE SORTIE OBLIGATOIRE — PROMPT IMAGE (200 mots MAXIMUM, jamais plus)
━━━━━━━━━━━━━━━━━━
Le champ prompt_fr DOIT contenir, exactement dans cet ordre, séparés par des sauts de ligne, ces sections :

🧾 TITRE DU CONCEPT
[Nom court du visuel / campagne]

🎯 OBJECTIF
[Objectif marketing : conversion, notoriété, promo, clic…]

🎨 SYSTÈME DE DESIGN UNIFIÉ (OBLIGATOIRE)
[Déclarer EXPLICITEMENT : Nom de la direction artistique choisie • Mood • Palette HEX (2-4 couleurs + accent) • Typographie display + support (noms précis) • 2-3 éléments graphiques signature • Traitement photo/sujet • Style de composition. Niveau agence premium internationale, appliqué à 100% de l'image.]

🎨 CONCEPT CRÉATIF
[Direction artistique globale : univers, ambiance, style]

🖼️ COMPOSITION VISUELLE
[Sujet principal, mise en avant produit/service, arrière-plan, éléments graphiques, hiérarchie visuelle]

📸 STYLE VISUEL
[Photographie / rendu : ultra réaliste, studio, publicité premium, lumière, profondeur, contraste]

🎯 MESSAGE PUBLICITAIRE
[Texte principal affiché dans le visuel]

📝 TEXTES À L'ÉCRAN (OVERLAY)
[Pour chaque texte : contenu EXACT, position. Police et couleur DÉDUITES par l'IA — design typo moderne, stylé, puissant, cohérent avec la direction artistique, la palette/branding et le produit. Indiquer le nom de la police choisie, la couleur HEX retenue et le style (bold / italic / brush / premium / minimal).]

🎨 PALETTE / BRANDING
[Couleurs principales utilisées + cohérence visuelle]

⚠️ CONTRAINTES
[Lisibilité mobile parfaite, zéro surcharge, zéro faux éléments, ultra réaliste non IA, hiérarchie marketing claire]

🚀 RÉSULTAT FINAL
[Image prête à publier (ads Facebook/Instagram/TikTok), optimisée conversion, style agence premium]`;

  const masterCarouselPrompt = `🧠🖼️ PROMPT MAÎTRE — CARROUSEL HAUTE CONVERSION (${params.slidesCount || 4} slides)

Génère un carrousel publicitaire ultra performant, conçu pour maximiser engagement, clics et conversion, adapté à Facebook, Instagram, TikTok et LinkedIn.
Style : marketing premium, direct, viral, clair, non générique, niveau agence internationale.

━━━━━━━━━━━━━━━━━━
🎨 DIRECTION ARTISTIQUE OBLIGATOIRE (SYSTÉMATIQUE — TOUS CARROUSELS)
━━━━━━━━━━━━━━━━━━
AVANT de rédiger le carrousel, CHOISIR EXPLICITEMENT et DÉCLARER UNE direction artistique premium cohérente avec le type d'offre / produit / service, le persona et l'univers de marque. Le carrousel ENTIER doit être construit à partir de cette direction (palette, typo, formes, textures, mise en scène, traitement photo) — design system UNIFIÉ sur 100% des slides.

La direction artistique DOIT contenir, déclarée explicitement dans la sortie :
• Nom de la direction (ex: "Bold Editorial Orange", "Luxe Dark Gradient", "Vibrant Lime Energy", "Soft Pastel Grid", "Brutalist Mono", "Premium Fintech Clean", "Tropical Premium", "Beverage 3D Hero")
• Mood / énergie (premium, audacieux, vibrant, minimal, luxueux, éditorial, brutaliste, organique, futuriste…)
• Palette HEX (2 à 4 couleurs dominantes + 1 accent contrasté) — réutilisée IDENTIQUEMENT sur toutes les slides
• Typographie : 1 display ULTRA bold (titres XXL, possibles outlines, italiques, mots-clés colorés) + 1 sans-serif support (sous-titres / corps)
• Éléments graphiques signature : blob organique, gros chiffres en filigrane, badges arrondis, stickers/ovales, grilles, lignes manuscrites, formes liquides, halos, gradients radiaux, traits soulignés, flèches, étoiles, accolades, etc. (CHOISIR 2-3 éléments répétés)
• Traitement photo / sujet : photo réelle détourée premium, sujet humain expressif quand pertinent, ombres douces, mise en scène éditoriale, NON IA générique
• Composition : asymétrie volontaire, hiérarchie typographique forte (titre énorme + sous-titre court + texte court), espaces négatifs maîtrisés, accents colorés sur mots-clés

RÉFÉRENCES VISUELLES DE NIVEAU À ATTEINDRE (qualité agence top-tier) : posts marketing premium type @joshgrafiqs, UrbanTechtz Rate Cards, Sir Lasa Tech, PraiseUCdesigns, Nubiq fintech ads, Settle CPG carousels, Heineken/Spaten beverage hero shots. JAMAIS de slides plates, génériques, "PowerPoint", template Canva basique, ni style IA détectable.

RÈGLE DE COHÉRENCE ABSOLUE : la MÊME direction artistique (palette + typo + éléments signature + traitement) s'applique IDENTIQUEMENT à TOUTES les slides — aucune slide ne dévie. Variation autorisée uniquement sur la composition interne (position du sujet, accents), JAMAIS sur le système.

📥 INPUTS À UTILISER — Nombre de slides : ${params.slidesCount || 4}. Type d'offre, Nom de l'offre, Description, Idée (champ "Insérer mon idée" OU idée validée cliquée), Objectif du contenu, Ton d'écriture (déduit si absent), Angle marketing (déduit si absent), Activité/métier, Secteur, Marché/localisation, Persona, Image de référence + description, Textes des slides (si activés, un par slide) + position. Police et couleur des textes TOUJOURS déduites intelligemment par l'IA (design moderne, stylé, cohérent avec la direction artistique et la palette/branding). Palette (prioritaire si fournie).

🧠 LOGIQUE OBLIGATOIRE — choisir automatiquement les meilleurs angles selon l'objectif, adapter le message au persona et niveau de conscience client, transformer l'idée en storytelling ou persuasion directe, prioriser clarté + impact + conversion, 1 slide = 1 message unique puissant, aucune surcharge, style humain non IA.

🎯 STRUCTURE NARRATIVE (adapter au nombre de slides)
• 2 slides → Hook + CTA direct
• 3 slides → Hook + Problème + Solution
• 4 slides → Hook + Problème + Solution + Preuve/CTA

🟦 SLIDE 1 — HOOK (STOP SCROLL) : problème fort / promesse / erreur fréquente / question choc / insight puissant. Texte court, impact immédiat.
🟦 SLIDE 2 — PROBLÈME / CONTEXTE : douleur, frustration, situation actuelle, conséquence.
🟦 SLIDE 3 — SOLUTION / MÉCANISME : solution, méthode, système, valeur concrète.
🟦 SLIDE 4 (optionnel) — PREUVE + CTA : résultat, bénéfice, avant/après, autorité, CTA clair ("DM INFO", "Clique ici", "Réserve maintenant").

🎨 DESIGN PAR SLIDE : texte principal, position, hiérarchie + DESIGN TYPO DÉDUIT PAR L'IA (police, couleur HEX, style — bold, minimal, premium, punchy) — moderne, stylé, puissant, ultra accrocheur, parfaitement cohérent avec la direction artistique, la palette/branding et le produit/service.
🎯 RÈGLES CONVERSION : 1 idée = 1 slide, lisible en < 3s, contraste élevé, hiérarchie claire, style publicité premium (SaaS/Apple/Nike).

✍️ RÈGLE TEXTE — LONGUEUR & INTÉGRITÉ (ABSOLUE, NON NÉGOCIABLE) : le texte de CHAQUE slide DOIT contenir entre 5 et 15 MOTS (jamais en caractères — uniquement en mots), bornes incluses. Chaque texte est UNE PHRASE COMPLÈTE, autonome, lisible à voix haute du premier au dernier mot, JAMAIS tronquée, coupée, suspendue, abrégée, amputée ni inachevée. AUCUN mot coupé en deux, AUCUNE syllabe manquante, AUCUNE fin de phrase escamotée d'une slide à l'autre. Si la phrase ne tient pas dans la composition, on la raccourcit en restant ≥ 5 mots et ≤ 15 mots — JAMAIS on ne tronque un mot.

━━━━━━━━━━━━━━━━━━
🟦 STRUCTURE DE SORTIE OBLIGATOIRE — PROMPT CARROUSEL (150 à 200 mots MAXIMUM)
━━━━━━━━━━━━━━━━━━
Le champ prompt_fr DOIT contenir, dans cet ordre, séparés par des sauts de ligne :

🧾 TITRE DE LA CAMPAGNE
[Nom court du carrousel]

🎯 OBJECTIF
[Objectif marketing visé]

🎨 SYSTÈME DE DESIGN UNIFIÉ
[OBLIGATOIRE — déclarer : Nom de la direction artistique choisie • Mood • Palette HEX (2-4 couleurs + accent) • Typographie display + support (noms précis) • 2-3 éléments graphiques signature répétés • Traitement photo/sujet • Style de composition. Le tout IDENTIQUE sur 100% des slides, niveau agence premium internationale.]

Puis pour CHAQUE slide (de 1 à ${params.slidesCount || 4}) reproduire EXACTEMENT ce gabarit :

🟦 SLIDE N — [RÔLE NARRATIF : HOOK / PROBLÈME / SOLUTION / PREUVE-CTA]
Message clé : [phrase courte, 1 idée unique]
Composition visuelle : [sujet, mise en scène, hiérarchie]
Texte affiché : [wording EXACT, ou reproduire mot pour mot si fourni]
Position du texte : [top-center / middle-center / bottom-center]
Police : [nom de la police — DÉDUITE par l'IA, moderne, stylée, cohérente avec la direction artistique et l'univers de marque]
Couleur : [HEX — DÉDUITE par l'IA depuis la palette/branding, contraste élevé, lisibilité mobile parfaite]
Style : [bold / minimal / premium / punchy — choisi pour maximiser impact et cohérence visuelle]

🎯 CTA FINAL
[Appel à l'action clair, court, orienté conversion]

⚠️ CONTRAINTES
[Lisibilité mobile, cohérence visuelle stricte entre slides, zéro surcharge, niveau agence premium, exploitable directement sur réseaux sociaux]`;

  const masterVideoPrompt = `🎬 PROMPT MAÎTRE — SCRIPT VIDÉO PUBLICITAIRE PREMIUM RÉALISTE

Génère un script vidéo publicitaire ou marketing naturel, 100% réaliste, premium, moderne et cinématographique, digne d'une agence publicitaire haut de gamme. Rendu directement exploitable en production vidéo, sans style IA ni formulation générique.

📥 INPUTS À UTILISER — Type d'offre, Nom de l'offre, Description, Idée (champ "Insérer mon idée" OU idée validée cliquée par l'utilisateur via le bouton "générer le contenu"), Objectif du contenu, Ton d'écriture (déduit si absent), Angle marketing (déduit si absent), Activité/métier, Secteur, Marché/localisation, Persona, Image de référence (si fournie), Durée vidéo (paramètre modèle), Texte écran overlay (si fourni, sinon déduire), Voix off (si fournie, sinon déduire intelligemment).

⚙️ RÈGLES — 150 à 200 mots MAXIMUM. Style humain non détectable IA. Univers cinématographique premium. Cohérence parfaite image/message/cible. Chaque scène fait avancer le storytelling. Adaptation automatique du nombre de scènes selon durée.

⏱️ STRUCTURE SCÈNES (durée totale EXACTE ${videoDuration}s, ${videoSceneCount} scènes)
• 6 à 10s → 2 à 3 scènes
• 10 à 15s → 3 à 4 scènes

🎧 AUDIO (uniquement si pertinent pour le secteur, le type d'offre, le nom et la description)
🎼 Musique de fond (BGM) — style adapté à l'émotion (premium / corporate / tropical / urbain / émotionnel / luxe / dynamique), évolution avec build-up et drop/accent final sur CTA, volume discret sous voix off, dominant sans voix off.
🔊 Bruitages (SFX) — ambiance (nature, ville, studio, luxe), SFX produits (versement, ouverture, condensation, glace, clic CTA), transitions (whoosh, cinematic hit, soft fade), accents émotionnels (sparkle, rise, impact, breath). Chaque bruitage : cohérent avec l'image, discret mais impactant, synchronisé avec les actions à l'écran.

🧩 OVERLAY TEXTE ÉCRAN — RÈGLE STRICTE :
• Si l'utilisateur N'A PAS activé "Texte à l'écran" dans la personnalisation → AUCUN texte overlay dans AUCUNE scène. Indiquer EXPLICITEMENT "Texte écran : aucun" pour CHAQUE scène. INTERDICTION ABSOLUE d'inventer, d'ajouter ou de suggérer le moindre texte, sous-titre, accroche ou CTA visuel à l'écran.
• Si activé : reproduire EXACTEMENT le wording fourni. Si la couleur, le moment d'apparition (timing) ou la durée d'affichage ne sont PAS renseignés par l'utilisateur, les DÉDUIRE INTELLIGEMMENT à partir de l'idée choisie, du ton, de l'angle marketing et du rythme narratif de la vidéo (couleur cohérente avec la palette/branding, timing aligné sur les beats clés de la scène, durée suffisante pour une lecture confortable mobile). Pour le second texte (si activé) appliquer la même règle de déduction intelligente.

🎙️ VOIX OFF
${hasVoiceOver
  ? `Voix off ACTIVÉE. ${hasVoiceOverText
    ? `UNE SEULE phrase continue, texte EXACT mot pour mot : "${params.voiceOverText}".`
    : `Texte de voix off NON fourni par l'utilisateur → DÉDUIRE INTELLIGEMMENT une SEULE phrase continue, naturelle, native ${voLang}, parfaitement cohérente avec l'idée choisie, le nom de l'offre, sa description, le ton, l'angle marketing, l'objectif et le persona. La phrase doit sonner 100% humaine, conversationnelle et orientée conversion (hook → bénéfice → CTA implicite).`}
🌐 LANGUE DE LA VOIX OFF — OBLIGATOIRE : la voix off DOIT être prononcée EXCLUSIVEMENT EN ${voLang} (langue déclarée du texte de la voix off). Le moteur audio/TTS du modèle vidéo (Veo, Sora, Kling, Hailuo, Seedance, Grok, Wan, etc.) DOIT détecter et utiliser la langue ${voLang} et UNIQUEMENT cette langue, avec un accent natif ${voLang}, une prononciation native, une intonation et un phrasé authentiquement ${voLang}. INTERDIT : prononcer le texte avec un accent étranger, traduire dans une autre langue, mélanger plusieurs langues, prononcer à l'anglaise des mots ${voLang}, ou utiliser une voix dans une langue différente de celle dans laquelle le texte est écrit. La langue parlée = la langue d'écriture du texte. Indiquer EXPLICITEMENT dans le script : "Voice-over language: ${voLang} (native speaker, native accent, no translation)".
🗣️ VOIX 100% HUMAINE NATURELLE — OBLIGATION ABSOLUE : voix d'un acteur/locuteur humain réel, chaleureuse, expressive, vivante, avec respirations naturelles, micro-variations de rythme et d'intonation, émotion sincère, articulation claire mais non mécanique. INTERDIT FORMELLEMENT : voix robotique, voix monotone, voix TTS bas de gamme, voix synthétique perceptible, accent IA, débit mécanique uniforme, prononciation artificielle. Niveau : voix off professionnelle de publicité premium (acteur voix-off natif ${voLang}). Forcer le modèle via le prompt à utiliser une voix humaine premium native ${voLang} (mention explicite "natural human voice, native ${voLang} speaker, premium voice-over actor, warm, expressive, non-robotic, no AI artifacts").
Maximum ${voiceOverMaxWords} mots. Mots faciles à prononcer (courts, courants, sans sigles, sans anglicismes complexes, sans chiffres en chiffres). Style naturel, fluide, premium, conversationnel. TIMING STRICT : démarre à t = 1.0s exactement (premier mot à ≥ 1s, aucun mot avant 1s). Se termine à t ≤ ${Math.max(1, videoDuration - 1)}s (1s avant la fin). Aucun mot dans la première seconde ni dans la dernière seconde de la vidéo. Débit ajusté pour tenir EXACTEMENT dans cette fenêtre de ${Math.max(1, videoDuration - 2)}s.`
  : `Voix off DÉSACTIVÉE par l'utilisateur. NE PAS générer de voix off. NE PAS inclure de bloc voix off dans la sortie. La vidéo s'appuie uniquement sur visuel, sound design et éventuels textes à l'écran.`}

━━━━━━━━━━━━━━━━━━
🎬 STRUCTURE DE SORTIE OBLIGATOIRE — SCRIPT VIDÉO (150 à 200 mots MAXIMUM)
━━━━━━━━━━━━━━━━━━
Le champ prompt_fr DOIT contenir, dans cet ordre, séparés par des sauts de ligne :

🧾 TITRE
Vidéo publicitaire ${params.productService || '[Nom de l\'offre]'} — ${videoDuration}s (${videoSceneCount} scènes)

🎨 DIRECTION ARTISTIQUE / LOOK & FEEL (OBLIGATOIRE — IDENTIQUE SUR 100% DES SCÈNES)
[Déclarer EXPLICITEMENT : Nom de la direction artistique choisie • Mood / énergie • Palette HEX (2-4 couleurs + accent) • Typographie display + support (noms précis) pour textes à l'écran • 2-3 éléments graphiques signature répétés • Traitement photo/sujet • Étalonnage couleur (color grading) • Grammaire de cadrage et signature de mouvement caméra • Style de transitions. Niveau agence publicitaire premium internationale, appliqué IDENTIQUEMENT à toutes les scènes.]

🎯 ANGLE MARKETING & ÉMOTION
[Angle retenu + émotion principale recherchée]

Puis pour CHAQUE scène (de 1 à ${videoSceneCount}) reproduire EXACTEMENT ce gabarit :

🎥 Scène N (Xs - Ys)
🎞️ Plan : [type de plan + mouvement caméra + animation détaillée du sujet — physiquement cohérente]
🌴 Background : [décor, profondeur, ambiance, lumière, cohérence avec offre/secteur]
🎧 Audio :
 🎼 Musique : [style + ambiance + évolution]
 🔊 SFX : [bruitages précis synchronisés]
📝 Texte écran : ${params.showText
  ? `[wording EXACT fourni par l'utilisateur — reproduire mot pour mot. Si un seul texte fourni, ne l'afficher QUE sur la/les scène(s) cohérente(s) avec le timing renseigné ou déduit. Si aucun texte ne s'affiche sur cette scène, écrire "aucun".]`
  : `"aucun" (l'utilisateur n'a PAS activé le texte à l'écran — INTERDICTION ABSOLUE d'ajouter le moindre texte overlay, sous-titre, accroche ou CTA visuel sur cette scène)`}
🎨 Design texte : ${params.showText
  ? `[position selon le réglage utilisateur si fourni. POLICE et COULEUR HEX TOUJOURS DÉDUITES par l'IA (jamais choisies par l'utilisateur) — design typographique moderne, stylé, puissant, ultra accrocheur, niveau UI/agence premium, parfaitement cohérent avec l'idée choisie, la direction artistique, la palette/branding du produit et le ton. Contraste élevé, lisibilité mobile parfaite, hiérarchie forte. Timing & durée d'apparition : valeurs utilisateur si fournies, sinon déduites intelligemment selon le rythme narratif.]`
  : `aucun (pas de texte donc pas de design texte)`}

🎥 Scène finale (DOIT impérativement contenir)
🎧 Audio :
 🎼 Musique : montée émotionnelle + final impact
 🔊 SFX : impact final / transition CTA / accent sonore premium

${hasVoiceOver ? `🎙️ Voix off (unique)
${hasVoiceOverText ? `"${params.voiceOverText}"` : `[Phrase déduite intelligemment — UNE SEULE phrase native ${voLang}, cohérente avec l'idée, l'offre, le ton, l'angle et l'objectif]`}
🌐 Langue parlée : ${voLang} UNIQUEMENT — locuteur natif ${voLang}, accent natif ${voLang}, prononciation native, aucune traduction, aucun mélange de langues. La langue dite = la langue dans laquelle le texte ci-dessus est écrit.
🗣️ Voix : 100% humaine naturelle, chaleureuse, expressive, non robotique, qualité voix-off publicitaire premium (acteur voix-off natif ${voLang}). Interdit : voix synthétique, monotone, mécanique ou avec accent IA.
(une seule phrase continue, ≤ ${voiceOverMaxWords} mots, démarre à t = 1s, se termine à t ≤ ${Math.max(1, videoDuration - 1)}s — donc 1s de silence au début ET 1s de silence à la fin)` : ''}

⚠️ CONTRAINTES — aucun style IA détectable, audio + visuel fonctionnent ensemble, chaque SFX renforce l'impact marketing, somme des durées = ${videoDuration}s exactement, résultat directement exploitable en production vidéo.

${params.videoRenderStyle ? `TYPE DE RENDU VIDÉO SÉLECTIONNÉ : "${params.videoRenderStyle}" — adapter TOUTE la direction artistique, l'ambiance, le cadrage et le style de montage à ce rendu.` : ''}`;

  const masterPrompt =
    params.contentType === 'video'
      ? masterVideoPrompt
      : params.contentType === 'carousel'
      ? masterCarouselPrompt
      : masterImagePrompt;

  const systemPrompt = `Tu es un système expert en direction artistique publicitaire, marketing émotionnel, storytelling visuel, branding premium, psychologie de conversion et génération de prompts IA ultra avancés.

Ta mission : générer un prompt FINAL en français, prêt à envoyer directement à l'API du modèle IA (${aiModelName}), au format ${params.format} (${formatLabel}), pour produire un contenu de type ${params.contentType} ultra premium, photoréaliste, naturel, émotionnel, orienté conversion, impossible à distinguer d'une vraie production humaine.

━━━━━━━━━━━━━━━━━━
RÈGLE DE PRIORITÉ ABSOLUE
━━━━━━━━━━━━━━━━━━
Utiliser les informations utilisateur dans cet ordre : 1) Réglages avancés activés, 2) Idée (champ "Insérer mon idée" OU idée validée cliquée par l'utilisateur via "générer le contenu"), 3) Type d'offre, 4) Image produit si présente, 5) Nom de l'offre, 6) Description, 7) Persona, 8) Objectif, 9) Angle marketing, 10) Nature de l'offre, 11) Style visuel, 12) Ton, 13) Activité, 14) Secteur, 15) Marché. Si une donnée manque : déduire intelligemment, rester crédible et cohérent. Ne jamais inventer hors brief.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — RÉGLAGES AVANCÉS PRIORITAIRES
━━━━━━━━━━━━━━━━━━
Tous les réglages avancés activés (palette, ton, style visuel, type de rendu, textes overlay + position, second texte, durées/timings, logo + position/timing, voix off + texte exact + langue, paramètres modèle, format/aspect ratio, durée vidéo, nombre de slides) DOIVENT être appliqués FIDÈLEMENT et VISIBLEMENT, sans exception, sur tous les supports. POLICE et COULEUR des textes à l'écran ne sont JAMAIS fournies par l'utilisateur : elles sont TOUJOURS déduites par l'IA pour un design typographique moderne, stylé, puissant, cohérent avec le produit, la direction artistique et la palette/branding. En cas de conflit avec l'analyse d'image ou la palette automatique, les réglages avancés GAGNENT TOUJOURS. Si un réglage n'est pas activé : ne PAS l'inventer.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — FORMAT / RATIO
━━━━━━━━━━━━━━━━━━
Respecter STRICTEMENT le format ${params.format} (${formatLabel}). Préciser explicitement "aspect ratio ${params.format}" dans le prompt généré. Adapter composition, cadrage, framing. Aucun élément essentiel coupé.
${contentTypeAdaptation}
${formatAdaptation}

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — RÉALISME 100% NATUREL
━━━━━━━━━━━━━━━━━━
Rendu indiscernable d'une vraie production humaine. Anatomie parfaite (5 doigts, yeux et dents naturels, peau réelle). Préhension d'objets réaliste. Cohérence spatiale et logique du regard (écrans face caméra orientés vers la personne). Aucun artefact IA : pas de plastique, pas de uncanny valley, pas de doigts fusionnés, pas de texte illisible ou inventé, pas de logo déformé, pas de cadre/bordure/contour autour du logo, pas de fond rectangulaire derrière le produit (produit détouré intégré nativement dans le décor réel). Logo et texte overlay JAMAIS superposés (marge > 10%).

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — CONCEPT & COMPOSITION 100% RÉALISTES ET LOGIQUES
━━━━━━━━━━━━━━━━━━
TOUS les blocs "🎨 CONCEPT CRÉATIF" et "🖼️ COMPOSITION VISUELLE" générés DOIVENT être :
- 100% RÉALISTES : scènes plausibles dans le monde réel, situations crédibles, lieux existants, objets et accessoires cohérents avec l'usage réel du produit/service.
- 100% LOGIQUES : aucune incohérence physique, spatiale, temporelle, contextuelle ou narrative. Chaque élément a une raison d'être. Les proportions, échelles, perspectives, ombres, reflets, gravité, interactions humain/objet sont parfaitement justes.
- ZÉRO STYLE IA : interdiction absolue d'univers fantastiques, surréalistes, oniriques, "trop parfaits", flottants, abstraits, métaphoriques irréels, brillances exagérées, particules magiques, hologrammes gratuits, effets "rendu 3D IA", visages génériques uniformes.
- ZÉRO INCOHÉRENCE avec le contenu généré (texte overlay, caption, script, idée, offre, produit) : ce qui est montré DOIT correspondre EXACTEMENT à ce qui est dit/écrit. Si le texte parle d'un café, l'image montre un vrai café réaliste, pas une métaphore.
- Mise en scène = situation de vie réelle ou shooting publicitaire réaliste type grande agence (Apple, Nike, McDonald's, L'Oréal). Personnes naturelles, expressions authentiques, environnements réels, lumière crédible.
Toute idée non réaliste, non logique, ou "IA-esque" DOIT être remplacée par une alternative photoréaliste, ancrée dans le réel, cohérente avec les inputs.

━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE — DIFFÉRENCIATION VISUELLE EN CAS DE COMPARAISON / AVANT-APRÈS / VERSUS
━━━━━━━━━━━━━━━━━━
Dès qu'un angle marketing, un cas d'utilisation, une idée ou une scène implique une COMPARAISON, un AVANT/APRÈS, un VS / VERSUS, une opposition "solution actuelle vs notre solution", "concurrent vs nous", "ancienne méthode vs nouvelle méthode", ou tout face-à-face entre deux options :
- Le PRODUIT / SERVICE DE L'UTILISATEUR (référence exacte : ${params.productService || "[Nom de l'offre]"}) DOIT être représenté visuellement de manière STRICTEMENT DISTINCTE de l'autre produit/service/option auquel il est comparé. Aucune ressemblance de forme, de packaging, de couleur dominante, de matière, de typographie, de logo, de mise en scène, de cadrage ou de style entre les deux.
- L'autre produit/service comparé DOIT être clairement DIFFÉRENT : silhouette différente, packaging différent, palette différente, traitement visuel différent (par ex. désaturé, terne, daté, générique, "old-school", flou de fond plus neutre), pour qu'aucune confusion ne soit possible entre les deux côtés.
- Le côté "produit utilisateur" doit toujours apparaître valorisé (lumière premium, mise en avant, netteté, couleurs vives de sa propre direction artistique), tandis que l'alternative comparée reste neutre/discrète/moins attractive — sans jamais copier le design du produit utilisateur.
- Interdiction absolue de dupliquer, cloner, mirroir ou décliner le produit de l'utilisateur pour représenter le "concurrent" / "avant" / "ancienne version". Il doit s'agir d'un objet ou d'une scène visuellement et conceptuellement distincte.
- Ne JAMAIS nommer, afficher ou imiter une marque concurrente réelle, ni reproduire son logo, son packaging, sa typographie ou sa charte. L'alternative comparée reste générique et anonyme.
- Cette règle s'applique à 100% des supports (image, carrousel, vidéo) et à 100% des modèles IA, sur chaque slide et chaque scène où la comparaison apparaît.

${masterPrompt}

${premiumDirectionBlock}

━━━━━━━━━━━━━━━━━━
FORMAT DE RÉPONSE
━━━━━━━━━━━━━━━━━━
Le champ "prompt_fr" doit contenir UNIQUEMENT le prompt final, en français, prêt à envoyer au modèle IA, en respectant À LA LETTRE la structure de sortie obligatoire définie ci-dessus pour le type ${params.contentType}. Texte fluide, aéré par de vrais sauts de ligne (\\n\\n) entre chaque section. Pas de markdown, pas de listes à puces hors gabarit, pas de commentaires, pas d'explications.

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
${params.contentType === 'video' ? `Durée vidéo choisie par l'utilisateur (SOURCE DE VÉRITÉ ABSOLUE) : ${videoDuration}s. Le script du prompt final doit contenir exactement ${videoSceneCount} scènes dont la somme fait EXACTEMENT ${videoDuration}s, et faire 150 à 200 mots MAX.` : ''}
${params.objective ? `Objectif du contenu (PRIORITAIRE): ${params.objective}` : 'Objectif: non renseigné'}
${activeRenderStyle ? `Type de rendu${params.contentType === 'video' ? ' vidéo' : ''}: ${activeRenderStyle}` : 'Type de rendu: automatique'}

=== DIRECTIVE OBJECTIF MARKETING (RÈGLE STRATÉGIQUE — PRIORITÉ MAXIMALE) ===
${params.objective?.includes('Attirer') ? `🧲 OBJECTIF ATTIRER : Crée un contenu capable d'ARRÊTER IMMÉDIATEMENT LE SCROLL. Maximiser la curiosité, l'émotion et l'intérêt dès les premières secondes. Le contenu doit générer un fort taux d'engagement, de partage et de mémorisation.
Résultat attendu : plus de portée • plus de vues • plus d'engagement • plus de trafic.` : ''}
${params.objective?.includes('Éduquer') ? `📚 OBJECTIF ÉDUQUER : Crée un contenu pédagogique simple, clair et facile à comprendre même pour un débutant. Apporter une forte valeur perçue tout en démontrant l'expertise de la marque.
Résultat attendu : plus de confiance • plus d'autorité • plus de temps de visionnage • plus d'abonnés.` : ''}
${params.objective?.includes('Convaincre') ? `🤝 OBJECTIF CONVAINCRE : Crée un contenu basé sur la PREUVE, les RÉSULTATS et la CRÉDIBILITÉ. Lever les objections et renforcer la confiance afin d'augmenter l'intention d'achat.
Résultat attendu : plus de confiance • plus de prospects • plus de demandes • plus de conversions.` : ''}
${params.objective?.includes('Vendre') ? `💰 OBJECTIF VENDRE : Crée un contenu orienté CONVERSION mettant en avant la valeur, les bénéfices et les résultats obtenus. Générer un fort désir d'achat et inciter immédiatement au passage à l'action.
Résultat attendu : plus de ventes • plus de rendez-vous • plus de leads • plus de chiffre d'affaires.` : ''}
${params.objective?.includes('Fidéliser') ? `🔁 OBJECTIF FIDÉLISER : Crée un contenu qui renforce la relation avec les clients existants. Valoriser les utilisateurs, augmenter l'engagement et encourager l'utilisation continue de l'offre.
Résultat attendu : plus de rétention • plus de fidélité • plus de recommandations • plus de valeur client.` : ''}

=== DIRECTIVE TYPE DE CONTENU (EXIGENCE PREMIUM) ===
${params.contentType === 'image' ? `📸 PROMPT IMAGE : Crée une image publicitaire PREMIUM digne des meilleures agences marketing internationales. Composition professionnelle, hiérarchie visuelle forte, typographie moderne, couleurs cohérentes avec la marque, texte parfaitement lisible, design capable d'arrêter le scroll et d'attirer immédiatement l'attention.
Résultat attendu : image professionnelle • impact immédiat • arrêt du scroll • forte mémorisation.` : ''}
${params.contentType === 'carousel' ? `🎠 PROMPT CARROUSEL : Crée un carrousel PREMIUM optimisé pour les réseaux sociaux. Chaque slide doit susciter l'envie de passer à la suivante. Utiliser une structure claire, un design cohérent, des titres percutants et une progression logique jusqu'à la dernière slide.
Résultat attendu : plus de temps passé • plus de sauvegardes • plus de partages • plus d'engagement.` : ''}
${params.contentType === 'video' ? `🎬 PROMPT VIDÉO : Crée une vidéo publicitaire PREMIUM digne d'une campagne de grande marque. Utiliser un HOOK puissant, un storytelling captivant, un rythme dynamique, des plans cinématographiques, des transitions fluides et une forte charge émotionnelle.
Résultat attendu : plus de rétention • plus de vues complètes • plus d'engagement • plus de conversions.` : ''}

=== IDÉE (SOURCE DE VÉRITÉ — NE RIEN INVENTER AU-DELÀ) ===
${params.inputText ? `Idée décrite: "${params.inputText}"` : ''}
${params.ideaChosen ? `Idée choisie: "${params.ideaChosen}"` : ''}
${!params.inputText && !params.ideaChosen ? 'Aucune idée spécifique — proposer un concept cohérent avec le contexte' : ''}
RAPPEL CRITIQUE : tous les chiffres, prix, quantités, noms et mentions visibles dans le visuel DOIVENT correspondre EXACTEMENT à cette idée et au produit/service ci-dessus. Aucune invention de marque, d'enseigne, de prix ou de promesse non mentionnée.

=== IMAGES DE RÉFÉRENCE ===
${params.imageDescription ? `Analyse (${params.referenceImageCount || 1} image(s)): ${params.imageDescription}` : 'Aucune image de référence'}
${params.referenceImageCount && params.referenceImageCount > 1 ? `IMPORTANT: ${params.referenceImageCount} images fournies — analyser et fusionner les éléments visuels communs pour un rendu cohérent et harmonieux.` : ''}
${params.referenceImageCount && params.referenceImageCount > 0 ? `
=== FIDÉLITÉ ABSOLUE À L'IMAGE DE RÉFÉRENCE (RÈGLE PRIORITAIRE N°1 — NON NÉGOCIABLE) ===
L'image de référence fournie par l'utilisateur représente SON produit / SON service / SON offre réelle. Elle DOIT être prise en compte, respectée et REPRODUITE À L'IDENTIQUE dans TOUS ses détails dans le contenu généré, avec un rendu fiable à 100% par rapport à l'original. Le client doit reconnaître INSTANTANÉMENT, au premier coup d'œil et sans aucune ambiguïté, exactement ce qui figure sur sa photo de référence.
Éléments à reproduire FIDÈLEMENT (liste non exhaustive, à adapter selon la nature de l'offre — produit physique, service, lieu, personne, prestation, plat, packshot, scène, intérieur, équipement…) : forme exacte, proportions, géométrie, volumes, couleurs réelles, matières, textures, finitions, packaging, étiquette, logo, typographie de l'étiquette, motifs, accessoires visibles, agencement, décor, mobilier, vêtements, coiffure, traits du visage, posture, environnement, ambiance lumineuse, signalétique, mentions visibles. Aucune variation de design, aucune réinterprétation, aucune substitution, aucun élément générique « ressemblant ».
${params.contentType === 'carousel' ? `⚡ SPÉCIFIQUE CARROUSEL : ce MÊME produit de référence DOIT apparaître et être REPRODUIT À L'IDENTIQUE sur CHAQUE slide du carrousel où un produit est montré (slide 1, 2, 3, 4 selon le cas). Aucune slide ne peut afficher un produit différent, modifié, redessiné ou substitué. La cohérence produit est ABSOLUE sur l'ensemble de la série de slides : même packaging, même étiquette, même couleurs, même proportions, sous des angles/cadrages/mises en scène variés si besoin, mais TOUJOURS le même produit fidèle à la photo de référence.\n` : ''}
${params.contentType === 'video' ? `⚡ SPÉCIFIQUE VIDÉO : le sujet de l'image de référence (produit, service, lieu, personne) DOIT apparaître à l'IDENTIQUE sur CHAQUE plan / frame de la vidéo où il est visible — même apparence, même packaging, même couleurs, même proportions, même identité visuelle, sous différents angles/cadrages/mouvements caméra mais TOUJOURS strictement fidèle à la photo de référence d'un plan à l'autre.\n` : ''}
TRAITEMENT AUTORISÉ — UNIQUEMENT amélioration photographique légère (entre +10% et +40% selon la qualité initiale de la photo de référence) :
• Nettoyer les imperfections (poussières, rayures parasites, reflets disgracieux, flou de mise au point, bruit numérique, balance des blancs).
• Améliorer la netteté, la définition des micro-détails, le rendu des matières, la profondeur, le contraste local.
• Optimiser la lumière (douce, sculptante, professionnelle) et les ombres réalistes cohérentes avec la scène.
• Conserver les couleurs RÉELLES (pas de virage colorimétrique, pas de saturation excessive qui changerait la teinte d'origine).
Si la photo de référence est déjà très qualitative → amélioration proche de +10%. Si elle est moyenne/amateur → amélioration jusqu'à +40% maxi. JAMAIS au-delà : on ne redessine pas, on ne stylise pas, on ne "recrée" pas le sujet.
INTERDITS STRICTS : changer la forme, la couleur, le packaging, l'étiquette, le logo, l'identité visuelle, le décor caractéristique ou les traits distinctifs du sujet de référence ; remplacer par un équivalent générique ressemblant ; inventer des éléments absents (texte, mention, label, certification, parfum, variante, mobilier, personne, enseigne) ; modifier les proportions ; styliser / illustrer / cartooniser le sujet ; produire un rendu visiblement différent où le client ne reconnaîtrait pas instantanément ce qui figure sur sa photo de référence.
PRIORITÉ : cette règle de fidélité à l'image de référence PRIME sur le style visuel, le type de rendu, l'angle marketing, l'idée et tout autre paramètre. Aucun réglage avancé ne peut justifier de dénaturer le sujet de référence.
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
Position du texte (IDENTIQUE sur TOUTES les slides) : à DÉCIDER de manière AUTONOME par le modèle, en parfaite cohérence avec la composition, le sujet et la hiérarchie visuelle de chaque slide — placement digne d'une grande agence créative premium (Behance / Awwwards), zones de respiration optimales, jamais sur un élément clé du visuel.
Police d'écriture (IDENTIQUE sur TOUTES les slides) : à CHOISIR de manière AUTONOME par le modèle parmi des typographies premium éditoriales (sans-serif géométriques ou serif modernes haut de gamme selon le secteur), 100% cohérente avec le ton de marque, l'univers du produit/service et le rendu publicitaire grande marque visé. Kerning et leading impeccables, lisibilité mobile parfaite.
${params.textColor ? `🎨 Couleur du texte (IDENTIQUE sur TOUTES les slides — OBLIGATOIRE) : ${params.textColor} (code hexadécimal exact). Tous les textes affichés DOIVENT être rendus EXACTEMENT dans cette couleur, sans variation entre slides. Ajouter uniquement un léger contour/ombre subtil pour la lisibilité si nécessaire, sans altérer la teinte.` : ''}
⚡ HARMONIE PARFAITE OBLIGATOIRE entre TOUTES les slides du carrousel : même typographie, même taille relative, même position, même hiérarchie visuelle, même palette, même traitement (ombre/contour si nécessaire), même rythme et même style éditorial — comme un seul système de design cohérent du début à la fin. Lisibilité maximale sur mobile, contraste fort, intégration native dans la composition (pas un simple sticker collé). Rendu digne d'un grand directeur artistique, optimisé pour la conversion. La slide 1 doit porter le hook le plus puissant ; les slides suivantes développent et culminent sur un call-to-action implicite ou explicite. Ne JAMAIS modifier le wording fourni.`
    : `Texte overlay (À REPRODUIRE EXACTEMENT, MOT POUR MOT, AUCUNE MODIFICATION NI AJOUT): "${params.textContent}"
Position du texte : à DÉCIDER de manière AUTONOME par le modèle, en parfaite cohérence avec la composition, le sujet et la hiérarchie visuelle — placement digne d'une grande agence créative premium (Behance / Awwwards), respect des zones de respiration et de la règle des tiers, jamais sur un élément clé du visuel.
Police d'écriture : à CHOISIR de manière AUTONOME par le modèle parmi des typographies premium éditoriales 100% cohérentes avec le ton de marque, le secteur et l'univers du produit/service. Kerning et leading impeccables, rendu publicitaire grande marque, lisibilité mobile parfaite.
${params.textColor ? `🎨 Couleur du texte (OBLIGATOIRE — PRIORITÉ ABSOLUE) : ${params.textColor} (code hexadécimal exact). Le texte affiché DOIT être rendu EXACTEMENT dans cette couleur, sans dérive, sans variation de teinte, sans dégradé, sans effet de couleur additionnel. Ajouter UNIQUEMENT un léger contour ou une ombre portée subtile si nécessaire pour garantir la lisibilité sur le fond, sans altérer la couleur du texte.` : ''}
${params.contentType === 'video' ? `⏱️ Timing à l'écran — TEXTE 1 (OBLIGATOIRE — DOIT figurer EXPLICITEMENT dans la/les scène(s) correspondante(s) du storyboard) :
• Moment d'apparition : ${typeof params.textStart1 === 'number' ? `${params.textStart1}s (timing EXACT fourni par l'utilisateur — à respecter strictement)` : `À DÉDUIRE INTELLIGEMMENT par le modèle en fonction de l'idée, du rythme narratif, du hook et de la durée totale de ${videoDuration}s (typiquement entre 0s et ${Math.max(1, Math.floor(videoDuration / 3))}s pour un hook d'accroche). Annoncer le timing déduit explicitement dans le storyboard.`}
• Durée d'affichage : ${typeof params.textDuration1 === 'number' ? `${Math.max(3, params.textDuration1)}s (durée fournie par l'utilisateur — JAMAIS inférieure à 3s pour garantir la lecture confortable)` : `À DÉDUIRE INTELLIGEMMENT par le modèle en fonction du nombre de mots et du rythme de lecture confortable (≈ 0,35s/mot), avec un MINIMUM ABSOLU de 3s (NON NÉGOCIABLE — jamais d'affichage flash inférieur à 3s) et un maximum de ${Math.max(3, videoDuration - 1)}s. Annoncer la durée déduite explicitement dans le storyboard.`}
• Le texte doit rester parfaitement lisible pendant TOUTE sa durée d'affichage (≥ 3s OBLIGATOIRE, jamais d'apparition flash), sans chevauchement avec d'autres overlays.` : ''}
${(params.contentType === 'video' || params.contentType === 'image') && params.text2Enabled && params.textContent2
  ? `\n--- TEXTE À L'ÉCRAN N°2 — À REPRODUIRE EXACTEMENT MOT POUR MOT : "${params.textContent2}"
⚡ CONTINUITÉ NARRATIVE OBLIGATOIRE : ce Texte 2 est la SUITE COHÉRENTE et NATURELLE du Texte 1 ("${params.textContent}"). Les deux forment UN MÊME message en deux temps (hook → chute / call-to-action), sans répétition. ${params.contentType === 'image' ? `Les deux textes sont visibles SIMULTANÉMENT dans l'image, hiérarchisés visuellement (Texte 1 = accroche principale, Texte 2 = punchline / CTA secondaire). Chacun fait entre 3 et 15 mots MAXIMUM — JAMAIS plus.` : ''}
Position du texte 2 : à DÉCIDER de manière AUTONOME par le modèle, en parfaite cohérence avec la position du Texte 1 et la composition globale — hiérarchie visuelle claire, équilibre éditorial premium, aucun chevauchement.
Police d'écriture 2 : à CHOISIR de manière AUTONOME par le modèle, en pair harmonieux avec la typographie du Texte 1 (même famille ou pair éditorial premium reconnu), cohérent avec la marque et le rendu publicitaire haut de gamme.
${params.textColor2 ? `🎨 Couleur du texte 2 (OBLIGATOIRE) : ${params.textColor2} (code hexadécimal exact) — appliquer EXACTEMENT cette couleur, sans dérive ni variation. Léger contour/ombre subtil autorisé uniquement pour la lisibilité.` : ''}
${params.contentType === 'video' ? `⏱️ Timing à l'écran — TEXTE 2 (OBLIGATOIRE — DOIT figurer EXPLICITEMENT dans la/les scène(s) correspondante(s) du storyboard) :
• Moment d'apparition : ${typeof params.textStart2 === 'number' ? `${params.textStart2}s (timing EXACT fourni par l'utilisateur — à respecter strictement)` : `À DÉDUIRE INTELLIGEMMENT après le Texte 1, en cohérence avec la dramaturgie (typiquement seconde moitié de la vidéo, ou juste après la fin du Texte 1, jamais avant). Annoncer le timing déduit explicitement dans le storyboard.`}
• Durée d'affichage : ${typeof params.textDuration2 === 'number' ? `${Math.max(3, params.textDuration2)}s (durée fournie par l'utilisateur — JAMAIS inférieure à 3s pour garantir la lecture confortable)` : `À DÉDUIRE INTELLIGEMMENT en fonction du nombre de mots (≈ 0,35s/mot) et du rôle CTA / punchline finale, avec un MINIMUM ABSOLU de 3s (NON NÉGOCIABLE — jamais d'affichage flash inférieur à 3s). Annoncer la durée déduite explicitement dans le storyboard.`}
• AUCUN chevauchement avec le Texte 1 : le Texte 2 commence APRÈS la disparition complète du Texte 1, ou occupe une zone visuelle clairement distincte. Durée minimale d'affichage ≥ 3s OBLIGATOIRE.` : ''}
⚡ HARMONIE OBLIGATOIRE entre Texte 1 et Texte 2 : cohérence typographique parfaite (même famille ou pair harmonieux), hiérarchie visuelle claire (poids/taille), palette cohérente, espacements équilibrés, rythme de lecture professionnel. Rendu digne d'un grand directeur artistique — composition équilibrée, lisibilité maximale, aucun chevauchement. Convertir avec impact, sans surcharge.`
  : ''}`)
  : 'Pas de texte overlay — NE PAS générer de texte, pancarte, étiquette, logo ou enseigne dans l\'image'}
${params.logoEnabled && params.logoUrl
  ? (params.contentType === 'video'
    ? `🏷️ LOGO DE MARQUE (OBLIGATOIRE — PRIORITÉ ABSOLUE) : intégrer EXACTEMENT ce logo fourni par l'utilisateur, et AUCUN AUTRE. URL du logo (image de référence à utiliser telle quelle, fond déjà transparent) : ${params.logoUrl}\n• INTERDICTION ABSOLUE d'inventer, dessiner, recréer, redessiner, styliser, reinterpréter ou substituer un autre logo, monogramme, lettrage, icône, emblème ou marque. Reproduire À L'IDENTIQUE le logo fourni (formes, couleurs, typographie, proportions exactes).\n• Position : ${params.logoPosition === 'bottom-right' ? 'en bas à droite' : params.logoPosition === 'bottom-left' ? 'en bas à gauche' : params.logoPosition === 'top-left' ? 'en haut à gauche' : params.logoPosition === 'top-right' ? 'en haut à droite' : params.logoPosition === 'top-center' ? 'en haut au centre' : params.logoPosition === 'middle-left' ? 'au milieu à gauche' : params.logoPosition === 'middle-right' ? 'au milieu à droite' : 'en bas au centre'}. Taille discrète et professionnelle, parfaitement net, sans déformation, sans rotation, sans effet, sans recadrage du logo, sans ajout de texte autour, fond transparent préservé, ne couvre jamais le sujet principal.\n• Apparition dans la vidéo : ${params.logoAppearance === 'middle' ? "AU MILIEU de la vidéo (apparition à mi-parcours, environ à la moitié de la durée)" : params.logoAppearance === 'end' ? "À LA FIN de la vidéo (apparition sur les dernières secondes, comme signature de marque finale)" : "AU DÉBUT de la vidéo (apparition dès les premières secondes, dès l'ouverture)"} — le script et le storyboard DOIVENT explicitement indiquer ce timing d'apparition du logo, sans exception.`
    : `🏷️ LOGO DE MARQUE (POST-TRAITEMENT OBLIGATOIRE — PRIORITÉ ABSOLUE) : NE PAS dessiner, recréer, styliser, écrire ni intégrer de logo dans l'image générée. Le vrai logo PNG importé par l'utilisateur sera appliqué APRÈS génération en surimpression exacte par l'application.\n• URL technique du logo utilisateur (à conserver comme référence de workflow, PAS à redessiner par le modèle) : ${params.logoUrl}\n• Réserver seulement une petite zone propre et vide ${params.logoPosition === 'bottom-right' ? 'en bas à droite' : params.logoPosition === 'bottom-left' ? 'en bas à gauche' : params.logoPosition === 'top-left' ? 'en haut à gauche' : params.logoPosition === 'top-right' ? 'en haut à droite' : params.logoPosition === 'top-center' ? 'en haut au centre' : params.logoPosition === 'middle-left' ? 'au milieu à gauche' : params.logoPosition === 'middle-right' ? 'au milieu à droite' : 'en bas au centre'}, avec marges de sécurité, sans sujet ni texte dans cette zone.\n• INTERDICTION ABSOLUE : aucun autre logo, monogramme, pictogramme de marque, lettrage de marque, enseigne ou faux logo ne doit apparaître dans l'image.`)
  : 'Pas de logo à intégrer'}
 ${params.paletteEnabled ? `🎨 PALETTE DE COULEURS ACTIVE (PRIORITÉ ABSOLUE — domine 60-80% du visuel, prévaut sur toute autre suggestion couleur y compris l'analyse d'images de référence): ${params.paletteHex.join(', ')}

GESTION DE LA PALETTE DE COULEURS (RÈGLES STRICTES) :
• La palette fournie est la RÉFÉRENCE VISUELLE PRINCIPALE de toute la création. Respecter rigoureusement chaque couleur sélectionnée dans l'ensemble du contenu généré.
• Appliquer la palette de manière cohérente sur : arrière-plans, éléments graphiques, typographies, icônes, formes, boutons, encadrés, animations, transitions, effets lumineux, éléments décoratifs, overlays, éléments de marque.
• La palette doit renforcer l'identité visuelle de la marque tout en conservant une esthétique premium et professionnelle.
• Ne JAMAIS utiliser des couleurs qui entrent en conflit avec la palette définie, sauf si cela est indispensable pour assurer la lisibilité ou mettre en valeur un élément critique.
• Créer une harmonie visuelle complète à partir des couleurs fournies. Adapter automatiquement contrastes, ombres, lumières, dégradés et effets visuels afin de conserver une excellente lisibilité et une qualité visuelle haut de gamme.
• Les couleurs doivent guider naturellement le regard vers les informations importantes.
${params.contentType === 'image' ? `• SI TYPE = IMAGE : utiliser la palette pour construire une composition cohérente et mémorable. Les couleurs doivent participer à l'impact visuel immédiat et renforcer la reconnaissance de la marque. Le sujet principal doit rester parfaitement visible et mis en valeur grâce à une utilisation intelligente de la palette.` : ''}${params.contentType === 'carousel' ? `• SI TYPE = CARROUSEL : maintenir une cohérence parfaite de la palette sur l'ensemble des slides. Créer une continuité visuelle forte entre chaque slide. Varier subtilement les proportions et associations de couleurs entre les slides tout en conservant une identité graphique homogène. L'utilisateur doit reconnaître instantanément qu'il s'agit d'un seul et même contenu.` : ''}${params.contentType === 'video' ? `• SI TYPE = VIDÉO : utiliser la palette comme fil conducteur visuel de toutes les scènes. L'intégrer dans les décors, éclairages, effets lumineux, éléments graphiques, textes, transitions et étalonnage colorimétrique. Maintenir une cohérence colorimétrique sur toute la vidéo. Les couleurs doivent renforcer l'émotion recherchée et contribuer à l'identité de marque.` : ''}
• PRIORITÉ : toutes les décisions graphiques, artistiques et visuelles doivent être prises en tenant compte de cette palette. La palette doit influencer l'ensemble de la direction artistique sans jamais nuire à la lisibilité, au réalisme, à la crédibilité ou à la qualité premium du contenu. Avant de finaliser le prompt, vérifier que la palette est correctement intégrée dans tous les éléments visuels majeurs de la création.

UTILISATION STRATÉGIQUE DE LA PALETTE (RÈGLE INTELLIGENTE) :
• Analyser automatiquement la psychologie des couleurs de la palette fournie.
• Utiliser les couleurs dominantes pour renforcer l'objectif marketing recherché : attirer l'attention, inspirer confiance, transmettre de l'énergie, créer du désir, renforcer le caractère premium, favoriser la mémorisation.
• La palette ne doit pas seulement être appliquée visuellement — elle doit aussi soutenir l'émotion et le message du contenu.` : 'Palette automatique'}

${params.productColorsHex && params.productColorsHex.length > 0 ? `🎯 COULEURS EXACTES DU PRODUIT DÉTECTÉES (PRIORITÉ MAXIMALE — REPRODUCTION 100% FIDÈLE, NON NÉGOCIABLE) :
Les codes hexadécimaux suivants ont été extraits automatiquement de la photo de référence du produit fournie par l'utilisateur. Ils correspondent aux couleurs RÉELLES du produit (packaging, étiquette, matière, finition, identité visuelle de marque) :
${params.productColorsDescription || params.productColorsHex.join(', ')}
Liste brute des codes hex (à reproduire à l'identique, sans dérive de teinte) : ${params.productColorsHex.join(' | ')}

RÈGLES STRICTES :
• Reproduire EXACTEMENT ces couleurs sur le produit lui-même (packaging, étiquette, capsule, bouchon, texte imprimé, logo de marque, matière, surface, finition) — code hex AU PIXEL PRÈS, aucune approximation, aucun virage colorimétrique, aucune resaturation, aucun changement de teinte/luminosité/saturation.
• INTERDICTION ABSOLUE de remplacer une couleur du produit par une couleur voisine ou plus « esthétique ». La fidélité chromatique au produit RÉEL prime sur toute considération artistique, palette automatique, ambiance lumineuse ou direction visuelle.
• L'éclairage de scène et l'ambiance colorée du décor doivent être conçus pour PRÉSERVER ces couleurs exactes (lumière neutre 5500K si nécessaire, balance des blancs juste, pas de teinte parasite sur le produit).
• Mentionner explicitement les codes hexadécimaux dans le prompt final, au niveau de la description du produit, afin que le modèle générateur respecte ces valeurs au rendu.
• Cette règle PRIME sur la palette de couleurs active, sur le style visuel et sur tout autre réglage couleur. Le client doit reconnaître son produit à 100% — couleurs identiques à la photo de référence.
` : ''}

⚠️ RAPPEL FINAL — Les RÉGLAGES AVANCÉS ci-dessus (palette, ton, style visuel, texte overlay, logo, position${params.contentType === 'video' ? `, durée vidéo EXACTE ${videoDuration}s et timecodes des plans` : ''}) renseignés par l'utilisateur sont STRICTEMENT PRIORITAIRES sur toute autre source (analyse d'images, suggestions automatiques). Appliquer EXACTEMENT comme demandé. La POLICE et la COULEUR des textes à l'écran ne sont JAMAIS choisies par l'utilisateur : elles DOIVENT être déduites par l'IA pour un design typographique moderne, stylé, puissant, ultra accrocheur, cohérent avec le produit, l'identité visuelle (palette/branding) et la direction artistique.

⚡ COHÉRENCE DU TEXTE AFFICHÉ DANS LE VISUEL (RÈGLE ABSOLUE — NON NÉGOCIABLE) :
Tout texte visible dans le visuel généré (overlay, titre, sous-titre, textes de slides du carrousel, mentions, badges, accroches, punchlines, CTA) DOIT être 100% COHÉRENT avec, par ordre de priorité :
1) L'IDÉE INSÉRÉE${params.ideaChosen ? ` ("${params.ideaChosen}")` : params.inputText ? ` ("${params.inputText}")` : ''} OU, à défaut d'idée explicite, l'ANGLE MARKETING choisi${params.marketingAngle ? ` ("${params.marketingAngle}")` : ''} — ces deux éléments dictent le SUJET, le MESSAGE et l'ANGLE NARRATIF du texte affiché.
2) L'OBJECTIF DU CONTENU${params.objective ? ` ("${params.objective}")` : ''} — chaque mot affiché doit servir cet objectif (attirer / éduquer / convaincre / vendre / fidéliser).
3) Le TON D'ÉCRITURE${params.ton ? ` ("${params.ton}")` : ''} — vocabulaire, registre, niveau de langue, énergie et rythme du texte affiché DOIVENT respecter EXACTEMENT ce ton, sans exception.
Si un texte overlay exact a été fourni par l'utilisateur, le reproduire MOT POUR MOT sans modification. Sinon, tout texte généré (titre, accroche, mention visible) doit dériver STRICTEMENT de l'idée/angle, servir l'objectif et adopter le ton — jamais générique, jamais hors-sujet, jamais contradictoire.

Génère un prompt unifié, cohérent et fidèle à l'offre. Sobriété et précision priment sur la décoration.`;

  const variantInstruction = params.variant
    ? `\n\n=== VARIANTE CRÉATIVE EXIGÉE ===\nGénère une NOUVELLE VARIANTE du prompt en respectant STRICTEMENT les mêmes inputs (offre, idée, objectif, ton, format, style visuel, palette, texte overlay, logo, modèle IA, etc.) mais en changeant explicitement et significativement :\n- le CONCEPT CRÉATIF (angle narratif, métaphore visuelle, mise en scène),\n- la COMPOSITION VISUELLE (cadrage, perspective, placement du sujet et du produit, hiérarchie),\n- le STYLE VISUEL (ambiance lumineuse, palette d'éclairage, traitement, texture, rendu),\nafin de proposer une direction artistique CLAIREMENT DIFFÉRENTE de la précédente, tout en restant 100% fidèle aux inputs. Ne répète pas la même idée visuelle. Sois audacieux, original, et conserve une qualité agence premium. Seed aléatoire: ${Math.random().toString(36).slice(2, 10)}.`
    : '';
  const data = await callKreatorAI({
    action: 'generate_prompt',
    messages: [{ role: 'user', content: userPrompt + variantInstruction }],
    system_prompt: systemPrompt,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.prompt_fr === 'string') {
      parsed.prompt_fr = formatPromptWithLineBreaks(parsed.prompt_fr);
    }
    return parsed;
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
  ideaHook?: string;
  useCase?: string;
  regenerateVariant?: boolean;
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

${params.regenerateVariant ? `━━━━━━━━━━━━━━━━━━
RÉGÉNÉRATION / VARIANTE ALTERNATIVE OBLIGATOIRE
━━━━━━━━━━━━━━━━━━
Cette demande est une RÉGÉNÉRATION. Tu DOIS produire des captions COMPLÈTEMENT DIFFÉRENTES de la version précédente : nouveaux hooks, nouvelles descriptions, nouveaux CTAs, nouveaux hashtags. Change l'angle narratif, le ton émotionnel, le style de formulation. MAIS conserve STRICTEMENT : le ton d'écriture imposé, l'objectif marketing, l'angle marketing, la cohérence avec le prompt du visuel, le style humanisé 100% naturel non-détectable IA, et la structure obligatoire (hook, description, CTA, hashtags).` : ''}

━━━━━━━━━━━━━━━━━━
ACCESSIBILITÉ & CLARTÉ — RÈGLE ABSOLUE (NON NÉGOCIABLE)
━━━━━━━━━━━━━━━━━━
TOUTES les captions DOIVENT être instantanément compréhensibles par un novice/débutant total dans le secteur, sans aucun pré-requis. Objectif : entrer dans la psychologie de TOUTE cible (novice ou expert) en moins de 2 secondes, SANS friction, SANS effort de décodage, SANS aucune incompréhension possible.
- Niveau de lecture obligatoire : ~CM2 / 11 ans. Phrases courtes, mots simples, idées concrètes.
- INTERDIT FORMELLEMENT : jargon métier, anglicismes non expliqués, sigles/acronymes non développés, termes techniques, expressions idiomatiques rares, références culturelles de niche, mots savants, formulations ambiguës, doubles sens, abréviations obscures.
- Si un mot technique est INDISPENSABLE (ex: nom du produit ou notion clé), l'expliquer immédiatement dans la même phrase avec des mots simples — jamais laissé brut.
- Test de validation mental obligatoire avant d'écrire chaque caption : "Une personne qui découvre ce sujet pour la première fois comprend-elle CHAQUE mot et CHAQUE idée du premier coup ?" Si NON → reformuler plus simplement.
- Zéro friction de lecture : pas de phrase à relire, pas de syntaxe complexe, pas de subordonnées empilées.

━━━━━━━━━━━━━━━━━━
TON D'ÉCRITURE — APPLICATION SYSTÉMATIQUE AUX CAPTIONS
━━━━━━━━━━━━━━━━━━
${params.ton ? `Le ton d'écriture imposé est : "${params.ton}". CHAQUE caption (Facebook, Instagram, TikTok, LinkedIn) ET chaque caption de slide DOIVENT être rédigées SYSTÉMATIQUEMENT et À 100% dans ce ton : vocabulaire, niveau de langue, énergie, rythme, registre, ponctuation. Aucune caption ne peut s'écarter de ce ton, même partiellement. Si une formulation entre en conflit avec le ton imposé → la réécrire dans le ton.` : `Aucun ton imposé : adopter un ton naturel, humain, accessible, cohérent avec le persona et le marché, et appliquer ce ton à TOUTES les captions de manière uniforme.`}

━━━━━━━━━━━━━━━━━━
ANTI-DÉTECTION IA OBLIGATOIRE
━━━━━━━━━━━━━━━━━━
RÈGLE ABSOLUE (NON NÉGOCIABLE) : CHAQUE caption de CHAQUE réseau (Facebook, Instagram, TikTok, LinkedIn) ET chaque caption de slide DOIT être 100% HUMAINE, HUMANISÉE, INDÉTECTABLE comme générée par une IA. Objectif : passer tous les détecteurs IA (GPTZero, Originality, Copyleaks, ZeroGPT, etc.) sans aucune trace.

OBLIGATOIRE — Écriture humaine réelle :
- Rythme irrégulier : alterne phrases TRÈS courtes (2-5 mots) et phrases plus longues. Pas de cadence régulière.
- Vocabulaire simple, parlé, quotidien — comme un vrai humain qui parle à un ami sur le réseau.
- Micro-imperfections humaines : phrases incomplètes assumées, ellipses "...", tirets "—", interjections ("ah", "bon", "bref", "ok", "voilà"), parenthèses spontanées, répétitions volontaires d'insistance.
- Émotion réelle, vécue, subjective ("j'ai", "moi je", "perso", "franchement", "honnêtement", "en vrai", "le pire c'est que", "tu vois ce que je veux dire").
- Questions directes au lecteur, tutoiement spontané (sauf si le ton impose vouvoiement).
- Détails concrets, sensoriels, anecdotiques (pas de généralités lisses).
- Aucune phrase "trop bien construite", aucune symétrie parfaite, aucune liste à 3 éléments mécanique.

INTERDICTIONS ABSOLUES (formulations typiques IA — ZÉRO tolérance) :
- "dans le paysage numérique actuel", "à l'ère digitale", "à l'ère du numérique", "dans un monde où"
- "plongeons dans", "explorons ensemble", "découvrons ensemble", "embarquons"
- "sans plus attendre", "il est important de noter", "il convient de souligner", "il va sans dire"
- "dans cet article", "dans ce post", "aujourd'hui je vais vous parler de"
- "En conclusion", "Pour conclure", "En somme", "En définitive", "Au final" (en ouverture rhétorique)
- "révolutionnaire", "incontournable", "à couper le souffle", "véritable game-changer"
- "n'hésitez pas à", "je vous invite à", "je tenais à partager"
- Triplets d'adjectifs parfaitement équilibrés ("simple, efficace, puissant")
- Toute tournure corporate, lisse, neutre, générique, "trop propre"
- Emojis en début de chaque ligne en mode liste robotique
- "✨", "🚀", "💡" placés mécaniquement sans intention émotionnelle réelle

TEST DE VALIDATION (obligatoire mentalement avant d'écrire chaque caption) :
1. "Est-ce qu'un humain réel, sur ce réseau, écrirait EXACTEMENT cette phrase ?" Si NON → réécrire.
2. "Est-ce qu'un détecteur IA flaggerait cette phrase ?" Si OUI → casser la structure, ajouter une imperfection humaine.
3. "Est-ce que cette caption respecte 100% le TON D'ÉCRITURE et l'ANGLE MARKETING imposés ?" Si NON → réécrire dans l'angle/ton.

L'angle marketing et le ton d'écriture doivent transparaître dans CHAQUE phrase de CHAQUE caption — pas seulement dans le hook ou le CTA. La voix humaine, l'angle et le ton sont indissociables sur toute la longueur du texte.

━━━━━━━━━━━━━━━━━━
STRUCTURE OBLIGATOIRE (par caption)
━━━━━━━━━━━━━━━━━━
HOOK — accroche ultra forte qui stoppe le scroll immédiatement (0-2s). RÈGLE ABSOLUE DE RÉTENTION : les 3 PREMIERS MOTS du hook doivent être des MOTS PUISSANTS (impact, émotion, curiosité, urgence, bénéfice, choc, contradiction) qui capturent l'attention dès la première milliseconde — psychologie de rétention utilisée par les plus grands experts du watch time (Hormozi, MrBeast, Gary Vee). Cette règle s'applique STRICTEMENT et IDENTIQUEMENT à TOUTES les captions (Facebook, Instagram, TikTok, LinkedIn) et à TOUT type de contenu (image, carrousel, vidéo). Aucune exception.
DESCRIPTION — texte humain cohérent avec le visuel, l'OBJECTIF marketing et l'ANGLE marketing du contenu.
CTA — RÈGLE ABSOLUE : ULTRA COURT, 3 ou 4 MOTS MAXIMUM (jamais plus), punchy, parlé, humain, orienté CONVERSION immédiate. Exemples de format attendu : "Chope la ici maintenant !", "Teste ça aujourd'hui !", "Réserve ta place vite", "Clique le lien bio", "Commande la tienne maintenant", "DM moi le mot CADEAU". Le verbe d'action, la promesse et l'urgence doivent refléter directement l'OBJECTIF (notoriété → suis/partage, engagement → commente/sauvegarde, trafic → clique lien bio, conversion/vente → achète/réserve/essaie, lead → DM mot-clé). L'angle marketing transparaît dans le ton (urgence, exclusivité, preuve, transformation). INTERDIT : phrase longue, explication, double action, jargon corporate. 3-4 mots, point.
HASHTAGS — Entre 5 et 10 hashtags par réseau (jamais moins de 5, jamais plus de 10). VIRAUX et 100% COHÉRENTS avec : le PRODUIT/SERVICE exact, l'OBJECTIF marketing, le SECTEUR d'activité, et SURTOUT — en PRIORITÉ ABSOLUE — le TOP des MOTS-CLÉS RÉELLEMENT RECHERCHÉS par le client cible sur ce réseau précis (requêtes tapées dans la barre de recherche de la plateforme par le persona). Hiérarchie obligatoire : 1) top requêtes cible (priorité n°1), 2) produit/offre, 3) secteur/activité, 4) tendance plateforme, 5) niche. Simples, lisibles, sans chiffres aléatoires, sans hashtags inventés. Séparés par espaces, tous préfixés #.

━━━━━━━━━━━━━━━━━━
ANGLE MARKETING — AUTO-SÉLECTION SI ABSENT
━━━━━━━━━━━━━━━━━━
Si un ANGLE_MARKETING est fourni dans les inputs : TOUTES les captions doivent être strictement cohérentes avec cet angle (formulation, promesse, ton émotionnel, CTA).
Si AUCUN angle marketing n'est fourni : sélectionne automatiquement EN INTERNE l'angle marketing le plus performant pour cet objectif + cette offre + ce persona + ce secteur (le plus convertissant et viral), puis applique-le rigoureusement à toutes les captions et au CTA. Ne mentionne jamais l'angle choisi explicitement dans la caption.

SÉPARATION STRICTE : le CTA va UNIQUEMENT dans le champ "cta". Il ne doit JAMAIS apparaître dans "description". La description ne se termine pas par une question/CTA.

${params.ideaHook ? `━━━━━━━━━━━━━━━━━━
HOOK IMPOSÉ — ABSOLU (NON NÉGOCIABLE)
━━━━━━━━━━━━━━━━━━
Le HOOK de l'idée retenue est : "${params.ideaHook}".
Ce hook DOIT être utilisé MOT POUR MOT, IDENTIQUE, comme champ "hook" de CHAQUE caption (facebook, instagram, tiktok, linkedin). Ne le reformule pas, ne le traduis pas, ne le raccourcis pas, ne change pas l'emoji, ne change pas la ponctuation. Aucune variation, aucune adaptation par réseau. Ce hook s'applique IDENTIQUEMENT aux 4 plateformes.
` : ''}

━━━━━━━━━━━━━━━━━━
RÈGLES ALGORITHMES 2026 PAR RÉSEAU
━━━━━━━━━━━━━━━━━━

📘 FACEBOOK — Objectif : commentaires longs, réactions émotionnelles, partages.
• Style : conversationnel, humain, chaleureux, relatable.
• Longueur : 40 à 80 mots.
• CTA : 3-4 mots max, punchy et parlé (ex : "Dis-le en commentaire !", "Partage à un pote !").
• Hashtags : 5 à 10, priorité top requêtes Facebook de la cible + produit + secteur.

📸 INSTAGRAM — Objectif : sauvegardes, partages story, commentaires, SEO interne 2026.
• Style : aspirationnel, authentique, expert ou lifestyle selon secteur.
• Longueur : 150 à 300 mots max.
• Hook : 3 premiers mots = mots puissants scroll-stop (règle absolue de rétention).
• CTA : 3-4 mots max, parlé IG (ex : "Sauvegarde pour plus tard !", "Lien en bio maintenant").
• Hashtags : 5 à 10, priorité top requêtes Instagram de la cible + produit + secteur.

🎵 TIKTOK — Objectif : rétention, commentaires, SEO TikTok, partages, rewatch.
• Style : brut, direct, spontané, conversationnel.
• Longueur : 50 à 150 caractères max.
• CTA : 3-4 mots max, brut TikTok (ex : "Teste et reviens dire !", "Chope la ici").
• Hashtags : 5 à 10, priorité top requêtes TikTok de la cible + produit + secteur + #fyp/#pourtoi.

💼 LINKEDIN — Objectif : dwell time, conversations, crédibilité, commentaires longs, expertise.
• Style : professionnel humain, storytelling business, expertise naturelle.
• Longueur : 150 à 300 mots.
• CTA : 3-4 mots max, pro mais direct (ex : "Réserve ta démo", "DM pour échanger").
• Hashtags : 5 à 10, priorité top requêtes LinkedIn BtoB de la cible + secteur + produit.

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
JUSQU'À 8 hashtags MAX par réseau, SIMPLES (un seul mot/concept), VIRAUX, correspondant aux REQUÊTES RÉELLES de recherche du persona SUR CE RÉSEAU précis. Mixer niche cible + intention de recherche + secteur + tendance plateforme + branding. Jamais spammer, jamais > 8, jamais incohérents, jamais à rallonge ou illisibles.

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
    const parsed = extractJsonObject(content);
    if (params.ideaHook) {
      for (const p of ['facebook', 'instagram', 'tiktok', 'linkedin'] as const) {
        if (parsed?.[p]) parsed[p].hook = params.ideaHook;
      }
    }
    return parsed;
  } catch (e) {
    console.error('generateCaption JSON parse failed. Raw content:', String(content).slice(0, 800));
    throw new Error('Failed to parse AI response');
  }
}

function extractJsonObject(raw: string): any {
  let s = String(raw || '')
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  // direct parse
  try { return JSON.parse(s); } catch {}
  // grab the largest {...} block
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    let candidate = s.substring(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
    // repair common issues: trailing commas, control chars, smart quotes
    candidate = candidate
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
    return JSON.parse(candidate);
  }
  throw new Error('No JSON object found in AI response');
}

export async function generateImage(
  promptEn: string,
  aiModel: AIModel = 'nano-banana-2',
  format: string = '1:1',
  inputImageUrl?: string,
  abortSignal?: AbortSignal,
  logoUrl?: string,
  preferKie?: boolean,
) {
  // === FORCE kie.ai (utilisé notamment pour la génération de carrousel
  // sur nano-banana-2 / nano-banana-pro afin d'éviter l'épuisement des
  // crédits Lovable AI Gateway / OpenRouter) ===
  if (preferKie && ['nano-banana-2', 'nano-banana-pro'].includes(aiModel)) {
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

  // === OpenRouter models (Nano Banana, GPT Image 5, Grok) ===
  // NOTE: Imagen 4 variants are NOT on OpenRouter — they route through kie.ai below.
  const openRouterModels: AIModel[] = [
    'nano-banana-2', 'nano-banana-pro', 'grok-image',
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
    if (data?.fallback && data?.fallback_provider === 'kie') {
      if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      // Bascule vers kie.ai pour le même modèle (start + polling)
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
    if (data?.fallback) throw new Error(data?.error || 'Service image indisponible');
    if (data?.error) throw new Error(data.error);
    const imageUrl = data?.image_url;
    if (!imageUrl) throw new Error('No image generated (OpenRouter)');
    return imageUrl;
  }

  // All image models are now routed through kie.ai
  const isKieImageModel = [
    'nano-banana-2', 'nano-banana-pro',
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
      input_image_url: inputImageUrl || '',
      logo_url: logoUrl || '',
    },
  });

  if (error) throw error;
  if (data?.fallback && data?.fallback_model) {
    if (abortSignal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
    return generateImage(promptEn, data.fallback_model as AIModel, format, inputImageUrl, abortSignal, logoUrl);
  }
  if (data?.error) throw new Error(data.error);

  const imageUrl = data?.image_url;
  if (!imageUrl) throw new Error('No image generated');

  return imageUrl;
}

export interface ImageVerifyResult {
  ok: boolean;
  issues: string[];
  improved_prompt_fr?: string;
}

/**
 * Vérifie visuellement une image générée contre les contraintes de composition
 * (texte non superposé au sujet, logo discret, hiérarchie respectée, marges).
 * Si non conforme, renvoie un prompt amélioré pour régénération.
 */
export async function verifyGeneratedImage(params: {
  imageUrl: string;
  promptFr: string;
  format: string;
  hasText: boolean;
  textContent?: string;
  textPosition?: string;
  hasLogo: boolean;
  logoPosition?: string;
}): Promise<ImageVerifyResult> {
  const systemPrompt = `Tu es directeur artistique senior. Tu audites une image marketing générée par IA et vérifies STRICTEMENT le respect de règles de composition non négociables. Tu réponds UNIQUEMENT en JSON valide.

RÈGLES À VÉRIFIER (chaque violation = échec) :
1) Le texte overlay n'est JAMAIS écrit par-dessus le sujet principal (visage, produit hero, plat, packaging, personnage). Il vit dans une zone négative (fond, ciel, mur, sol, espace vide).
2) Le texte est parfaitement lisible (contraste suffisant, taille adaptée mobile 6-12% hauteur, marges ≥10%, kerning correct, intégré nativement).
3) Le logo est DISCRET : taille ≈3-8% de la plus petite dimension, placé en signature dans le coin/position attendue, jamais sur le sujet, jamais surdimensionné, jamais déformé/recoloré.
3-ter) ÉCHEC IMMÉDIAT si le logo est entouré de QUOI QUE CE SOIT : pointillés, tirets, lignes discontinues, marching ants / sélection Photoshop, rectangle de sélection, cadre, encadré, bordure (de toute épaisseur), contour, liseré, halo, pastille, vignette, fond coloré derrière le logo, rectangle blanc/noir/coloré, ombre portée formant un cadre, dashed/dotted border de quelque sorte. Le logo doit apparaître comme un PNG transparent simplement posé sur l'image, sans AUCUN trait ni AUCUNE forme autour. Toute trace de délimitation visuelle autour du logo = ok=false obligatoire.
3-bis) Le logo n'est JAMAIS superposé, ni chevauchant, ni en contact, ni dans la même bande horizontale/verticale que le texte overlay (titre, sous-texte, CTA, badge, emoji du titre). Marge minimale STRICTEMENT SUPÉRIEURE À 10% entre tout pixel du logo et tout glyphe de texte. Toute proximité visible logo↔texte = échec.
4) Aucun élément essentiel coupé/tronqué/sortant du cadre, marges de sécurité respectées.
5) Hiérarchie claire : sujet hero domine, texte zone calme, logo signature — pas de collision/chevauchement entre les trois zones.
6) Wording du texte affiché STRICTEMENT identique au texte demandé (pas d'invention, pas de faute).
7) Cohérence visuelle premium digne d'une affiche pro (pas de rendu "template Canva basique").
8) RATIO/FORMAT : l'image respecte EXACTEMENT le ratio demandé (1:1 carré, 16:9 horizontal cinéma, 9:16 vertical mobile). Aucune déformation, aucun cadrage incohérent avec le format.
9) SAFE-ZONES SPÉCIFIQUES AU FORMAT :
   Grille de référence : 9 zones (top-left, top-center, top-right, mid-left, center, mid-right, bottom-left, bottom-center, bottom-right) + coordonnées en pourcentage (x%, y%).
   - 9:16 vertical (1080×1920) : sujet hero zone mid-center (x 10-90%, y 25-72%, 50-65% surface) ; titre top-center (y 14-24%) OU bottom-center (y 76-86%), largeur max 84%, taille 8-10% hauteur ; sous-texte attaché au titre ; emoji intégré au titre (même taille, jamais flottant) ; badge en top-left/top-right (12-16% largeur) ; logo coin (par défaut bottom-right), marge ≥10%, taille 5-7% largeur. Safe-UI : 12% du haut et 18% du bas réservés/aérés.
   - 1:1 carré (1080×1080) : sujet hero centré (x 22-78%, y 22-78%, 40-55% surface) ; titre bandeau top-center (y 8-20%) OU bottom-center (y 80-92%), largeur ≤88%, taille 8-12% hauteur ; sous-texte collé au titre ; emoji intégré au titre (un emoji décoratif possible en coin opposé au logo, 6-8% côté) ; badge top-left/top-right (12-15% côté) ; logo coin (par défaut bottom-right), marge ≥10%, taille 6-8% côté.
   - 16:9 horizontal (1920×1080) : composition asymétrique règle des tiers — sujet hero tiers gauche (x 5-45%) OU tiers droit (x 55-95%), pleine hauteur utile (y 8-92%) ; titre dans le tiers OPPOSÉ (aligné gauche, y 25-75%), taille 10-14% hauteur, marges latérales ≥5%, haut-bas ≥7% ; sous-texte sous le titre (5-7% hauteur) ; emoji intégré au titre uniquement ; badge coin du tiers texte ; logo coin opposé au titre (par défaut bottom-right), marge ≥10%, taille 4-6% largeur.
10) POSITIONS EXPLICITES DANS LE PROMPT : vérifier que le prompt déclarait bien la position de CHAQUE élément (sujet, titre, sous-texte, emoji, badge, logo) avec zone + coordonnées % adaptées au ratio. Si l'image ne respecte pas ces positions OU si le prompt n'en déclarait pas → échec.
11) EMOJI : aucun emoji parasite flottant dans la scène ou sur le sujet. Tout emoji visible doit être intégré au bloc texte (titre/sous-texte) à la même hauteur de ligne, sauf cas explicite de pictogramme décoratif en coin opposé au logo (taille 6-8%).

SORTIE JSON :
{"ok": boolean, "issues": ["..."], "improved_prompt_fr": "..."}
- "ok" = true UNIQUEMENT si toutes les règles applicables sont respectées.
- "issues" = liste courte et précise des violations constatées.
- "improved_prompt_fr" = OBLIGATOIRE si ok=false. Reprends le prompt original et REFORMULE-le en AJOUTANT/CORRIGEANT un bloc « Positions exactes des éléments » qui déclare pour CHAQUE élément (sujet, titre, sous-texte, emoji, badge, logo) sa zone (grille 9) + coordonnées (x%, y%) + taille relative + marges, parfaitement adaptés au ratio ${params.format} (safe-zones décrites règle 9). Conserve la structure et l'esprit du prompt original. Reste en français, prêt à envoyer au modèle image.`;

  const userText = `PROMPT ORIGINAL UTILISÉ POUR GÉNÉRER L'IMAGE :
"""
${params.promptFr}
"""

CONTEXTE :
- Format / ratio attendu : ${params.format} ${params.format === '9:16' ? '(vertical mobile — Reels/Stories/TikTok)' : params.format === '16:9' ? '(horizontal cinéma — YouTube/LinkedIn/desktop)' : params.format === '1:1' ? '(carré — Instagram feed)' : ''}
- Texte overlay demandé : ${params.hasText ? `"${params.textContent || ''}" (position attendue : ${params.textPosition || 'n/c'})` : 'aucun'}
- Logo demandé : ${params.hasLogo ? `oui (position attendue : ${params.logoPosition || 'n/c'}, taille discrète signature)` : 'aucun'}

Analyse l'image jointe en tenant compte du ratio ${params.format} et de ses safe-zones spécifiques, et retourne le JSON.`;

  const data = await callKreatorAI({
    action: 'verify_image',
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userText }],
    system_prompt: systemPrompt,
    image_base64s: [params.imageUrl],
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { ok: true, issues: [] };
  try {
    const cleaned = String(content).replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      ok: !!parsed.ok,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      improved_prompt_fr: parsed.improved_prompt_fr || undefined,
    };
  } catch {
    return { ok: true, issues: [] };
  }
}

export async function generateVideo(
  promptEn: string,
  aiModel: AIModel = 'veo-3',
  format: string = '9:16',
  onProgress?: (pct: number) => void,
  abortSignal?: AbortSignal,
  modelSettings?: ModelSettings,
  soraCharacterScenes?: { duration: number }[],
  voiceOver?: { text: string; language: string },
  opts?: { onTaskStart?: (taskId: string) => void; resumeTaskId?: string }
) {
  const isKieModel = [
    'veo-3', 'veo-3.1', 'kling-2.1', 'kling-2.5', 'kling-2.6', 'kling-3.0',
    'grok-imagine-i2v', 'grok-imagine-t2v',
    'grok-imagine-1.5-preview',
    'bytedance/seedance-1.5-pro', 'bytedance/seedance-2',
    'sora-2', 'sora-2-t2v', 'sora-2-i2v', 'sora-2-pro-t2v', 'sora-2-pro-i2v', 'sora-2-pro-character',
    'minimax/hailuo-2.3', 'alibaba/wan-2.7',
  ].includes(aiModel);

  // Helper local : applique le mux voix off post-génération si nécessaire.
  const maybeMux = async (videoUrl: string): Promise<string> => {
    if (!voiceOver?.text?.trim()) return videoUrl;
    try {
      const { requiresMuxVoiceOver, getVideoDurationSec } = await import('./voice-over');
      if (!requiresMuxVoiceOver(aiModel)) return videoUrl;
      const durationSec = getVideoDurationSec(aiModel, modelSettings || {});
      if (onProgress) onProgress(92);

      // 1) TTS server-side
      const { data: ttsData, error: ttsErr } = await supabase.functions.invoke('tts-voiceover', {
        body: { text: voiceOver.text.trim(), language: voiceOver.language || 'Français' },
      });
      if (ttsErr || !ttsData?.audio_base64) {
        console.warn('[generateVideo] TTS failed, returning video without VO', ttsErr || ttsData);
        return videoUrl;
      }
      if (onProgress) onProgress(95);

      // 2) Mux client-side via ffmpeg.wasm
      const { muxVideoWithVoiceOver } = await import('./video-mux');
      const muxedBlob = await muxVideoWithVoiceOver({
        videoUrl,
        voiceOverMp3Base64: ttsData.audio_base64,
        videoDurationSec: durationSec,
      });
      if (onProgress) onProgress(98);

      // 3) Upload dans le bucket public
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return videoUrl;
      const file = new File([muxedBlob], `${crypto.randomUUID()}.mp4`, { type: 'video/mp4' });
      const path = `${user.id}/muxed/${crypto.randomUUID()}.mp4`;
      const { error: upErr } = await supabase.storage.from('kreator-uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'video/mp4',
      });
      if (upErr) {
        console.warn('[generateVideo] mux upload failed', upErr);
        return videoUrl;
      }
      const { data: pub } = supabase.storage.from('kreator-uploads').getPublicUrl(path);
      if (onProgress) onProgress(100);
      return pub.publicUrl || videoUrl;
    } catch (e) {
      console.error('[generateVideo] mux pipeline error', e);
      return videoUrl;
    }
  };

  // === kie.ai models — start + polling ===
  if (isKieModel) {
    let taskId = opts?.resumeTaskId;
    if (!taskId) {
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
      if (startData?.done && startData?.video_url) return await maybeMux(startData.video_url);
      taskId = startData?.task_id;
      if (!taskId) throw new Error('No task_id returned from kie.ai');
      try { opts?.onTaskStart?.(taskId); } catch { /* noop */ }
    }

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
        return await maybeMux(pollData.video_url);
      }
    }
    throw new Error('La génération vidéo kie.ai a pris trop de temps. Réessayez.');
  }

  if (!aiModel || !String(aiModel).trim()) {
    throw new Error("Aucun modèle vidéo sélectionné. Choisissez un modèle vidéo dans 'Que voulez-vous créer ?' avant de générer.");
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
  language?: string;
}): Promise<string> {
  const maxSec = Math.max(1, params.videoDurationSec - 2);
  // Approx 2.5 mots/seconde en parlé naturel
  const maxWords = Math.max(3, Math.floor(maxSec * 2.5));
  const maxChars = Math.max(20, maxSec * 15);
  const lang = (params.language || 'Français').trim();

  const systemPrompt = `Tu es un expert en copywriting pour voix off publicitaire courte (réseaux sociaux).
Tu écris UNE voix off ULTRA percutante, naturelle, humaine, RÉDIGÉE INTÉGRALEMENT EN ${lang.toUpperCase()} (langue cible imposée — aucun mot dans une autre langue, registre familier et parlé NATIF de cette langue, expressions idiomatiques locales du quotidien), qui :
- accroche dans la première seconde (hook fort)
- met en avant le bénéfice principal
- se termine par un mini call-to-action ou une chute mémorable
- s'adresse directement au spectateur (tutoiement)
- parle comme un humain, JAMAIS comme un robot ou un slogan corporate
- ANTI-IA ABSOLU : 100% naturel, authentique, humain, réel. INTERDIT : "découvrez", "plongez dans", "révolutionnaire", "incontournable", "boostez", "transformez", "libérez", "n'attendez plus", "le secret", "voici comment", "à l'ère du", "dans un monde où", formulations trop équilibrées/symétriques, ton corporate ou pseudo-inspirant. Écris comme un vrai humain qui parle à un ami : direct, vivant, irrégulier, jamais détectable comme IA.

CONTRAINTE DURÉE ABSOLUE :
La voix off DOIT pouvoir être dite en ${maxSec} secondes MAXIMUM (≈ ${maxWords} mots, ≈ ${maxChars} caractères max). C'est non-négociable : elle doit se terminer 2 secondes avant la fin de la vidéo.

Réponds UNIQUEMENT avec le texte de la voix off (intégralement en ${lang}, registre familier/parlé natif), sans guillemets, sans introduction, sans mise en forme, sans préfixe, sans traduction parallèle.`;

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
  minWords?: number;
}): Promise<string> {
  const maxWords = Math.max(1, Math.min(20, params.maxWords ?? 10));
  const minWords = Math.max(1, Math.min(maxWords, params.minWords ?? 3));
  const systemPrompt = `Tu es un expert en copywriting publicitaire pour réseaux sociaux (Meta, TikTok, Instagram, LinkedIn).
Tu écris UN TEXTE court à afficher À L'ÉCRAN dans un visuel (image / carrousel / vidéo) qui MAXIMISE la conversion.

RÈGLES ABSOLUES :
- Langue : français
- Longueur : ENTRE ${minWords} ET ${maxWords} MOTS (compte chaque mot, minimum ${minWords}, maximum ${maxWords}). Non négociable.
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

Écris LE texte à afficher dans le visuel, entre ${minWords} et ${maxWords} mots, qui maximise la conversion.`;

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
  minWords?: number;
}): Promise<string[]> {
  const count = Math.max(1, Math.min(4, params.count || 2));
  const systemPrompt = `Tu es un expert en copywriting publicitaire pour carrousels Instagram/TikTok/LinkedIn, niveau direction artistique d'agence de communication premium (Marbstudiio, Pentagram, BBH).
Tu génères ${count} textes courts à afficher à l'écran, UN PAR SLIDE d'un carrousel de ${count} slides, parfaitement HARMONIEUX entre eux, qui maximisent la conversion.

RÈGLES ABSOLUES :
- Langue : français.
- Chaque texte = UNE SEULE PHRASE COMPLÈTE, autonome, qui se suffit à elle-même. JAMAIS de phrase tronquée, coupée, incomplète, suspendue ou amputée. La phrase doit pouvoir être lue à voix haute sans qu'il manque un mot.
- Phrase la PLUS CONCISE possible : le strict nécessaire, AUCUN mot superflu, aucun pavé de texte, aucune surcharge. Texte AÉRÉ digne d'une grande agence de communication et design produit/service.
- LONGUEUR IMPOSÉE : chaque texte fait ENTRE 5 ET 15 MOTS (bornes incluses). N'utilise PLUS de 15 mots, et JAMAIS moins de 5 mots. Si l'idée est riche, monte jusqu'à 15 mots ; si elle est simple, reste autour de 5-8 mots. Toujours percutant, lisible d'un coup d'œil sur mobile.
- Un seul texte par slide (pas de retour à la ligne, pas de point-virgule pour relier deux idées).
- HARMONIE / COHÉRENCE NARRATIVE PARFAITE entre les ${count} slides : même ton, même registre, même rythme, même style éditorial — comme s'il s'agissait d'un seul mini-script découpé. SUITE LOGIQUE OBLIGATOIRE entre les textes : chaque slide enchaîne naturellement sur la précédente et prépare la suivante (cause → conséquence, problème → solution, étape → étape, promesse → preuve → action). Lus à la suite, les ${count} textes doivent former une mini-histoire fluide, sans rupture ni redite.
- ALIGNEMENT CONTEXTE 100% OBLIGATOIRE : chaque texte DOIT s'appuyer fidèlement sur l'OBJECTIF du contenu, l'ANGLE MARKETING, le NOM de l'offre, sa DESCRIPTION, son TYPE D'OFFRE, le PERSONA, l'activité et le secteur fournis dans le contexte. Aucun texte ne doit inventer une fonctionnalité, un bénéfice ou un positionnement hors de ces inputs.
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

  Écris les ${count} textes à afficher dans chaque slide — chacun étant UNE PHRASE COMPLÈTE de 5 à 15 mots, autonome, jamais tronquée, en SUITE LOGIQUE cohérente d'une slide à l'autre (mini-script découpé), 100% alignés sur l'objectif, l'angle marketing, le nom, la description et le type d'offre ci-dessus, et optimisés pour la conversion.`;

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
    // Retire la ponctuation finale lourde (le rendu visuel n'en a pas besoin).
    t = t.replace(/[;:]+$/g, '').trim();
    // Cap dur à 15 mots maximum par slide (la borne basse de 5 mots reste
    // à la charge du modèle via le system prompt).
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length > 15) {
      t = words.slice(0, 15).join(' ').replace(/[.,;:!?]+$/g, '').trim();
    }
    out.push(t);
  }
  return out;
}
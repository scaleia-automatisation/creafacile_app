import type { ContentType } from '@/store/useKreatorStore';

export type VisualStyle = { label: string; description: string };

export const VISUAL_STYLES: Record<ContentType, VisualStyle[]> = {
  image: [
    { label: '⬜ Minimaliste', description: "Fond uni, produit ou service centré, rien ne distrait l'œil. Idéal pour : packshot, lancement produit, image épurée premium." },
    { label: '🌿 Lifestyle', description: "Mise en scène réelle, personne en action, ambiance du quotidien. Idéal pour : projection client, identification, désir d'achat." },
    { label: '🔄 Avant / Après', description: "Image divisée en deux, transformation visible immédiatement. Idéal pour : preuve, résultat, transformation produit ou service." },
    { label: '🔍 Gros plan macro', description: "Détail ultra-rapproché, texture, qualité, finition visible. Idéal pour : montrer la qualité, créer le désir sensoriel." },
    { label: '🪟 Flat-lay', description: "Vue de dessus, produit + accessoires disposés joliment ensemble. Idéal pour : storytelling visuel, ambiance, mise en valeur multi-éléments." },
    { label: '🔠 Texte géant', description: "Phrase ou chiffre énorme sur fond simple, message direct. Idéal pour : promesse, chiffre choc, citation forte, urgence." },
    { label: '🎨 Couleur-bloc vive', description: "Une seule couleur saturée en fond, produit ou service au centre. Idéal pour : arrêter le scroll, signature visuelle forte, marque jeune." },
    { label: '⚫ Contraste fort', description: "Noir et blanc ou opposition extrême, message ultra-clair. Idéal pour : élégance, sérieux, marque premium, impact visuel." },
    { label: '📷 Authentique / Réel', description: "Photo non retouchée, vraie personne, vraie situation, naturel. Idéal pour : témoignage, confiance, marque proche, B2B humain." },
    { label: '🎞️ Cinéma / Editorial', description: "Lumière travaillée, mise en scène esthétique, image magazine. Idéal pour : luxe, mode, voyage, automobile, immobilier haut de gamme." },
    { label: '🖥️ Capture d\'écran / Interface', description: "Vraie capture du produit numérique ou interface utilisée. Idéal pour : SaaS, application, service digital, démo concrète." },
    { label: '🎈 Pop / Graphique coloré', description: "Couleurs vives, formes graphiques, style affiche moderne. Idéal pour : food, divertissement, créateurs, jeunes marques." },
  ],
  carousel: [
    { label: '📖 Storytelling visuel', description: "Une histoire racontée slide par slide, fil narratif fort. Idéal pour : créer l'émotion, retenir l'attention jusqu'au bout." },
    { label: '🎨 Texte sur fond coloré', description: "Phrases courtes sur fonds de couleur unie, lecture rapide. Idéal pour : éducation, conseils, citations, listes simples." },
    { label: '🔄 Avant / Après étalé', description: "Slide 1 avant, slide 2 transition, slide 3 après transformation. Idéal pour : preuve de résultat, transformation client visible." },
    { label: '🔢 Tuto étapes numérotées', description: "Étape 1, 2, 3 avec visuel et titre clair par slide. Idéal pour : guide, méthode, processus, instructions." },
    { label: '🤍 Minimaliste professionnel', description: "Fonds clairs, typographie élégante, peu d'éléments par slide. Idéal pour : B2B, finance, immobilier, conseil, marque sérieuse." },
    { label: '🆚 Comparatif visuel', description: "Tableau ou opposition côte à côte, différence évidente immédiate. Idéal pour : prouver la valeur, dépasser la concurrence." },
    { label: '🖼️ Photo + texte superposé', description: "Belle image en fond, texte court par-dessus, lecture immédiate. Idéal pour : lifestyle, voyage, mode, beauté, food." },
    { label: '📰 Magazine / Editorial', description: "Mise en page comme un magazine, typographie travaillée, premium. Idéal pour : luxe, mode, culture, créateurs, marques haut de gamme." },
    { label: '💬 Témoignage / Citation', description: "Une grande citation par slide avec photo client réelle visible. Idéal pour : preuve sociale, confiance, fidélisation, B2B." },
    { label: '📊 Graphique / Data visuelle', description: "Chiffres, courbes, pourcentages mis en valeur graphiquement clairement. Idéal pour : prouver les résultats, B2B, finance, performance." },
  ],
  video: [
    { label: '🎤 Face caméra', description: "Quelqu'un parle directement à l'objectif, proximité immédiate. Idéal pour : témoignage, créateur, fondateur, coach, autorité." },
    { label: '⚡ Démo rapide', description: "Le produit ou service utilisé en action, résultat visible vite. Idéal pour : SaaS, beauté, food, outils, électronique." },
    { label: '🔄 Avant / Après filmé', description: "Transition visuelle entre deux états, transformation rapide visible. Idéal pour : beauté, fitness, rénovation, formation, coaching." },
    { label: '🔠 Texte animé dynamique', description: "Mots qui apparaissent vite, rythme rapide, musique tendance. Idéal pour : éducation, statistiques, listes, accroches fortes." },
    { label: '👁️ POV (point de vue)', description: "Caméra à la première personne, immersion totale spectateur. Idéal pour : voyage, restaurant, expérience client, déballage." },
    { label: '📦 Unboxing / Réaction', description: "Découverte filmée d'un produit ou service, émotion authentique. Idéal pour : e-commerce, beauté, tech, lancement nouveauté." },
    { label: '🐢 Slow motion', description: "Mouvement ralenti d'un détail, beauté du geste amplifiée. Idéal pour : food, mode, automobile, luxe, sport." },
    { label: '🎬 Cinématique / Aérien', description: "Plans larges, drone, lumière travaillée, qualité film. Idéal pour : immobilier, voyage, automobile, architecture, événement." },
    { label: '🖥️ Enregistrement d\'écran', description: "Capture du produit numérique utilisé en direct, simple. Idéal pour : SaaS, application, formation digitale, tutoriel." },
    { label: '🎨 Stop-motion / Animation', description: "Animation image par image, effet créatif unique mémorable. Idéal pour : food, créateurs, marques originales, explainer." },
    { label: '✂️ Montage ultra-rapide', description: "Coupures multiples, plusieurs scènes courtes, énergie maximale. Idéal pour : best-of, lancement, événement, gaming, divertissement." },
    { label: '🎙️ Narration voix-off', description: "Voix posée qui raconte sur images travaillées, émotion forte. Idéal pour : luxe, voyage, marque émotionnelle, storytelling profond." },
  ],
};
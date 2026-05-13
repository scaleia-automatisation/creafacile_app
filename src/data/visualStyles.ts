import type { ContentType } from '@/store/useKreatorStore';

export type VisualStyle = { label: string; description: string };

export const VISUAL_STYLES: Record<ContentType, VisualStyle[]> = {
  image: [
    { label: '🔠 Texte géant', description: "Phrase ou chiffre choc plein écran, lu en 1 seconde. Convertit pour produit, service, SaaS et formation : promesse, résultat, urgence." },
    { label: '🔄 Avant / Après', description: "Deux états côte à côte, transformation immédiate. Universel : produit (résultat), service (livrable), SaaS (interface), formation (élève)." },
    { label: '🎨 Couleur-bloc vive', description: "Fond saturé unique, sujet centré, signature forte. Stoppe le scroll quel que soit le type d'offre." },
    { label: '⚫ Contraste fort', description: "Noir & blanc ou opposition extrême, message ultra-net. Sérieux et premium pour produit, service, SaaS ou formation." },
    { label: '⬜ Minimaliste', description: "Fond uni, sujet centré, zéro distraction. Universel : packshot produit, mockup SaaS, visuel service, couverture formation." },
    { label: '🌿 Lifestyle', description: "Personne réelle en action, projection client immédiate. Convertit pour produit utilisé, service vécu, SaaS au quotidien, formation appliquée." },
    { label: '💬 Témoignage / Citation', description: "Grande citation client + visage réel, preuve sociale immédiate. Universel : avis produit, retour service, étude SaaS, témoignage élève." },
    { label: '📊 Chiffre clé / Data', description: "Un seul chiffre énorme + contexte court, preuve chiffrée. Convertit pour ROI produit, résultat service, métrique SaaS, taux formation." },
    { label: '🆚 Comparatif visuel', description: "Opposition côte à côte vs concurrence ou ancienne méthode. Universel : produit vs autre, service vs DIY, SaaS vs Excel, formation vs autodidacte." },
    { label: '🎈 Pop / Graphique coloré', description: "Couleurs vives, formes graphiques, style affiche moderne. Convertit pour marques jeunes : produit, service, SaaS ou formation." },
  ],
  carousel: [
    { label: '🔢 Tuto étapes numérotées', description: "Étapes 1, 2, 3 claires par slide, méthode actionnable. Convertit pour produit (mode d'emploi), service (process), SaaS (onboarding), formation (méthode)." },
    { label: '🔄 Avant / Après étalé', description: "Slide 1 problème, slide 2 transformation, slide 3 résultat. Universel : transformation produit, service, SaaS ou élève formation." },
    { label: '🎨 Texte sur fond coloré', description: "Phrases courtes sur fond uni, lecture instantanée. Convertit pour conseils, listes, promesses — tout type d'offre." },
    { label: '📖 Storytelling visuel', description: "Histoire racontée slide par slide : accroche → tension → résolution. Universel pour produit, service, SaaS ou formation." },
    { label: '🆚 Comparatif visuel', description: "Opposition vs concurrence ou ancienne méthode, valeur évidente. Convertit pour toute offre." },
    { label: '💬 Témoignage / Citation', description: "Grande citation + photo client par slide, preuve sociale forte. Universel quel que soit le type d'offre." },
    { label: '📊 Graphique / Data visuelle', description: "Chiffres, %, courbes mis en valeur, preuve chiffrée slide par slide. Convertit pour résultats produit, service, SaaS ou formation." },
    { label: '🤍 Minimaliste professionnel', description: "Fonds clairs, typographie élégante, peu d'éléments. Sérieux et premium pour toute offre B2B ou haut de gamme." },
    { label: '❌ Erreurs vs Solutions', description: "Slide erreur ❌, slide solution ✅, vraie valeur ajoutée. Universel : erreurs produit, service, SaaS ou formation à éviter." },
    { label: '🎁 Bénéfices clés listés', description: "1 bénéfice par slide, icône + titre + bénéfice court. Convertit pour vendre n'importe quelle offre en mode pitch visuel." },
  ],
  video: [
    { label: '🎤 Face caméra', description: "Personne qui parle direct à l'objectif, hook fort en 2s. Convertit pour produit, service, SaaS et formation : autorité, confiance, proximité." },
    { label: '⚡ Démo rapide', description: "Offre utilisée en action, résultat visible en quelques secondes. Universel : démo produit, service livré, SaaS en use, exercice formation." },
    { label: '🔄 Avant / Après filmé', description: "Transition rapide entre 2 états, transformation visible. Convertit pour produit, service, SaaS (interface) ou élève formation." },
    { label: '🔠 Texte animé dynamique', description: "Mots qui apparaissent au rythme rapide, musique tendance. Universel : promesses, chiffres, listes, accroches pour toute offre." },
    { label: '✂️ Montage ultra-rapide', description: "Cuts multiples, scènes courtes, énergie dès la 1re seconde. Convertit pour n'importe quelle offre en mode scroll-stop." },
    { label: '🖥️ Enregistrement d\'écran', description: "Capture directe à l'écran, démo concrète et claire. Convertit pour SaaS, formation, service digital, produit numérique." },
    { label: '👁️ POV (point de vue)', description: "Caméra 1re personne, immersion totale. Convertit pour expérience produit, service vécu, parcours SaaS ou exercice formation." },
    { label: '💬 Témoignage filmé', description: "Vrai client face caméra qui raconte son résultat. Preuve sociale ultime pour produit, service, SaaS ou formation." },
    { label: '🎙️ Narration voix-off', description: "Voix posée + visuels travaillés, storytelling émotionnel fort. Universel : marque produit, service premium, SaaS, formation inspirante." },
    { label: '📊 Data animée', description: "Chiffres et graphiques animés, preuve chiffrée en mouvement. Convertit pour ROI produit, résultats service, métriques SaaS, taux formation." },
  ],
};
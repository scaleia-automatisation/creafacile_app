import { useKreatorStore } from '@/store/useKreatorStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo } from 'react';
import type { ContentType } from '@/store/useKreatorStore';
import { FUNNEL_OBJECTIVES, FUNNEL_ANGLES, type FunnelObjective } from '@/data/funnelAngles';
import { VISUAL_STYLES } from '@/data/visualStyles';
import IdeaSuggestions from './IdeaSuggestions';

const OBJECTIVES = FUNNEL_OBJECTIVES;

// ─────────────────────────────────────────────────────────────────────────────
// Angles marketing et styles visuels personnalisés par SECTEUR et adaptés au
// TYPE DE CONTENU (image / carrousel / vidéo). Pensés pour générer des
// contenus business‑oriented, premium, ultraréalistes et indétectables IA.
// ─────────────────────────────────────────────────────────────────────────────

type AnglesAndStyles = {
  angles: string[];
  styles: { image: string[]; carousel: string[]; video: string[] };
};

// Angles ordonnés selon AIDA + FOMO :
// 🟣 ATTENTION → 🔵 INTÉRÊT → 🟢 DÉSIR → 🟡 ACTION → 🔴 FOMO (urgence/rareté)
// Chaque angle = 1 phrase courte, simple, compréhensible par un enfant de 10 ans.

const SECTOR_PRESETS: Record<string, AnglesAndStyles> = {
  '🛍️ E-commerce / Retail (DTC, marketplaces)': {
    angles: [
      '👀 Le produit qui fait stopper le scroll',
      '🤯 Ce détail va te surprendre',
      '❓ Tu connais déjà cette astuce ?',
      '🎬 Comment ça fonctionne en 10 secondes',
      '✅ Le problème que ce produit résout',
      '💡 Pourquoi tout le monde en parle',
      '🌟 Notre best-seller du moment',
      '⭐ Plus de 1000 clients adorent',
      '✨ Le résultat avant / après',
      '🆚 Pourquoi il bat la concurrence',
      '👍 Approuvé par les vrais utilisateurs',
      '🎁 La qualité qu\'on voit au premier coup d\'œil',
      '📦 Livré chez toi en 48h',
      '🛒 Commande en 2 clics',
      '💳 Paiement en plusieurs fois sans frais',
      '↩️ Satisfait ou remboursé 30 jours',
      '⏰ Offre valable 24h seulement',
      '🔥 Stock presque épuisé',
      '💸 -30% pendant 48h chrono',
      '🚨 Dernières pièces disponibles',
      '🎉 Cadeau offert pour les 50 premiers',
    ],
    styles: {
      image: ['🖼️ Packshot studio premium fond neutre', '☀️ Flat lay lumière naturelle douce', '🏠 Mise en situation lifestyle réaliste', '✨ Macro produit ultra-détaillée'],
      carousel: ['📊 Avant / après produit', '🔢 Top features numérotées', '🆚 Comparatif visuel structuré', '📖 Storytelling produit en 3-5 slides'],
      video: ['📱 UGC main-tenue iPhone naturel', '🎬 Démo produit cinématographique', '📦 Unboxing ASMR satisfaisant', '⚡ Hook 2s + bénéfice + CTA'],
    },
  },
  '🧃 Produits grande consommation (cosmétiques, food, boissons)': {
    angles: [
      '👀 Le produit dont tout le monde parle',
      '🤩 Tellement bon que ça se voit',
      '❓ Tu as déjà goûté à ça ?',
      '🌿 Ce qu\'il y a vraiment dedans',
      '💡 Pourquoi c\'est meilleur pour toi',
      '🎬 Comment l\'utiliser au quotidien',
      '😋 Le plaisir dès la première fois',
      '🌟 Notre saveur la plus aimée',
      '⭐ Adoré par les familles',
      '🏆 Élu meilleur produit de l\'année',
      '🆚 Comparé aux marques classiques',
      '✨ La différence se sent tout de suite',
      '🛒 Trouve-le dans ton magasin préféré',
      '🛍️ Disponible en ligne en 1 clic',
      '🎁 Le pack découverte à petit prix',
      '💳 Premier achat -20%',
      '⏰ Édition limitée du mois',
      '🔥 Bientôt en rupture de stock',
      '🚨 Plus que quelques jours pour l\'avoir',
      '🎉 Saveur exclusive de saison',
      '💸 Promo flash week-end seulement',
    ],
    styles: {
      image: ['📷 Macro food/produit ultra-appétissant', '☀️ Lumière naturelle matinale', '🌿 Flat lay ingrédients bruts', '🎨 Pop coloré packaging hero'],
      carousel: ['🍳 Recette / routine en 3 étapes', '🌿 Ingrédients & bénéfices', '⭐ Avis consommateurs', '📖 Histoire de la marque'],
      video: ['💧 ASMR pour / verser / craquer', '🎬 Pack-shot rotatif premium', '📱 UGC dégustation authentique', '⚡ Stop-motion pop & fun'],
    },
  },
  '👗 Mode / Fashion / Luxe': {
    angles: [
      '👀 La pièce qui va faire tourner les têtes',
      '🤯 Cette tenue change tout',
      '❓ Et toi, tu oserais la porter ?',
      '👑 Le style qui inspire confiance',
      '✨ Comment la porter en 3 façons',
      '💡 Pourquoi cette pièce est iconique',
      '🪞 Le look avant / après',
      '🌟 La pièce coup de cœur de la saison',
      '⭐ Adorée par les fashionistas',
      '🏆 Vue partout sur Instagram',
      '🧵 La qualité qu\'on touche du doigt',
      '🎨 Les couleurs disponibles',
      '👗 Trouve ta taille en 10 secondes',
      '🛍️ Essaye-la chez toi sans engagement',
      '🎁 Livraison + retour gratuits',
      '💳 Paye en 3x sans frais',
      '⏰ Drop de la nouvelle collection',
      '🔥 Édition limitée numérotée',
      '🚨 Dernières tailles disponibles',
      '🎉 Pré-commande exclusive 24h',
      '💸 -40% sur la collection précédente',
    ],
    styles: {
      image: ['🏛️ Editorial luxe magazine', '🌆 Street style urbain', '🖼️ Studio fond neutre fashion', '🌸 Romantique lumière dorée'],
      carousel: ['👗 Lookbook 3-5 tenues', '🆚 1 pièce 3 façons', '📖 Behind the scenes shooting', '🎯 Guide morphologie'],
      video: ['🎬 Catwalk cinématographique slow-mo', '📱 GRWM authentique', '🌆 Try-on haul lifestyle', '✨ Teaser drop dramatique'],
    },
  },
  '🧴 Beauté / Cosmétique / Skincare': {
    angles: [
      '👀 La routine qui change la peau',
      '🤯 Le résultat va t\'étonner',
      '❓ Tu connais ce secret beauté ?',
      '🧪 Les ingrédients qui marchent vraiment',
      '💡 Pourquoi ta peau va l\'adorer',
      '🎬 Ma routine en 3 étapes simples',
      '✨ Avant / après en 14 jours',
      '🌟 Le best-seller skincare',
      '⭐ +10 000 avis 5 étoiles',
      '👩‍🔬 Validé par les dermatologues',
      '🌿 100% clean et cruelty-free',
      '🆚 La différence vs ta crème actuelle',
      '🛒 Disponible en pharmacie et en ligne',
      '🎁 Pack routine complète à -25%',
      '💳 Premier achat = mini format offert',
      '🧴 Test la mini avant la full size',
      '⏰ Lancement nouveau soin cette semaine',
      '🔥 Stock limité en édition',
      '🚨 Bientôt en rupture, profite vite',
      '🎉 Cadeau dès 50€ d\'achat',
      '💸 -30% pour les 100 premières',
    ],
    styles: {
      image: ['💎 Macro texture produit hyperréel', '☀️ Skin glow lumière naturelle', '🖼️ Packshot studio premium', '🌸 Lifestyle salle de bain épurée'],
      carousel: ['🧴 Routine matin / soir', '🧪 Actifs & bénéfices', '✨ Résultats avant / après', '⭐ Témoignages clientes'],
      video: ['📱 UGC application produit', '✨ Glow-up transformation', '🧪 Démo texture macro', '🎬 Storytelling fondateur'],
    },
  },
  '💻 Tech / SaaS / IA / startups digitales': {
    angles: [
      '👀 L\'outil qui fait gagner des heures',
      '🤯 Tu fais encore ça à la main ?',
      '❓ Et si l\'IA bossait pour toi ?',
      '⏱️ Comment ça marche en 30 secondes',
      '💡 Le problème qu\'on résout enfin',
      '🎬 Démo express en vidéo',
      '📈 Le ROI prouvé en chiffres',
      '🌟 La fonctionnalité qui change tout',
      '⭐ Adopté par +5000 équipes',
      '🏆 Élu meilleur outil 2026',
      '🆚 Pourquoi c\'est mieux qu\'Excel',
      '🧠 L\'expertise derrière l\'outil',
      '🛠️ Essaye gratuitement 14 jours',
      '👉 Démo personnalisée en 1 clic',
      '🎁 Setup offert pour démarrer',
      '💳 Sans engagement, annule quand tu veux',
      '⏰ Tarif early-adopter encore actif',
      '🔥 Places en bêta limitées',
      '🚨 Hausse de prix dans 7 jours',
      '🎉 Bonus exclusifs pour les 100 premiers',
      '💸 -50% sur le plan annuel',
    ],
    styles: {
      image: ['🖥️ UI mockup propre & moderne', '✨ Minimaliste tech premium', '🌑 Dark mode néon', '📊 Data viz claire'],
      carousel: ['📊 Étude de cas chiffrée', '💡 5 tips actionnables', '🆚 Avant vs après automatisation', '🎯 Roadmap / framework'],
      video: ['🎬 Screencast démo produit', '📱 Talking head founder', '⚡ Motion graphics data', '💼 Témoignage client B2B'],
    },
  },
  '🏦 Banque / Finance / Assurance (Fintech incluse)': {
    angles: [
      '👀 L\'erreur qui te coûte cher chaque mois',
      '🤯 Tu paies trop sans le savoir',
      '❓ Et si ton argent travaillait pour toi ?',
      '📚 Comprendre en 1 minute',
      '💡 La solution simple à connaître',
      '🛡️ Pourquoi c\'est 100% sécurisé',
      '📈 Combien tu peux économiser',
      '🌟 La formule la plus choisie',
      '⭐ Noté 4,9/5 par les clients',
      '🏆 Recommandé par les experts',
      '🆚 Comparé à ta banque actuelle',
      '🧠 L\'expertise qui te protège',
      '👉 Simule ton offre en 2 minutes',
      '🎁 Ouverture de compte offerte',
      '💳 100€ offerts à la souscription',
      '📞 Un conseiller te rappelle gratuitement',
      '⏰ Offre de bienvenue ce mois-ci',
      '🔥 Taux exceptionnel encore valable',
      '🚨 Conditions qui changent bientôt',
      '🎉 Bonus parrainage limité dans le temps',
      '💸 Frais offerts la première année',
    ],
    styles: {
      image: ['🏛️ Premium institutionnel sobre', '📊 Data viz infographique', '🖥️ App UI clean', '🌆 Lifestyle pro confiant'],
      carousel: ['📚 Guide en 5 étapes', '🆚 Comparatif solutions', '📊 Chiffres clés impactants', '⚠️ Erreurs à éviter'],
      video: ['🎬 Talking head expert pédagogique', '📊 Motion data storytelling', '💼 Témoignage client résultat', '⚡ Hook chiffré + insight'],
    },
  },
  '🏠 Immobilier (promotion, agences, location courte durée)': {
    angles: [
      '👀 Le bien rare que tout le monde cherche',
      '🤯 Cette vue va te scotcher',
      '❓ Et si c\'était ton futur chez toi ?',
      '🏡 Visite virtuelle en 60 secondes',
      '💡 Pourquoi ce quartier est top',
      '📍 Tous les commerces à 5 minutes',
      '💰 La rentabilité expliquée simplement',
      '🌟 Le coup de cœur de la semaine',
      '⭐ +200 clients déjà accompagnés',
      '🏆 Agence n°1 sur le secteur',
      '🆚 Avant / après home staging',
      '🔑 Bien off-market exclusif',
      '👉 Réserve ta visite en 1 clic',
      '📞 Estimation gratuite en 24h',
      '🎁 Frais de notaire offerts',
      '💳 Financement étudié sur place',
      '⏰ Première visite ce week-end',
      '🔥 Déjà 10 visites prévues',
      '🚨 Compromis attendu cette semaine',
      '🎉 Dernier lot disponible du programme',
      '💸 Baisse de prix exceptionnelle',
    ],
    styles: {
      image: ['📸 Photo immo grand-angle lumière dorée', '🏛️ Architecture éditoriale', '🌆 Vue drone aérienne', '🖼️ Staging intérieur magazine'],
      carousel: ['🏠 Visite virtuelle slide par slide', '💰 Calcul rentabilité', '📍 Quartier & atouts', '🆚 Avant / après home staging'],
      video: ['🎬 Tour cinématographique gimbal', '🚁 Drone aérien dynamique', '📱 Walkthrough natif agent', '⚡ Hook prix + surface + CTA'],
    },
  },
  '🚗 Automobile (constructeurs + concessionnaires)': {
    angles: [
      '👀 La voiture qu\'on ne voit pas passer',
      '🤯 Ce design va te bluffer',
      '❓ Tu l\'imagines garée chez toi ?',
      '🏁 Les sensations en 30 secondes',
      '💡 Pourquoi c\'est la plus complète',
      '🔧 Toutes les options expliquées',
      '⛽ Combien tu vas économiser en carburant',
      '🌟 Le modèle le plus vendu',
      '⭐ Avis conducteurs vérifiés',
      '🏆 Élue voiture de l\'année',
      '🆚 Comparée aux concurrentes',
      '💎 Le détail premium qu\'on adore',
      '👉 Réserve ton essai gratuit',
      '📞 Demande ton offre personnalisée',
      '🎁 Pack équipement offert',
      '💳 Financement à 0% étudié',
      '⏰ Offre valable jusqu\'à fin du mois',
      '🔥 Derniers modèles en stock',
      '🚨 Bonus reprise jusqu\'à 5000€',
      '🎉 Édition spéciale numérotée',
      '💸 Remise exceptionnelle ce week-end',
    ],
    styles: {
      image: ['🌆 Auto cinématique éclairage ciné', '🏁 Action shot dynamique', '🖼️ Studio fond gradient premium', '🌅 Golden hour route ouverte'],
      carousel: ['🔧 Specs techniques visuelles', '🆚 Comparatif modèles', '🎁 Offres concession', '📖 Histoire du modèle'],
      video: ['🎬 Spot publicitaire ciné', '🚗 Roulage drone dynamique', '📱 Walk-around concession', '⚡ Hook + perf + CTA RDV'],
    },
  },
  '✈️ Tourisme / Voyage / Hôtellerie': {
    angles: [
      '👀 La destination qui fait rêver',
      '🤯 Ce paysage existe vraiment',
      '❓ Et si c\'était toi sur la photo ?',
      '🗺️ L\'itinéraire parfait en 1 minute',
      '💡 Pourquoi y aller maintenant',
      '🌅 Les 3 plus beaux spots',
      '🏖️ Ce qui est inclus dans le séjour',
      '🌟 Le séjour le plus réservé',
      '⭐ +1000 voyageurs comblés',
      '🏆 Hôtel élu meilleur de la région',
      '🍽️ La gastronomie locale incontournable',
      '🤿 L\'expérience unique sur place',
      '👉 Réserve en 2 minutes',
      '📞 Conseil gratuit pour ton voyage',
      '🎁 Surclassement offert',
      '💳 Annulation gratuite jusqu\'à J-7',
      '⏰ Tarif early booking encore actif',
      '🔥 Dernières chambres disponibles',
      '🚨 Vacances scolaires presque complètes',
      '🎉 Bonus + petit-déjeuner offert',
      '💸 -30% sur les départs de dernière minute',
    ],
    styles: {
      image: ['🌅 Paysage golden hour épique', '🏖️ Lifestyle vacances authentique', '🏛️ Hôtel éditorial magazine', '🍽️ Gastronomie locale macro'],
      carousel: ['🗺️ Itinéraire jour par jour', '✅ Top 5 expériences', '💰 Budget & bons plans', '📖 Carnet de voyage'],
      video: ['🚁 Drone destination épique', '📱 Vlog immersif POV', '🎬 Trailer destination ciné', '⚡ Hook lieu + prix + CTA'],
    },
  },
  '🍽️ Restauration / Food brands / Dark kitchens': {
    angles: [
      '👀 Le plat qui fait saliver direct',
      '🤯 Tu vois cette texture ?',
      '❓ Tu craquerais pour ça ?',
      '👨‍🍳 Le secret du chef en 30 secondes',
      '💡 Pourquoi nos produits sont différents',
      '🌿 100% frais, 100% local',
      '🍽️ La carte du moment dévoilée',
      '🌟 Le plat signature à goûter absolument',
      '⭐ Avis Google 4,9/5',
      '🏆 Recommandé par les guides',
      '📍 À 5 minutes de chez toi',
      '🎉 L\'ambiance qu\'on adore',
      '👉 Réserve ta table en 1 clic',
      '📲 Commande à emporter ou en livraison',
      '🎁 Apéritif offert pour ta réservation',
      '💳 Carte fidélité = 1 plat offert',
      '⏰ Menu spécial week-end',
      '🔥 Plat du jour en quantité limitée',
      '🚨 Dernières places pour ce soir',
      '🎊 Soirée à thème exclusive',
      '💸 Happy hour de 18h à 20h',
    ],
    styles: {
      image: ['📷 Food photography macro vapeur', '☀️ Table styling lumière naturelle', '🔥 Action cuisine ambiance chaude', '🖼️ Plat hero fond sombre'],
      carousel: ['🍽️ Menu signature visuel', '👨‍🍳 Étapes recette', '⭐ Avis clients', '📍 Adresse & ambiance'],
      video: ['🎬 ASMR cuisine satisfaisant', '👨‍🍳 Behind the scenes chef', '📱 Foodie review authentique', '⚡ Hook plat + prix + CTA resa'],
    },
  },
  '🩺 Santé / Pharma / Cliniques / Bien-être': {
    angles: [
      '👀 Le symptôme à ne pas ignorer',
      '🤯 Ce que personne ne te dit',
      '❓ Tu as déjà ressenti ça ?',
      '📚 Comprendre en 1 minute',
      '💡 La solution douce et naturelle',
      '🛡️ Pourquoi c\'est sans risque',
      '✨ Le résultat patient en photos',
      '🌟 Le protocole le plus demandé',
      '⭐ +500 patients accompagnés',
      '👩‍⚕️ Équipe diplômée & expérimentée',
      '🏆 Clinique reconnue dans la région',
      '🌿 Approche globale et bienveillante',
      '👉 Prends RDV en ligne en 1 clic',
      '📞 Premier appel gratuit & confidentiel',
      '🎁 Bilan offert pour ton premier RDV',
      '💳 Tiers payant accepté',
      '⏰ Quelques créneaux libres cette semaine',
      '🔥 Agenda qui se remplit vite',
      '🚨 Plus de RDV avant 3 semaines',
      '🎉 Nouveau soin dispo dès lundi',
      '💸 Forfait découverte à prix doux',
    ],
    styles: {
      image: ['🏥 Clinique épurée lumière douce', '👩‍⚕️ Portrait praticien rassurant', '🌿 Wellness naturel apaisant', '📊 Infographie médicale claire'],
      carousel: ['📚 Guide santé en 5 points', '✨ Avant / après protocole', '⚠️ Idées reçues vs réalité', '👩‍⚕️ Présentation équipe'],
      video: ['🎬 Talking head expert santé', '🏥 Tour clinique rassurant', '💬 Témoignage patient authentique', '⚡ Hook problème + solution + RDV'],
    },
  },
  '🎓 Éducation / Formation / Infoproduits': {
    angles: [
      '👀 La compétence que tout le monde s\'arrache',
      '🤯 Ce que l\'école ne t\'apprend pas',
      '❓ Et si tu changeais de vie en 3 mois ?',
      '🎬 Le programme expliqué en 1 minute',
      '💡 La méthode qui marche vraiment',
      '🚀 Ce que tu sauras faire après',
      '💼 Les débouchés concrets',
      '🌟 La formation la plus suivie',
      '⭐ +2000 élèves formés',
      '🏆 Note moyenne 4,9/5',
      '👨‍🏫 Un formateur expert pour toi',
      '🎓 Certification reconnue à la clé',
      '👉 Inscris-toi en 2 minutes',
      '📞 Rappel gratuit avec un conseiller',
      '🎁 Bonus offert pour toute inscription',
      '💳 Paiement en 4x sans frais',
      '⏰ Inscriptions ouvertes 7 jours',
      '🔥 Places limitées par session',
      '🚨 Prochaine session dans 1 mois',
      '🎉 Tarif promo pour les 50 premiers',
      '💸 -40% jusqu\'à dimanche minuit',
    ],
    styles: {
      image: ['📚 Lifestyle apprenant inspirant', '✨ Mockup formation premium', '🖼️ Portrait formateur autoritaire', '📊 Infographie pédagogique'],
      carousel: ['💡 5 leçons clés', '🛣️ Parcours apprenant', '⭐ Témoignages élèves', '🆚 Avant / après formation'],
      video: ['🎬 Talking head expert pédagogue', '📱 Témoignage élève transformation', '⚡ Mini-leçon valeur immédiate', '💼 Hook problème + méthode + CTA'],
    },
  },
  '💼 Coaching / Consulting / Services B2B': {
    angles: [
      '👀 Le problème qui freine ton business',
      '🤯 Ce que tes concurrents font déjà',
      '❓ Et si tu doublais ton chiffre ?',
      '🧠 La méthode expliquée simplement',
      '💡 Pourquoi ça marche à coup sûr',
      '🎯 Le diagnostic en 15 minutes',
      '📈 Les résultats clients en chiffres',
      '🌟 Notre offre la plus demandée',
      '⭐ +100 entreprises accompagnées',
      '🏆 Cas client : +200% de CA',
      '🤝 Un partenariat sur-mesure',
      '💼 L\'expertise de 10 ans à ton service',
      '👉 Réserve ton appel découverte gratuit',
      '📞 30 minutes pour faire le point',
      '🎁 Audit offert sans engagement',
      '✅ Garantie résultat ou remboursé',
      '⏰ 3 places dispo ce mois-ci',
      '🔥 Agenda complet jusqu\'en juin',
      '🚨 Tarifs qui augmentent en janvier',
      '🎉 Bonus exclusif si tu signes cette semaine',
      '💸 Pack lancement à prix réduit',
    ],
    styles: {
      image: ['💼 Portrait pro confiant éditorial', '🖥️ Setup bureau premium', '📊 Framework visuel propre', '🏛️ Corporate haut de gamme'],
      carousel: ['📊 Étude de cas client', '🧠 Framework / méthode', '⚠️ 5 erreurs à éviter', '✅ Checklist actionnable'],
      video: ['🎬 Talking head expert charismatique', '💬 Témoignage client B2B chiffré', '📱 Mini-conseil valeur', '⚡ Hook + insight + CTA appel'],
    },
  },
  '🎮 Médias / Divertissement / Gaming / Créateurs': {
    angles: [
      '👀 Le moment qui va devenir viral',
      '🤯 Tu n\'avais jamais vu ça',
      '❓ Et toi tu en penses quoi ?',
      '🎬 La nouveauté en 30 secondes',
      '💡 Le concept derrière le projet',
      '🤩 Pourquoi tu vas adorer',
      '🎮 Un aperçu exclusif du gameplay',
      '🌟 Le top 5 du moment',
      '⭐ Adoré par la communauté',
      '🏆 Le best-of à ne pas rater',
      '🤝 Rejoins la communauté',
      '🎁 Du contenu rien que pour toi',
      '👉 Like, partage, commente',
      '🔔 Active la cloche pour ne rien rater',
      '🎟️ Réserve ta place pour l\'event',
      '💳 Pré-commande ouverte aujourd\'hui',
      '⏰ Drop officiel ce vendredi',
      '🔥 Édition collector limitée',
      '🚨 Plus que 24h avant la sortie',
      '🎉 Cadeau pour les premiers fans',
      '💸 Offre de lancement à -30%',
    ],
    styles: {
      image: ['🌑 Sombre dramatique néon', '🎨 Coloré pop saturé', '🖼️ Key art éditorial', '⚡ Dynamique action freeze'],
      carousel: ['🏆 Top 5 / classement', '📖 Lore / behind scenes', '🎯 Tips gameplay', '⭐ Réactions communauté'],
      video: ['⚡ Highlight reel rythmé', '🎬 Trailer cinématographique', '📱 Reaction / face cam authentique', '🎮 Gameplay teaser hook 2s'],
    },
  },
  '📡 Télécom / Internet / Services digitaux': {
    angles: [
      '👀 Le forfait qui change tout',
      '🤯 Tu paies trop pour ton internet',
      '❓ Et si tu allais 10x plus vite ?',
      '⚡ La fibre expliquée en 1 minute',
      '💡 Pourquoi changer maintenant',
      '🛡️ Un service client toujours dispo',
      '📊 Compare avec ton offre actuelle',
      '🌟 Le forfait le plus choisi',
      '⭐ +1 million de clients satisfaits',
      '🏆 Élu meilleur réseau 2026',
      '🆚 Pourquoi on est moins cher',
      '🎁 Tout inclus sans surprise',
      '👉 Souscris en 5 minutes en ligne',
      '📞 Aide à la migration gratuite',
      '🎁 Smartphone offert à la souscription',
      '💳 Sans engagement, libre quand tu veux',
      '⏰ Offre de bienvenue ce mois-ci',
      '🔥 Bonus data doublé',
      '🚨 Dernier jour pour en profiter',
      '🎉 Parrainage = mois offert',
      '💸 -50% pendant 6 mois',
    ],
    styles: {
      image: ['🖥️ UI app épurée premium', '🌆 Lifestyle connecté moderne', '✨ Minimaliste tech bleu', '📊 Data viz vitesse'],
      carousel: ['📊 Comparatif forfaits', '⚡ Bénéfices clés', '🎁 Offres en cours', '🆚 Avant / après changement'],
      video: ['🎬 Spot pub lifestyle connecté', '📱 Témoignage client satisfait', '⚡ Motion data vitesse', '💼 Hook prix + débit + CTA'],
    },
  },
};

const DEFAULT_PRESET: AnglesAndStyles = {
  angles: [
    '👀 Le contenu qui fait stopper le scroll',
    '🤯 Le détail qui change tout',
    '❓ Et toi, tu fais comment ?',
    '💡 La solution simple et claire',
    '🎬 Comment ça marche en 30 secondes',
    '✨ Le résultat avant / après',
    '🌟 Notre offre phare du moment',
    '⭐ Adoré par nos clients',
    '🏆 La référence sur le marché',
    '🆚 Pourquoi on est différents',
    '🧠 L\'expertise qui fait la différence',
    '🤝 La confiance qu\'on construit',
    '👉 Découvre tout en 1 clic',
    '📞 Contacte-nous gratuitement',
    '🎁 Cadeau offert pour démarrer',
    '💳 Sans engagement, sans risque',
    '⏰ Offre limitée dans le temps',
    '🔥 Stock / places limitées',
    '🚨 Plus que quelques jours',
    '🎉 Bonus exclusif aux premiers',
    '💸 Promo flash à ne pas rater',
  ],
  styles: {
    image: ['✨ Minimaliste premium', '🌿 Lifestyle authentique', '🏛️ Luxe haut de gamme', '🖼️ Studio fond neutre'],
    carousel: ['📊 Avant / après', '🔢 Top features numérotées', '📖 Storytelling 3-5 slides', '🆚 Comparatif structuré'],
    video: ['🎬 Cinématographique premium', '📱 UGC authentique', '⚡ Hook 2s + bénéfice + CTA', '🌆 Lifestyle dynamique'],
  },
};

const QUALITY_DIRECTIVE =
  '🎯 Tous les rendus visent un niveau agence premium : ultraréaliste, 100% naturel, indétectable IA, orienté business & boost de chiffre d\'affaires.';

const TONS = [
  'Direct / Cash',
  'Provocateur',
  'Authentique',
  'Storytelling',
  'Humoristique',
  'Éducatif',
  'Inspirant',
  'Urgent',
  'Amical',
];

const ObjectiveStep = () => {
  const {
    objective, setObjective,
    marketing_angle, setMarketingAngle,
    visual_style_brief, setVisualStyleBrief,
    company_sector, type,
    options, setOptions,
    user_mode,
  } = useKreatorStore();

  const preset = useMemo(() => SECTOR_PRESETS[company_sector] ?? DEFAULT_PRESET, [company_sector]);
  // Angles marketing : pilotés par l'objectif (étape du tunnel) + type de contenu.
  // Si l'objectif sélectionné fait partie des 9 étapes du tunnel, on affiche
  // les 15 angles spécifiques à ce couple objectif × type. Sinon, fallback
  // sur les angles du secteur (legacy).
  const angles = useMemo(() => {
    const funnelAngles = FUNNEL_ANGLES[objective as FunnelObjective];
    if (funnelAngles) return funnelAngles[type as ContentType] ?? funnelAngles.image;
    return preset.angles;
  }, [objective, type, preset]);
  const styleOptions = useMemo(
    () => VISUAL_STYLES[type as ContentType] ?? VISUAL_STYLES.image,
    [type]
  );
  const styles = styleOptions.map((s) => s.label);
  const selectedStyleDescription = useMemo(
    () => styleOptions.find((s) => s.label === visual_style_brief)?.description,
    [styleOptions, visual_style_brief]
  );

  // Reset si la valeur sélectionnée n'appartient plus aux options du secteur/type
  useEffect(() => {
    // L'utilisateur peut désormais personnaliser le texte → on ne reset plus
    // automatiquement la valeur si elle n'est plus dans les presets.
  }, [angles, styles]);

  const angleInPresets = angles.includes(marketing_angle);
  const styleInPresets = styles.includes(visual_style_brief);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Objectif du contenu</label>
          <Select value={objective} onValueChange={setObjective}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <SelectValue placeholder="Choisir un objectif..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              {OBJECTIVES.map((o) => (
                <SelectItem key={o} value={o} className="text-foreground focus:bg-secondary/20">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {user_mode === 'expert' && (
          <>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Ton d'écriture
              </label>
              <Select value={options.ton} onValueChange={(v) => setOptions({ ton: v })}>
                <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                  <SelectValue placeholder="Choisir un ton..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-foreground/10">
                  {TONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-foreground focus:bg-secondary/20">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <p className="text-xs text-muted-foreground italic">{QUALITY_DIRECTIVE}</p>
        </div>
      </div>
  );
};

export default ObjectiveStep;
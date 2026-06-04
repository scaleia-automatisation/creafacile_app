import type { ContentType } from '@/store/useKreatorStore';
import type { OfferKind } from './useCases';

// Angles marketing par (objectif × type d'offre × type de contenu).
// Spec utilisateur — 5 angles par combinaison, avec émoji représentatif.

type AnglesByType = Record<ContentType, string[]>;
type ByOffer = Record<OfferKind, AnglesByType>;

export const MARKETING_ANGLES: Record<string, ByOffer> = {
  '🧲 Attirer': {
    produit: {
      image: [
        '🔄 Avant / Après',
        '📈 Résultat obtenu',
        '🏷️ Offre spéciale',
        '🆚 Comparatif',
        '🏠 Produit en situation réelle',
      ],
      carousel: [
        '⚠️ Les erreurs à éviter',
        '🆚 Comparatif',
        '⭐ Les 5 bénéfices',
        '🔄 Avant / Après',
        '🧠 Les idées reçues',
      ],
      video: [
        '🪝 Hook viral',
        '🔄 Avant / Après',
        '🎬 Démonstration produit',
        '🏠 Produit en situation réelle',
        '🆚 Comparatif',
      ],
    },
    service: {
      image: [
        '📈 Résultat client',
        '🔄 Avant / Après',
        '🎁 Offre de service',
        '🗣️ Témoignage client',
        '🧠 Expertise',
      ],
      carousel: [
        '⚠️ Les erreurs à éviter',
        '📊 Étude de cas',
        '🔄 Avant / Après',
        '🧠 Les idées reçues',
        '🧠 Conseils d\'expert',
      ],
      video: [
        '📖 Storytelling',
        '📈 Résultat client',
        '🔄 Avant / Après',
        '💡 Problème → Solution',
        '📊 Étude de cas',
      ],
    },
  },
  '📚 Éduquer': {
    produit: {
      image: [
        '⚠️ Les erreurs à éviter',
        '⭐ Les 5 bénéfices',
        '🛠️ Comment ça fonctionne',
        '✅ Bonnes pratiques',
        '💡 Astuce d\'utilisation',
      ],
      carousel: [
        '📖 Guide étape par étape',
        '⭐ Les 5 bénéfices',
        '🛠️ Comment ça fonctionne',
        '💡 Astuces pratiques',
        '❓ Questions fréquentes',
      ],
      video: [
        '🛠️ Comment ça fonctionne',
        '🎬 Démonstration produit',
        '📖 Guide pratique',
        '💡 Astuce d\'utilisation',
        '❓ Questions fréquentes',
      ],
    },
    service: {
      image: [
        '⚠️ Les erreurs à éviter',
        '🧠 Conseils d\'expert',
        '🗺️ Méthode utilisée',
        '🪜 Étapes du processus',
        '❓ Questions fréquentes',
      ],
      carousel: [
        '🗺️ Méthode étape par étape',
        '📖 Guide pratique',
        '❓ Questions fréquentes',
        '🧠 Conseils d\'expert',
        '⚠️ Les erreurs à éviter',
      ],
      video: [
        '🎬 Démonstration méthode',
        '📖 Guide étape par étape',
        '🧠 Conseils d\'expert',
        '❓ Questions fréquentes',
        '⚠️ Erreurs à éviter',
      ],
    },
  },
  '🤝 Convaincre': {
    produit: {
      image: [
        '💬 Avis client',
        '🆚 Comparatif',
        '🔄 Avant / Après',
        '📈 Résultat obtenu',
        '💎 Pourquoi ce produit est différent',
      ],
      carousel: [
        '🆚 Comparatif',
        '🗣️ Témoignage client',
        '🔄 Avant / Après',
        '❓ Questions fréquentes',
        '⭐ Les 5 bénéfices',
      ],
      video: [
        '🗣️ Témoignage client',
        '🔄 Avant / Après',
        '🆚 Comparatif',
        '🎬 Démonstration produit',
        '📈 Résultat utilisateur',
      ],
    },
    service: {
      image: [
        '📊 Étude de cas',
        '🗣️ Témoignage client',
        '📈 Résultat client',
        '🧠 Expertise',
        '🔄 Avant / Après',
      ],
      carousel: [
        '📊 Étude de cas',
        '🗣️ Témoignages clients',
        '📈 Résultat client',
        '🗺️ Méthode utilisée',
        '❓ Questions fréquentes',
      ],
      video: [
        '📊 Étude de cas',
        '🗣️ Témoignage client',
        '📈 Résultat client',
        '🎬 Démonstration méthode',
        '📖 Storytelling',
      ],
    },
  },
  '💰 Vendre': {
    produit: {
      image: [
        '⏰ Offre limitée',
        '💎 Publicité premium',
        '🆚 Comparatif',
        '🎬 Démonstration du produit',
        '🔄 Avant / Après',
      ],
      carousel: [
        '🆚 Comparatif',
        '⭐ Les 5 bénéfices',
        '🗣️ Témoignage client',
        '❓ Questions fréquentes',
        '🏷️ Offre spéciale',
      ],
      video: [
        '🎬 Démonstration produit',
        '🏷️ Offre spéciale',
        '🔄 Avant / Après',
        '🗣️ Témoignage client',
        '🆚 Comparatif',
      ],
    },
    service: {
      image: [
        '🎁 Offre de service',
        '📈 Résultat client',
        '📊 Étude de cas',
        '🗣️ Témoignage client',
        '🧠 Expertise',
      ],
      carousel: [
        '📊 Étude de cas',
        '🎁 Offre de service',
        '📈 Résultat client',
        '🗣️ Témoignages clients',
        '❓ Questions fréquentes',
      ],
      video: [
        '💡 Problème → Solution',
        '📊 Étude de cas',
        '🎁 Offre de service',
        '🗣️ Témoignage client',
        '🎬 Démonstration méthode',
      ],
    },
  },
  '🔁 Fidéliser': {
    produit: {
      image: [
        '💬 Avis client',
        '💡 Astuce d\'utilisation',
        '🆕 Nouveaux usages',
        '📈 Résultat utilisateur',
        '🏠 Produit en situation réelle',
      ],
      carousel: [
        '💡 Astuces d\'utilisation',
        '❓ Questions fréquentes',
        '⚠️ Erreurs à éviter',
        '🆕 Nouveaux usages',
        '🗣️ Témoignages clients',
      ],
      video: [
        '💡 Astuce d\'utilisation',
        '🗣️ Témoignage client',
        '🆕 Nouveaux usages',
        '📈 Résultat utilisateur',
        '📱 UGC',
      ],
    },
    service: {
      image: [
        '🗣️ Témoignage client',
        '🧠 Conseils d\'expert',
        '📈 Résultat client',
        '🗺️ Méthode avancée',
        '🎭 Coulisses',
      ],
      carousel: [
        '🧠 Conseils avancés',
        '❓ Questions fréquentes',
        '🗣️ Témoignages clients',
        '📊 Études de cas',
        '🗺️ Méthodes avancées',
      ],
      video: [
        '🧠 Conseils avancés',
        '🗣️ Témoignage client',
        '📊 Étude de cas',
        '📖 Storytelling',
        '🎭 Coulisses',
      ],
    },
  },
};
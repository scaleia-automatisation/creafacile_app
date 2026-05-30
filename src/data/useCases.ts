import type { ContentType } from '@/store/useKreatorStore';

export type OfferKind = 'produit' | 'service';

type ByType = Record<ContentType, string[]>;
type ByOffer = Record<OfferKind, ByType>;

// 4 cas d'utilisation par (objectif × type d'offre × type de contenu).
// Pour "Attirer du trafic" la spec ne couvre que Produit : on réutilise la
// même liste pour Service afin de toujours proposer 4 cas.
export const USE_CASES: Record<string, ByOffer> = {
  '🧲 Attirer du trafic': {
    produit: {
      image: ['Publicité Premium', 'Lifestyle', 'Promotion', 'Avant / Après'],
      carousel: ['5 Bénéfices', 'Comparatif', 'Erreurs à éviter', 'FAQ Produit'],
      video: ['Hook Viral', 'UGC', 'Démonstration Produit', 'Avant / Après'],
    },
    service: {
      image: ['Publicité Premium', 'Lifestyle', 'Promotion', 'Avant / Après'],
      carousel: ['5 Bénéfices', 'Comparatif', 'Erreurs à éviter', 'FAQ Service'],
      video: ['Hook Viral', 'UGC', 'Démonstration Méthode', 'Avant / Après'],
    },
  },
  '🎯 Générer des prospects': {
    produit: {
      image: ['Promotion', 'Avis Client', 'Comparatif', 'Avant / Après'],
      carousel: ['Comparatif', 'FAQ Produit', 'Témoignage Client', '5 Bénéfices'],
      video: ['Démonstration Produit', 'Témoignage Client', 'Avant / Après', 'UGC'],
    },
    service: {
      image: ['Offre de Service', 'Résultat Client', 'Témoignage Client', 'Expertise'],
      carousel: ['Étude de Cas', 'FAQ Service', 'Méthode Étape par Étape', 'Témoignages Clients'],
      video: ['Problème → Solution', 'Étude de Cas', 'Témoignage Client', 'Démonstration Méthode'],
    },
  },
  '🛡️ Rassurer': {
    produit: {
      image: ['Avis Client', 'Avant / Après', 'Comparatif', 'Lifestyle'],
      carousel: ['Témoignage Client', 'FAQ Produit', 'Comparatif', '5 Bénéfices'],
      video: ['Témoignage Client', 'UGC', 'Avant / Après', 'Démonstration Produit'],
    },
    service: {
      image: ['Témoignage Client', 'Résultat Client', 'Expertise', 'Avant / Après'],
      carousel: ['Étude de Cas', 'FAQ Service', 'Témoignages Clients', 'Méthode Étape par Étape'],
      video: ['Témoignage Client', 'Étude de Cas', 'Démonstration Méthode', 'Storytelling'],
    },
  },
  '💰 Vendre': {
    produit: {
      image: ['Publicité Premium', 'Promotion', 'Comparatif', 'Avant / Après'],
      carousel: ['5 Bénéfices', 'Comparatif', 'FAQ Produit', 'Témoignage Client'],
      video: ['Démonstration Produit', 'Avant / Après', 'Témoignage Client', 'Hook Viral'],
    },
    service: {
      image: ['Offre de Service', 'Résultat Client', 'Expertise', 'Témoignage Client'],
      carousel: ['Étude de Cas', 'Méthode Étape par Étape', 'FAQ Service', 'Témoignages Clients'],
      video: ['Problème → Solution', 'Étude de Cas', 'Démonstration Méthode', 'Storytelling'],
    },
  },
  '🔁 Fidéliser': {
    produit: {
      image: ['Lifestyle', 'Avis Client', 'Publicité Premium', 'Avant / Après'],
      carousel: ['FAQ Produit', '5 Bénéfices', 'Témoignage Client', 'Erreurs à éviter'],
      video: ['UGC', 'Témoignage Client', 'Démonstration Produit', 'Hook Viral'],
    },
    service: {
      image: ['Expertise', 'Témoignage Client', 'Résultat Client', 'Offre de Service'],
      carousel: ['Méthode Étape par Étape', 'FAQ Service', 'Témoignages Clients', 'Étude de Cas'],
      video: ['Storytelling', 'Démonstration Méthode', 'Témoignage Client', 'Étude de Cas'],
    },
  },
};

export const USE_CASE_ICONS: Record<string, string> = {
  'Publicité Premium': '💎',
  'Lifestyle': '🌿',
  'Promotion': '🏷️',
  'Avant / Après': '🔄',
  '5 Bénéfices': '⭐',
  'Comparatif': '🆚',
  'Erreurs à éviter': '⚠️',
  'FAQ Produit': '❓',
  'FAQ Service': '❓',
  'Hook Viral': '🪝',
  'UGC': '📱',
  'Démonstration Produit': '🎬',
  'Avis Client': '💬',
  'Témoignage Client': '🗣️',
  'Témoignages Clients': '🗣️',
  'Offre de Service': '🎁',
  'Résultat Client': '📈',
  'Expertise': '🧠',
  'Étude de Cas': '📊',
  'Méthode Étape par Étape': '🗺️',
  'Problème → Solution': '💡',
  'Démonstration Méthode': '🧪',
  'Storytelling': '📖',
};
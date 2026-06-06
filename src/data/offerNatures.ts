import type { OfferKind } from './useCases';

export const OFFER_NATURES: Record<OfferKind, string[]> = {
  produit: [
    '1 acheté = 1 offert',
    'Livraison gratuite pendant 1 mois',
    "Cadeau exclusif offert avec l'achat",
    '-20% à -50% pendant une durée limitée',
    'Pack 2 produits à prix réduit',
    'Produit complémentaire offert',
    'Satisfait ou remboursé',
    'Garantie offerte pendant 1 an',
  ],
  service: [
    'Audit gratuit',
    'Devis gratuit',
    'Diagnostic gratuit',
    'Maintenance et mise à jour gratuite pendant 6 mois',
    'Appel découverte offert',
    'Essai gratuit de 7 jours',
    'Accompagnement bonus offert pendant 1 mois',
    'Garantie satisfait ou remboursé',
  ],
};

export const isSpecialOfferAngle = (angle?: string | null): boolean => {
  if (!angle) return false;
  return angle.toLowerCase().includes('offre spéciale');
};
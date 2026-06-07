import { AlertCircle } from 'lucide-react';
import { useKreatorStore } from '@/store/useKreatorStore';

const ScratchMissingAlert = () => {
  const {
    starting_choice, offer_type, company_activity, company_sector,
    product_service, product_image_url, objective,
    user_mode, type,
  } = useKreatorStore();

  if (starting_choice !== 'scratch') return null;

  const isProduct = offer_type === '📦 Produit';
  const isBeginner = user_mode === 'beginner';
  const missing: string[] = [];
  if (!offer_type?.trim()) missing.push("Type d'offre");
  if (!product_service?.trim()) missing.push('Nom');
  if (isProduct && type !== 'video' && !product_image_url?.trim()) missing.push("Image du produit");
  if (!objective?.trim()) missing.push('Objectif du contenu');
  if (!isBeginner && !company_activity?.trim()) missing.push('Activité principale');
  if (!isBeginner && !company_sector?.trim()) missing.push("Secteur d'activité");

  if (missing.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto flex items-start gap-2 p-4 rounded-btn border border-destructive/40 bg-destructive/10 text-sm text-destructive">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold mb-1">
          Remplissez le type d'offre et la description avant de continuer.
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          {missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default ScratchMissingAlert;
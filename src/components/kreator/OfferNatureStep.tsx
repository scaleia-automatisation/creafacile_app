import { useKreatorStore } from '@/store/useKreatorStore';
import { Input } from '@/components/ui/input';
import { OFFER_NATURES, isSpecialOfferAngle } from '@/data/offerNatures';
import type { OfferKind } from '@/data/useCases';

const OfferNatureStep = () => {
  const { marketing_angle, offer_type, offer_nature, setOfferNature, user_mode } = useKreatorStore();

  if (user_mode === 'beginner') return null;

  const offerKind: OfferKind | null =
    offer_type === '📦 Produit' ? 'produit' : offer_type === '🛠️ Service' ? 'service' : null;

  if (!offerKind) return null;
  if (!isSpecialOfferAngle(marketing_angle)) return null;

  const presets = OFFER_NATURES[offerKind];
  const datalistId = `offer-nature-presets-${offerKind}`;

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium text-muted-foreground block">Nature de l'offre</label>
      <Input
        list={datalistId}
        value={offer_nature}
        onChange={(e) => setOfferNature(e.target.value)}
        placeholder="Choisissez ou saisissez une nature d'offre"
        className="bg-card border-foreground/10 text-foreground"
      />
      <datalist id={datalistId}>
        {presets.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
};

export default OfferNatureStep;
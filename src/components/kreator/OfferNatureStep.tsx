import { useKreatorStore } from '@/store/useKreatorStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { OFFER_NATURES, isSpecialOfferAngle } from '@/data/offerNatures';
import type { OfferKind } from '@/data/useCases';

const OfferNatureStep = () => {
  const { marketing_angle, offer_type, offer_nature, setOfferNature } = useKreatorStore();

  const offerKind: OfferKind | null =
    offer_type === '📦 Produit' ? 'produit' : offer_type === '🛠️ Service' ? 'service' : null;

  if (!offerKind) return null;
  if (!isSpecialOfferAngle(marketing_angle)) return null;

  const presets = OFFER_NATURES[offerKind];

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium text-muted-foreground block">Nature de l'offre</label>
      <Select
        value={presets.includes(offer_nature) ? offer_nature : undefined}
        onValueChange={(v) => setOfferNature(v)}
      >
        <SelectTrigger className="bg-card border-foreground/10 text-foreground">
          <SelectValue placeholder="Choisissez une nature d'offre" />
        </SelectTrigger>
        <SelectContent className="bg-card border-foreground/10">
          {presets.map((p) => (
            <SelectItem key={p} value={p} className="text-foreground focus:bg-secondary/20">
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={offer_nature}
        onChange={(e) => setOfferNature(e.target.value)}
        placeholder="Modifiez l'offre librement"
        className="bg-card border-foreground/10 text-foreground"
      />
    </div>
  );
};

export default OfferNatureStep;
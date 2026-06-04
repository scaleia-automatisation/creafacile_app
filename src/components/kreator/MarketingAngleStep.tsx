import { useKreatorStore } from '@/store/useKreatorStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MARKETING_ANGLES } from '@/data/marketingAngles';
import type { OfferKind } from '@/data/useCases';

const MarketingAngleStep = () => {
  const { objective, offer_type, type, marketing_angle, setMarketingAngle } = useKreatorStore();

  const offerKind: OfferKind | null =
    offer_type === '📦 Produit' ? 'produit' : offer_type === '🛠️ Service' ? 'service' : null;

  if (!objective || !offerKind || !type) return null;

  const angles = MARKETING_ANGLES[objective]?.[offerKind]?.[type] ?? [];
  if (angles.length === 0) return null;

  return (
    <div className="w-full">
      <label className="text-sm font-medium text-muted-foreground mb-2 block">Angle marketing</label>
      <Select value={marketing_angle || undefined} onValueChange={(v) => setMarketingAngle(v)}>
        <SelectTrigger className="bg-card border-foreground/10 text-foreground">
          <SelectValue placeholder="Choisissez un angle marketing" />
        </SelectTrigger>
        <SelectContent className="bg-card border-foreground/10">
          {angles.map((a) => (
            <SelectItem key={a} value={a} className="text-foreground focus:bg-secondary/20">
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MarketingAngleStep;
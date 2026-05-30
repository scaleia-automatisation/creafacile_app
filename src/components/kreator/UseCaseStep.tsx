import { useKreatorStore } from '@/store/useKreatorStore';
import { USE_CASES, USE_CASE_ICONS, type OfferKind } from '@/data/useCases';

const UseCaseStep = () => {
  const { objective, offer_type, type, use_case, setUseCase } = useKreatorStore();

  const offerKind: OfferKind | null = offer_type === '📦 Produit'
    ? 'produit'
    : offer_type === '🛠️ Service'
      ? 'service'
      : null;

  if (!objective || !offerKind || !type) return null;

  const cases = USE_CASES[objective]?.[offerKind]?.[type] ?? [];
  if (cases.length === 0) return null;

  const selected = use_case;

  return (
    <div className="w-full">
      <label className="text-sm font-medium text-muted-foreground mb-2 block">Cas d'utilisation</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cases.map((c) => {
          const isSelected = selected === c;
          const isDimmed = !!selected && !isSelected;
          const icon = USE_CASE_ICONS[c] ?? '✨';
          return (
            <button
              key={c}
              type="button"
              onClick={() => setUseCase(isSelected ? '' : c)}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-card border-[3px] transition-all duration-200 min-h-[110px] text-center ${
                isSelected
                  ? 'border-primary bg-card shadow-lg shadow-primary/10'
                  : isDimmed
                    ? 'border-foreground/10 bg-card opacity-40 hover:opacity-70'
                    : 'border-foreground/10 bg-card hover:border-secondary hover:bg-secondary/5'
              }`}
            >
              <span className="text-3xl leading-none">{icon}</span>
              <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {c}
              </span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full gradient-bg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UseCaseStep;
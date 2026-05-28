import { useKreatorStore } from '@/store/useKreatorStore';
import ContentTypeStep from './ContentTypeStep';

const StartingChoiceButtons = () => {
  const {
    type, setType,
    offer_type,
    setStartingChoice,
  } = useKreatorStore();

  const isProduct = offer_type === '📦 Produit';
  const isService = offer_type === '🛠️ Service';
  const offerLabel = offer_type ? offer_type.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase() : '';

  const cards = [
    { type: 'image' as const, label: `Pub ${offerLabel}`, emoji: '📱' },
    { type: 'carousel' as const, label: `Carousel ${offerLabel}`, emoji: '🎠' },
    { type: 'video' as const, label: `Vidéo ${offerLabel}`, emoji: '🎬' },
  ];

  const handleSelectType = (t: 'image' | 'carousel' | 'video') => {
    setType(t);
    setStartingChoice('idea');
  };

  return (
    <div id="starting-choice-buttons" className="flex flex-col items-center gap-6 max-w-6xl mx-auto">
      {/* 3 cards de type de contenu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch w-full max-w-3xl mx-auto">
        {cards.map((card) => {
          const active = type === card.type;
          return (
            <button
              key={card.type}
              onClick={() => handleSelectType(card.type)}
              className={`relative flex flex-col items-center justify-center gap-2 p-5 sm:p-6 rounded-card border-[3px] transition-all duration-200 min-h-[100px] ${
                active
                  ? 'border-primary bg-card shadow-lg shadow-primary/10'
                  : 'border-foreground/10 bg-card hover:border-secondary hover:bg-secondary/5'
              }`}
            >
              <span className="text-2xl">{card.emoji}</span>
              <span className={`font-bold text-sm ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {isProduct || isService ? card.label : card.label.replace(` ${offerLabel}`, '')}
              </span>
              {active && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full gradient-bg" />
              )}
            </button>
          );
        })}
      </div>

      {/* Modèle IA et format (déplacé depuis l'ancien bloc 3) */}
      <div className="w-full pt-2">
        <ContentTypeStep />
      </div>
    </div>
  );
};

export default StartingChoiceButtons;

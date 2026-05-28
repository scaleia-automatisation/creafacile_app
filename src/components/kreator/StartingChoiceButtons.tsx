import { useKreatorStore } from '@/store/useKreatorStore';
import { Wand2, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { refineIdea } from '@/lib/kreator-ai';
import { useState } from 'react';

const StartingChoiceButtons = () => {
  const {
    type, setType,
    input_text, setInputText, setIdeaChosen,
    offer_type, product_service, product_description,
    company_activity, company_sector, market, target_persona, marketing_angle,
    objective,
    setStartingChoice,
  } = useKreatorStore();
  const [refiningIdea, setRefiningIdea] = useState(false);

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

  const handleRefineIdea = async () => {
    const missing: string[] = [];
    if (!product_service?.trim()) missing.push('Nom');
    if (!product_description?.trim()) missing.push('Description');
    if (!input_text?.trim()) missing.push('Idée de contenu');
    if (missing.length) {
      toast.error(`Veuillez renseigner : ${missing.join(', ')}`);
      return;
    }
    setRefiningIdea(true);
    try {
      const refined = await refineIdea({
        idea: input_text,
        offerType: offer_type,
        productName: product_service,
        productDescription: product_description,
        activity: company_activity,
        sector: company_sector,
        market,
        persona: target_persona,
        objective,
        marketingAngle: marketing_angle,
      });
      const val = refined.slice(0, 500);
      setInputText(val);
      setIdeaChosen(val);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'amélioration de l'idée");
    } finally {
      setRefiningIdea(false);
    }
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

      {/* Idée de contenu */}
      <div className="w-full max-w-2xl space-y-2">
        <label className="text-sm font-medium text-foreground">
          Décris ton idée de contenu
        </label>
        <Textarea
          value={input_text}
          onChange={(e) => {
            const val = e.target.value.slice(0, 500);
            setInputText(val);
            setIdeaChosen(val);
          }}
          placeholder="Ex : Mettre en avant notre nouvelle collection d'été avec une ambiance plage…"
          className="min-h-[110px] resize-none border-2 border-[hsl(210_100%_55%)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          autoFocus
          maxLength={500}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {input_text.length}/500
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleRefineIdea}
            disabled={refiningIdea || !input_text.trim()}
            className="h-8 text-xs gap-1.5 bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0"
          >
            {refiningIdea ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Améliorer l'idée
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StartingChoiceButtons;

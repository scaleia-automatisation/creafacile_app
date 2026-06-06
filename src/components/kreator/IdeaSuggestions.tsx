import { useState, useEffect } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, PenLine, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateContentIdeas, callKreatorAI, type ContentIdea } from '@/lib/kreator-ai';

const IdeaSuggestions = () => {
  const {
    type, objective, offer_type, product_service, product_description, product_image_url, use_case, marketing_angle,
    company_activity, company_sector, target_persona, market, options,
    setInputText, setIdeaChosen, setUseCase,
    manual_idea_mode, setManualIdeaMode,
  } = useKreatorStore();

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [mode, setMode] = useState<'none' | 'generated'>('none');

  const missing: string[] = [];
  if (!offer_type?.trim()) missing.push("type d'offre");
  if (!product_service?.trim()) missing.push('Nom');
  if (offer_type === 'produit' && !product_image_url?.trim()) missing.push('Image de référence');
  if (!product_description?.trim()) missing.push('Description');
  if (!objective?.trim()) missing.push('Objectif du contenu');
  const canGenerate = missing.length === 0;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Veuillez renseigner les champs requis');
      return;
    }
    setLoading(true);
    try {
      const res = await generateContentIdeas({
        contentType: type,
        objective,
        offerType: offer_type,
        productName: product_service,
        productDescription: product_description,
        activity: company_activity,
        sector: company_sector,
        persona: target_persona,
        market,
        useCase: use_case,
        tone: options?.ton,
        marketingAngle: marketing_angle,
      });
      setIdeas(res.ideas || []);
      setMode('generated');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération des idées');
    } finally {
      setLoading(false);
    }
  };

  const updateIdea = (idx: number, field: 'hook' | 'concept', value: string) => {
    setIdeas((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const handleUseIdea = (idea: ContentIdea) => {
    const text = `${idea.hook} — ${idea.concept}`.slice(0, 500);
    setInputText(text);
    setIdeaChosen(text);
    toast.success('Idée sélectionnée. Lancement de la génération…');
    // Scroll to generation block and trigger generation via custom event
    setTimeout(() => {
      const target = document.getElementById('generation-step-block');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.dispatchEvent(new CustomEvent('kreator:generate'));
    }, 200);
  };

  return (
    <div className="md:col-span-2 flex flex-col items-center gap-4 py-6 px-4">
      {!canGenerate && (
        <p className="text-muted-foreground text-sm text-center max-w-4xl line-clamp-2">
          Avant de générer 3 idées de contenu, veuillez renseigner les 3 premiers blocs&nbsp;: type d'offre, Nom, Image de référence si produit, Description et objectif du contenu.
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
        <Button
          type="button"
          onClick={() => {
            setManualIdeaMode(false);
            handleGenerate();
          }}
          disabled={loading || !canGenerate}
          className="flex-1 py-6 text-base md:text-lg font-extrabold gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          <span>{ideas.length > 0 && mode === 'generated' ? 'Régénérer 3 idées de contenu' : 'Générer 3 idées de contenu'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setManualIdeaMode(true);
            setMode('none');
            setIdeas([]);
          }}
          disabled={!canGenerate}
          className="flex-1 py-6 text-base md:text-lg font-extrabold rounded-btn border-2 flex items-center justify-center gap-2"
        >
          <PenLine className="w-5 h-5" />
          <span>Insérer mon idée</span>
        </Button>
      </div>

      {mode === 'generated' && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-2">
          {ideas.map((idea, idx) => (
            <div
              key={idea.id ?? idx}
              className="flex flex-col items-center text-center gap-3 p-4 rounded-card border-2 border-foreground/10 bg-card hover:border-primary/40 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary text-center">
                Idée {idx + 1}
              </div>
              <textarea
                value={idea.hook}
                onChange={(e) => updateIdea(idx, 'hook', e.target.value)}
                rows={2}
                className="w-full font-bold text-foreground text-base leading-snug text-center bg-transparent border border-transparent hover:border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-2 resize-none"
              />
              <textarea
                value={idea.concept}
                onChange={(e) => updateIdea(idx, 'concept', e.target.value)}
                rows={3}
                className="w-full text-sm text-muted-foreground leading-relaxed text-center bg-transparent border border-transparent hover:border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-2 resize-none"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleUseIdea(idea)}
                className="mt-auto gap-1.5 gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Générer le contenu
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeaSuggestions;
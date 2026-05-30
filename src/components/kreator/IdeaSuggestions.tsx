import { useState } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateContentIdeas, type ContentIdea } from '@/lib/kreator-ai';

const IdeaSuggestions = () => {
  const {
    type, objective, offer_type, product_service, product_description, product_image_url, use_case,
    company_activity, company_sector, target_persona, market,
    setInputText, setIdeaChosen,
  } = useKreatorStore();

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  const missing: string[] = [];
  if (!offer_type?.trim()) missing.push("type d'offre");
  if (!product_service?.trim()) missing.push('Nom');
  if (offer_type === 'produit' && !product_image_url?.trim()) missing.push('Image de référence');
  if (!product_description?.trim()) missing.push('Description');
  if (!objective?.trim()) missing.push('Objectif du contenu');
  if (!use_case?.trim()) missing.push("Cas d'utilisation");
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
      });
      setIdeas(res.ideas || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération des idées');
    } finally {
      setLoading(false);
    }
  };

  const handleUseIdea = (idea: ContentIdea) => {
    const text = `${idea.hook} — ${idea.concept}`.slice(0, 500);
    setInputText(text);
    setIdeaChosen(text);
    toast.success('Idée sélectionnée. Lancement de la génération…');
    // Scroll to prompt block and auto-trigger prompt generation
    setTimeout(() => {
      const btn = document.getElementById('prompt-generate-btn') as HTMLButtonElement | null;
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!btn.disabled) btn.click();
      } else {
        const ta = document.querySelector('textarea');
        ta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  return (
    <div className="md:col-span-2 flex flex-col items-center gap-4 py-6 px-4">
      {!canGenerate && (
        <p className="text-xs text-center text-muted-foreground max-w-xl">
          Avant de générer 3 idées de contenu, veuillez renseigner : type d'offre, Nom, Image de référence si produit, Description, objectif du contenu, cas d'utilisations sont requis pour générer les 3 idées de contenus.
        </p>
      )}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="flex flex-col items-center justify-center gap-1 h-auto bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0 px-8 py-4 text-sm font-semibold rounded-btn"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
        <span>Générer 3 idées de contenu</span>
      </Button>

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-2">
          {ideas.map((idea, idx) => (
            <div
              key={idea.id ?? idx}
              className="flex flex-col gap-3 p-4 rounded-card border-2 border-foreground/10 bg-card hover:border-primary/40 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary">
                Idée {idx + 1}
              </div>
              <div className="font-bold text-foreground text-sm leading-snug">
                {idea.hook}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {idea.concept}
              </div>
              <div className="text-[11px] font-semibold text-foreground/80 bg-secondary/10 border border-secondary/20 rounded-btn px-2 py-1.5">
                🎯 {idea.angle}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => handleUseIdea(idea)}
                className="mt-auto gap-1.5 gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Générer ce contenu
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeaSuggestions;
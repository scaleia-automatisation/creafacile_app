import { useState, useEffect, useRef } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, PenLine, CheckCircle2, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { generateContentIdeas, buildPersonaContext, type ContentIdea } from '@/lib/kreator-ai';

const IdeaSuggestions = () => {
  const {
    type, slides_count, objective, offer_type, product_service, product_description, product_image_url, use_case, marketing_angle, offer_nature,
    company_activity, company_sector, target_persona, target_audience, market, options,
    setInputText, setIdeaChosen, idea_chosen, prompt_fr, setPromptFr,
    setManualIdeaMode, setManualIdeaText, manual_idea_mode,
  } = useKreatorStore();

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [mode, setMode] = useState<'none' | 'generated'>('none');
  const lastTypeRef = useRef<string>(type);
  const lastSlidesRef = useRef<number>(slides_count);
  const lastAngleRef = useRef<string>(marketing_angle);
  const lastObjectiveRef = useRef<string>(objective);

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
        persona: buildPersonaContext(target_audience, target_persona),
        market,
        useCase: use_case,
        tone: options?.ton,
        marketingAngle: marketing_angle + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
        slidesCount: type === 'carousel' ? slides_count : undefined,
      });
      setIdeas(res.ideas || []);
      setMode('generated');
      lastTypeRef.current = type;
      lastSlidesRef.current = slides_count;
      lastAngleRef.current = marketing_angle;
      lastObjectiveRef.current = objective;
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération des idées');
    } finally {
      setLoading(false);
    }
  };

  // Si l'utilisateur change le type de contenu (image / carousel / vidéo) après
  // avoir déjà généré 3 idées, on relance automatiquement la génération pour
  // que les idées soient adaptées au nouveau format choisi.
  useEffect(() => {
    if (mode !== 'generated') return;
    if (lastTypeRef.current === type) return;
    if (!canGenerate || loading) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Si carrousel et que le nombre de slides change après génération, on
  // régénère automatiquement pour que les idées restent cohérentes avec
  // le nouveau nombre de slides.
  useEffect(() => {
    if (mode !== 'generated') return;
    if (type !== 'carousel') return;
    if (lastSlidesRef.current === slides_count) return;
    if (!canGenerate || loading) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides_count]);

  // Régénère automatiquement les 3 idées si l'angle marketing change après
  // une première génération.
  useEffect(() => {
    if (mode !== 'generated') return;
    if (lastAngleRef.current === marketing_angle) return;
    if (!canGenerate || loading) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketing_angle]);

  // Régénère automatiquement les 3 idées si l'objectif change après une
  // première génération.
  useEffect(() => {
    if (mode !== 'generated') return;
    if (lastObjectiveRef.current === objective) return;
    if (!canGenerate || loading) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objective]);

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
      // Si un prompt a déjà été généré/édité pour cette idée, on l'envoie tel
      // quel au modèle. Sinon on laisse GenerationStep le générer.
      const hasPrompt = !!useKreatorStore.getState().prompt_fr?.trim();
      window.dispatchEvent(new CustomEvent('kreator:generate', {
        detail: { forcePromptRegen: !hasPrompt },
      }));
    }, 200);
  };

  const handleGenerateIdeaPrompt = (idea: ContentIdea) => {
    const text = `${idea.hook} — ${idea.concept}`.slice(0, 500);
    setManualIdeaText('');
    setManualIdeaMode(false);
    setInputText(text);
    setIdeaChosen(text);
    toast.info('Génération du prompt en cours…');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kreator:generate-prompt'));
    }, 100);
  };

  const handleChooseIdea = (idea: ContentIdea) => {
    const text = `${idea.hook} — ${idea.concept}`.slice(0, 500);
    setManualIdeaText('');
    setManualIdeaMode(false);
    setInputText(text);
    setIdeaChosen(text);
    // N'affiche le toast que si le bloc personnalisation n'est pas déjà
    // renseigné : si l'utilisateur a déjà saisi/généré des textes ou une
    // voix off, la régénération auto suffit, pas besoin d'alerte.
    const s = useKreatorStore.getState();
    const customizationFilled =
      !!s.options.text_content?.trim() ||
      !!s.options.text_content_2?.trim() ||
      (s.options.slide_texts || []).some((t) => !!t?.trim()) ||
      !!s.voice_over_text?.trim();
    if (!customizationFilled) {
      toast.success('Idée choisie. Personnalisation disponible…');
    }
    setTimeout(() => {
      const target = document.getElementById('generation-step-block');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            setManualIdeaText('');
            setIdeaChosen('');
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
            setIdeaChosen('');
          }}
          disabled={!canGenerate}
          className="flex-1 py-6 text-base md:text-lg font-extrabold rounded-btn border-2 flex items-center justify-center gap-2"
        >
          <PenLine className="w-5 h-5" />
          <span>Insérer mon idée</span>
        </Button>
      </div>

      {mode === 'generated' && ideas.length > 0 && !manual_idea_mode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-2">
          {ideas.map((idea, idx) => {
            const ideaText = `${idea.hook} — ${idea.concept}`.slice(0, 500);
            const isSelected = !!idea_chosen && idea_chosen === ideaText;
            const hasSelection = !!idea_chosen && ideas.some(
              (it) => `${it.hook} — ${it.concept}`.slice(0, 500) === idea_chosen
            );
            const dimmed = hasSelection && !isSelected;
            return (
            <div
              key={idea.id ?? idx}
              className={`relative flex flex-col items-center text-center gap-3 p-4 rounded-card border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-card ring-2 ring-primary/40'
                  : dimmed
                  ? 'border-foreground/10 bg-card opacity-60 hover:opacity-100 hover:border-primary/40'
                  : 'border-foreground/10 bg-card hover:border-primary/40'
              }`}
            >
              {isSelected && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
              )}
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary text-center">
                Idée {idx + 1}
              </div>
              <textarea
                value={idea.hook}
                onChange={(e) => updateIdea(idx, 'hook', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                rows={2}
                className="w-full font-bold text-foreground text-base leading-snug text-center bg-transparent border border-transparent hover:border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-2 resize-none"
              />
              <textarea
                value={idea.concept}
                onChange={(e) => updateIdea(idx, 'concept', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                rows={3}
                className="w-full text-sm text-muted-foreground leading-relaxed text-center bg-transparent border border-transparent hover:border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-2 resize-none"
              />
              <div className="mt-auto flex flex-col gap-2 w-full">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChooseIdea(idea);
                  }}
                  className="gap-1.5 gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSelected ? 'Idée choisie' : 'Je choisis cette idée'}
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdeaSuggestions;
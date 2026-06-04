import { useState } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, PenLine, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateContentIdeas, callKreatorAI, type ContentIdea } from '@/lib/kreator-ai';

const IdeaSuggestions = () => {
  const {
    type, objective, offer_type, product_service, product_description, product_image_url, use_case,
    company_activity, company_sector, target_persona, market, options,
    setInputText, setIdeaChosen, setUseCase,
  } = useKreatorStore();

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [mode, setMode] = useState<'none' | 'generated' | 'manual'>('none');
  const [manualIdea, setManualIdea] = useState('');
  const [improving, setImproving] = useState(false);

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

  const handleImproveIdea = async () => {
    if (!manualIdea.trim()) {
      toast.error('Veuillez saisir votre idée');
      return;
    }
    if (!canGenerate) {
      toast.error('Veuillez renseigner les champs requis');
      return;
    }
    setImproving(true);
    try {
      const system = `Tu es un expert en marketing digital viral orienté business, viralité et conversion. Tu reçois une idée brute d'un utilisateur et tu dois la RÉÉCRIRE en une idée de contenu ULTRA puissante, scroll-stop dès les 2 premières secondes, alignée sur l'objectif business (viralité + conversion) et parfaitement cohérente avec tous les inputs fournis (offre, persona, ton, type de contenu, objectif).
RÈGLES:
- Conserver l'intention et le sujet de l'idée originale, ne pas changer le fond.
- Ajouter un hook 0-2s irrésistible (curiosité, émotion, controverse douce, transformation, preuve sociale, urgence).
- Rester en français, ton fidèle au ton demandé.
- Réponds UNIQUEMENT avec un JSON valide sans markdown: {"idea":"hook + concept en 1-3 phrases max 500 caractères"}`;
      const user = `=== INPUTS ===
Type d'offre: ${offer_type}
Nom: ${product_service}
Description: ${product_description}
Objectif du contenu: ${objective}
Ton d'écriture: ${options?.ton || 'non précisé'}
Persona / client cible: ${target_persona || 'non précisé'}
Type de contenu: ${type}
${company_activity ? `Activité: ${company_activity}` : ''}
${company_sector ? `Secteur: ${company_sector}` : ''}
${market ? `Marché: ${market}` : ''}

=== IDÉE BRUTE À AMÉLIORER ===
${manualIdea}`;
      const data = await callKreatorAI({
        action: 'improve_idea',
        messages: [{ role: 'user', content: user }],
        system_prompt: system,
      });
      const content = data?.choices?.[0]?.message?.content || '';
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      let improved = manualIdea;
      try {
        const parsed = JSON.parse(cleaned);
        improved = parsed.idea || cleaned;
      } catch {
        improved = cleaned || manualIdea;
      }
      setManualIdea(improved);
      toast.success('Idée améliorée');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'amélioration de l'idée");
    } finally {
      setImproving(false);
    }
  };

  const handleUseManualIdea = () => {
    if (!manualIdea.trim()) {
      toast.error('Veuillez saisir votre idée');
      return;
    }
    const text = manualIdea.trim().slice(0, 500);
    // L'idée insérée est prioritaire : on ignore le cas d'utilisation
    setUseCase('');
    setInputText(text);
    setIdeaChosen(text);
    toast.success('Idée insérée. Lancement de la génération…');
    setTimeout(() => {
      const target = document.getElementById('generation-step-block');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.dispatchEvent(new CustomEvent('kreator:generate'));
    }, 200);
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
            if (mode === 'manual') setMode('none');
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
            setMode('manual');
            setIdeas([]);
          }}
          disabled={!canGenerate}
          className="flex-1 py-6 text-base md:text-lg font-extrabold rounded-btn border-2 flex items-center justify-center gap-2"
        >
          <PenLine className="w-5 h-5" />
          <span>Insérer mon idée</span>
        </Button>
      </div>

      {mode === 'manual' && (
        <div className="w-full max-w-3xl flex flex-col gap-3 p-4 rounded-card border-2 border-foreground/10 bg-card">
          <label className="text-sm font-bold text-foreground">Votre idée</label>
          <textarea
            value={manualIdea}
            onChange={(e) => setManualIdea(e.target.value)}
            rows={5}
            placeholder="Décrivez votre idée de contenu…"
            className="w-full text-sm text-foreground bg-background border border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-3 resize-y"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImproveIdea}
              disabled={improving || !manualIdea.trim()}
              className="flex-1 gap-2 font-bold"
            >
              {improving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Améliorer l'idée
            </Button>
            <Button
              type="button"
              onClick={handleUseManualIdea}
              disabled={!manualIdea.trim()}
              className="flex-1 gap-2 gradient-bg border-0 text-primary-foreground hover:opacity-90 font-bold"
            >
              <Sparkles className="w-4 h-4" />
              Générer le contenu
            </Button>
          </div>
        </div>
      )}

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
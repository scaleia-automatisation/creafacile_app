import { useState } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { callKreatorAI } from '@/lib/kreator-ai';

const ManualIdeaPanel = () => {
  const {
    type, objective, offer_type, product_service, product_description,
    company_activity, company_sector, target_persona, market, options,
    setInputText, setIdeaChosen, setUseCase,
    manual_idea_mode, manual_idea_text, setManualIdeaText,
  } = useKreatorStore();

  const [improving, setImproving] = useState(false);

  if (!manual_idea_mode) return null;

  const missing: string[] = [];
  if (!offer_type?.trim()) missing.push("type d'offre");
  if (!product_service?.trim()) missing.push('Nom');
  if (!product_description?.trim()) missing.push('Description');
  if (!objective?.trim()) missing.push('Objectif du contenu');
  const canGenerate = missing.length === 0;

  const handleImproveIdea = async () => {
    if (!manual_idea_text.trim()) {
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
${manual_idea_text}`;
      const data = await callKreatorAI({
        action: 'improve_idea',
        messages: [{ role: 'user', content: user }],
        system_prompt: system,
      });
      const content = data?.choices?.[0]?.message?.content || '';
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      let improved = manual_idea_text;
      try {
        const parsed = JSON.parse(cleaned);
        improved = parsed.idea || cleaned;
      } catch {
        improved = cleaned || manual_idea_text;
      }
      setManualIdeaText(improved);
      toast.success('Idée améliorée');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'amélioration de l'idée");
    } finally {
      setImproving(false);
    }
  };

  const handleUseManualIdea = () => {
    if (!manual_idea_text.trim()) {
      toast.error('Veuillez saisir votre idée');
      return;
    }
    const text = manual_idea_text.trim().slice(0, 500);
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

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 p-4 rounded-card border-2 border-foreground/10 bg-card">
      <label className="text-sm font-bold text-foreground">Votre idée</label>
      <textarea
        value={manual_idea_text}
        onChange={(e) => setManualIdeaText(e.target.value)}
        rows={5}
        placeholder="Décrivez votre idée de contenu…"
        className="w-full text-sm text-foreground bg-background border border-foreground/10 focus:border-primary/50 focus:outline-none rounded-md p-3 resize-y"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleImproveIdea}
          disabled={improving || !manual_idea_text.trim()}
          className="flex-1 gap-2 font-bold"
        >
          {improving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Améliorer l'idée
        </Button>
        <Button
          type="button"
          onClick={handleUseManualIdea}
          disabled={!manual_idea_text.trim()}
          className="flex-1 gap-2 gradient-bg border-0 text-primary-foreground hover:opacity-90 font-bold"
        >
          <Sparkles className="w-4 h-4" />
          Générer le contenu
        </Button>
      </div>
    </div>
  );
};

export default ManualIdeaPanel;
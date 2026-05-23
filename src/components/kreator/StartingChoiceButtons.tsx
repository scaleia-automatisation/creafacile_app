import { useKreatorStore } from '@/store/useKreatorStore';
import { Lightbulb, TrendingUp, AlertCircle, PenLine, ImagePlus, Upload, X, Replace, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { describeImageShort, describeProductImages, refineIdea } from '@/lib/kreator-ai';

const StartingChoiceButtons = () => {
  const {
    type, starting_choice, setStartingChoice,
    input_text, setInputText, setIdeaChosen,
    offer_type, company_activity, company_sector, market, target_persona,
    product_service, product_description, product_image_url,
    simple_images, setSimpleImages,
    objective,
    user_mode,
  } = useKreatorStore();
  const setInputImageDescription = useKreatorStore((s) => s.setInputImageDescription);
  const [scratchError, setScratchError] = useState<string[]>([]);
  const [loadingDescSet, setLoadingDescSet] = useState<Set<number>>(new Set());
  const [groupAnalysis, setGroupAnalysis] = useState('');
  const [analyzingGroup, setAnalyzingGroup] = useState(false);
  const [showGroupAnalysis, setShowGroupAnalysis] = useState(false);
  const [refiningIdea, setRefiningIdea] = useState(false);

  const handleRefineIdea = async () => {
    const missing: string[] = [];
    if (!offer_type?.trim()) missing.push("Type d'offre");
    if (!product_service?.trim()) missing.push('Nom');
    if (!product_description?.trim()) missing.push('Description');
    if (!company_activity?.trim()) missing.push('Activité principale ou métier');
    if (!company_sector?.trim()) missing.push('Secteur');
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

  // Propagate the global analysis into the prompt input so generatePrompt receives it
  useEffect(() => {
    if (starting_choice !== 'simple') return;
    setInputImageDescription(groupAnalysis || '');
  }, [groupAnalysis, starting_choice, setInputImageDescription]);

  // Reset the global analysis carrier when leaving image-based entry points
  useEffect(() => {
    if (starting_choice !== 'simple' && starting_choice !== 'perf') {
      setInputImageDescription('');
    }
  }, [starting_choice, setInputImageDescription]);
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  if (type !== 'image' && type !== 'carousel' && type !== 'video') return null;

  const choose = (val: 'scratch' | 'perf' | 'idea' | 'simple') => {
    if (val === 'scratch') {
      // Toggle off if already selected
      if (starting_choice === 'scratch') {
        setScratchError([]);
        setStartingChoice('');
        return;
      }
      const missing: string[] = [];
      if (!offer_type?.trim()) missing.push("Type d'offre");
      if (!product_description?.trim()) missing.push("Description de l'offre");
      if (!product_service?.trim()) missing.push("Nom de l'offre");
      if (!objective?.trim()) missing.push('Objectif du contenu');
      if (!company_activity?.trim()) missing.push('Activité principale ou métier');
      setScratchError(missing);
      setStartingChoice('scratch');
      return;
    } else {
      setScratchError([]);
    }
    setStartingChoice(starting_choice === val ? '' : val);
  };

  const handleSimpleFile = async (file: File, index: number) => {
    const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WEBP ou GIF (les fichiers HEIC ne sont pas acceptés).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier dépasse 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const next = [...simple_images];
      next[index] = { url: base64, description: '' };
      setSimpleImages(next);
      // Auto-générer la description en 1 phrase dès l'insertion
      generateDescription(index, base64);
    };
    reader.readAsDataURL(file);
  };

  const generateDescription = async (index: number, urlOverride?: string) => {
    const url = urlOverride ?? simple_images[index]?.url;
    if (!url) return;
    setLoadingDescSet((prev) => {
      const s = new Set(prev);
      s.add(index);
      return s;
    });
    try {
      const desc = await describeImageShort(url);
      const updated = [...useKreatorStore.getState().simple_images];
      if (updated[index]) {
        updated[index] = { ...updated[index], description: desc };
        setSimpleImages(updated);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la description de l'image");
    } finally {
      setLoadingDescSet((prev) => {
        const s = new Set(prev);
        s.delete(index);
        return s;
      });
    }
  };

  const generateGroupAnalysis = async () => {
    const urls = simple_images.map((i) => i?.url).filter(Boolean) as string[];
    if (urls.length < 2) return;
    setShowGroupAnalysis(true);
    setAnalyzingGroup(true);
    try {
      const desc = await describeProductImages(urls);
      setGroupAnalysis(desc.trim());
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse des images");
    } finally {
      setAnalyzingGroup(false);
    }
  };

  const handleRemoveSimple = (index: number) => {
    const next = [...simple_images];
    next.splice(index, 1);
    setSimpleImages(next);
  };

  const handleDescChange = (index: number, value: string) => {
    const next = [...simple_images];
    if (next[index]) {
      next[index] = { ...next[index], description: value };
      setSimpleImages(next);
    }
  };

  const baseBtn =
    'w-full flex items-center justify-center gap-2 h-auto py-4 px-5 text-sm md:text-base font-bold border-2 border-[hsl(210_100%_55%)] transition-all whitespace-normal leading-tight text-center';
  const radius = { borderRadius: '20px' };

  return (
    <div id="starting-choice-buttons" className="flex flex-col items-center gap-4 max-w-6xl mx-auto">
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 items-start w-full ${user_mode === 'beginner' ? 'max-w-xl mx-auto' : 'lg:grid-cols-4'}`}>
      <div className="w-full">
        <button
          onClick={() => choose('idea')}
          style={radius}
          className={`${baseBtn} ${
            starting_choice === 'idea'
              ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-card text-foreground hover:opacity-90'
          }`}
        >
          <PenLine className="w-5 h-5 shrink-0" />
          <span>J'ai une idée<br />de contenu</span>
        </button>
      </div>
      {user_mode === 'expert' && (
        <>
          <div className="w-full">
            <button
              onClick={() => choose('simple')}
              style={radius}
              className={`${baseBtn} ${
                starting_choice === 'simple'
                  ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-card text-foreground hover:opacity-90'
              }`}
            >
              <ImagePlus className="w-5 h-5 shrink-0" />
              <span>Créer à partir<br />d'une image</span>
            </button>
          </div>
          <div className="w-full">
            <button
              onClick={() => choose('perf')}
              style={radius}
              className={`${baseBtn} ${
                starting_choice === 'perf'
                  ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-card text-foreground hover:opacity-90'
              }`}
            >
              <TrendingUp className="w-5 h-5 shrink-0" />
              <span>S'inspirer d'un<br />post viral</span>
            </button>
          </div>
        </>
      )}
      <div className="w-full">
        <button
          onClick={() => choose('scratch')}
          style={radius}
          className={`${baseBtn} ${
            starting_choice === 'scratch'
              ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-card text-foreground hover:opacity-90'
          }`}
        >
          <Lightbulb className="w-5 h-5 shrink-0" />
          <span>Je n'ai pas d'idée<br />aujaurd'hui</span>
        </button>
      </div>
    </div>
    {starting_choice === 'scratch' && scratchError.length > 0 && (
      <div className="w-full flex items-start gap-2 p-3 rounded-btn border border-destructive/40 bg-destructive/10 text-sm text-destructive">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold mb-1">
          Veuillez renseigner les champs requis avant de générer des idées de contenu :
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          {scratchError.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </div>
      </div>
    )}
    {starting_choice === 'simple' && (
      <div className="w-full step-border bg-background p-4 sm:p-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ImagePlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Image de référence
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Importez 1 image. Sa direction UI design (couleurs, style, composition, ambiance) est analysée automatiquement pour reproduire fidèlement le même rendu visuel.
        </p>
        <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
          {[0].map((index) => {
            const img = simple_images[index];
            return (
              <div key={index} className="space-y-2">
                {img?.url ? (
                  <div className="relative group aspect-square rounded-lg overflow-hidden border border-foreground/10 bg-card">
                    <img src={img.url} alt={`Image simple ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-foreground bg-card/80 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveSimple(index)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-foreground bg-card/80 hover:bg-primary hover:text-primary-foreground"
                        onClick={() => fileRefs[index]?.current?.click()}
                      >
                        <Replace className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRefs[index]?.current?.click()}
                    className="aspect-square w-full rounded-lg border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium">Image {index + 1}</span>
                  </button>
                )}
                {img?.url && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground block text-left">
                      Description UI design de l'image
                    </label>
                    <Textarea
                      value={img.description}
                      onChange={(e) => handleDescChange(index, e.target.value)}
                      placeholder={loadingDescSet.has(index) ? 'Analyse UI design en cours…' : 'Description UI design (couleurs, style, composition, ambiance) — 3 à 4 phrases max'}
                      disabled={loadingDescSet.has(index)}
                      className="text-xs min-h-[80px] resize-y"
                    />
                    {loadingDescSet.has(index) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyse en cours…
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileRefs[index]}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSimpleFile(file, index);
                    e.target.value = '';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    )}
    {starting_choice === 'idea' && (
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
    )}
    </div>
  );
};

export default StartingChoiceButtons;
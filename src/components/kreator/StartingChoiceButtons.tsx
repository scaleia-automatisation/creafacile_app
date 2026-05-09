import { useKreatorStore } from '@/store/useKreatorStore';
import { Lightbulb, TrendingUp, AlertCircle, PenLine, ImagePlus, Upload, X, Replace, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { describeImageShort } from '@/lib/kreator-ai';

const StartingChoiceButtons = () => {
  const {
    type, starting_choice, setStartingChoice,
    input_text, setInputText, setIdeaChosen,
    offer_type, company_activity, company_sector,
    product_service, product_description, product_image_url,
    simple_images, setSimpleImages,
    objective,
  } = useKreatorStore();
  const [scratchError, setScratchError] = useState<string[]>([]);
  const [loadingDesc, setLoadingDesc] = useState<number | null>(null);
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  if (type !== 'image' && type !== 'carousel') return null;

  const choose = (val: 'scratch' | 'perf' | 'idea' | 'simple') => {
    if (val === 'scratch') {
      // Toggle off if already selected
      if (starting_choice === 'scratch') {
        setScratchError([]);
        setStartingChoice('');
        return;
      }
      const isProduct = offer_type === '📦 Produit';
      const missing: string[] = [];
      if (!offer_type?.trim()) missing.push("Type d'offre");
      if (!product_service?.trim()) missing.push('Nom');
      if (isProduct && !product_image_url?.trim()) missing.push("Image du produit");
      if (!objective?.trim()) missing.push('Objectif du contenu');
      if (!company_activity?.trim()) missing.push('Activité principale');
      if (!company_sector?.trim()) missing.push("Secteur d'activité");
      setScratchError(missing);
      setStartingChoice('scratch');
      return;
    } else {
      setScratchError([]);
    }
    setStartingChoice(starting_choice === val ? '' : val);
  };

  const handleSimpleFile = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier dépasse 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const next = [...simple_images];
      next[index] = { url: base64, description: '' };
      setSimpleImages(next);
      // auto-generate short description
      setLoadingDesc(index);
      try {
        const desc = await describeImageShort(base64);
        const updated = [...useKreatorStore.getState().simple_images];
        if (updated[index]) {
          updated[index] = { ...updated[index], description: desc };
          setSimpleImages(updated);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors de la description de l'image");
      } finally {
        setLoadingDesc(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSimple = (index: number) => {
    const next = [...simple_images];
    next.splice(index, 1);
    setSimpleImages(next);
  };

  const handleDescChange = (index: number, value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const limited = words.slice(0, 7).join(' ');
    // allow trailing space while typing under limit
    const final = words.length <= 7 ? value : limited;
    const next = [...simple_images];
    if (next[index]) {
      next[index] = { ...next[index], description: final };
      setSimpleImages(next);
    }
  };

  const baseBtn =
    'w-full flex items-center justify-center gap-2 h-auto py-4 px-5 text-sm md:text-base font-bold border-2 border-[hsl(210_100%_55%)] transition-all whitespace-normal leading-tight text-center';
  const radius = { borderRadius: '20px' };

  return (
    <div className="flex flex-col items-center gap-4 max-w-6xl mx-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start w-full">
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
          <span>Je n'ai pas d'idée</span>
        </button>
      </div>
    </div>
    {starting_choice === 'scratch' && scratchError.length > 0 && (
      <div className="w-full flex items-start gap-2 p-3 rounded-btn border border-destructive/40 bg-destructive/10 text-sm text-destructive">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold mb-1">
            Remplissez le type d'offre et la description avant de continuer. Nom et Objectif du contenu.
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {scratchError.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </div>
    )}
    {starting_choice === 'simple' && (
      <div className="w-full step-border bg-background p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <ImagePlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Images simples (jusqu'à 4)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Importez vos images. Une description courte (7 mots max) est générée automatiquement et reste modifiable.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((index) => {
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
                    {loadingDesc === index && !img.description ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Description…
                      </div>
                    ) : (
                      <Input
                        value={img.description}
                        onChange={(e) => handleDescChange(index, e.target.value)}
                        placeholder="Description (7 mots max)"
                        className="text-xs h-9"
                      />
                    )}
                    <div className="text-[10px] text-muted-foreground text-right">
                      {img.description ? img.description.trim().split(/\s+/).filter(Boolean).length : 0}/7 mots
                    </div>
                  </div>
                )}
                <input
                  ref={fileRefs[index]}
                  type="file"
                  accept="image/*"
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
          className="min-h-[110px] resize-none"
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground text-right">
          {input_text.length}/500
        </div>
      </div>
    )}
    </div>
  );
};

export default StartingChoiceButtons;
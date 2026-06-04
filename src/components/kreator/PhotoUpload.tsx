import { useState, useRef, useEffect } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Upload, X, Replace, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { describeProductImages } from '@/lib/kreator-ai';

const MAX_PHOTOS = 4;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

interface PhotoSlot {
  url: string;
  description: string;
}

const PhotoUpload = () => {
  const { input_photos, setInputPhotos } = useKreatorStore();
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [groupAnalysis, setGroupAnalysis] = useState('');
  const [analyzingGroup, setAnalyzingGroup] = useState(false);
  const groupKeyRef = useRef<string>('');

  const handleFile = (file: File, index: number) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB}MB`);
      return;
    }

    // Convert to base64 for AI vision analysis
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newPhotos = [...input_photos];
      newPhotos[index] = { url: base64, description: newPhotos[index]?.description || '' };
      setInputPhotos(newPhotos);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (index: number) => {
    const newPhotos = [...input_photos];
    newPhotos[index] = { url: '', description: '' };
    setInputPhotos(newPhotos);
  };

  const handleDescriptionChange = (index: number, desc: string) => {
    const newPhotos = [...input_photos];
    if (newPhotos[index]) {
      newPhotos[index] = { ...newPhotos[index], description: desc };
    }
    setInputPhotos(newPhotos);
  };

  // Ensure we always have 3 slots
  const slots: PhotoSlot[] = Array.from({ length: MAX_PHOTOS }, (_, i) =>
    input_photos[i] || { url: '', description: '' }
  );

  // Auto-analyse globale dès qu'il y a 2 images ou plus
  useEffect(() => {
    const urls = input_photos.map((p) => p?.url).filter(Boolean) as string[];
    if (urls.length < 2) {
      groupKeyRef.current = '';
      setGroupAnalysis('');
      return;
    }
    const key = urls.join('|').slice(0, 200) + ':' + urls.length;
    if (groupKeyRef.current === key) return;
    groupKeyRef.current = key;
    setAnalyzingGroup(true);
    describeProductImages(urls)
      .then((desc) => setGroupAnalysis(desc.trim()))
      .catch((e) => {
        console.error('Group image analysis failed', e);
        toast.error("Erreur lors de l'analyse des images");
      })
      .finally(() => setAnalyzingGroup(false));
  }, [input_photos]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground block">
        Images du produit (max {MAX_PHOTOS}) — utilisées pour générer le contenu
      </label>

      <div className="grid grid-cols-4 gap-3">
        {slots.map((slot, index) => (
          <div key={index} className="space-y-2">
            {slot.url ? (
              <div className="relative group aspect-square rounded-card overflow-hidden border border-foreground/10 bg-card">
                <img src={slot.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-foreground bg-card/80 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-foreground bg-card/80 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => fileInputRefs[index]?.current?.click()}
                  >
                    <Replace className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs[index]?.current?.click()}
                className="aspect-square w-full rounded-card border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-medium">Photo {index + 1}</span>
              </button>
            )}

            {/* Description field per photo */}
            {slot.url && (
              <Input
                value={slot.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                placeholder={`Décris la photo ${index + 1}…`}
                className="bg-card border-foreground/10 text-foreground text-xs placeholder:text-muted-foreground h-8"
              />
            )}

            <input
              ref={fileInputRefs[index]}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file, index);
                e.target.value = '';
              }}
            />
          </div>
        ))}
      </div>

      {(analyzingGroup || groupAnalysis) && (
        <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Analyse globale des images</span>
          </div>
          {analyzingGroup ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyse en cours… (détection : produits/services identiques ou différents)
            </div>
          ) : (
            <Textarea
              value={groupAnalysis}
              onChange={(e) => setGroupAnalysis(e.target.value)}
              rows={2}
              className="bg-card border-foreground/10 text-foreground text-xs min-h-[56px] resize-none"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;

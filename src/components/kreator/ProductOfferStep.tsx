import { useState, useRef, useEffect } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, CheckCircle, Sparkles, Upload, X, Replace, ImagePlus, Lightbulb, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generatePersonas, describeImageShort, generateIdeas, detectSectorFromImage, detectOfferTypeFromDescription, describeProductImages } from '@/lib/kreator-ai';
import { useAuth } from '@/contexts/AuthContext';
import StepContainer from './StepContainer';
import ActivitySectorFields, { SECTORS } from './ActivitySectorFields';

const OFFER_TYPES = [
  '📦 Produit',
  '🛠️ Service',
  '💻 SaaS',
  '🎓 Formation',
];
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

type Persona = {
  id: number;
  profil: string;
  contexte_rapide: string;
  csp: string;
  probleme: string;
  objectif: string;
};

const ProductOfferStep = () => {
  const { user } = useAuth();
  const {
    type,
    company_activity,
    company_sector, setCompanySector,
    market,
    marketing_angle,
    product_service, setProductService,
    product_description, setProductDescription,
    offer_type, setOfferType,
    target_persona, setTargetPersona,
    product_image_url, setProductImageUrl,
    product_image_urls_extra, setProductImageUrlsExtra,
    idea_chosen, setIdeaChosen,
    setInputText,
  } = useKreatorStore();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [describing, setDescribing] = useState(false);
  const [detectingOfferType, setDetectingOfferType] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extraFileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const autoPersonaKeyRef = useRef<string>('');
  const groupAnalyzeKeyRef = useRef<string>('');
  const [ideas, setIdeas] = useState<{ id: number; title: string; angle: string; description?: string }[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const isProduct = offer_type === '📦 Produit';
  const isService = offer_type === '🛠️ Service';
  const isSaas = offer_type === '💻 SaaS';
  const isFormation = offer_type === '🎓 Formation';

  const offerLabel = offer_type ? offer_type.replace(/^[^\p{L}\p{N}]+/u, '').trim() : '';
  const nameLabel = offerLabel ? `Nom (${offerLabel})` : 'Nom';
  const descriptionLabel = offerLabel ? `Description (${offerLabel})` : 'Description';
  const namePlaceholder = isProduct ? 'Ex : Pain au levain bio'
    : isService ? 'Ex : Coaching sportif personnalisé'
    : isSaas ? 'Ex : BoosterApp'
    : isFormation ? 'Ex : Formation Trading 30 jours'
    : 'Donnez un nom court';
  const descPlaceholder = isProduct
    ? 'Une phrase simple (générée auto depuis l\'image)'
    : 'Une phrase simple (ex : coaching sportif personnalisé à domicile)';

  const toOneSentence = (text: string) => {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const match = cleaned.match(/^[^.!?\n]+[.!?]/);
    let s = (match ? match[0] : cleaned).trim();
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
  };

  const handleDescriptionBlur = async () => {
    const cleanedDesc = toOneSentence(product_description || '');
    if (cleanedDesc !== product_description) setProductDescription(cleanedDesc);
    if (!cleanedDesc || offer_type || detectingOfferType) return;
    setDetectingOfferType(true);
    try {
      const detected = await detectOfferTypeFromDescription(cleanedDesc, OFFER_TYPES);
      if (detected && OFFER_TYPES.includes(detected)) setOfferType(detected);
    } catch (e) {
      console.error('Auto offer type detection failed', e);
    } finally {
      setDetectingOfferType(false);
    }
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setProductImageUrl(dataUrl);
      // If only one image so far, use single-image description; group analysis runs via effect when ≥2.
      if (isProduct && product_image_urls_extra.length === 0) {
        setDescribing(true);
        try {
          const [desc, sector] = await Promise.all([
            describeImageShort(dataUrl),
            detectSectorFromImage(dataUrl, SECTORS).catch(() => ''),
          ]);
          setProductDescription(toOneSentence(desc));
          if (sector) setCompanySector(sector);
        } catch (e) {
          console.error(e);
        } finally {
          setDescribing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtraFile = async (file: File, idx: number) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB}MB`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const next = [...product_image_urls_extra];
      next[idx] = dataUrl;
      setProductImageUrlsExtra(next.filter(Boolean));
    } catch (e) {
      console.error(e);
    }
  };

  const removeExtra = (idx: number) => {
    const next = product_image_urls_extra.filter((_, i) => i !== idx);
    setProductImageUrlsExtra(next);
  };

  // Auto-analyse globale dès qu'il y a 2 images ou plus
  useEffect(() => {
    if (!isProduct) return;
    const all = [product_image_url, ...product_image_urls_extra].filter(Boolean);
    if (all.length < 2) return;
    const key = all.join('|').slice(0, 200) + ':' + all.length;
    if (groupAnalyzeKeyRef.current === key) return;
    groupAnalyzeKeyRef.current = key;
    setDescribing(true);
    describeProductImages(all)
      .then((desc) => setProductDescription(toOneSentence(desc)))
      .catch((e) => console.error('Group image analysis failed', e))
      .finally(() => setDescribing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product_image_url, product_image_urls_extra, isProduct]);

  const handleNoIdea = async () => {
    if (!user) { toast.error('Connectez-vous pour générer des idées'); return; }
    if (!company_activity) { toast.error('Renseignez votre activité principale dans "Votre activité"'); return; }
    const missing: string[] = [];
    if (!product_service?.trim()) missing.push('Produit ou service');
    if (!marketing_angle?.trim()) missing.push('Angle marketing');
    if (missing.length > 0) {
      toast.error(`Veuillez renseigner : ${missing.join(' et ')} avant de générer des idées`);
      return;
    }
    setLoadingIdeas(true);
    try {
      const result = await generateIdeas(company_activity, company_sector, type, marketing_angle, product_service, market);
      setIdeas(result.ideas);
      setShowIdeas(true);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération des idées');
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleGenerateMore = async () => {
    setLoadingIdeas(true);
    try {
      const result = await generateIdeas(company_activity, company_sector, type, marketing_angle, product_service, market);
      setIdeas(result.ideas);
    } catch { toast.error('Erreur lors de la génération'); }
    finally { setLoadingIdeas(false); }
  };

  const handleGeneratePersonas = async () => {
    if (!company_activity?.trim()) {
      toast.error("Renseignez l'activité principale (bloc Votre activité)");
      return;
    }
    if (!company_sector?.trim()) {
      toast.error("Renseignez le secteur d'activité (bloc Votre activité)");
      return;
    }
    if (!offer_type?.trim()) {
      toast.error("Sélectionnez le type d'offre");
      return;
    }
    setLoadingPersonas(true);
    try {
      const result = await generatePersonas({
        activity: company_activity,
        sector: company_sector,
        offerType: offer_type,
      });
      setPersonas(result.personas || []);
      setSelectedPersonaId(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération des personas');
    } finally {
      setLoadingPersonas(false);
    }
  };

  // Auto-générer les personas quand tous les champs requis sont remplis
  useEffect(() => {
    const ready =
      offer_type?.trim() &&
      product_description?.trim() &&
      product_service?.trim() &&
      company_activity?.trim() &&
      company_sector?.trim();
    if (!ready) return;
    const key = [offer_type, product_description, product_service, company_activity, company_sector].join('|');
    if (autoPersonaKeyRef.current === key) return;
    if (loadingPersonas) return;
    autoPersonaKeyRef.current = key;
    handleGeneratePersonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer_type, product_description, product_service, company_activity, company_sector]);

  const handleSelectPersona = (p: Persona) => {
    setSelectedPersonaId(p.id);
    const text = `${p.profil} — ${p.contexte_rapide} | CSP: ${p.csp} | Problème: ${p.probleme} | Objectif: ${p.objectif}`;
    setTargetPersona(text);
  };

  return (
    <StepContainer stepNumber={1} title="Quel est votre offre ? (produit, service...)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            Type d'offre *
            {detectingOfferType && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          </label>
          <Select value={offer_type} onValueChange={setOfferType}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <SelectValue placeholder="Choisir un type d'offre..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              {OFFER_TYPES.map((o) => (
                <SelectItem key={o} value={o} className="text-foreground focus:bg-secondary/20">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isProduct && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-primary" />
              Image de référence du produit
            </label>
            {product_image_url ? (
              <div className="relative group aspect-square w-full max-w-[180px] rounded-lg overflow-hidden border border-foreground/10 bg-card">
                <img src={product_image_url} alt="Produit" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground bg-card/80 hover:bg-destructive hover:text-destructive-foreground" onClick={() => setProductImageUrl('')}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground bg-card/80 hover:bg-primary hover:text-primary-foreground" onClick={() => fileRef.current?.click()}>
                    <Replace className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square w-full max-w-[180px] rounded-lg border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Importer une image</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value=''; }} />
            {/* Images supplémentaires (jusqu'à 2 de plus) */}
            {product_image_url && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {[0, 1].map((idx) => {
                  const url = product_image_urls_extra[idx];
                  return url ? (
                    <div key={idx} className="relative group w-[72px] h-[72px] rounded-md overflow-hidden border border-foreground/10 bg-card">
                      <img src={url} alt={`Produit ${idx + 2}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExtra(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => extraFileRefs[idx].current?.click()}
                      className="w-[72px] h-[72px] rounded-md border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-[10px] font-medium">+ image</span>
                    </button>
                  );
                })}
                {[0, 1].map((idx) => (
                  <input
                    key={`in-${idx}`}
                    ref={extraFileRefs[idx]}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExtraFile(f, idx); e.target.value=''; }}
                  />
                ))}
              </div>
            )}
            {product_image_url && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Ajoutez 1 ou 2 images supplémentaires (mêmes angles ou produits différents). À partir de 2 images, une description globale est générée automatiquement.
              </p>
            )}
            {describing && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Analyse {(product_image_urls_extra.length + (product_image_url ? 1 : 0)) >= 2 ? 'des images' : "de l'image"}…
              </div>
            )}
          </div>
        )}

        <div className={isProduct ? 'md:col-span-2' : ''}>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {nameLabel} *
          </label>
          <Input
            value={product_service}
            onChange={(e) => setProductService(e.target.value)}
            placeholder={namePlaceholder}
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {descriptionLabel}
          </label>
          <Textarea
            value={product_description}
            onChange={(e) => {
              // Une seule phrase simple : on bloque les retours à la ligne
              const single = e.target.value.replace(/[\r\n]+/g, ' ');
              setProductDescription(single);
            }}
            onBlur={handleDescriptionBlur}
            placeholder={descPlaceholder}
            rows={2}
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm min-h-[60px] resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Une seule phrase simple, exacte
            {isProduct
              ? ((product_image_urls_extra.length + (product_image_url ? 1 : 0)) >= 2
                ? ' — générée automatiquement à partir des images (identiques ou différentes)'
                : ' — générée automatiquement à partir de l\'image')
              : ' — à renseigner manuellement'}
          </p>
        </div>

        <div className="md:col-span-2">
          <ActivitySectorFields />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Client cible / Persona
            </label>
            <Button
              type="button"
              size="sm"
              onClick={handleGeneratePersonas}
              disabled={loadingPersonas}
              className="gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn text-xs font-bold"
            >
              {loadingPersonas ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Générer mon persona
            </Button>
          </div>
          <Textarea
            value={target_persona}
            onChange={(e) => setTargetPersona(e.target.value)}
            placeholder="Décrivez votre client idéal (âge, situation, problème, objectif…) ou utilisez le bouton pour le générer."
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm min-h-[80px] resize-none"
          />
          {personas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPersona(p)}
                  className={`text-left relative p-4 rounded-xl border-[2px] transition-all ${
                    selectedPersonaId === p.id
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-foreground/10 hover:border-secondary/50'
                  } bg-card`}
                >
                  {selectedPersonaId === p.id && (
                    <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-primary" />
                  )}
                  <div className="text-sm font-bold text-foreground mb-2">{p.profil}</div>
                  <div className="text-xs text-muted-foreground mb-1.5">{p.contexte_rapide}</div>
                  <div className="text-xs text-muted-foreground mb-1"><span className="text-primary font-semibold">CSP:</span> {p.csp}</div>
                  <div className="text-xs text-muted-foreground mb-1"><span className="text-primary font-semibold">Problème:</span> {p.probleme}</div>
                  <div className="text-xs text-muted-foreground"><span className="text-primary font-semibold">Objectif:</span> {p.objectif}</div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col items-start gap-3">
            {loadingIdeas && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Génération des idées en cours…
              </div>
            )}
            {showIdeas && !loadingIdeas && (
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  {ideas.map((idea) => (
                    <div
                      key={idea.id}
                      className={`relative p-4 rounded-xl border-[2px] transition-all duration-300 cursor-pointer ${
                        idea_chosen === idea.title
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-foreground/10 hover:border-secondary/50'
                      } bg-card`}
                      onClick={() => { setIdeaChosen(idea.title); setInputText(`${idea.title} — ${idea.description || ''}`); }}
                    >
                      {idea_chosen === idea.title && (
                        <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-primary" />
                      )}
                      <h3 className="font-bold text-sm text-foreground mb-1">{idea.title}</h3>
                      <p className="text-xs text-muted-foreground mb-1">{idea.angle}</p>
                      {idea.description && <p className="text-xs text-muted-foreground">{idea.description}</p>}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleGenerateMore} disabled={loadingIdeas}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Régénérer 3 nouvelles idées
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </StepContainer>
  );
};

export default ProductOfferStep;
import { useState, useRef, useEffect } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generatePersonas, generateIdeas, detectOfferTypeFromDescription, generateServiceDescription, detectActivityFromDescription, detectSectorFromActivity, detectBestTone } from '@/lib/kreator-ai';
import { useAuth } from '@/contexts/AuthContext';
import StepContainer from './StepContainer';
import ActivitySectorFields, { SECTORS } from './ActivitySectorFields';

const OFFER_TYPES = [
  '📦 Produit',
  '🛠️ Service',
];

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
    type, objective,
    company_activity, setCompanyActivity,
    company_sector, setCompanySector,
    market,
    marketing_angle,
    product_service, setProductService,
    product_description, setProductDescription,
    offer_type, setOfferType,
    target_persona, setTargetPersona,
    target_audience, setTargetAudience,
    product_image_url, setProductImageUrl,
    product_image_urls_extra, setProductImageUrlsExtra,
    idea_chosen, setIdeaChosen,
    setInputText,
    user_mode,
    options, setOptions,
  } = useKreatorStore();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [generatingServiceDesc, setGeneratingServiceDesc] = useState(false);
  const autoServiceDescKeyRef = useRef<string>('');
  const [detectingOfferType, setDetectingOfferType] = useState(false);
  const [detectingActivity, setDetectingActivity] = useState(false);
  const autoActivityKeyRef = useRef<string>('');
  const [detectingSector, setDetectingSector] = useState(false);
  const autoSectorKeyRef = useRef<string>('');
  const autoPersonasKeyRef = useRef<string>('');
  const autoToneKeyRef = useRef<string>('');
  const [detectingTone, setDetectingTone] = useState(false);
  const [ideas, setIdeas] = useState<{ id: number; title: string; angle: string; description?: string }[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isProduct = offer_type === '📦 Produit';
  const isService = offer_type === '🛠️ Service';

  const offerLabel = offer_type ? offer_type.replace(/^[^\p{L}\p{N}]+/u, '').trim() : '';
  const nameLabel = offerLabel ? `Nom (${offerLabel})` : 'Nom';
  const descriptionLabel = offerLabel ? `Description (${offerLabel})` : 'Description';
  const namePlaceholder = isProduct ? 'Ex : Pain au levain bio'
    : isService ? 'Ex : Coaching sportif personnalisé'
    : 'Donnez un nom court';
  const descPlaceholder = isProduct
    ? 'Une phrase simple (générée auto depuis l\'image)'
    : 'Une phrase simple (générée auto depuis le nom)';

  const toSentences = (text: string, max: number) => {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const matches = cleaned.match(/[^.!?\n]+[.!?]+/g);
    let s = matches ? matches.slice(0, max).join(' ').trim() : cleaned;
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
  };
  const toOneSentence = (text: string) => toSentences(text, 1);

  const handleOfferTypeChange = (val: string) => {
    setOfferType(val);
    setProductService('');
    setProductDescription('');
    setProductImageUrl('');
    setProductImageUrlsExtra([]);
    setTargetPersona('');
    setTargetAudience('');
    setIdeaChosen('');
    setInputText('');
    setPersonas([]);
    setSelectedPersonaId(null);
    setShowIdeas(false);
    setIdeas([]);
  };

  const handleDescriptionBlur = async () => {
    // Pour un produit, on autorise plusieurs lignes (le champ s'affiche sur 3 lignes
    // pour permettre les retours à la ligne du texte). Pour un service, on garde
    // une seule phrase courte.
    const cleanedDesc = isProduct
      ? (product_description || '').trim()
      : toOneSentence(product_description || '');
    if (cleanedDesc !== product_description) setProductDescription(cleanedDesc);
    if (!cleanedDesc) return;
    const tasks: Promise<void>[] = [];
    if (!offer_type && !detectingOfferType) {
      setDetectingOfferType(true);
      tasks.push(
        detectOfferTypeFromDescription(cleanedDesc, OFFER_TYPES)
          .then((detected) => { if (detected && OFFER_TYPES.includes(detected)) setOfferType(detected); })
          .catch((e) => console.error('Auto offer type detection failed', e))
          .finally(() => setDetectingOfferType(false))
      );
    }
    if (!detectingActivity && autoActivityKeyRef.current !== cleanedDesc) {
      autoActivityKeyRef.current = cleanedDesc;
      setDetectingActivity(true);
      tasks.push(
        detectActivityFromDescription(cleanedDesc)
          .then((activity) => { if (activity) setCompanyActivity(activity); })
          .catch((e) => console.error('Auto activity detection failed', e))
          .finally(() => setDetectingActivity(false))
      );
    }
    if (!detectingSector && autoSectorKeyRef.current !== cleanedDesc) {
      autoSectorKeyRef.current = cleanedDesc;
      setDetectingSector(true);
      tasks.push(
        detectSectorFromActivity(cleanedDesc, SECTORS)
          .then((sector) => { if (sector) setCompanySector(sector); })
          .catch((e) => console.error('Auto sector detection failed', e))
          .finally(() => setDetectingSector(false))
      );
    }
    await Promise.all(tasks);
  };

  const handleServiceNameBlur = async () => {
    if (!isService) return;
    const name = (product_service || '').trim();
    if (!name) return;
    if (product_description?.trim()) return;
    if (autoServiceDescKeyRef.current === name) return;
    autoServiceDescKeyRef.current = name;
    setGeneratingServiceDesc(true);
    try {
      const desc = await generateServiceDescription(name);
      const cleaned = toOneSentence(desc);
      if (cleaned) {
        setProductDescription(cleaned);
        // Déclenche activité + secteur depuis cette description
        const [activity, sector] = await Promise.all([
          detectActivityFromDescription(cleaned).catch(() => ''),
          detectSectorFromActivity(cleaned, SECTORS).catch(() => ''),
        ]);
        if (activity && !company_activity?.trim()) {
          setCompanyActivity(activity);
          autoActivityKeyRef.current = cleaned;
        }
        if (sector && !company_sector?.trim()) {
          setCompanySector(sector);
          autoSectorKeyRef.current = cleaned;
        }
      }
    } catch (e) {
      console.error('Auto service description generation failed', e);
    } finally {
      setGeneratingServiceDesc(false);
    }
  };

  const handleNoIdea = async () => {
    if (!user) { toast.error('Connectez-vous pour générer des idées'); return; }
    const isBeginner = user_mode === 'beginner';
    if (!isBeginner && !company_activity) { toast.error('Renseignez votre activité principale dans "Votre activité"'); return; }
    const missing: string[] = [];
    if (!product_service?.trim()) missing.push('Produit ou service');
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
    const isBeginner = user_mode === 'beginner';
    if (!isBeginner && !company_activity?.trim()) {
      toast.error("Renseignez l'activité principale (bloc Votre activité)");
      return;
    }
    if (!isBeginner && !company_sector?.trim()) {
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
        productService: product_service,
        productDescription: product_description,
      });
      const list: Persona[] = result.personas || [];
      setPersonas(list);
      if (typeof result.target_audience === 'string' && result.target_audience.trim()) {
        setTargetAudience(result.target_audience.trim());
      }
      const bestId = typeof result.best_id === 'number' ? result.best_id : list[0]?.id;
      const best = list.find((p) => p.id === bestId) || list[0];
      if (best) {
        setSelectedPersonaId(best.id);
        const text = `${best.profil} — ${best.contexte_rapide} | CSP: ${best.csp} | Problème: ${best.probleme} | Objectif: ${best.objectif}`;
        setTargetPersona(text);
      } else {
        setSelectedPersonaId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération des personas');
    } finally {
      setLoadingPersonas(false);
    }
  };

  // Auto-génère 3 personas dès que description + activité + secteur + type d'offre sont renseignés
  useEffect(() => {
    const desc = (product_description || '').trim();
    const activity = (company_activity || '').trim();
    const sector = (company_sector || '').trim();
    const offer = (offer_type || '').trim();
    if (!desc || !activity || !sector || !offer) return;
    const key = `${desc}|${activity}|${sector}|${offer}`;
    if (autoPersonasKeyRef.current === key) return;
    if (loadingPersonas) return;
    autoPersonasKeyRef.current = key;
    (async () => {
      setLoadingPersonas(true);
      try {
        const result = await generatePersonas({ activity, sector, offerType: offer, productService: product_service, productDescription: desc });
        const list: Persona[] = result.personas || [];
        setPersonas(list);
        if (typeof result.target_audience === 'string' && result.target_audience.trim()) {
          setTargetAudience(result.target_audience.trim());
        }
        // Auto-sélection du meilleur persona (conversion / douleur / revenus)
        const bestId = typeof result.best_id === 'number' ? result.best_id : list[0]?.id;
        const best = list.find((p) => p.id === bestId) || list[0];
        if (best) {
          setSelectedPersonaId(best.id);
          const text = `${best.profil} — ${best.contexte_rapide} | CSP: ${best.csp} | Problème: ${best.probleme} | Objectif: ${best.objectif}`;
          setTargetPersona(text);
        }
      } catch (err) {
        console.error('Auto personas generation failed', err);
      } finally {
        setLoadingPersonas(false);
      }
    })();
  }, [product_description, company_activity, company_sector, offer_type]);

  // Mode débutant : déduit automatiquement le ton d'écriture le plus adapté
  // (le plus convertissant / viral) à partir de l'objectif, du type d'offre,
  // du nom et de la description. Ne s'exécute pas si l'utilisateur a déjà
  // choisi un ton (mode expert).
  useEffect(() => {
    if (user_mode !== 'beginner') return;
    const obj = (objective || '').trim();
    const off = (offer_type || '').trim();
    const name = (product_service || '').trim();
    const desc = (product_description || '').trim();
    if (!obj || !off || !name || !desc) return;
    if (options.ton?.trim()) return;
    const key = `${obj}|${off}|${name}|${desc}`;
    if (autoToneKeyRef.current === key) return;
    if (detectingTone) return;
    autoToneKeyRef.current = key;
    const TONS = [
      'Direct / Cash', 'Provocateur', 'Authentique', 'Storytelling',
      'Humoristique', 'Éducatif', 'Inspirant', 'Urgent', 'Amical',
    ];
    setDetectingTone(true);
    detectBestTone({
      tones: TONS,
      objective: obj,
      offerType: off,
      productName: name,
      productDescription: desc,
      activity: company_activity,
      sector: company_sector,
    })
      .then((tone) => { if (tone) setOptions({ ton: tone }); })
      .catch((e) => console.error('Auto tone detection failed', e))
      .finally(() => setDetectingTone(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_mode, objective, offer_type, product_service, product_description, company_activity, company_sector, options.ton]);

  // Auto-détection activité + secteur dès qu'une description produit est renseignée (produit comme service)
  useEffect(() => {
    const desc = (product_description || '').trim();
    if (!desc) return;
    if (autoActivityKeyRef.current === desc && autoSectorKeyRef.current === desc) return;
    const needActivity = !detectingActivity && autoActivityKeyRef.current !== desc;
    const needSector = !detectingSector && autoSectorKeyRef.current !== desc;
    if (!needActivity && !needSector) return;
    const t = setTimeout(() => {
      if (needActivity) {
        autoActivityKeyRef.current = desc;
        setDetectingActivity(true);
        detectActivityFromDescription(desc)
          .then((a) => { if (a) setCompanyActivity(a); })
          .catch((e) => console.error('Auto activity detection failed', e))
          .finally(() => setDetectingActivity(false));
      }
      if (needSector) {
        autoSectorKeyRef.current = desc;
        setDetectingSector(true);
        detectSectorFromActivity(desc, SECTORS)
          .then((s) => { if (s) setCompanySector(s); })
          .catch((e) => console.error('Auto sector detection failed', e))
          .finally(() => setDetectingSector(false));
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product_description, company_activity, company_sector]);

  // Auto-resize du champ description pour que tout le texte soit visible d'un coup
  // La hauteur minimum reste égale au nombre de rows (3 pour produit, 2 pour service)
  useEffect(() => {
    const el = descTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
    const padding = parseInt(getComputedStyle(el).paddingTop) + parseInt(getComputedStyle(el).paddingBottom);
    const border = parseInt(getComputedStyle(el).borderTopWidth) + parseInt(getComputedStyle(el).borderBottomWidth);
    const minH = lineHeight * el.rows + padding + border;
    el.style.height = `${Math.max(el.scrollHeight, minH)}px`;
  }, [product_description]);


  const handleSelectPersona = (p: Persona) => {
    setSelectedPersonaId(p.id);
    const text = `${p.profil} — ${p.contexte_rapide} | CSP: ${p.csp} | Problème: ${p.probleme} | Objectif: ${p.objectif}`;
    setTargetPersona(text);
  };

  return (
    <StepContainer stepNumber={1} title="Qui êtes vous ?">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            Type d'offre *
            {detectingOfferType && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          </label>
          <Select value={offer_type} onValueChange={handleOfferTypeChange}>
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

        <div className={isProduct ? 'md:col-span-2' : ''}>
          <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            {nameLabel} *
            {generatingServiceDesc && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          </label>
          <Input
            value={product_service}
            onChange={(e) => setProductService(e.target.value)}
            onBlur={handleServiceNameBlur}
            placeholder={namePlaceholder}
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        {!(isProduct && product_image_url?.trim()) && (
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {descriptionLabel}
          </label>
          <Textarea
            ref={descTextareaRef}
            value={product_description}
            onChange={(e) => {
              // Pour un produit, on autorise jusqu'à 3 lignes (retours à la ligne)
              // afin de pouvoir décrire l'emplacement du texte. Pour un service,
              // on garde une seule phrase simple.
              let next = e.target.value;
              if (!isProduct) {
                next = next.replace(/[\r\n]+/g, ' ');
              } else {
                const lines = next.split(/\r?\n/).slice(0, 3);
                next = lines.join('\n');
              }
              setProductDescription(next);
              if (!next.trim()) {
                setCompanyActivity('');
                setCompanySector('');
                setPersonas([]);
                setSelectedPersonaId(null);
                autoActivityKeyRef.current = '';
                autoSectorKeyRef.current = '';
                autoServiceDescKeyRef.current = '';
              }
            }}
            onBlur={handleDescriptionBlur}
            placeholder={descPlaceholder}
            rows={isProduct ? 3 : 2}
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm resize-none !min-h-0"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {isProduct ? 'Jusqu\'à 3 lignes (retours à la ligne autorisés)' : 'Une seule phrase simple, exacte'}
            {isProduct
              ? ' — générée automatiquement à partir de l\'image'
              : ' — générée automatiquement à partir du nom du service'}
          </p>
        </div>
        )}

        <div className="md:col-span-2">
          <ActivitySectorFields />
        </div>

        {user_mode === 'expert' && (
          <div className="md:col-span-2">
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Client cible (audience large)
                {loadingPersonas && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              </label>
              <Textarea
                value={target_audience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Audience cible large et généraliste (déduite automatiquement à partir de l'offre)."
                className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground text-sm min-h-[60px] resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Audience large (groupe généraliste) — déduite automatiquement, modifiable. Les 3 personas ci-dessous sont des sous-cibles précises de cette audience.
              </p>
            </div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Persona (sous-cible précise)
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
                  <div
                    key={p.id}
                    className={`text-left relative p-4 rounded-xl border-[2px] transition-all flex flex-col ${
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
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelectPersona(p)}
                      disabled={selectedPersonaId === p.id}
                      className="mt-3 w-full gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn text-xs font-bold"
                    >
                      {selectedPersonaId === p.id ? (
                        <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Persona choisi</>
                      ) : (
                        'Je choisis ce persona'
                      )}
                    </Button>
                  </div>
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
        )}
      </div>
    </StepContainer>
  );
};

export default ProductOfferStep;

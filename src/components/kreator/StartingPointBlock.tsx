import { useState, useRef, useEffect } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Upload, X, Replace, ImagePlus, FileText, TrendingUp, Lightbulb, Loader2, RefreshCw, CheckCircle, ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { generateIdeas, generateIdeaFromImages, describeImage, summarizePerformingPosts } from '@/lib/kreator-ai';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

const renderStyles = [
  'Mise en situation réelle (utilisation dans la vie quotidienne)',
  'Fond blanc / neutre (propre, e-commerce)',
  'Style haut de gamme / luxe (éclairage travaillé, rendu premium)',
  'Ambiance naturelle (lumière douce, aspect authentique)',
  'Style storytelling (qui raconte une histoire)',
  'Moment de vie (spontané, humain, naturel)',
  'Avant / après (montre une transformation)',
  'Style épuré / minimaliste (peu d\'éléments)',
  'Style créatif (original, différent)',
  'Réaliste avec effet "waouh" (surprenant mais crédible)',
  'Rendu produit amélioré (plus net, plus propre)',
  'Gros plan détail (zoom sur texture / qualité)',
  'Visuel avec texte (explicatif, marketing)',
  'Style utilisateur (pris sur le vif, authentique)',
  'Style réseaux sociaux (moderne, tendance)',
];

const StartingPointBlock = () => {
  const { user } = useAuth();
  const {
    input_photos, setInputPhotos, input_text, setInputText, setInputImageUrl,
    type, format, idea_chosen, setIdeaChosen,
    company_activity, company_sector,
    product_service,
    market,
    marketing_angle,
    render_style, setRenderStyle,
    options,
    starting_choice, setStartingChoice,
  } = useKreatorStore();
  const setInputImageDescription = useKreatorStore((s) => s.setInputImageDescription);

  // Refs for file inputs (only 1 reference image now)
  const photoRefs = [useRef<HTMLInputElement>(null)];
  const perfRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Local state for performing posts (up to 4)
  const [showPerfBlock, setShowPerfBlock] = useState(false);
  const [perfPosts, setPerfPosts] = useState<{ url: string; description: string; loading: boolean }[]>([]);
  const [perfSummary, setPerfSummary] = useState('');
  const [showPerfAnalysis, setShowPerfAnalysis] = useState(false);
  const [loadingPerfSummary, setLoadingPerfSummary] = useState(false);

  // Idea generation state
  const [ideas, setIdeas] = useState<{ id: number; title: string; angle: string; description?: string }[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingImageIdea, setLoadingImageIdea] = useState(false);

  // Propagate the viral-posts global analysis to the prompt input
  useEffect(() => {
    if (starting_choice !== 'perf') return;
    setInputImageDescription(perfSummary || '');
  }, [perfSummary, starting_choice, setInputImageDescription]);

  // Mirror viral posts into input_photos so the prompt synthesis sees them
  useEffect(() => {
    if (starting_choice !== 'perf') return;
    const mirrored = perfPosts
      .filter((p) => p?.url)
      .map((p) => ({ url: p.url, description: p.description || '' }));
    setInputPhotos(mirrored);
  }, [perfPosts, starting_choice, setInputPhotos]);

  // React to global starting_choice (buttons placed above ContentTypeStep)
  useEffect(() => {
    if (starting_choice === 'perf') {
      setShowPerfBlock(true);
      // Clear any previously generated ideas
      setShowIdeas(false);
      setIdeas([]);
      // scroll into view
      setTimeout(() => {
        document.getElementById('starting-point-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (starting_choice === 'scratch') {
      setShowPerfBlock(false);
      // Clear any previously uploaded performing posts
      setPerfPosts([]);
      setPerfSummary('');
      setTimeout(() => {
        document.getElementById('starting-choice-buttons')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      // Trigger idea generation
      handleNoIdea();
    } else {
      // Neither selected: hide everything
      setShowPerfBlock(false);
      setShowIdeas(false);
      setIdeas([]);
      setPerfPosts([]);
      setPerfSummary('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starting_choice]);

  const handlePhotoFile = (file: File, index: number) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newPhotos = [{ url: base64, description: '' }];
      setInputPhotos(newPhotos);
      setInputImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setInputPhotos([]);
    setInputImageUrl('');
  };

  const handlePerfFile = (file: File, index: number) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPerfPosts((prev) => {
        const next = [...prev];
        if (index < next.length) {
          next[index] = { ...next[index], url: base64, description: '' };
        } else {
          next.push({ url: base64, description: '', loading: false });
        }
        return next;
      });
      setPerfSummary('');
      setShowPerfAnalysis(false);
      // auto-generate short per-image description (max 2 sentences) — global analysis is on-demand
      autoDescribePerf(base64);
    };
    reader.readAsDataURL(file);
  };

  const autoDescribePerf = async (url: string) => {
    // mark loading on the post matching this url
    setPerfPosts((prev) => prev.map((p) => p.url === url ? { ...p, loading: true } : p));
    try {
      const desc = await describeImage(url);
      // keep only first 2 sentences
      const short = (desc.match(/[^.!?]+[.!?]+/g) || [desc]).slice(0, 2).join(' ').trim();
      let snapshot: { url: string; description: string; loading: boolean }[] = [];
      setPerfPosts((prev) => {
        snapshot = prev.map((p) => p.url === url ? { ...p, description: short, loading: false } : p);
        return snapshot;
      });
      setPerfSummary('');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse de l'image");
      setPerfPosts((prev) => prev.map((p) => p.url === url ? { ...p, loading: false } : p));
    }
  };

  const handleRemovePerf = (index: number) => {
    setPerfPosts((prev) => prev.filter((_, i) => i !== index));
    setPerfSummary('');
    setShowPerfAnalysis(false);
  };

  const handleDescribePerf = async (index: number) => {
    const post = perfPosts[index];
    if (!post?.url) return;
    setPerfPosts((prev) => prev.map((p, i) => i === index ? { ...p, loading: true } : p));
    try {
      const desc = await describeImage(post.url);
      setPerfPosts((prev) => prev.map((p, i) => i === index ? { ...p, description: desc, loading: false } : p));
      setPerfSummary('');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse de l'image");
      setPerfPosts((prev) => prev.map((p, i) => i === index ? { ...p, loading: false } : p));
    }
  };

  const handleGeneratePerfAnalysis = async () => {
    const posts = perfPosts.filter((p) => p?.url);
    if (posts.length < 1) return;
    setShowPerfAnalysis(true);
    setLoadingPerfSummary(true);
    setPerfSummary('');
    try {
      // Make sure each uploaded image has a description (auto-describe missing)
      const ensured = await Promise.all(
        posts.map(async (p) => {
          if (p.description?.trim()) return p.description.trim();
          const desc = await describeImage(p.url);
          const short = (desc.match(/[^.!?]+[.!?]+/g) || [desc]).slice(0, 2).join(' ').trim();
          setPerfPosts((prev) => prev.map((pp) => pp.url === p.url ? { ...pp, description: short } : pp));
          return short;
        })
      );
      const summary = await summarizePerformingPosts(ensured);
      setPerfSummary(summary);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'analyse globale des posts");
    } finally {
      setLoadingPerfSummary(false);
    }
  };

  const handleNoIdea = async () => {
    if (!user) {
      toast.error('Connectez-vous pour générer des idées');
      return;
    }
    const { offer_type, objective } = useKreatorStore.getState();
    const missing: string[] = [];
    if (!offer_type?.trim()) missing.push("Type d'offre");
    if (!company_activity?.trim()) missing.push('Activité principale');
    if (!company_sector?.trim()) missing.push("Secteur d'activité");
    if (!objective?.trim()) missing.push('Objectif du contenu');
    if (missing.length > 0) {
      toast.error(`Veuillez renseigner : ${missing.join(', ')} avant de générer des idées à partir de zéro`);
      return;
    }
    setLoadingIdeas(true);
    try {
      const result = await generateIdeas(company_activity, company_sector, type, objective, product_service, market);
      setIdeas(result.ideas);
      setShowIdeas(true);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération des idées');
      setIdeas([
        { id: 1, title: '💡 Avant / Après', angle: 'Preuve sociale', description: 'Montrer la transformation' },
        { id: 2, title: '📚 Astuce du jour', angle: 'Éducatif', description: 'Partager une astuce pratique' },
        { id: 3, title: '🔥 Offre flash', angle: 'Urgence', description: 'Créer un sentiment d\'urgence' },
      ]);
      setShowIdeas(true);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleGenerateMore = async () => {
    setLoadingIdeas(true);
    try {
      const { objective } = useKreatorStore.getState();
      const result = await generateIdeas(company_activity, company_sector, type, objective || marketing_angle, product_service, market);
      setIdeas(result.ideas);
    } catch {
      toast.error('Erreur lors de la génération');
    } finally {
      setLoadingIdeas(false);
    }
  };

  const toBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerateIdeaFromImages = async () => {
    if (!user) {
      toast.error('Connectez-vous pour générer une idée');
      return;
    }
    const uploadedPhotos = input_photos.filter(p => p.url);
    if (uploadedPhotos.length === 0) {
      toast.error('Ajoutez au moins une image de référence');
      return;
    }
    setLoadingImageIdea(true);
    try {
      const base64Images = await Promise.all(uploadedPhotos.map(p => toBase64(p.url)));
      const result = await generateIdeaFromImages({
        imageDescriptions: uploadedPhotos.map(p => p.description?.trim() || ''),
        imageBase64s: base64Images,
        contentType: type,
        objective: marketing_angle,
        format,
        activity: company_activity,
        sector: company_sector,
        productService: product_service,
        market,
        ton: options.ton,
        visualStyle: options.visual_style,
      });
      const idea = result.idea;
      setIdeaChosen(`${idea.title} — ${idea.description}`);
      setInputText(`${idea.title} — ${idea.description}`);
      toast.success('Idée générée à partir des images !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération de l\'idée');
    } finally {
      setLoadingImageIdea(false);
    }
  };

  const slots = [input_photos[0] || { url: '', description: '' }];
  const isVideo = type === 'video';

  // ===== Vidéo : UI simplifiée =====
  if (isVideo) {
    if (!showPerfBlock && !loadingIdeas && !showIdeas) return null;
    return (
      <div id="starting-point-block" className="step-border bg-background p-4 sm:p-6 md:p-8">
        {showPerfBlock && (
          <div className={loadingIdeas || showIdeas ? 'mb-6 pb-6 border-b border-foreground/10' : ''}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Post viral de référence</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 text-center">
              Importez votre visuel pour vous en inspirer. Une analyse est générée automatiquement.
            </p>
            <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
              {[0].map((index) => {
                const post = perfPosts[index];
                return (
                  <div key={index} className="space-y-2">
                    {post?.url ? (
                      <div className="relative group aspect-square rounded-lg overflow-hidden border border-foreground/10 bg-card">
                        <img src={post.url} alt={`Post performant ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-foreground bg-card/80 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemovePerf(index)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-foreground bg-card/80 hover:bg-primary hover:text-primary-foreground"
                            onClick={() => perfRefs[index]?.current?.click()}
                          >
                            <Replace className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => perfRefs[index]?.current?.click()}
                        className="aspect-square w-full rounded-lg border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-xs font-medium">Image {index + 1}</span>
                      </button>
                    )}
                    {post?.url && (
                      <Button
                        onClick={() => handleDescribePerf(index)}
                        disabled={post.loading}
                        size="sm"
                        className="w-full text-xs bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0"
                      >
                        {post.loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 mr-1" />
                        )}
                        Décrire le post
                      </Button>
                    )}
                    {post?.description && (
                      <Textarea
                        value={post.description}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPerfPosts((prev) => prev.map((p, i) => i === index ? { ...p, description: value } : p));
                          setPerfSummary('');
                        }}
                        className="text-sm text-foreground bg-card border border-foreground/10 rounded-md p-2 leading-relaxed min-h-[100px] resize-y"
                      />
                    )}
                    <input
                      ref={perfRefs[index]}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePerfFile(file, index);
                        e.target.value = '';
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {perfPosts.filter((p) => p?.url).length >= 1 && (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGeneratePerfAnalysis}
                  disabled={loadingPerfSummary}
                  className="h-8 text-xs gap-1.5 bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0"
                >
                  {loadingPerfSummary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Analyse de performance
                </Button>
              </div>
            )}
            {showPerfAnalysis && perfPosts.filter((p) => p?.url).length >= 1 && (
              <div className="mt-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Analyse globale</span>
                </div>
                {loadingPerfSummary ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse des posts performants en cours…
                  </div>
                ) : (
                  <Textarea
                    value={perfSummary}
                    onChange={(e) => setPerfSummary(e.target.value)}
                    rows={5}
                    className="bg-card border-foreground/10 text-foreground text-xs leading-relaxed min-h-[110px] resize-y"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {loadingIdeas && (
          <div className="flex flex-col items-center py-8">
            <div className="text-3xl mb-3 animate-bounce">✨</div>
            <p className="text-sm text-muted-foreground">Génération des idées de vidéo en cours…</p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mt-2" />
          </div>
        )}

        {showIdeas && !loadingIdeas && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className={`relative p-5 rounded-xl border-[2px] transition-all duration-300 cursor-pointer ${
                    idea_chosen === idea.title
                      ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'border-foreground/10 hover:border-secondary/50 hover:shadow-md'
                  }`}
                  style={{
                    background: idea_chosen === idea.title
                      ? 'linear-gradient(135deg, rgba(255,45,115,0.08), rgba(255,106,61,0.08))'
                      : 'linear-gradient(180deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.02))',
                  }}
                  onClick={() => {
                    setIdeaChosen(idea.title);
                    setInputText(`${idea.title} — ${idea.description || ''}`);
                  }}
                >
                  {idea_chosen === idea.title && (
                    <div className="absolute -top-2 -right-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="text-center mb-3">
                    <span className="text-2xl">{idea.title.match(/^\p{Emoji}/u)?.[0] || '🎬'}</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground text-center mb-2">
                    {idea.title.replace(/^\p{Emoji}\s*/u, '')}
                  </h3>
                  {idea.description && (
                    <p className="text-xs text-muted-foreground text-center">{idea.description}</p>
                  )}
                  <Button
                    size="sm"
                    className={`mt-4 w-full text-xs font-semibold ${
                      idea_chosen === idea.title
                        ? 'gradient-bg border-0 text-primary-foreground'
                        : 'bg-card border border-foreground/10 text-foreground hover:border-secondary'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdeaChosen(idea.title);
                      setInputText(`${idea.title} — ${idea.description || ''}`);
                    }}
                  >
                    {idea_chosen === idea.title ? '✓ Idée choisie' : 'Je choisis cette idée'}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleGenerateMore}
              disabled={loadingIdeas}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Régénérer 3 nouvelles idées
            </Button>
          </div>
        )}
      </div>
    );
  }

  const hasContent = showPerfBlock || loadingIdeas || showIdeas;
  if (!hasContent) return null;

  return (
    <div id="starting-point-block" className="step-border bg-background p-4 sm:p-6 md:p-8">
      {/* Performing posts upload area */}
      {showPerfBlock && (
        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Post viral de référence</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4 text-center">
            Importez votre visuel pour vous en inspirer. Une analyse est générée automatiquement.
          </p>
          <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
            {[0].map((index) => {
              const post = perfPosts[index];
              return (
                <div key={index} className="space-y-2">
                  {post?.url ? (
                    <div className="relative group aspect-square rounded-lg overflow-hidden border border-foreground/10 bg-card">
                      <img src={post.url} alt={`Post performant ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-foreground bg-card/80 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemovePerf(index)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-foreground bg-card/80 hover:bg-primary hover:text-primary-foreground"
                          onClick={() => perfRefs[index]?.current?.click()}
                        >
                          <Replace className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => perfRefs[index]?.current?.click()}
                      className="aspect-square w-full rounded-lg border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">Image {index + 1}</span>
                    </button>
                  )}
                  {post?.url && (
                    <Button
                      onClick={() => handleDescribePerf(index)}
                      disabled={post.loading}
                      size="sm"
                      className="w-full text-xs bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0"
                    >
                      {post.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 mr-1" />
                      )}
                      Décrire le post
                    </Button>
                  )}
                  {post?.description && (
                    <Textarea
                      value={post.description}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPerfPosts((prev) => prev.map((p, i) => i === index ? { ...p, description: value } : p));
                        setPerfSummary('');
                      }}
                      className="text-sm text-foreground bg-card border border-foreground/10 rounded-md p-2 leading-relaxed min-h-[100px] resize-y"
                    />
                  )}
                  <input
                    ref={perfRefs[index]}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePerfFile(file, index);
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })}
          </div>

          {perfPosts.filter((p) => p?.url).length >= 1 && (
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleGeneratePerfAnalysis}
                disabled={loadingPerfSummary}
                className="h-8 text-xs gap-1.5 bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] text-white border-0"
              >
                {loadingPerfSummary ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Analyse de performance
              </Button>
            </div>
          )}
          {showPerfAnalysis && perfPosts.filter((p) => p?.url).length >= 1 && (
            <div className="mt-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Analyse globale</span>
              </div>
              {loadingPerfSummary ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse des posts performants en cours…
                </div>
              ) : (
                <Textarea
                  value={perfSummary}
                  onChange={(e) => setPerfSummary(e.target.value)}
                  rows={5}
                  className="bg-card border-foreground/10 text-foreground text-xs leading-relaxed min-h-[110px] resize-y"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Type de rendu — image/carousel */}
      {/* Loading */}
      {loadingIdeas && (
        <div className="flex flex-col items-center py-8 mt-6 border-t border-foreground/10">
          <div className="text-3xl mb-3 animate-bounce">✨</div>
          <p className="text-sm text-muted-foreground">Génération des idées en cours…</p>
          <Loader2 className="w-5 h-5 animate-spin text-primary mt-2" />
        </div>
      )}

      {/* Ideas cards */}
      {showIdeas && !loadingIdeas && (
        <div className="mt-6 pt-6 border-t border-foreground/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className={`relative p-5 rounded-xl border-[2px] transition-all duration-300 cursor-pointer ${
                  idea_chosen === idea.title
                    ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'border-foreground/10 hover:border-secondary/50 hover:shadow-md'
                }`}
                style={{
                  background: idea_chosen === idea.title
                    ? 'linear-gradient(135deg, rgba(255,45,115,0.08), rgba(255,106,61,0.08))'
                    : 'linear-gradient(180deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.02))',
                }}
                onClick={() => setIdeaChosen(idea.title)}
              >
                {idea_chosen === idea.title && (
                  <div className="absolute -top-2 -right-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="text-center mb-3">
                  <span className="text-2xl">{idea.title.match(/^\p{Emoji}/u)?.[0] || '💡'}</span>
                </div>
                <h3 className="font-bold text-sm text-foreground text-center mb-2">
                  {idea.title.replace(/^\p{Emoji}\s*/u, '')}
                </h3>
                <p className="text-xs text-muted-foreground text-center mb-1">{idea.angle}</p>
                {idea.description && (
                  <p className="text-xs text-muted-foreground text-center">{idea.description}</p>
                )}
                <Button
                  size="sm"
                  className={`mt-4 w-full text-xs font-semibold ${
                    idea_chosen === idea.title
                      ? 'gradient-bg border-0 text-primary-foreground'
                      : 'bg-card border border-foreground/10 text-foreground hover:border-secondary'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdeaChosen(idea.title);
                  }}
                >
                  {idea_chosen === idea.title ? '✓ Idée choisie' : 'Je choisis cette idée'}
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleGenerateMore}
            disabled={loadingIdeas}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Générer 3 nouvelles idées — 1 crédit
          </Button>
        </div>
      )}
    </div>
  );
};

export default StartingPointBlock;

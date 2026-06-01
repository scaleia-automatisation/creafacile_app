import { useState, useRef } from 'react';
import facebookLogo from '@/assets/facebook-logo.png';
import instagramLogo from '@/assets/instagram-logo.png';
import tiktokLogo from '@/assets/tiktok-logo.png';
import linkedinLogo from '@/assets/linkedin-logo.png';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Save, RefreshCw, Copy, Loader2, Share2, Mail, MessageCircle, Send, AlertTriangle, FilePlus, XCircle, X, Rocket, Clock } from 'lucide-react';
import StepContainer from './StepContainer';
import { generateImage, generateVideo, generateCaption, generatePrompt, type PlatformCaptions } from '@/lib/kreator-ai';
import { getVideoDurationSec, supportsVoiceOver } from '@/lib/voice-over';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Platform = 'facebook' | 'instagram' | 'tiktok' | 'linkedin';

const platformLabels: Record<Platform, string> = {
  facebook: '📘 Caption Facebook',
  instagram: '📸 Caption Instagram',
  tiktok: '🎵 Caption TikTok',
  linkedin: '💼 Caption LinkedIn',
};

const GenerationStep = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const {
    type, prompt_en, prompt_fr, setPromptFr, status, setStatus, result_url, setResultUrl,
    ai_model, format, setCreditsUsed, objective, marketing_angle, input_text, idea_chosen,
    company_sector, company_activity, input_photos, resetProject,
    model_settings, sora_character_scenes,
    offer_type, product_service, product_description, target_persona, market,
    options, slides_count, visual_style_brief, render_style, video_render_style,
    input_image_description, simple_images, starting_choice,
    voice_over_enabled, voice_over_text, user_mode,
  } = useKreatorStore();
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [captions, setCaptions] = useState<PlatformCaptions | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram');
  const [captionEditing, setCaptionEditing] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPublishedPopup, setShowPublishedPopup] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [publishPlatforms, setPublishPlatforms] = useState<Record<Platform, boolean>>({
    facebook: false, instagram: false, tiktok: false, linkedin: false,
  });
  const [publishing, setPublishing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buttonLabel = type === 'image' ? 'Générer le contenu' : type === 'carousel' ? 'Générer le carrousel' : 'Générer la vidéo';
  const creditsNeeded = type === 'image' ? 1 : type === 'carousel' ? (useKreatorStore.getState().slides_count) : 3;

  const currentCaption = captions ? captions[selectedPlatform] : null;

  // Validation des champs requis (identique à PromptStep)
  const isProduct = offer_type === '📦 Produit';
  const isBeginner = user_mode === 'beginner';
  const missingFields: string[] = [];
  if (!offer_type?.trim()) missingFields.push("Type d'offre");
  if (!product_service?.trim()) missingFields.push("Nom de l'offre");
  if (isProduct && !useKreatorStore.getState().product_image_url?.trim()) missingFields.push('Image du produit');
  if (isProduct && !product_description?.trim()) missingFields.push('Description du produit');
  if (!isBeginner && !objective?.trim()) missingFields.push('Objectif du contenu');
  if (!isBeginner && !company_activity?.trim()) missingFields.push('Activité principale');
  if (!isBeginner && !company_sector?.trim()) missingFields.push("Secteur d'activité");

  const getImageSynthesis = (): string => {
    const source =
      starting_choice === 'simple'
        ? (simple_images || []).filter(p => p?.url)
        : (input_photos || []).filter(p => p?.url);
    const globalAnalysis = (input_image_description || '').trim();
    if (source.length === 0) return globalAnalysis;
    const described = source.map((p, i) => {
      const desc = p.description?.trim() || 'image uploadée sans description textuelle — analyser visuellement';
      return `Image ${i + 1}: ${desc}`;
    });
    let synthesis =
      starting_choice === 'simple'
        ? `Direction UI design de référence (à reproduire FIDÈLEMENT — couleurs, style, composition, typo, ambiance) : ${described[0]}. PRIORITÉ ABSOLUE : adapter parfaitement le visuel généré à cette direction UI design.`
        : starting_choice === 'perf'
        ? `Analyse de viralité du post de référence (quintessence à réutiliser FIDÈLEMENT) : ${described[0]}. PRIORITÉ ABSOLUE : générer un visuel 100% cohérent avec cette analyse de viralité.`
        : source.length === 1
        ? `Image de référence : ${described[0]}`
        : `Synthèse de ${source.length} images de référence : ${described.join(' | ')}.`;
    if (globalAnalysis) synthesis += ` Analyse globale : ${globalAnalysis}`;
    return synthesis;
  };

  const buildPromptParams = () => ({
    contentType: type,
    format,
    objective,
    ton: options.ton,
    visualStyle: visual_style_brief || options.visual_style,
    inputText: input_text,
    ideaChosen: idea_chosen,
    companyActivity: company_activity,
    companySector: company_sector,
    productService: product_service,
    productDescription: product_description,
    market,
    offerType: offer_type,
    targetPersona: target_persona,
    marketingAngle: marketing_angle,
    showText: options.show_text,
    textContent: options.text_content,
    slideTexts: options.slide_texts,
    slidesCount: slides_count,
    text2Enabled: options.text_2_enabled,
    textContent2: options.text_content_2,
    textPosition2: options.text_position_2,
    textFont2: options.text_font_2,
    textColor2: options.text_color_2,
    textDuration1: options.text_duration_1,
    textDuration2: options.text_duration_2,
    textStart1: options.text_start_1,
    textStart2: options.text_start_2,
    paletteEnabled: options.palette_enabled,
    paletteHex: options.palette_hex,
    imageDescription: getImageSynthesis(),
    referenceImageCount:
      starting_choice === 'simple'
        ? (simple_images || []).filter(p => p?.url).length
        : input_photos.filter(p => p.url).length,
    aiModel: ai_model,
    renderStyle: render_style,
    videoRenderStyle: video_render_style,
    logoEnabled: options.logo_enabled,
    logoUrl: options.logo_url,
    logoPosition: options.logo_position,
    logoAppearance: options.logo_appearance,
    textPosition: options.text_position,
    textFont: options.text_font,
    textColor: options.text_color,
    voiceOverText:
      type === 'video' && voice_over_enabled && supportsVoiceOver(ai_model) && voice_over_text.trim()
        ? voice_over_text.trim()
        : undefined,
    videoDurationSec: type === 'video' ? getVideoDurationSec(ai_model, model_settings) : undefined,
  });

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Connectez-vous pour générer du contenu');
      return;
    }
    if (missingFields.length > 0) {
      toast.error(`Champs requis manquants : ${missingFields.join(' et ')}`);
      return;
    }

    // Modèles d'édition d'image nécessitant une image de référence
    const requiresReferenceImage = ['qwen/image-edit', 'ideogram/character'].includes(ai_model);
    if (requiresReferenceImage && !input_photos?.[0]?.url) {
      toast.error("Ce modèle nécessite une image de référence. Ajoutez-en une dans le bloc 'Point de départ'.");
      return;
    }

    setGenerating(true);
    setStatus('generating');
    setProgress(0);
    setElapsedSeconds(0);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    const isVideo = type === 'video';
    const progressInterval = !isVideo ? setInterval(() => {
      setProgress((p) => (p >= 95 ? p : p + Math.random() * 8));
    }, 500) : null;

    try {
      // 1) Génération silencieuse du prompt si pas déjà présent
      let activePrompt = prompt_fr;
      if (!activePrompt || activePrompt.trim().length === 0) {
        const promptResult = await generatePrompt(buildPromptParams());
        activePrompt = promptResult.prompt_fr || '';
        setPromptFr(activePrompt);
      }
      if (!activePrompt || activePrompt.trim().length === 0) {
        throw new Error('Prompt vide après génération');
      }

      const [contentUrl, captionResult] = await Promise.all([
        isVideo
          ? generateVideo(activePrompt, ai_model, format, (pct) => setProgress(pct), abortController.signal, model_settings, sora_character_scenes)
          : generateImage(activePrompt, ai_model, format, input_photos?.[0]?.url, abortController.signal, options.logo_enabled ? options.logo_url : ''),
        generateCaption({
          objective: marketing_angle || objective,
          idea: idea_chosen || input_text,
          contentType: type,
          sector: company_sector,
          activity: company_activity,
          aiModel: ai_model,
          format,
          slidesCount: slides_count,
          offerType: offer_type,
          offerName: product_service,
          offerDescription: product_description,
          persona: target_persona,
          market,
          marketingAngle: marketing_angle,
          ton: options.ton,
          visualStyle: visual_style_brief || options.visual_style || render_style || video_render_style,
          freeDescription: input_text,
          promptValide: activePrompt,
          advancedSettings: [
            options.palette_enabled ? `palette: ${options.palette_hex.join(', ')}` : '',
            options.logo_enabled ? `logo: ${options.logo_position}${type === 'video' ? ` (apparition ${options.logo_appearance})` : ''}` : '',
            options.show_text ? `texte overlay: position ${options.text_position}, police ${options.text_font}` : '',
          ].filter(Boolean).join(' | '),
          productAnalysis: input_image_description,
          text1: options.show_text ? options.text_content : '',
          text2: options.text_2_enabled ? options.text_content_2 : '',
          slideTexts: options.slide_texts,
        }),
      ]);

      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);

      const { data: deducted } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: creditsNeeded,
        p_action: `generate_${type}`,
      });

      if (!deducted) {
        toast.error('Crédits insuffisants');
        setStatus('idle');
        setGenerating(false);
        return;
      }

      await supabase.from('generations').insert([{
        user_id: user.id,
        type,
        ai_model,
        format,
        prompt_en_final: activePrompt,
        prompt_fr_final: activePrompt,
        result_url: contentUrl,
        credits_used: creditsNeeded,
        status: 'done',
        captions: (captionResult ?? null) as any,
      }]);

      setResultUrl(contentUrl);
      setCreditsUsed(creditsNeeded);
      setCaptions(captionResult);
      setStatus('done');
      await refreshProfile();
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      if (err?.name === 'AbortError' || err?.message === 'Generation cancelled') {
        toast.info('Génération annulée');
        setStatus('idle');
      } else {
        console.error(err);
        toast.error('Erreur lors de la génération. Aucun crédit déduit.');
        setStatus('error');
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
  };

  const handleCopyCaption = () => {
    if (!currentCaption) return;
    const text = `${currentCaption.hook}\n${currentCaption.description}\n${currentCaption.cta}\n\n${currentCaption.hashtags}`;
    navigator.clipboard.writeText(text);
    toast.success('Caption copié !');
  };

  const handleDownload = () => {
    if (!result_url) return;
    const ext = type === 'video' ? 'mp4' : 'png';
    const a = document.createElement('a');
    a.href = result_url;
    a.download = `kreator-${type}.${ext}`;
    a.click();
  };

  const handleSave = async () => {
    setShowSavedPopup(true);
  };

  const handleRegenerate = () => {
    setStatus('idle');
    setResultUrl('');
    setCaptions(null);
  };

  const handleShare = (platform: string) => {
    if (!currentCaption) return;
    const text = `${currentCaption.hook}\n${currentCaption.description}\n${currentCaption.cta}\n\n${currentCaption.hashtags}`;
    const encoded = encodeURIComponent(text);
    const url = encodeURIComponent(result_url || '');

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encoded}%20${url}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${url}&text=${encoded}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Mon%20contenu%20Créafacile&body=${encoded}%0A%0A${url}`, '_blank');
        break;
    }
  };

  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const confirmNewProject = () => {
    resetProject();
    setShowNewProjectDialog(false);
    setCaptions(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublishNow = () => {
    setPublishPlatforms({ facebook: false, instagram: false, tiktok: false, linkedin: false });
    setShowPublishDialog(prev => !prev);
  };

  const handleLaunchPublication = async () => {
    const selected = (Object.keys(publishPlatforms) as Platform[]).filter(p => publishPlatforms[p]);
    if (selected.length === 0) {
      toast.error('Sélectionnez au moins une plateforme');
      return;
    }

    setPublishing(true);
    try {
      // Webhook Make - send publication data
      const webhookUrl = 'https://hook.eu2.make.com/kreator-publish';
      const captionData = captions ? Object.fromEntries(
        selected.map(p => [p, captions[p]])
      ) : {};

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selected,
          content_url: result_url,
          content_type: type,
          captions: captionData,
          user_id: user?.id,
        }),
      }).catch(() => {
        // Webhook might not be configured yet, that's OK
      });

      setShowPublishDialog(false);
      setShowPublishedPopup(true);
    } catch {
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishSinglePlatform = async (platform: Platform) => {
    setPublishing(true);
    try {
      const webhookUrl = 'https://hook.eu2.make.com/kreator-publish';
      const captionData = captions ? { [platform]: captions[platform] } : {};

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: [platform],
          content_url: result_url,
          content_type: type,
          captions: captionData,
          user_id: user?.id,
        }),
      }).catch(() => {});

      setShowPublishDialog(false);
      setShowPublishedPopup(true);
    } catch {
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishLater = async () => {
    handleSave();
  };

  const updateCurrentCaption = (field: string, value: string) => {
    if (!captions) return;
    setCaptions({
      ...captions,
      [selectedPlatform]: {
        ...captions[selectedPlatform],
        [field]: value,
      },
    });
  };

  return (
    <>
      <StepContainer stepNumber={5} title="Génération">
        {status === 'idle' && (
          <Button
            id="prompt-generate-btn"
            onClick={handleGenerate}
            className="w-full py-6 text-base font-bold gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn"
          >
            {buttonLabel}
          </Button>
        )}

        {status === 'generating' && (
          <div className="flex flex-col items-center py-8">
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">✨</span>
              </div>
            </div>
            <div className="text-sm font-medium text-foreground mb-1">
              {progress < 95 ? 'Génération en cours…' : 'Finalisation en cours…'}
            </div>
            {type === 'video' && (
              <p className="text-xs text-muted-foreground mb-3 text-center max-w-xs">
                La génération vidéo prend en moyenne 2 à 5 minutes. Merci de patienter 🎬
              </p>
            )}
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">{Math.round(Math.min(progress, 100))}%</span>
              <span className="text-xs text-muted-foreground">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground hover:text-destructive"
              onClick={() => abortControllerRef.current?.abort()}
            >
              <XCircle className="w-4 h-4 mr-1" /> Annuler
            </Button>
          </div>
        )}

        {status === 'done' && result_url && (
          <div className="space-y-6">
            {/* Result preview */}
            <div className="rounded-card overflow-hidden bg-card border border-foreground/10">
              {type === 'video' ? (
                <video
                  src={result_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full rounded-card"
                  style={{ maxHeight: '70vh' }}
                />
              ) : (
                <img src={result_url} alt="Résultat" className="w-full object-cover" />
              )}
            </div>

            {/* 4 action buttons in one row */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={handleDownload}
                size="sm"
                className="gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn text-xs px-2"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Télécharger
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 text-foreground hover:border-secondary text-xs px-2"
                onClick={handleSave}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-foreground/10 text-foreground hover:border-secondary text-xs px-2">
                    <Share2 className="w-3.5 h-3.5 mr-1" /> Partager
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-foreground/10">
                  <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="text-foreground focus:bg-secondary/20 cursor-pointer">
                    <MessageCircle className="w-4 h-4 mr-2 text-secondary" /> WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('telegram')} className="text-foreground focus:bg-secondary/20 cursor-pointer">
                    <Send className="w-4 h-4 mr-2 text-primary" /> Telegram
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('email')} className="text-foreground focus:bg-secondary/20 cursor-pointer">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 text-foreground hover:border-secondary text-xs px-2"
                onClick={handleRegenerate}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Régénérer
              </Button>
            </div>

            {/* Caption section with platform dropdown */}
            <div className="bg-card rounded-card p-4 md:p-5 border border-foreground/10">
              <div className="flex items-center justify-between mb-4">
                <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                  <SelectTrigger className="w-[220px] bg-background border-foreground/10 text-foreground text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-foreground/10">
                    {(Object.keys(platformLabels) as Platform[]).map((p) => (
                      <SelectItem key={p} value={p} className="text-foreground focus:bg-secondary/20 cursor-pointer">
                        {platformLabels[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2" onClick={handleCopyCaption}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copier
                  </Button>
                  {captionEditing ? (
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-8 px-2" onClick={() => setCaptionEditing(false)}>
                      Mettre à jour
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-2" onClick={() => setCaptionEditing(true)}>
                      Modifier
                    </Button>
                  )}
                </div>
              </div>

              {currentCaption && (
                captionEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">HOOK</label>
                      <Textarea
                        value={currentCaption.hook}
                        onChange={(e) => updateCurrentCaption('hook', e.target.value)}
                        className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                        rows={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">DESCRIPTION</label>
                      <Textarea
                        value={currentCaption.description}
                        onChange={(e) => updateCurrentCaption('description', e.target.value)}
                        className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                        rows={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">APPEL À L'ACTION</label>
                      <Textarea
                        value={currentCaption.cta}
                        onChange={(e) => updateCurrentCaption('cta', e.target.value)}
                        className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                        rows={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block">HASHTAGS</label>
                      <Textarea
                        value={currentCaption.hashtags}
                        onChange={(e) => updateCurrentCaption('hashtags', e.target.value)}
                        className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                        rows={1}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground font-semibold">{currentCaption.hook}</p>
                    <p className="text-sm text-foreground">{currentCaption.description}</p>
                    <p className="text-sm text-foreground font-semibold">{currentCaption.cta}</p>
                    <p className="text-sm text-primary mt-2">{currentCaption.hashtags}</p>
                  </div>
                )
              )}
            </div>

            {/* Publish buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handlePublishNow}
                className="gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn py-5 text-sm font-bold"
              >
                <Rocket className="w-4 h-4 mr-2" /> Publier maintenant
              </Button>
              <Button
                variant="outline"
                className="border-foreground/10 text-foreground hover:border-secondary rounded-btn py-5 text-sm font-bold"
                onClick={handlePublishLater}
              >
                <Clock className="w-4 h-4 mr-2" /> Publier plus tard
              </Button>
            </div>

            {/* Inline publish platform selection */}
            {showPublishDialog && (
              <div className="mt-4 p-4 rounded-xl border-2 border-primary/20 bg-card/80 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Sélectionnez les plateformes</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(Object.keys(publishPlatforms) as Platform[]).map((p) => {
                    const selected = publishPlatforms[p];
                    const logos: Record<Platform, string> = {
                      facebook: facebookLogo,
                      instagram: instagramLogo,
                      tiktok: tiktokLogo,
                      linkedin: linkedinLogo,
                    };
                    const labels: Record<Platform, string> = {
                      facebook: 'Facebook',
                      instagram: 'Instagram',
                      tiktok: 'TikTok',
                      linkedin: 'LinkedIn',
                    };
                    return (
                      <div
                        key={p}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-foreground/10 hover:border-primary/40'
                        }`}
                      >
                        <div
                          onClick={() => setPublishPlatforms(prev => ({ ...prev, [p]: !prev[p] }))}
                          className="flex flex-col items-center gap-2 cursor-pointer w-full"
                        >
                          <img src={logos[p]} alt={labels[p]} className="w-10 h-10 rounded-lg object-contain" />
                          <span className="text-xs font-semibold text-foreground">{labels[p]}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handlePublishSinglePlatform(p); }}
                          disabled={publishing}
                          className="w-full mt-1 gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn h-8 text-xs font-bold"
                        >
                          {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Rocket className="w-3 h-3 mr-1" /> Publier</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={handleLaunchPublication}
                  disabled={publishing || !Object.values(publishPlatforms).some(Boolean)}
                  className="w-full mt-3 gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn py-4 font-bold"
                >
                  {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                  Lancer la publication
                </Button>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <p className="text-destructive font-medium mb-3">Erreur lors de la génération</p>
            <p className="text-sm text-muted-foreground mb-4">Aucun crédit n'a été déduit.</p>
            <Button onClick={handleGenerate} className="gradient-bg border-0 text-primary-foreground">
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </Button>
          </div>
        )}
      </StepContainer>

      {/* New project button - only after generation is done */}
      {status === 'done' && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleNewProject}
            variant="outline"
            className="border-foreground/10 text-foreground hover:border-secondary px-8 py-5 text-base font-semibold"
          >
            <FilePlus className="w-5 h-5 mr-2" /> Nouveau projet
          </Button>
        </div>
      )}

      {/* New project confirmation dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="bg-card border-foreground/10">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-secondary" />
              Attention
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Vous allez perdre les informations de ce projet si elles ne sont pas sauvegardées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button variant="outline" onClick={handleSave} className="border-foreground/10 text-foreground hover:border-secondary">
              <Save className="w-4 h-4 mr-2" /> Sauvegarder
            </Button>
            <Button onClick={confirmNewProject} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
              OK j'ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Published success popup */}
      <Dialog open={showPublishedPopup} onOpenChange={setShowPublishedPopup}>
        <DialogContent className="bg-card border-foreground/10 max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-foreground text-center">
              ✅ Publication envoyée !
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center">
              Votre contenu a été envoyé pour publication sur les plateformes sélectionnées.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              setShowPublishedPopup(false);
              confirmNewProject();
            }}
            className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn py-5 font-bold"
          >
            <FilePlus className="w-4 h-4 mr-2" /> Créer un nouveau contenu
          </Button>
        </DialogContent>
      </Dialog>

      {/* Saved popup */}
      <Dialog open={showSavedPopup} onOpenChange={setShowSavedPopup}>
        <DialogContent className="bg-card border-foreground/10 max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-foreground text-center">
              💾 Votre contenu est sauvegardé !
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center">
              Vous pouvez le retrouver dans le dossier <strong>Mes générations</strong> présent dans le tableau de bord.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              setShowSavedPopup(false);
              navigate('/my-generations');
            }}
            variant="outline"
            className="w-full border-foreground/10 text-foreground hover:border-secondary rounded-btn py-4"
          >
            Voir mes générations
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerationStep;
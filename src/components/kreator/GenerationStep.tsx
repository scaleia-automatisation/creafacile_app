import { useState, useRef, useEffect } from 'react';
import facebookLogo from '@/assets/facebook-logo.png';
import instagramLogo from '@/assets/instagram-logo.png';
import tiktokLogo from '@/assets/tiktok-logo.png';
import linkedinLogo from '@/assets/linkedin-logo.png';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Save, RefreshCw, Copy, Loader2, Share2, Mail, MessageCircle, Send, AlertTriangle, FilePlus, XCircle, X, Rocket, Clock, Eye, EyeOff } from 'lucide-react';
import StepContainer from './StepContainer';
import { generateImage, generateVideo, generateCaption, generatePrompt, verifyGeneratedImage, type PlatformCaptions } from '@/lib/kreator-ai';
import type { Json } from '@/integrations/supabase/types';
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

const loadCanvasImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const toDrawableImageSrc = async (src: string) => {
  if (src.startsWith('data:')) return src;
  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) return src;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
};

const logoPositionLabel = (position?: string) => ({
  'bottom-right': 'en bas à droite',
  'bottom-left': 'en bas à gauche',
  'top-left': 'en haut à gauche',
  'top-right': 'en haut à droite',
  'top-center': 'en haut au centre',
  'middle-left': 'au milieu à gauche',
  'middle-right': 'au milieu à droite',
  'bottom-center': 'en bas au centre',
}[position || 'bottom-center'] || 'en bas au centre');

const xmlEscape = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const composeImageWithExactLogo = async (imageUrl: string, logoUrl: string, position: string, format: string) => {
  if (!imageUrl || !logoUrl) return imageUrl;
  try {
    const [baseSrc, logoSrc] = await Promise.all([toDrawableImageSrc(imageUrl), toDrawableImageSrc(logoUrl)]);
    const [base, logo] = await Promise.all([loadCanvasImage(baseSrc), loadCanvasImage(logoSrc)]);
    const width = base.naturalWidth || base.width;
    const height = base.naturalHeight || base.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(base, 0, 0, width, height);

    const minDim = Math.min(width, height);
    const margin = minDim * (format === '9:16' ? 0.06 : format === '16:9' ? 0.045 : 0.055);
    const maxLogoHeight = minDim * (format === '16:9' ? 0.055 : 0.07);
    const maxLogoWidth = width * (format === '9:16' ? 0.2 : 0.16);
    const logoNaturalWidth = logo.naturalWidth || logo.width;
    const logoNaturalHeight = logo.naturalHeight || logo.height;
    const scale = Math.min(maxLogoWidth / logoNaturalWidth, maxLogoHeight / logoNaturalHeight);
    const logoW = logoNaturalWidth * scale;
    const logoH = logoNaturalHeight * scale;

    const x = position?.includes('right')
      ? width - margin - logoW
      : position?.includes('left')
      ? margin
      : (width - logoW) / 2;
    const y = position?.includes('top')
      ? margin
      : position?.includes('middle')
      ? (height - logoH) / 2
      : height - margin - logoH;

    ctx.drawImage(logo, x, y, logoW, logoH);
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('[logo overlay] impossible de composer le logo exact:', error);
    try {
      const [base, logo] = await Promise.all([loadCanvasImage(imageUrl), loadCanvasImage(logoUrl)]);
      const width = base.naturalWidth || base.width || 1024;
      const height = base.naturalHeight || base.height || 1024;
      const minDim = Math.min(width, height);
      const margin = minDim * (format === '9:16' ? 0.06 : format === '16:9' ? 0.045 : 0.055);
      const logoNaturalWidth = logo.naturalWidth || logo.width || 256;
      const logoNaturalHeight = logo.naturalHeight || logo.height || 256;
      const scale = Math.min((width * (format === '9:16' ? 0.2 : 0.16)) / logoNaturalWidth, (minDim * (format === '16:9' ? 0.055 : 0.07)) / logoNaturalHeight);
      const logoW = logoNaturalWidth * scale;
      const logoH = logoNaturalHeight * scale;
      const x = position?.includes('right') ? width - margin - logoW : position?.includes('left') ? margin : (width - logoW) / 2;
      const y = position?.includes('top') ? margin : position?.includes('middle') ? (height - logoH) / 2 : height - margin - logoH;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${xmlEscape(imageUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/><image href="${xmlEscape(logoUrl)}" x="${x}" y="${y}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      return imageUrl;
    }
  }
};

const GenerationStep = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const {
    type, prompt_en, prompt_fr, setPromptFr, status, setStatus, result_url, setResultUrl,
    ai_model, format, setCreditsUsed, objective, marketing_angle, offer_nature, input_text, idea_chosen,
    company_sector, company_activity, input_photos, resetProject,
    model_settings, sora_character_scenes,
    offer_type, product_service, product_description, target_persona, market, use_case,
    options, slides_count, visual_style_brief, render_style, video_render_style,
    input_image_description, simple_images, starting_choice,
    voice_over_enabled, voice_over_text, voice_over_language, user_mode,
    generated_captions, setGeneratedCaptions,
    generated_carousel_slides, setGeneratedCarouselSlides,
  } = useKreatorStore();
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [captions, setCaptions] = useState<PlatformCaptions | null>(generated_captions);
  const [carouselSlides, setCarouselSlides] = useState<Array<{ url: string; captions: PlatformCaptions }> | null>(generated_carousel_slides);
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
  const [showPrompt, setShowPrompt] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buttonLabel = type === 'image' ? 'Générer le contenu' : type === 'carousel' ? 'Générer le carrousel' : 'Générer la vidéo';
  const creditsNeeded = type === 'image' ? 1 : type === 'carousel' ? (useKreatorStore.getState().slides_count) : 3;

  const currentCaption = captions ? captions[selectedPlatform] : null;

  useEffect(() => {
    if (status !== 'done') return;
    if (generated_captions) setCaptions(generated_captions);
    if (generated_carousel_slides) setCarouselSlides(generated_carousel_slides);
  }, [status, generated_captions, generated_carousel_slides]);

  // Validation des champs requis (identique à PromptStep)
  const isProduct = offer_type === '📦 Produit';
  const isBeginner = user_mode === 'beginner';
  const missingFields: string[] = [];
  if (!offer_type?.trim()) missingFields.push("Type d'offre");
  if (!product_service?.trim()) missingFields.push("Nom de l'offre");
  if (isProduct && type !== 'video') {
    const hasProductImg = !!useKreatorStore.getState().product_image_url?.trim();
    const hasInputPhoto = (input_photos || []).some((p) => p?.url);
    if (!hasProductImg && !hasInputPhoto) missingFields.push('Image du produit');
  }
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
    marketingAngle: marketing_angle + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
    useCase: use_case,
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
    imageDescription: (() => {
      const base = getImageSynthesis();
      const isVeo = ai_model === 'veo-3' || ai_model === 'veo-3.1';
      const veoDesc = (model_settings?.veo_reference_description || '').trim();
      const veoHasImg =
        !!model_settings?.veo_start_image_url ||
        !!model_settings?.veo_end_image_url ||
        (Array.isArray(model_settings?.veo_reference_image_urls) && model_settings!.veo_reference_image_urls!.filter(Boolean).length > 0);
      if (isVeo && veoHasImg && veoDesc) {
        const veoBlock = `Description fidèle de l'image de référence fournie pour Veo (à reproduire À L'IDENTIQUE dans la vidéo, sans aucune variation ni substitution) : ${veoDesc}`;
        return base ? `${base}\n${veoBlock}` : veoBlock;
      }
      return base;
    })(),
    referenceImageCount: (() => {
      const base =
        starting_choice === 'simple'
          ? (simple_images || []).filter(p => p?.url).length
          : input_photos.filter(p => p.url).length;
      const isVeo = ai_model === 'veo-3' || ai_model === 'veo-3.1';
      if (!isVeo) return base;
      const veoImgs =
        (model_settings?.veo_start_image_url ? 1 : 0) +
        (model_settings?.veo_end_image_url ? 1 : 0) +
        (Array.isArray(model_settings?.veo_reference_image_urls) ? model_settings!.veo_reference_image_urls!.filter(Boolean).length : 0);
      return base + veoImgs;
    })(),
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
    voiceOverLanguage:
      type === 'video' && voice_over_enabled && supportsVoiceOver(ai_model) && voice_over_text.trim()
        ? (voice_over_language || 'Français')
        : undefined,
    videoDurationSec: type === 'video' ? getVideoDurationSec(ai_model, model_settings) : undefined,
  });

  const withSelectedFormatInstruction = (prompt: string) => `${prompt.trim()}

CONTRAINTE FORMAT ABSOLUE — issue du champ Format utilisateur : produire le contenu final STRICTEMENT en ${format}. Ce ratio ${format} est prioritaire sur toute autre indication du prompt. Adapter cadrage, composition et marges de sécurité à ce format, sans couper les éléments essentiels.`;

  const withExactVideoDurationInstruction = (prompt: string) => {
    if (type !== 'video') return prompt;
    const duration = getVideoDurationSec(ai_model, model_settings);
    const planCount = duration <= 4 ? 2 : duration <= 6 ? 3 : 4;
    return `${prompt.trim()}

CONTRAINTE DURÉE VIDÉO ABSOLUE — produire une vidéo de ${duration}s EXACTEMENT. Le script/storyboard utilisé pour générer le contenu DOIT contenir EXACTEMENT ${planCount} plans minutés, avec début, fin et durée de chaque plan. La somme des durées des plans doit être mathématiquement ÉGALE à ${duration}s, sans dépassement, sans manque, sans durée approximative. Aucun plan ni texte/voix/logo ne doit sortir de cette durée totale.`;
  };

  const withLogoOverlayInstruction = (prompt: string) => {
    if (!options.logo_enabled || !options.logo_url || type === 'video') return prompt;
    return `${prompt.trim()}

CONTRAINTE LOGO ABSOLUE — le modèle IA NE DOIT PAS dessiner, inventer, recréer, styliser, écrire ou intégrer lui-même un logo, un monogramme, une icône de marque ou un lettrage de marque. Il doit seulement réserver un petit espace propre et vide ${logoPositionLabel(options.logo_position)}, avec marges de sécurité, car le vrai logo PNG importé par l'utilisateur sera appliqué APRÈS génération en surimpression exacte. Aucun autre logo ne doit apparaître dans l'image.`;
  };

  const handleGenerate = async (opts?: { forcePromptRegen?: boolean }) => {
    if (!user) {
      toast.error('Connectez-vous pour générer du contenu');
      return;
    }
    if (missingFields.length > 0) {
      toast.error(`Champs requis manquants : ${missingFields.join(' et ')}`);
      return;
    }

    // (no image-edit-only models currently require a reference image)

    const hadResultBeforeGeneration = Boolean(useKreatorStore.getState().result_url);
    setGenerating(true);
    setStatus('generating');
    setProgress(0);
    setElapsedSeconds(0);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    // Helpers d'annulation : interrompent immédiatement le flux dès que
    // l'utilisateur clique sur "Annuler", même pour les appels qui ne
    // supportent pas nativement AbortSignal (generatePrompt, generateCaption,
    // composeImageWithExactLogo, verifyGeneratedImage, supabase rpc/insert).
    const checkAbort = () => {
      if (abortController.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
    };
    const raceAbort = <T,>(p: Promise<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        if (abortController.signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const onAbort = () => {
          abortController.signal.removeEventListener('abort', onAbort);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        abortController.signal.addEventListener('abort', onAbort);
        p.then(
          (v) => { abortController.signal.removeEventListener('abort', onAbort); resolve(v); },
          (e) => { abortController.signal.removeEventListener('abort', onAbort); reject(e); },
        );
      });
    };

    const isVideo = type === 'video';
    const progressInterval = !isVideo ? setInterval(() => {
      setProgress((p) => (p >= 95 ? p : p + Math.random() * 8));
    }, 500) : null;

    try {
      // 1) Génération silencieuse du prompt si pas déjà présent OU si on force la régénération
      // (régénération = on reprend en compte tous les nouveaux inputs : modèle, format, type, etc.)
      let activePrompt = prompt_fr;
      if (opts?.forcePromptRegen || !activePrompt || activePrompt.trim().length === 0) {
        const promptResult = await raceAbort(generatePrompt(buildPromptParams()));
        activePrompt = promptResult.prompt_fr || '';
        setPromptFr(activePrompt);
      }
      checkAbort();
      if (!activePrompt || activePrompt.trim().length === 0) {
        throw new Error('Prompt vide après génération');
      }
      const generationPrompt = withExactVideoDurationInstruction(withLogoOverlayInstruction(withSelectedFormatInstruction(activePrompt)));

      // === CAROUSEL: N images (one per slide) + N captions ===
      if (type === 'carousel') {
        const n = Math.max(1, Math.min(4, slides_count || 1));
        const slideTexts = options.slide_texts || [];
        const chosenIdeaHook = (idea_chosen || '').split(' — ')[0].trim();
        const baseCaptionParams = {
          objective: (marketing_angle || objective) + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
          contentType: 'image' as const,
          sector: company_sector,
          activity: company_activity,
          aiModel: ai_model,
          format,
          slidesCount: 1,
          offerType: offer_type,
          offerName: product_service,
          offerDescription: product_description,
          persona: target_persona,
          market,
          marketingAngle: marketing_angle + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
          ton: options.ton,
          visualStyle: visual_style_brief || options.visual_style || render_style || video_render_style,
          freeDescription: input_text,
          promptValide: generationPrompt,
          ideaHook: chosenIdeaHook,
          useCase: use_case,
          advancedSettings: [
            options.palette_enabled ? `palette: ${options.palette_hex.join(', ')}` : '',
            options.logo_enabled ? `logo: ${options.logo_position}` : '',
            options.show_text ? `texte overlay slides` : '',
          ].filter(Boolean).join(' | '),
          productAnalysis: input_image_description,
        };

        const slideResults = await raceAbort(Promise.all(
          Array.from({ length: n }).map(async (_, i) => {
            const slideText = (slideTexts[i] || '').trim();
            const perSlidePrompt = `${generationPrompt}

🎯 GÉNÈRE EXCLUSIVEMENT LA SLIDE ${i + 1} sur ${n} du carrousel.
Texte affiché EXACTEMENT (mot pour mot, sans modification, sans ajout, sans traduction): "${slideText}".
Ne pas inclure le texte des autres slides.

⚠️ COHÉRENCE VISUELLE ABSOLUE entre TOUTES les slides du carrousel (slide 1 à ${n}) — règles NON négociables, identiques pour chaque slide :
- TYPOGRAPHIE STRICTEMENT IDENTIQUE sur toutes les slides : même police (font family), même graisse (weight), même style (italic/regular), même casse, même interlignage, même tracking, même couleur de texte, même contour/ombre éventuels.
- TAILLE DE TEXTE STRICTEMENT IDENTIQUE en proportion du cadre sur toutes les slides (mêmes pixels relatifs). Le texte de cette slide doit occuper la MÊME surface visuelle relative que celui des autres slides — ne jamais agrandir ni réduire selon la longueur du texte.
- POSITION DU TEXTE identique sur toutes les slides (même zone, même alignement, mêmes marges).
- BACKGROUND STRICTEMENT IDENTIQUE sur toutes les slides : même couleur/dégradé/texture/scène de fond, même luminosité, même traitement, même composition générale. Ne pas changer le décor entre les slides.
- Même palette, même ambiance, même style graphique, même traitement photo, même éclairage, même grain.
Cette slide doit être visuellement interchangeable avec les autres du carrousel à l'exception du contenu textuel "${slideText}".`;
            const [url, caps] = await Promise.all([
              generateImage(perSlidePrompt, ai_model, format, input_photos?.[0]?.url, abortController.signal, ''),
              generateCaption({
                ...baseCaptionParams,
                idea: slideText || idea_chosen || input_text,
                text1: slideText,
                slideTexts: [slideText],
              }),
            ]);
            checkAbort();
            const finalUrl = options.logo_enabled && options.logo_url
              ? await composeImageWithExactLogo(url, options.logo_url, options.logo_position, format)
              : url;
            return { url: finalUrl, captions: caps };
          }),
        ));
        checkAbort();

        if (progressInterval) clearInterval(progressInterval);
        setProgress(100);

        const { data: deducted } = await raceAbort(Promise.resolve(supabase.rpc('deduct_credits', {
          p_user_id: user.id,
          p_amount: creditsNeeded,
          p_action: `generate_${type}`,
        })));
        checkAbort();
        if (!deducted) {
          toast.error('Crédits insuffisants');
          setStatus(hadResultBeforeGeneration ? 'done' : 'idle');
          setGenerating(false);
          return;
        }

        // Insert one generation row per slide for traceability
        await supabase.from('generations').insert(
          slideResults.map((s, i) => ({
            user_id: user.id,
            type,
            ai_model,
            format,
            prompt_en_final: activePrompt,
            prompt_fr_final: activePrompt,
            result_url: s.url,
            credits_used: i === 0 ? creditsNeeded : 0,
            status: 'done' as const,
            captions: (s.captions ?? null) as unknown as Json,
          })),
        );

        setCarouselSlides(slideResults);
        setGeneratedCarouselSlides(slideResults);
        setResultUrl(slideResults[0].url);
        setCreditsUsed(creditsNeeded);
        setCaptions(slideResults[0].captions);
        setGeneratedCaptions(slideResults[0].captions);
        setStatus('done');
        await refreshProfile();
        return;
      }

      const [contentUrl, captionResult] = await raceAbort(Promise.all([
        isVideo
          ? generateVideo(generationPrompt, ai_model, format, (pct) => setProgress(pct), abortController.signal, model_settings, sora_character_scenes)
          : generateImage(generationPrompt, ai_model, format, input_photos?.[0]?.url, abortController.signal, ''),
        generateCaption({
          objective: (marketing_angle || objective) + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
          idea: idea_chosen || input_text,
          ideaHook: (idea_chosen || '').split(' — ')[0].trim(),
          useCase: use_case,
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
          marketingAngle: marketing_angle + (offer_nature ? ` — Nature de l'offre : ${offer_nature}` : ''),
          ton: options.ton,
          visualStyle: visual_style_brief || options.visual_style || render_style || video_render_style,
          freeDescription: input_text,
          promptValide: generationPrompt,
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
      ]));
      checkAbort();

      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);

      // === AUTO-VÉRIFICATION VISUELLE (image uniquement, une seule régénération max) ===
      let finalContentUrl = !isVideo && options.logo_enabled && options.logo_url
        ? await raceAbort(composeImageWithExactLogo(contentUrl, options.logo_url, options.logo_position, format))
        : contentUrl;
      checkAbort();
      let finalActivePrompt = activePrompt;
      if (!isVideo && finalContentUrl && !abortController.signal.aborted) {
        try {
          const verdict = await raceAbort(verifyGeneratedImage({
            imageUrl: finalContentUrl,
            promptFr: activePrompt,
            format,
            hasText: !!options.show_text,
            textContent: options.text_content,
            textPosition: options.text_position,
            hasLogo: !!options.logo_enabled,
            logoPosition: options.logo_position,
          }));
          checkAbort();
          if (!verdict.ok && verdict.improved_prompt_fr && !abortController.signal.aborted) {
            console.warn('[verify] image non conforme, régénération:', verdict.issues);
            toast.message('Optimisation visuelle automatique en cours…', {
              description: verdict.issues.slice(0, 2).join(' • '),
            });
            const improved = verdict.improved_prompt_fr;
            setPromptFr(improved);
            const improvedGenerationPrompt = withExactVideoDurationInstruction(withLogoOverlayInstruction(withSelectedFormatInstruction(improved)));
            const retryUrl = await generateImage(
              improvedGenerationPrompt,
              ai_model,
              format,
              input_photos?.[0]?.url,
              abortController.signal,
              '',
            );
            checkAbort();
            if (retryUrl) {
              finalContentUrl = options.logo_enabled && options.logo_url
                ? await raceAbort(composeImageWithExactLogo(retryUrl, options.logo_url, options.logo_position, format))
                : retryUrl;
              finalActivePrompt = improved;
            }
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') throw e;
          console.warn('[verify] échec auto-vérification (non bloquant):', e);
        }
      }
      checkAbort();

      const { data: deducted } = await raceAbort(Promise.resolve(supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: creditsNeeded,
        p_action: `generate_${type}`,
      })));
      checkAbort();

      if (!deducted) {
        toast.error('Crédits insuffisants');
        setStatus(hadResultBeforeGeneration ? 'done' : 'idle');
        setGenerating(false);
        return;
      }

      await supabase.from('generations').insert([{
        user_id: user.id,
        type,
        ai_model,
        format,
        prompt_en_final: finalActivePrompt,
        prompt_fr_final: finalActivePrompt,
        result_url: finalContentUrl,
        credits_used: creditsNeeded,
        status: 'done',
        captions: (captionResult ?? null) as unknown as Json,
      }]);

      setResultUrl(finalContentUrl);
      setCreditsUsed(creditsNeeded);
      setCaptions(captionResult);
      setGeneratedCaptions(captionResult);
      setGeneratedCarouselSlides(null);
      setStatus('done');
      await refreshProfile();
    } catch (err: unknown) {
      if (progressInterval) clearInterval(progressInterval);
      if (err instanceof DOMException && err.name === 'AbortError' || err instanceof Error && err.message === 'Generation cancelled') {
        toast.info('Génération annulée');
        setStatus(hadResultBeforeGeneration ? 'done' : 'idle');
      } else {
        console.error(err);
        const message = err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de la génération. Aucun crédit déduit.';
        toast.error(message, { description: 'Aucun crédit déduit.' });
        setStatus(hadResultBeforeGeneration ? 'done' : 'error');
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
  };

  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;
  const buildPromptParamsRef = useRef(buildPromptParams);
  buildPromptParamsRef.current = buildPromptParams;
  useEffect(() => {
    const onTrigger = (e: Event) => {
      // Par défaut on régénère le prompt maître pour reprendre tous les
      // inputs à jour. Mais si l'utilisateur a explicitement généré (et
      // potentiellement édité) le prompt via le bouton « Générer le prompt »,
      // on respecte ce prompt et on l'envoie tel quel au modèle.
      const detail = (e as CustomEvent).detail || {};
      const force = detail.forcePromptRegen !== false;
      handleGenerateRef.current({ forcePromptRegen: force });
    };
    const onGeneratePromptOnly = async () => {
      try {
        setPromptFr('');
        const target = document.getElementById('generation-step-block');
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const res = await generatePrompt(buildPromptParamsRef.current());
        const p = res?.prompt_fr || '';
        setPromptFr(p);
        if (p) toast.success('Prompt généré — modifiable ci-dessous');
      } catch (err) {
        console.error(err);
        toast.error('Erreur lors de la génération du prompt');
      }
    };
    window.addEventListener('kreator:generate', onTrigger);
    window.addEventListener('kreator:generate-prompt', onGeneratePromptOnly);
    return () => {
      window.removeEventListener('kreator:generate', onTrigger);
      window.removeEventListener('kreator:generate-prompt', onGeneratePromptOnly);
    };
  }, [setGeneratedCaptions, setGeneratedCarouselSlides, setResultUrl]);

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
    // Reprendre TOUS les nouveaux inputs (modèle IA, format, type de contenu, réglages, etc.)
    // en forçant la régénération du prompt depuis les valeurs courantes du store.
    handleGenerate({ forcePromptRegen: true });
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
    setCarouselSlides(null);
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
    const nextCaptions = {
      ...captions,
      [selectedPlatform]: {
        ...captions[selectedPlatform],
        [field]: value,
      },
    };
    setCaptions(nextCaptions);
    setGeneratedCaptions(nextCaptions);
  };

  const updateSlideCaption = (slideIndex: number, field: string, value: string) => {
    if (!carouselSlides) return;
    const next = carouselSlides.map((s, i) => {
      if (i !== slideIndex) return s;
      return {
        ...s,
        captions: {
          ...s.captions,
          [selectedPlatform]: {
            ...s.captions[selectedPlatform],
            [field]: value,
          },
        },
      };
    });
    setCarouselSlides(next);
    setGeneratedCarouselSlides(next);
    if (slideIndex === 0) {
      setCaptions(next[0].captions);
      setGeneratedCaptions(next[0].captions);
    }
  };

  return (
    <>
      <StepContainer stepNumber={5} title="Génération">
        <div id="generation-step-block" />
        {status === 'idle' && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Choisissez une idée ci-dessus et cliquez sur « Générer le contenu » pour lancer la génération.
          </p>
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
            {/* Result preview — carousel shows N rows (slide + caption) below */}
            {!(type === 'carousel' && carouselSlides && carouselSlides.length > 0) && (
              <div className="rounded-card overflow-hidden bg-card border border-foreground/10">
                {type === 'video' ? (
                  <video
                    src={result_url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full rounded-card"
                    style={{ maxHeight: '70vh' }}
                    ref={(el) => {
                      if (el) {
                        el.muted = true;
                        const p = el.play();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                      }
                    }}
                  />
                ) : (
                  <img src={result_url} alt="Résultat" className="w-full object-cover" />
                )}
              </div>
            )}

            {/* 4 action buttons in one row */}
            <div className="grid grid-cols-5 gap-2">
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
                onClick={() => setShowPrompt(s => !s)}
              >
                {showPrompt ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                {showPrompt ? 'Masquer prompt' : 'Voir le prompt'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 text-foreground hover:border-secondary text-xs px-2"
                onClick={handleRegenerate}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Régénérer
              </Button>
            </div>

            {showPrompt && (
              <div className="bg-card rounded-card p-4 md:p-5 border border-foreground/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Prompt utilisé (modifiable)</label>
                  <span className="text-xs text-muted-foreground">{prompt_fr.length} car.</span>
                </div>
                <Textarea
                  value={prompt_fr}
                  onChange={(e) => setPromptFr(e.target.value)}
                  className="bg-background border-foreground/10 text-foreground text-sm resize-none whitespace-pre-wrap leading-6 font-mono"
                  style={{
                    minHeight: `${Math.max(
                      160,
                      (Math.ceil(prompt_fr.length / 70) + (prompt_fr.match(/\n/g)?.length || 0) + 1) * 24
                    )}px`,
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(prompt_fr); toast.success('Prompt copié'); }}>
                    <Copy className="w-3 h-3 mr-1" /> Copier
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">Les modifications seront utilisées lors du prochain « Régénérer ».</p>
                </div>
              </div>
            )}

            {/* Carousel: N rows of [slide image | caption] */}
            {type === 'carousel' && carouselSlides && carouselSlides.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Carrousel — {carouselSlides.length} slides
                  </h3>
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
                </div>
                {carouselSlides.map((slide, idx) => {
                  const cap = slide.captions[selectedPlatform];
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card rounded-card border border-foreground/10 p-4"
                    >
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Slide {idx + 1}
                        </div>
                        <div className="rounded-card overflow-hidden bg-background border border-foreground/10">
                          <img src={slide.url} alt={`Slide ${idx + 1}`} className="w-full object-cover" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-foreground/10 text-foreground hover:border-secondary text-xs"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = slide.url;
                              a.download = `kreator-carousel-slide-${idx + 1}.png`;
                              a.click();
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Slide {idx + 1}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Caption — Slide {idx + 1}
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">Hook</label>
                          <Textarea
                            value={cap.hook}
                            onChange={(e) => updateSlideCaption(idx, 'hook', e.target.value)}
                            className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                            rows={1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">Description</label>
                          <Textarea
                            value={cap.description}
                            onChange={(e) => updateSlideCaption(idx, 'description', e.target.value)}
                            className="bg-background border-foreground/10 text-foreground text-sm min-h-[60px] resize-none"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">Appel à l'action</label>
                          <Textarea
                            value={cap.cta}
                            onChange={(e) => updateSlideCaption(idx, 'cta', e.target.value)}
                            className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                            rows={1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1 block">Hashtags</label>
                          <Textarea
                            value={cap.hashtags}
                            onChange={(e) => updateSlideCaption(idx, 'hashtags', e.target.value)}
                            className="bg-background border-foreground/10 text-foreground text-sm min-h-[40px] resize-none"
                            rows={1}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const text = `${cap.hook}\n${cap.description}\n${cap.cta}\n\n${cap.hashtags}`;
                            navigator.clipboard.writeText(text);
                            toast.success(`Caption slide ${idx + 1} copié !`);
                          }}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copier
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Caption section with platform dropdown (image / video only) */}
            {!(type === 'carousel' && carouselSlides && carouselSlides.length > 0) && (
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
            )}

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

            {/* New content button */}
            <div className="pt-4 border-t border-foreground/10">
              <Button
                onClick={handleNewProject}
                variant="outline"
                className="w-full border-foreground/10 text-foreground hover:border-secondary rounded-btn py-5 text-sm font-bold"
              >
                <FilePlus className="w-4 h-4 mr-2" /> Créer un nouveau contenu
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <p className="text-destructive font-medium mb-3">Erreur lors de la génération</p>
            <p className="text-sm text-muted-foreground mb-4">Aucun crédit n'a été déduit.</p>
            <Button onClick={() => handleGenerate({ forcePromptRegen: true })} className="gradient-bg border-0 text-primary-foreground">
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </Button>
          </div>
        )}
      </StepContainer>

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
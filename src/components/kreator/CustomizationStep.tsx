import { useRef, useState } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import StepContainer from './StepContainer';
import { Upload, X, Loader2, Mic, Sparkles, RefreshCw } from 'lucide-react';
import { useStorageUpload } from '@/hooks/useStorageUpload';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { supportsVoiceOver, getVideoDurationSec } from '@/lib/voice-over';
import { generateVoiceOver, generateOnScreenText } from '@/lib/kreator-ai';

const tons = [
  'Direct / Cash',
  'Provocateur',
  'Authentique',
  'Storytelling',
  'Humoristique',
  'Éducatif',
  'Inspirant',
  'Urgent',
  'Amical',
];

const styles = ['Luxe', 'Moderne', 'Impact', 'Lifestyle'];

const CLASSIC_FONTS = [
  'Playfair Display', 'Merriweather', 'Lora', 'Libre Baskerville', 'EB Garamond',
  'Georgia', 'Times New Roman', 'Crimson Text', 'Cormorant Garamond', 'Palatino',
];
const DESIGN_FONTS = [
  'Montserrat', 'Raleway', 'Bebas Neue', 'Oswald', 'Poppins',
  'Nunito', 'DM Sans', 'Space Grotesk', 'Syne', 'Outfit',
];
const ALL_FONTS = [...CLASSIC_FONTS, ...DESIGN_FONTS];

const TEXT_POSITIONS: { value: 'top-center' | 'middle-center' | 'bottom-center'; label: string }[] = [
  { value: 'top-center', label: 'Centré en haut' },
  { value: 'middle-center', label: 'Centré au centre' },
  { value: 'bottom-center', label: 'Centré en bas' },
];

// Video text colors palette
const TEXT_COLORS: { name: string; hex: string }[] = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Rouge', hex: '#E11D2E' },
  { name: 'Rouge foncé', hex: '#7F1D1D' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Jaune', hex: '#FACC15' },
  { name: 'Vert', hex: '#22C55E' },
  { name: 'Vert foncé', hex: '#14532D' },
  { name: 'Bleu', hex: '#2563EB' },
  { name: 'Bleu nuit', hex: '#0B1E4A' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Or', hex: '#D4AF37' },
  { name: 'Argent', hex: '#C0C0C0' },
  { name: 'Turquoise', hex: '#14B8A6' },
];

const normalizeHex = (v: string): string | null => {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toUpperCase();
  if (/^#([0-9a-fA-F]{3})$/.test(s)) {
    const r = s[1], g = s[2], b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
};

const CustomizationStep = () => {
  const {
    type, user_mode, showAdvanced, setShowAdvanced, options, setOptions,
    ai_model, model_settings,
    voice_over_enabled, setVoiceOverEnabled,
    voice_over_text, setVoiceOverText,
    offer_type, product_service, product_description,
    marketing_angle, objective,
    idea_chosen, input_text, format,
    company_activity, company_sector, target_persona,
    render_style, video_render_style,
  } = useKreatorStore();
  const isVideo = type === 'video';
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useStorageUpload();
  const [hexInput, setHexInput] = useState('');
  const [hexInput2, setHexInput2] = useState('');
  const [voGenerating, setVoGenerating] = useState(false);
  const [text1Generating, setText1Generating] = useState(false);
  const [text2Generating, setText2Generating] = useState(false);

  const videoDurationSec = isVideo ? getVideoDurationSec(ai_model, model_settings) : 8;
  const voMaxSec = Math.max(1, videoDurationSec - 2);
  const voMaxChars = Math.max(20, voMaxSec * 18);
  const voModelSupports = isVideo && !!ai_model && supportsVoiceOver(ai_model);

  const handleGenerateVoiceOver = async () => {
    if (!voModelSupports) {
      toast.error("Ce modèle vidéo ne prend pas en charge la voix off.");
      return;
    }
    if (!product_service?.trim() || !marketing_angle?.trim()) {
      toast.error("Renseignez le nom de l'offre et l'angle marketing avant de générer la voix off.");
      return;
    }
    setVoGenerating(true);
    try {
      const text = await generateVoiceOver({
        offerType: offer_type,
        productName: product_service,
        productDescription: product_description,
        objective,
        marketingAngle: marketing_angle,
        videoDurationSec,
      });
      setVoiceOverText(text.slice(0, voMaxChars));
      toast.success('Voix off générée');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération de la voix off');
    } finally {
      setVoGenerating(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    const url = await upload(file, 'image');
    if (url) {
      setOptions({ logo_url: url });
      toast.success('Logo importé');
    }
  };

  const handleHexChange = (v: string) => {
    setHexInput(v);
    const norm = normalizeHex(v);
    if (norm) setOptions({ text_color: norm });
  };

  const handleHexChange2 = (v: string) => {
    setHexInput2(v);
    const norm = normalizeHex(v);
    if (norm) setOptions({ text_color_2: norm });
  };

  const buildTextParams = (variant: 1 | 2) => ({
    contentType: type,
    format,
    idea: idea_chosen || input_text,
    objective,
    marketingAngle: marketing_angle,
    productName: product_service,
    productDescription: product_description,
    offerType: offer_type,
    visualStyle: isVideo ? video_render_style : render_style,
    tone: options.ton,
    activity: company_activity,
    sector: company_sector,
    persona: target_persona,
    variant,
    excludeText: variant === 2 ? options.text_content : undefined,
    maxWords: 5,
  });

  const activeVisualStyle = isVideo ? video_render_style : render_style;
  const missingForText: string[] = [];
  if (!objective?.trim()) missingForText.push("l'objectif du contenu");
  if (!activeVisualStyle?.trim()) missingForText.push('le style visuel');
  if (!options.ton?.trim()) missingForText.push("le ton d'écriture");
  const canGenerateText = missingForText.length === 0;
  const missingTextTooltip = canGenerateText
    ? ''
    : `Renseignez ${missingForText.join(', ')} pour générer le texte.`;

  const handleGenerateText = async (variant: 1 | 2) => {
    if (!canGenerateText) {
      toast.error(missingTextTooltip);
      return;
    }
    const setLoading = variant === 1 ? setText1Generating : setText2Generating;
    setLoading(true);
    try {
      const text = await generateOnScreenText(buildTextParams(variant));
      if (text) {
        if (variant === 1) setOptions({ text_content: text.slice(0, 50) });
        else setOptions({ text_content_2: text.slice(0, 50) });
      }
    } catch (e) {
      console.error(`Generate on-screen text ${variant} failed`, e);
      toast.error('Erreur lors de la génération du texte');
    } finally {
      setLoading(false);
    }
  };

  const isVisible = user_mode === 'expert' || showAdvanced;

  if (user_mode === 'beginner' && !showAdvanced) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
          />
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            ⚙️ RÉGLAGES AVANCÉS
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {user_mode === 'beginner' && (
        <div className="flex flex-col items-center gap-3 py-4 mb-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              ⚙️ RÉGLAGES AVANCÉS
            </span>
          </div>
        </div>
      )}
      {isVisible && (
        <StepContainer stepNumber={4} title="Personnalisation">
          <Accordion type="multiple" className="space-y-2">
            {/* Logo (image, carousel & vidéo) */}
            <AccordionItem value="logo" className="border-foreground/10">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  Ajouter un logo
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Désactivé</span>
                    <Switch
                      checked={options.logo_enabled}
                      onCheckedChange={(v) => setOptions({ logo_enabled: v })}
                    />
                    <span className="text-xs text-muted-foreground">Activé</span>
                  </div>
                  {options.logo_enabled && (
                    <>
                      <div className="flex items-center gap-3">
                        {options.logo_url ? (
                          <div className="relative h-16 w-16 rounded-card overflow-hidden border border-foreground/10 bg-card flex items-center justify-center">
                            <img src={options.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                            <button
                              onClick={() => setOptions({ logo_url: '' })}
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                              type="button"
                              aria-label="Supprimer le logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploading}
                            className="h-16 w-16 rounded-card border-2 border-dashed border-foreground/10 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                          >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span className="text-[9px] font-medium">Logo</span>
                          </button>
                        )}
                        <div className="flex-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {options.logo_url ? 'Remplacer' : 'Importer'} (PNG transparent recommandé)
                          </Button>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLogoUpload(f);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Position du logo</label>
                        <Select
                          value={options.logo_position}
                          onValueChange={(v) => setOptions({ logo_position: v as 'bottom-center' | 'bottom-right' | 'top-left' | 'top-right' })}
                        >
                          <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-foreground/10">
                            <SelectItem value="top-left" className="text-foreground focus:bg-secondary/20">Logo en haut à gauche</SelectItem>
                            <SelectItem value="top-right" className="text-foreground focus:bg-secondary/20">Logo en haut à droite</SelectItem>
                            <SelectItem value="bottom-center" className="text-foreground focus:bg-secondary/20">Logo en bas au centre</SelectItem>
                            <SelectItem value="bottom-right" className="text-foreground focus:bg-secondary/20">Logo en bas à droite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

            {/* Text overlay */}
            <AccordionItem value="text" className="border-foreground/10">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                {isVideo ? 'Texte à l\'écran' : type === 'carousel' ? 'Texte dans les slides' : 'Texte dans le visuel'}
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Sans</span>
                    <Switch
                      checked={options.show_text}
                      onCheckedChange={(v) => setOptions({ show_text: v })}
                    />
                    <span className="text-xs text-muted-foreground">Avec</span>
                  </div>
                  {options.show_text && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleGenerateText(1)}
                      disabled={text1Generating}
                      title={missingTextTooltip || undefined}
                      className="h-8 text-xs gap-1 bg-[#FF2D73] text-white hover:bg-[#e62968] border-none"
                    >
                      {text1Generating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Générer le texte
                    </Button>
                  )}
                </div>
                {options.show_text && !canGenerateText && (
                  <p className="text-[11px] text-destructive mb-2">{missingTextTooltip}</p>
                )}
                {options.show_text && (
                  <div className="space-y-3">
                    {isVideo && (
                      <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Texte à l'écran 1
                      </div>
                    )}
                    <Input
                      value={options.text_content}
                      onChange={(e) => {
                        if (e.target.value.length <= 50) setOptions({ text_content: e.target.value });
                      }}
                      placeholder="Texte à afficher (1 à 5 mots)"
                      className="bg-card border-foreground/10 text-foreground text-sm"
                    />
                    {isVideo && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">À quel moment de la vidéo l'afficher ?</label>
                          <Select
                            value={String(options.text_start_1)}
                            onValueChange={(v) => setOptions({ text_start_1: Number(v) })}
                          >
                            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-foreground/10">
                              {Array.from({ length: Math.min(videoDurationSec, 15) }, (_, i) => i).map((s) => (
                                <SelectItem key={s} value={String(s)} className="text-foreground focus:bg-secondary/20">
                                  {s === 0 ? 'Dès le début (0s)' : `À ${s}s`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Durée d'affichage</label>
                          <Select
                            value={String(options.text_duration_1)}
                            onValueChange={(v) => setOptions({ text_duration_1: Number(v) })}
                          >
                            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-foreground/10">
                              {[3, 4, 5].map((s) => (
                                <SelectItem key={s} value={String(s)} className="text-foreground focus:bg-secondary/20">
                                  {s} secondes
                                </SelectItem>
                              ))}
                              <SelectItem value="0" className="text-foreground focus:bg-secondary/20">
                                Toute la durée de la vidéo
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Position du texte</label>
                      <Select
                        value={options.text_position}
                        onValueChange={(v) =>
                          setOptions({ text_position: v as typeof options.text_position })
                        }
                      >
                        <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-foreground/10">
                          {TEXT_POSITIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value} className="text-foreground focus:bg-secondary/20">
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Police d'écriture</label>
                      <Select
                        value={options.text_font}
                        onValueChange={(v) => setOptions({ text_font: v })}
                      >
                        <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-foreground/10 max-h-[280px]">
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Classiques</div>
                          {CLASSIC_FONTS.map((f) => (
                            <SelectItem key={f} value={f} className="text-foreground focus:bg-secondary/20" style={{ fontFamily: f }}>
                              {f}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Design</div>
                          {DESIGN_FONTS.map((f) => (
                            <SelectItem key={f} value={f} className="text-foreground focus:bg-secondary/20" style={{ fontFamily: f }}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Text color (vidéo) */}
                    {isVideo && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground block">Couleur du texte</label>
                        <div className="grid grid-cols-8 gap-2">
                          {TEXT_COLORS.map((c) => {
                            const selected = options.text_color?.toUpperCase() === c.hex.toUpperCase();
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                title={`${c.name} ${c.hex}`}
                                onClick={() => {
                                  setOptions({ text_color: c.hex });
                                  setHexInput(c.hex);
                                }}
                                className={`h-7 w-7 rounded-full border transition-all ${
                                  selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-foreground/40' : 'border-foreground/10 hover:scale-110'
                                }`}
                                style={{ backgroundColor: c.hex }}
                                aria-label={c.name}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Code hex</span>
                          <Input
                            value={hexInput || options.text_color}
                            onChange={(e) => handleHexChange(e.target.value)}
                            placeholder="#FFFFFF"
                            className="bg-card border-foreground/10 text-foreground text-xs h-8 w-28 font-mono uppercase"
                            maxLength={7}
                          />
                          <div
                            className="h-6 w-6 rounded-md border border-foreground/10"
                            style={{ backgroundColor: options.text_color }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Second on-screen text */}
                    <div className="pt-3 border-t border-foreground/10 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={options.text_2_enabled}
                              onCheckedChange={(v) => setOptions({ text_2_enabled: v })}
                            />
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                              {isVideo ? "Ajouter un 2e texte à l'écran" : type === 'carousel' ? 'Ajouter un 2e texte dans les slides' : 'Ajouter un 2e texte dans le visuel'}
                            </span>
                          </div>
                          {options.text_2_enabled && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleGenerateText(2)}
                              disabled={text2Generating}
                              title={missingTextTooltip}
                              className="h-8 text-xs gap-1 bg-[#FF2D73] text-white hover:bg-[#e62968] border-none"
                            >
                              {text2Generating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Générer le texte
                            </Button>
                          )}
                        </div>
                        {options.text_2_enabled && !canGenerateText && (
                          <p className="text-[11px] text-destructive">{missingTextTooltip}</p>
                        )}
                        {options.text_2_enabled && (
                          <>
                            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                              {isVideo ? "Texte à l'écran 2" : 'Texte 2'}
                            </div>
                            <Input
                              value={options.text_content_2}
                              onChange={(e) => {
                                if (e.target.value.length <= 50) setOptions({ text_content_2: e.target.value });
                              }}
                              placeholder="Texte à afficher (1 à 5 mots)"
                              className="bg-card border-foreground/10 text-foreground text-sm"
                            />
                            {isVideo && (
                              <>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">À quel moment de la vidéo l'afficher ?</label>
                                  <Select
                                    value={String(options.text_start_2)}
                                    onValueChange={(v) => setOptions({ text_start_2: Number(v) })}
                                  >
                                    <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-foreground/10">
                                      {Array.from({ length: Math.min(videoDurationSec, 15) }, (_, i) => i).map((s) => (
                                        <SelectItem key={s} value={String(s)} className="text-foreground focus:bg-secondary/20">
                                          {s === 0 ? 'Dès le début (0s)' : `À ${s}s`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Durée d'affichage</label>
                                  <Select
                                    value={String(options.text_duration_2)}
                                    onValueChange={(v) => setOptions({ text_duration_2: Number(v) })}
                                  >
                                    <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-foreground/10">
                                      {[3, 4, 5].map((s) => (
                                        <SelectItem key={s} value={String(s)} className="text-foreground focus:bg-secondary/20">
                                          {s} secondes
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="0" className="text-foreground focus:bg-secondary/20">
                                        Toute la durée de la vidéo
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Position du texte</label>
                              <Select
                                value={options.text_position_2}
                                onValueChange={(v) =>
                                  setOptions({ text_position_2: v as typeof options.text_position_2 })
                                }
                              >
                                <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-foreground/10">
                                  {TEXT_POSITIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value} className="text-foreground focus:bg-secondary/20">
                                      {p.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Police d'écriture</label>
                              <Select
                                value={options.text_font_2}
                                onValueChange={(v) => setOptions({ text_font_2: v })}
                              >
                                <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-foreground/10 max-h-[280px]">
                                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Classiques</div>
                                  {CLASSIC_FONTS.map((f) => (
                                    <SelectItem key={f} value={f} className="text-foreground focus:bg-secondary/20" style={{ fontFamily: f }}>
                                      {f}
                                    </SelectItem>
                                  ))}
                                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Design</div>
                                  {DESIGN_FONTS.map((f) => (
                                    <SelectItem key={f} value={f} className="text-foreground focus:bg-secondary/20" style={{ fontFamily: f }}>
                                      {f}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {isVideo && (<div className="space-y-2">
                              <label className="text-xs text-muted-foreground block">Couleur du texte</label>
                              <div className="grid grid-cols-8 gap-2">
                                {TEXT_COLORS.map((c) => {
                                  const selected = options.text_color_2?.toUpperCase() === c.hex.toUpperCase();
                                  return (
                                    <button
                                      key={c.hex}
                                      type="button"
                                      title={`${c.name} ${c.hex}`}
                                      onClick={() => {
                                        setOptions({ text_color_2: c.hex });
                                        setHexInput2(c.hex);
                                      }}
                                      className={`h-7 w-7 rounded-full border transition-all ${
                                        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-foreground/40' : 'border-foreground/10 hover:scale-110'
                                      }`}
                                      style={{ backgroundColor: c.hex }}
                                      aria-label={c.name}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Code hex</span>
                                <Input
                                  value={hexInput2 || options.text_color_2}
                                  onChange={(e) => handleHexChange2(e.target.value)}
                                  placeholder="#FFFFFF"
                                  className="bg-card border-foreground/10 text-foreground text-xs h-8 w-28 font-mono uppercase"
                                  maxLength={7}
                                />
                                <div
                                  className="h-6 w-6 rounded-md border border-foreground/10"
                                  style={{ backgroundColor: options.text_color_2 }}
                                />
                              </div>
                            </div>)}
                          </>
                        )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Color palette - not for video */}
            {!isVideo && (
              <AccordionItem value="palette" className="border-foreground/10">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  Palette de couleurs
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-muted-foreground">Désactivé</span>
                    <Switch
                      checked={options.palette_enabled}
                      onCheckedChange={(v) => setOptions({ palette_enabled: v })}
                    />
                    <span className="text-xs text-muted-foreground">Activé</span>
                  </div>
                  {options.palette_enabled && (
                    <div className="flex gap-3">
                      {options.palette_hex.map((color, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newPalette = [...options.palette_hex];
                              newPalette[i] = e.target.value;
                              setOptions({ palette_hex: newPalette });
                            }}
                            className="w-10 h-10 rounded-btn cursor-pointer border-0 bg-transparent"
                          />
                          <span className="text-xs text-muted-foreground font-mono">{color}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Voice over (vidéo uniquement) */}
            {isVideo && (
              <AccordionItem value="voiceover" className="border-foreground/10">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    Texte de la voix off
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-3">
                  {!voModelSupports && (
                    <p className="text-xs text-muted-foreground italic">
                      Le modèle vidéo sélectionné ne prend pas en charge la voix off.
                      Choisissez un modèle compatible (Sora 2, Veo 3/3.1, Kling 2.6/3.0, Seedance 2) pour activer cette option.
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Désactivée</span>
                    <Switch
                      checked={voice_over_enabled && voModelSupports}
                      disabled={!voModelSupports}
                      onCheckedChange={(v) => setVoiceOverEnabled(v)}
                    />
                    <span className="text-xs text-muted-foreground">Activée</span>
                  </div>

                  {voice_over_enabled && voModelSupports && (
                    <>
                      <div className="text-[11px] text-muted-foreground">
                        Durée vidéo : {videoDurationSec}s — la voix off doit durer ≤ {voMaxSec}s (≈ {voMaxChars} caractères max)
                      </div>
                      <Textarea
                        value={voice_over_text}
                        onChange={(e) => {
                          if (e.target.value.length <= voMaxChars) setVoiceOverText(e.target.value);
                        }}
                        placeholder="Écrivez ou générez le texte de la voix off…"
                        className="bg-card border-foreground/10 text-foreground text-sm min-h-[90px] resize-none"
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {voice_over_text.length}/{voMaxChars} car.
                        </span>
                        <div className="flex gap-2">
                          {!voice_over_text && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleGenerateVoiceOver}
                              disabled={voGenerating}
                              className="gradient-bg border-0 text-primary-foreground hover:opacity-90 rounded-btn text-xs font-bold"
                            >
                              {voGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                              Générer le texte de la voix off
                            </Button>
                          )}
                          {voice_over_text && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleGenerateVoiceOver}
                              disabled={voGenerating}
                              className="rounded-btn text-xs font-bold"
                            >
                              {voGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                              Régénérer voix off
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </StepContainer>
      )}
    </>
  );
};

export default CustomizationStep;

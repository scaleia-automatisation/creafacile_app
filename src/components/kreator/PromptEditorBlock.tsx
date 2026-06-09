import { useEffect, useRef } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';

const countWords = (s: string) =>
  s.trim() ? s.trim().split(/\s+/).filter(Boolean).length : 0;

const PromptEditorBlock = () => {
  const { prompt_fr, setPromptFr } = useKreatorStore();
  const blockRef = useRef<HTMLDivElement | null>(null);
  const prevLenRef = useRef<number>(prompt_fr?.length || 0);

  // Quand le prompt vient d'être généré (passe de vide à non-vide),
  // on scrolle automatiquement vers ce bloc.
  useEffect(() => {
    const len = prompt_fr?.length || 0;
    if (prevLenRef.current === 0 && len > 0) {
      setTimeout(() => {
        blockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
    prevLenRef.current = len;
  }, [prompt_fr]);

  if (!prompt_fr?.trim()) return null;

  const words = countWords(prompt_fr);
  const inRange = words >= 150 && words <= 200;

  return (
    <div
      id="prompt-editor-block"
      ref={blockRef}
      className="w-full max-w-4xl mx-auto bg-card rounded-card p-4 md:p-5 border-2 border-primary/30"
    >
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="w-4 h-4 text-primary" />
          Prompt généré (modifiable) — utilisé pour générer le contenu
        </label>
        <div className="flex items-center gap-3 text-xs">
          <span className={inRange ? 'text-primary font-bold' : 'text-muted-foreground'}>
            {words} mots {inRange ? '✓' : '(cible 150–200)'}
          </span>
          <span className="text-muted-foreground">{prompt_fr.length} car.</span>
        </div>
      </div>
      <Textarea
        value={prompt_fr}
        onChange={(e) => setPromptFr(e.target.value)}
        className="bg-background border-foreground/10 text-foreground text-sm resize-none whitespace-pre-wrap leading-6 font-mono"
        style={{
          minHeight: `${Math.max(
            220,
            (Math.ceil(prompt_fr.length / 70) + (prompt_fr.match(/\n/g)?.length || 0) + 1) * 24
          )}px`,
        }}
      />
      <div className="flex gap-2 mt-2 items-center flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(prompt_fr);
            toast.success('Prompt copié');
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copier
        </Button>
        <p className="text-xs text-muted-foreground">
          Les modifications seront utilisées lors du clic sur « Générer le contenu ».
        </p>
      </div>
    </div>
  );
};

export default PromptEditorBlock;
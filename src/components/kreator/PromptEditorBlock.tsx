import { useEffect, useRef } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { Textarea } from '@/components/ui/textarea';

const countWords = (s: string) =>
  s.trim() ? s.trim().split(/\s+/).filter(Boolean).length : 0;

const PromptEditorBlock = () => {
  const { prompt_fr, setPromptFr } = useKreatorStore();
  const blockRef = useRef<HTMLDivElement | null>(null);
  const prevLenRef = useRef<number>(prompt_fr?.length || 0);

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
      className="w-full max-w-6xl mx-auto bg-card rounded-card p-3 md:p-4 border-2 border-primary/30"
    >
      <div className="flex items-center justify-end mb-1">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className={inRange ? 'text-primary font-bold' : ''}>
            {words} mots {inRange ? '✓' : '(cible 150–200)'}
          </span>
          <span>{prompt_fr.length} car.</span>
        </div>
      </div>
      <Textarea
        value={prompt_fr}
        onChange={(e) => setPromptFr(e.target.value)}
        className="bg-background border-foreground/10 text-foreground text-sm resize-none whitespace-pre-wrap leading-6 overflow-y-auto font-bold"
        style={{
          fontFamily: 'Arial, sans-serif',
          minHeight: '80px',
          maxHeight: '15cm',
        }}
      />
    </div>
  );
};

export default PromptEditorBlock;
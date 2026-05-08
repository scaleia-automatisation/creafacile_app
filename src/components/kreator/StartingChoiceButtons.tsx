import { useKreatorStore } from '@/store/useKreatorStore';
import { Lightbulb, TrendingUp, AlertCircle, PenLine } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

const StartingChoiceButtons = () => {
  const {
    type, starting_choice, setStartingChoice,
    input_text, setInputText, setIdeaChosen,
    offer_type, company_activity, company_sector, objective,
  } = useKreatorStore();
  const [scratchError, setScratchError] = useState<string[]>([]);

  if (type !== 'image' && type !== 'carousel') return null;

  const choose = (val: 'scratch' | 'perf' | 'idea') => {
    if (val === 'scratch') {
      const missing: string[] = [];
      if (!offer_type?.trim()) missing.push("Type d'offre");
      if (!company_activity?.trim()) missing.push('Activité principale');
      if (!company_sector?.trim()) missing.push("Secteur d'activité");
      if (!objective?.trim()) missing.push('Objectif du contenu');
      if (missing.length > 0 && starting_choice !== 'scratch') {
        setScratchError(missing);
        return;
      }
      setScratchError([]);
    } else {
      setScratchError([]);
    }
    setStartingChoice(starting_choice === val ? '' : val);
  };

  const baseBtn =
    'w-full flex items-center justify-center gap-2 h-auto py-4 px-5 text-sm md:text-base font-bold border-2 border-[hsl(210_100%_55%)] transition-all whitespace-normal leading-tight text-center';
  const radius = { borderRadius: '20px' };

  return (
    <div className="flex flex-col items-center gap-4 max-w-3xl mx-auto">
    <div className="flex flex-col sm:flex-row justify-center gap-3 items-start w-full">
      <div className="w-full sm:w-[260px]">
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
      <div className="w-full sm:w-[260px]">
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
          <span>S'inspirer d'un post<br />qui a performé</span>
        </button>
      </div>
      <div className="flex flex-col gap-2 w-full sm:w-[260px]">
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
          <span>Je n'ai pas d'idée,<br />partir de zéro</span>
        </button>
        {scratchError.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-btn border border-destructive/40 bg-destructive/10 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Champs requis manquants :</div>
              <ul className="list-disc list-inside space-y-0.5">
                {scratchError.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
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
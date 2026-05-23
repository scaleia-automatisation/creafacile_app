import { useKreatorStore } from '@/store/useKreatorStore';

const ModeToggle = () => {
  const { user_mode, setUserMode } = useKreatorStore();
  const isExpert = user_mode === 'expert';

  return (
    <div className="inline-flex items-center rounded-full bg-card border border-foreground/10 p-1">
      <button
        onClick={() => setUserMode('beginner')}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          !isExpert
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Débutant
      </button>
      <button
        onClick={() => setUserMode('expert')}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          isExpert
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Expert
      </button>
    </div>
  );
};

export default ModeToggle;

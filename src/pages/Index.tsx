import boosterLogo from '@/assets/creafacile-logo.png';
import ModeToggle from '@/components/kreator/ModeToggle';
import MobileMenu from '@/components/MobileMenu';
import StartingPointBlock from '@/components/kreator/StartingPointBlock';
import ProductOfferStep from '@/components/kreator/ProductOfferStep';
import StartingChoiceButtons from '@/components/kreator/StartingChoiceButtons';
import ObjectiveStep from '@/components/kreator/ObjectiveStep';
import StepContainer from '@/components/kreator/StepContainer';
import CustomizationStep from '@/components/kreator/CustomizationStep';
import GenerationStep from '@/components/kreator/GenerationStep';
import IdeaSuggestions from '@/components/kreator/IdeaSuggestions';
import ManualIdeaPanel from '@/components/kreator/ManualIdeaPanel';
import PromptEditorBlock from '@/components/kreator/PromptEditorBlock';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Coins, LayoutDashboard, LogOut, Sun, Moon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useKreatorStore } from '@/store/useKreatorStore';
import { toast } from 'sonner';

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/5 relative">
        <div className="w-full px-4 py-3 md:py-4 flex items-center justify-between">
          <img src={boosterLogo} alt="Créafacile" className="h-12 md:h-[62px] cursor-pointer" onClick={() => navigate('/')} />
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-pill border border-foreground/10">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-sm text-foreground">{profile?.credits ?? 0}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground p-2"
                    onClick={() => navigate('/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground p-2"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
                <MobileMenu />
              </>
            ) : (
              <>
                <button
                  className="hidden md:block gradient-bg text-primary-foreground px-3 md:px-4 py-2 rounded-btn text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/auth')}
                >
                  Commencer
                </button>
                <MobileMenu />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-center mb-4 md:mb-6 leading-[1.05]">
          <span className="text-foreground">Crée et publie du contenu</span>
          <br />
          <span className="gradient-text italic">engageant en 3 clics,</span>
          <br />
          <span className="gradient-text italic">même sans idée</span>
        </h1>

        {/* Mode toggle below title */}
        <div className="flex justify-center mb-6 md:mb-10">
          <ModeToggle />
        </div>

        <div className="space-y-6">
          <ProductOfferStep />
          <StepContainer stepNumber={2} title="Quel est votre objectif ?">
            <ObjectiveStep />
          </StepContainer>
          <StepContainer stepNumber={3} title="Que voulez-vous créer ?">
            <StartingChoiceButtons />
          </StepContainer>
          <IdeaSuggestions />
          <PromptEditorBlock />
          <CustomizationStep />
          <StartingPointBlock />
          <ManualIdeaPanel />
          <GenerationStep />
        </div>
      </main>

      <footer className="border-t border-foreground/5 py-8 mt-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-4">
            <button onClick={() => navigate('/privacy')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Politique de confidentialité</button>
            <button onClick={() => navigate('/terms')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Conditions générales d'utilisation</button>
            <button onClick={() => navigate('/data-deletion')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Suppression des données</button>
            <button onClick={() => navigate('/data-deletion-reminder')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Rappel de suppression</button>
          </div>
          <p className="text-center text-xs text-muted-foreground">© 2026 Créafacile — Génération de contenu marketing par IA</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

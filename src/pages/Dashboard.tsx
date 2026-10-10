import boosterLogo from '@/assets/creafacile-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Image, Layers, Video, LogOut, Copy, Users, Crown, ArrowUpCircle, ArrowDownCircle, History, FolderOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { STRIPE_PLANS, PlanKey } from '@/lib/stripe-plans';

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  action: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [genCount, setGenCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setGenCount(count ?? 0));
    supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setTransactions(data as CreditTransaction[]);
      });
  }, [user]);

  const handleCopyReferral = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`);
      toast.success('Lien d\'invitation copié !');
    }
  };

  const handleSubscribe = async (planKey: PlanKey) => {
    if (planKey === 'free') return;
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: STRIPE_PLANS[planKey].price_id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error('Erreur lors de la redirection vers le paiement');
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow text-2xl">✨</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/5">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <img src={boosterLogo} alt="Créafacile" className="h-8 md:h-10 cursor-pointer" onClick={() => navigate('/')} />
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-2 bg-card px-3 py-1.5 md:px-4 md:py-2 rounded-pill border border-foreground/10">
              <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <span className="font-bold text-sm md:text-base text-foreground">{profile.credits}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">crédits</span>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4 md:mb-6">
          Bonjour{profile.display_name ? `, ${profile.display_name}` : ''} 👋
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="card-surface p-4 md:p-6 border border-foreground/10 rounded-card">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Crédits</span>
            </div>
            <span className="text-3xl font-black text-foreground">{profile.credits}</span>
            <span className="text-xs text-muted-foreground ml-2">
              Plan {profile.plan === 'free' ? 'Gratuit' : profile.plan === 'pro' ? 'Pro' : 'Premium'}
            </span>
          </div>

          <div className="card-surface p-4 md:p-6 border border-foreground/10 rounded-card">
            <div className="flex items-center gap-3 mb-2">
              <Image className="w-5 h-5 text-secondary" />
              <span className="text-sm text-muted-foreground">Générations</span>
            </div>
            <span className="text-3xl font-black text-foreground">{genCount}</span>
          </div>

          <div className="card-surface p-4 md:p-6 border border-foreground/10 rounded-card cursor-pointer hover:border-primary/30 transition-colors" onClick={handleCopyReferral}>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Parrainage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground font-mono">{profile.referral_code}</span>
              <Copy className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">+3 crédits par invité</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6 md:mb-8">
          <Button onClick={() => navigate('/app')} className="gradient-bg border-0 text-primary-foreground font-bold px-6 md:px-8 py-5 md:py-6 rounded-btn text-sm md:text-base hover:opacity-90 w-full sm:w-auto">
            Créer du contenu ✨
          </Button>
          <Button onClick={() => navigate('/generations')} variant="outline" className="border-foreground/10 text-foreground font-bold px-6 md:px-8 py-5 md:py-6 rounded-btn text-sm md:text-base w-full sm:w-auto">
            <FolderOpen className="w-4 h-4 mr-2" /> Mes générations
          </Button>
        </div>

        {/* Plans */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" /> Plans disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(Object.keys(STRIPE_PLANS) as PlanKey[]).map((key) => {
            const plan = STRIPE_PLANS[key];
            const isCurrent = profile.plan === key;
            return (
              <div key={key} className={`card-surface p-5 border rounded-card ${isCurrent ? 'border-primary' : 'border-foreground/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  {isCurrent && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-pill font-medium">Actuel</span>}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-black text-foreground">{plan.price === 0 ? 'Gratuit' : `${plan.price}€`}</span>
                  {plan.price > 0 && <span className="text-xs text-muted-foreground">/mois</span>}
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && key !== 'free' && (
                  <Button onClick={() => handleSubscribe(key)} size="sm" className="w-full gradient-bg border-0 text-primary-foreground text-xs">
                    Passer à {plan.name}
                  </Button>
                )}
                {isCurrent && (
                  <Button disabled size="sm" variant="outline" className="w-full text-xs">
                    Plan actuel
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Credit Transactions */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Historique des crédits
        </h2>
        {transactions.length === 0 ? (
          <div className="card-surface p-8 border border-foreground/10 rounded-card text-center mb-8">
            <p className="text-muted-foreground">Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              const actionLabel = tx.action
                .replace('renewal_pro', 'Renouvellement Pro')
                .replace('renewal_premium', 'Renouvellement Premium')
                .replace('referral_bonus', 'Bonus parrainage')
                .replace('signup_bonus', 'Bonus inscription')
                .replace('generation_', 'Génération ')
                .replace('image', 'image')
                .replace('carousel', 'carrousel')
                .replace('video', 'vidéo');

              return (
                <div key={tx.id} className="card-surface p-3 md:p-4 border border-foreground/10 rounded-card flex items-center gap-3 md:gap-4">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-btn flex-shrink-0 flex items-center justify-center ${isCredit ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    {isCredit ? <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" /> : <ArrowDownCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground capitalize truncate">{actionLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`text-xs md:text-sm font-bold flex-shrink-0 ${isCredit ? 'text-green-400' : 'text-destructive'}`}>
                    {isCredit ? '+' : '-'}{tx.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

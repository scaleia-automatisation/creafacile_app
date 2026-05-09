import { useEffect, useState } from 'react';
import { useKreatorStore } from '@/store/useKreatorStore';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const SECTORS = [
  '🛍️ E-commerce / Retail (DTC, marketplaces)',
  '🧃 Produits grande consommation (cosmétiques, food, boissons)',
  '👗 Mode / Fashion / Luxe',
  '🧴 Beauté / Cosmétique / Skincare',
  '💻 Tech / SaaS / IA / startups digitales',
  '🏦 Banque / Finance / Assurance (Fintech incluse)',
  '🏠 Immobilier (promotion, agences, location courte durée)',
  '🚗 Automobile (constructeurs + concessionnaires)',
  '✈️ Tourisme / Voyage / Hôtellerie',
  '🍽️ Restauration / Food brands / Dark kitchens',
  '🩺 Santé / Pharma / Cliniques / Bien-être',
  '🎓 Éducation / Formation / Infoproduits',
  '💼 Coaching / Consulting / Services B2B',
  '🎮 Médias / Divertissement / Gaming / Créateurs',
  '📡 Télécom / Internet / Services digitaux',
];

const MARKETS = [
  'Asiatique',
  'Européen',
  'Américain',
  'Africain',
  'Moyen-oriental',
  'Latino/Hispanique',
  'Amérindien',
  'Océanien',
];

const ActivitySectorFields = () => {
  const { profile } = useAuth();
  const {
    company_activity, setCompanyActivity,
    company_sector, setCompanySector,
    market, setMarket,
  } = useKreatorStore();
  const [sectorMode, setSectorMode] = useState<'preset' | 'custom'>('preset');

  useEffect(() => {
    if (profile) {
      if (profile.company_activity && !company_activity) {
        setCompanyActivity(profile.company_activity);
      }
      if (profile.company_sector && !company_sector) {
        setCompanySector(profile.company_sector);
        if (profile.company_sector && !SECTORS.includes(profile.company_sector)) {
          setSectorMode('custom');
        }
      }
    }
  }, [profile]);

  const handleSectorChange = (value: string) => {
    if (value === 'custom') {
      setSectorMode('custom');
      setCompanySector('');
    } else {
      setSectorMode('preset');
      setCompanySector(value);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Activité principale *</label>
          <Input
            value={company_activity}
            onChange={(e) => setCompanyActivity(e.target.value)}
            placeholder="Ex: Coach fitness, Boulangerie..."
            className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Secteur *</label>
          {sectorMode === 'preset' ? (
            <Select value={company_sector} onValueChange={handleSectorChange}>
              <SelectTrigger className="bg-card border-foreground/10 text-foreground">
                <SelectValue placeholder="Sélectionner un secteur..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s} className="text-foreground focus:bg-secondary/20">{s}</SelectItem>
                ))}
                <SelectItem value="custom" className="text-foreground focus:bg-secondary/20">
                  ✏️ Personnaliser
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-2">
              <Input
                value={company_sector}
                onChange={(e) => setCompanySector(e.target.value)}
                placeholder="Ex: Artisanat, Mode..."
                className="bg-card border-foreground/10 text-foreground placeholder:text-muted-foreground flex-1"
              />
              <button
                onClick={() => { setSectorMode('preset'); setCompanySector(''); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2"
                title="Revenir à la liste"
              >
                ↩
              </button>
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Marché / Localisation</label>
          <Select value={market} onValueChange={(v) => setMarket(v === '__none__' ? '' : v)}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <SelectValue placeholder="Choisir un marché cible..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              <SelectItem value="__none__" className="text-foreground focus:bg-secondary/20">Aucun (automatique)</SelectItem>
              {MARKETS.map((m) => (
                <SelectItem key={m} value={m} className="text-foreground focus:bg-secondary/20">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
  );
};

export default ActivitySectorFields;

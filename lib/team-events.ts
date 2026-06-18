import { Product, RoundResult, MarketEffectEntry } from './types';

type TeamEventTemplate = {
  name: string;
  description_fr: string;
  probability: number; // 0-1
  condition: (products: Product[], result: RoundResult, prevResult: RoundResult | null) => boolean;
  effect_json: MarketEffectEntry[];
  triggered_by: 'auto';
};

const TEAM_EVENT_TEMPLATES: TeamEventTemplate[] = [
  {
    name: 'Scandale fournisseur',
    description_fr: 'Ton fournisseur fast-fashion a été exposé pour des pratiques douteuses. Ta réputation en prend un coup.',
    probability: 0.35,
    condition: (products) => products.some(p => p.supplier === 'fast_fashion_asie'),
    effect_json: [
      { type: 'global', metric: 'image', mult: 0.72 } as MarketEffectEntry,
      { type: 'global', metric: 'sustainability', mult: 0.60 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
  {
    name: 'Couverture magazine',
    description_fr: 'Un grand magazine a mis ta marque en avant ! Tout le monde attend ton prochain lancement.',
    probability: 0.30,
    condition: (products, result) => result.score_image >= 65 && products.some(p => ['collab_createur','capsule_artisanale'].includes(p.supplier)),
    effect_json: [
      { type: 'global', metric: 'image', mult: 1.25 } as MarketEffectEntry,
      { type: 'global', metric: 'sales', mult: 1.15 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
  {
    name: 'Prix Éthique Mode',
    description_fr: "Ta démarche durable a été reconnue par l'industrie. Les investisseurs s'y intéressent.",
    probability: 0.28,
    condition: (products, result) => result.score_durabilite >= 70 && products.some(p => ['atelier_abidjan','capsule_artisanale'].includes(p.supplier)),
    effect_json: [
      { type: 'global', metric: 'sustainability', mult: 1.20 } as MarketEffectEntry,
      { type: 'global', metric: 'loyalty', mult: 1.15 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
  {
    name: 'Viral pop-up',
    description_fr: "Ton pop-up a explosé sur les réseaux ! Des files d'attente devant la boutique.",
    probability: 0.32,
    condition: (products, result) => {
      const totalDist = products.reduce((s,p) => s+(p.budget_dist_popup??0), 0);
      const totalBudget = products.reduce((s,p) => s+((p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0)), 0);
      return result.score_fidelite >= 55 && totalBudget > 0 && totalDist/totalBudget >= 0.30;
    },
    effect_json: [
      { type: 'global', metric: 'sales', mult: 1.18 } as MarketEffectEntry,
      { type: 'global', metric: 'loyalty', mult: 1.20 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
  {
    name: 'Retard de production',
    description_fr: "Ton fournisseur n'a pas pu tenir ses délais. Certaines pièces arrivent trop tard en boutique.",
    probability: 0.20,
    condition: (products) => products.some(p => p.supplier === 'fast_fashion_asie' || p.supplier === 'usine_europe'),
    effect_json: [
      { type: 'global', metric: 'sales', mult: 0.80 } as MarketEffectEntry,
      { type: 'global', metric: 'loyalty', mult: 0.85 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
  {
    name: 'Sur-saturation interne',
    description_fr: 'Ton portfolio manque de diversité — tes produits se cannibalisent mutuellement.',
    probability: 1.0, // toujours si condition vraie
    condition: (products) => {
      const styleCounts = products.reduce((acc, p) => { acc[p.style] = (acc[p.style]??0)+1; return acc; }, {} as Record<string,number>);
      return Object.values(styleCounts).some(n => n >= 3);
    },
    effect_json: [
      { type: 'global', metric: 'sales', mult: 0.75 } as MarketEffectEntry,
    ],
    triggered_by: 'auto',
  },
];

export function computeTeamEvents(
  teamId: string,
  products: Product[],
  result: RoundResult,
  prevResult: RoundResult | null,
  roundNumber: number,
  sessionId: string
): Array<{ team_id: string; session_id: string; round_number: number; name: string; description_fr: string; effect_json: MarketEffectEntry[]; triggered_by: 'auto' }> {
  const triggered = [];
  for (const template of TEAM_EVENT_TEMPLATES) {
    if (!template.condition(products, result, prevResult)) continue;
    if (Math.random() > template.probability) continue;
    triggered.push({
      team_id: teamId,
      session_id: sessionId,
      round_number: roundNumber,
      name: template.name,
      description_fr: template.description_fr,
      effect_json: template.effect_json,
      triggered_by: 'auto' as const,
    });
  }
  return triggered;
}

// Applique les effets d'un team event sur des scores existants
export function applyTeamEventEffects(
  scores: { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; score_global: number },
  effects: MarketEffectEntry[]
): typeof scores {
  let { score_ventes, score_image, score_durabilite, score_fidelite } = scores;
  for (const eff of effects as any[]) {
    if (eff.type !== 'global') continue;
    if (eff.metric === 'sales' || eff.metric === 'all') score_ventes = Math.max(0, Math.min(100, Math.round(score_ventes * eff.mult)));
    if (eff.metric === 'image' || eff.metric === 'all') score_image = Math.max(0, Math.min(100, Math.round(score_image * eff.mult)));
    if (eff.metric === 'sustainability' || eff.metric === 'all') score_durabilite = Math.max(0, Math.min(100, Math.round(score_durabilite * eff.mult)));
    if (eff.metric === 'loyalty' || eff.metric === 'all') score_fidelite = Math.max(0, Math.min(100, Math.round(score_fidelite * eff.mult)));
  }
  const score_global = Math.round(score_ventes * 0.30 + score_image * 0.25 + score_durabilite * 0.20 + score_fidelite * 0.25);
  return { score_ventes, score_image, score_durabilite, score_fidelite, score_global };
}

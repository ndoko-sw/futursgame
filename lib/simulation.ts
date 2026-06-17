import { Decision, MarketEvent, MarketEffectData } from './types';

type Scores = {
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
  score_global: number;
};

function applyEffect(base: number, effect: MarketEffectData, metric: 'sales' | 'image' | 'sustainability' | 'loyalty'): number {
  if (effect.metric !== 'all' && effect.metric !== metric) return base;
  return base * effect.mult;
}

function getActiveEffects(d: Decision, events: MarketEvent[]): MarketEffectData[] {
  return events
    .filter(e => e.active)
    .map(e => e.effect_json)
    .filter((ef): ef is MarketEffectData => !!ef)
    .filter((ef) => {
      if (ef.type === 'global') return true;
      if (ef.type === 'channel_boost') return ef.target === d.comm_channel;
      if (ef.type === 'supplier_mod')  return ef.target === d.supplier;
      if (ef.type === 'style_boost')   return ef.target === d.collection_style;
      return false;
    });
}

export function computeRoundResults(
  decisions: Decision[],
  activeEvents: MarketEvent[] = []
): Map<string, Scores> {
  const out = new Map<string, Scores>();

  const supplierMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
    atelier_abidjan:    { sales: 0.6,  image: 0.8,  sustainability: 0.95, loyalty: 0.75 },
    usine_europe:       { sales: 0.75, image: 0.7,  sustainability: 0.65, loyalty: 0.7  },
    fast_fashion_asie:  { sales: 0.9,  image: 0.3,  sustainability: 0.2,  loyalty: 0.4  },
    capsule_artisanale: { sales: 0.4,  image: 0.95, sustainability: 0.85, loyalty: 0.85 },
    collab_createur:    { sales: 0.7,  image: 0.85, sustainability: 0.55, loyalty: 0.65 },
  };
  const styleMod: Record<string, number> = {
    casual_luxe: 0.85, streetwear: 0.80, techwear: 0.65, avant_garde: 0.70, minimaliste: 0.75,
  };
  const focusMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
    balanced:      { sales: 1,    image: 1,    sustainability: 1,    loyalty: 1    },
    price:         { sales: 1.3,  image: 0.8,  sustainability: 0.7,  loyalty: 0.9  },
    product:       { sales: 0.9,  image: 1.1,  sustainability: 1,    loyalty: 1.2  },
    image:         { sales: 0.8,  image: 1.4,  sustainability: 0.8,  loyalty: 1    },
    sustainability:{ sales: 0.7,  image: 1,    sustainability: 1.5,  loyalty: 1.1  },
  };

  for (const d of decisions) {
    const sm  = supplierMod[d.supplier ?? '']      ?? supplierMod.usine_europe;
    const sty = styleMod[d.collection_style ?? ''] ?? 0.75;
    const fm  = focusMod[d.brand_focus ?? '']      ?? focusMod.balanced;

    const bF = Math.min((d.budget_fournisseur   ?? 0) / 25_000, 1.8);
    const bC = Math.min((d.budget_collection    ?? 0) / 25_000, 1.8);
    const bP = Math.min((d.budget_prix          ?? 0) / 25_000, 1.8);
    const bD = Math.min((d.budget_distribution  ?? 0) / 25_000, 1.8);
    const bK = Math.min((d.budget_communication ?? 0) / 25_000, 1.8);

    const priceFactor = 0.5 + ((d.price ?? 50) / 100) * 0.6;
    const jitter = () => 0.85 + Math.random() * 0.3;

    const effects = getActiveEffects(d, activeEvents);

    let ventes      = Math.round(sm.sales        * bF * bC * bD * bK * priceFactor * fm.sales        * sty * bP * jitter() * 60);
    let image       = Math.round(sm.image        * bK * fm.image        * sty * priceFactor * jitter() * 100);
    let durabilite  = Math.round(sm.sustainability * bF * fm.sustainability * jitter() * 100);
    let fidelite    = Math.round(sm.loyalty       * bC * bD * fm.loyalty  * jitter() * 100);

    for (const ef of effects) {
      ventes     = Math.round(applyEffect(ventes,    ef, 'sales'));
      image      = Math.round(applyEffect(image,     ef, 'image'));
      durabilite = Math.round(applyEffect(durabilite,ef, 'sustainability'));
      fidelite   = Math.round(applyEffect(fidelite,  ef, 'loyalty'));
    }

    ventes     = Math.max(0, Math.min(100, ventes));
    image      = Math.max(0, Math.min(100, image));
    durabilite = Math.max(0, Math.min(100, durabilite));
    fidelite   = Math.max(0, Math.min(100, fidelite));

    const score_global = Math.round(ventes * 0.3 + image * 0.3 + durabilite * 0.2 + fidelite * 0.2);

    out.set(d.team_id, { score_ventes: ventes, score_image: image, score_durabilite: durabilite, score_fidelite: fidelite, score_global });
  }

  return out;
}

import { Decision, MarketEvent, SimpleEffect, ConditionalEffect, MarketEffectEntry } from './types';

type BaseScores = {
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
};

type Scores = BaseScores & { score_global: number };

// ── Saturation mechanic ──────────────────────────────────────────────────────
// Teams competing on the same channel + style cannibalize each other.
// Unique positioning → +10% bonus on sales. All teams same → -25% penalty.
function computeSaturationMult(d: Decision, allDecisions: Decision[]): number {
  const n = allDecisions.length;
  if (n <= 1) return 1.0;

  const sameChannel = allDecisions.filter(dec => dec.comm_channel === d.comm_channel).length;
  const sameStyle   = allDecisions.filter(dec => dec.collection_style === d.collection_style).length;

  // density: 0 = unique, 1 = all teams share this dimension
  const channelDensity = (sameChannel - 1) / (n - 1);
  const styleDensity   = (sameStyle   - 1) / (n - 1);
  const maxDensity = Math.max(channelDensity, styleDensity);

  // 1.10 (unique) → 0.75 (all same)
  return Math.round((1.1 - maxDensity * 0.35) * 1000) / 1000;
}

// ── Effect resolution ────────────────────────────────────────────────────────
function effectMatchesTeam(d: Decision, eff: SimpleEffect): boolean {
  if (eff.type === 'global') return true;
  const targets = eff.target?.split(',').map(t => t.trim()) ?? [];
  if (eff.type === 'channel_boost')      return targets.includes(d.comm_channel ?? '');
  if (eff.type === 'supplier_mod')       return targets.includes(d.supplier ?? '');
  if (eff.type === 'style_boost')        return targets.includes(d.collection_style ?? '');
  if (eff.type === 'distribution_boost') return targets.includes(d.distribution ?? '');
  return false;
}

function applySimpleEffect(
  s: { ventes: number; image: number; durabilite: number; fidelite: number },
  eff: SimpleEffect,
): void {
  if (eff.metric === 'sales'          || eff.metric === 'all') s.ventes     = Math.round(s.ventes     * eff.mult);
  if (eff.metric === 'image'          || eff.metric === 'all') s.image      = Math.round(s.image      * eff.mult);
  if (eff.metric === 'sustainability' || eff.metric === 'all') s.durabilite = Math.round(s.durabilite * eff.mult);
  if (eff.metric === 'loyalty'        || eff.metric === 'all') s.fidelite   = Math.round(s.fidelite   * eff.mult);
}

function resolveEffects(d: Decision, base: BaseScores, events: MarketEvent[]): SimpleEffect[] {
  const resolved: SimpleEffect[] = [];

  for (const event of events) {
    if (!event.active) continue;
    const rawJson = event.effect_json as any;
    const entries: MarketEffectEntry[] = Array.isArray(rawJson)
      ? rawJson
      : rawJson ? [rawJson] : [];

    for (const entry of entries) {
      if (entry.type === 'conditional') {
        const ce = entry as ConditionalEffect;
        const fieldVal = ce.condition_field.startsWith('score_')
          ? (base as any)[ce.condition_field]
          : (d as any)[ce.condition_field];

        let met = false;
        if (ce.condition_op === '>')  met = Number(fieldVal) > Number(ce.condition_value);
        if (ce.condition_op === '<=') met = Number(fieldVal) <= Number(ce.condition_value);
        if (ce.condition_op === '=')  met = String(fieldVal) === String(ce.condition_value);

        const picked = met ? ce.then_effect : ce.else_effect;
        if (effectMatchesTeam(d, picked)) resolved.push(picked);
      } else {
        const se = entry as SimpleEffect;
        if (effectMatchesTeam(d, se)) resolved.push(se);
      }
    }
  }

  return resolved;
}

// ── Main computation ─────────────────────────────────────────────────────────
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
    const sm  = supplierMod[d.supplier ?? '']       ?? supplierMod.usine_europe;
    const sty = styleMod[d.collection_style ?? '']  ?? 0.75;
    const fm  = focusMod[d.brand_focus ?? '']       ?? focusMod.balanced;

    const bF = Math.min((d.budget_fournisseur   ?? 0) / 25_000, 1.8);
    const bC = Math.min((d.budget_collection    ?? 0) / 25_000, 1.8);
    const bP = Math.min((d.budget_prix          ?? 0) / 25_000, 1.8);
    const bD = Math.min((d.budget_distribution  ?? 0) / 25_000, 1.8);
    const bK = Math.min((d.budget_communication ?? 0) / 25_000, 1.8);

    const priceTierMap: Record<string, number> = { accessible: 30, milieu: 70, premium: 110, luxe: 160 };
    const priceVal = priceTierMap[(d as any).price_tier ?? ''] ?? (d.price ?? 70);
    const priceFactor = 0.5 + (priceVal / 100) * 0.6;
    const jitter = () => 0.85 + Math.random() * 0.3;

    // Saturation: penalizes teams crowding the same market segment
    const satMult = computeSaturationMult(d, decisions);

    // Pass 1 — base scores (includes saturation on sales)
    const base: BaseScores = {
      score_ventes:     Math.round(sm.sales         * bF * bC * bD * bK * priceFactor * fm.sales         * sty * bP * jitter() * 60 * satMult),
      score_image:      Math.round(sm.image         * bK * fm.image         * sty * priceFactor * jitter() * 100),
      score_durabilite: Math.round(sm.sustainability * bF * fm.sustainability * jitter() * 100),
      score_fidelite:   Math.round(sm.loyalty        * bC * bD * fm.loyalty  * jitter() * 100),
    };

    // Pass 2 — resolve conditional effects using base scores
    const effects = resolveEffects(d, base, activeEvents);

    // Pass 3 — apply effects
    const s = { ventes: base.score_ventes, image: base.score_image, durabilite: base.score_durabilite, fidelite: base.score_fidelite };
    for (const eff of effects) applySimpleEffect(s, eff);

    s.ventes     = Math.max(0, Math.min(100, s.ventes));
    s.image      = Math.max(0, Math.min(100, s.image));
    s.durabilite = Math.max(0, Math.min(100, s.durabilite));
    s.fidelite   = Math.max(0, Math.min(100, s.fidelite));

    const score_global = Math.round(s.ventes * 0.3 + s.image * 0.3 + s.durabilite * 0.2 + s.fidelite * 0.2);

    out.set(d.team_id, {
      score_ventes: s.ventes, score_image: s.image,
      score_durabilite: s.durabilite, score_fidelite: s.fidelite, score_global,
    });
  }

  return out;
}

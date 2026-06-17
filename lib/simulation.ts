import { Decision, MarketEvent, Product, SimpleEffect, ConditionalEffect, MarketEffectEntry } from './types';

type BaseScores = {
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
};

type Scores = BaseScores & { score_global: number };

const supplierMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
  atelier_abidjan:    { sales: 0.6,  image: 0.8,  sustainability: 0.95, loyalty: 0.75 },
  usine_europe:       { sales: 0.75, image: 0.7,  sustainability: 0.65, loyalty: 0.7  },
  fast_fashion_asie:  { sales: 0.9,  image: 0.3,  sustainability: 0.2,  loyalty: 0.4  },
  capsule_artisanale: { sales: 0.4,  image: 0.95, sustainability: 0.85, loyalty: 0.85 },
  collab_createur:    { sales: 0.7,  image: 0.85, sustainability: 0.55, loyalty: 0.65 },
};

const styleSalesMod: Record<string, number> = {
  casual_luxe: 0.85, streetwear: 0.80, techwear: 0.65, avant_garde: 0.70, minimaliste: 0.75,
};

const priceTierFactor: Record<string, number> = {
  accessible: 0.50, milieu: 0.70, premium: 1.10, luxe: 1.60,
};

const distributionMod: Record<string, { sales: number; loyalty: number }> = {
  ecommerce:   { sales: 1.1, loyalty: 1.0 },
  popup:       { sales: 0.9, loyalty: 1.4 },
  multibrand:  { sales: 1.0, loyalty: 0.9 },
  wholesale:   { sales: 1.3, loyalty: 0.8 },
  social_drop: { sales: 1.2, loyalty: 1.1 },
};

const commMod: Record<string, { image: number; sales: number }> = {
  tiktok_insta: { image: 1.1, sales: 1.2 },
  press_rp:     { image: 1.5, sales: 0.8 },
  event:        { image: 1.0, sales: 0.9 },
  influencer:   { image: 0.9, sales: 1.3 },
};

const focusMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
  balanced:      { sales: 1,    image: 1,    sustainability: 1,    loyalty: 1    },
  price:         { sales: 1.3,  image: 0.8,  sustainability: 0.7,  loyalty: 0.9  },
  product:       { sales: 0.9,  image: 1.1,  sustainability: 1,    loyalty: 1.2  },
  image:         { sales: 0.8,  image: 1.4,  sustainability: 0.8,  loyalty: 1    },
  sustainability:{ sales: 0.7,  image: 1,    sustainability: 1.5,  loyalty: 1.1  },
};

// ── Effect resolution ────────────────────────────────────────────────────────
function effectMatchesProduct(p: Product, eff: SimpleEffect): boolean {
  if (eff.type === 'global') return true;
  const targets = eff.target?.split(',').map(t => t.trim()) ?? [];
  if (eff.type === 'channel_boost')      return targets.includes(p.comm_channel);
  if (eff.type === 'supplier_mod')       return targets.includes(p.supplier);
  if (eff.type === 'style_boost')        return targets.includes(p.style);
  if (eff.type === 'distribution_boost') return targets.includes(p.distribution);
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

function resolveEffectsForProduct(p: Product, base: BaseScores, events: MarketEvent[]): SimpleEffect[] {
  const resolved: SimpleEffect[] = [];
  for (const event of events) {
    if (!event.active) continue;
    const rawJson = event.effect_json as any;
    const entries: MarketEffectEntry[] = Array.isArray(rawJson) ? rawJson : rawJson ? [rawJson] : [];

    for (const entry of entries) {
      if (entry.type === 'conditional') {
        const ce = entry as ConditionalEffect;
        const fieldVal = ce.condition_field.startsWith('score_')
          ? (base as any)[ce.condition_field]
          : (p as any)[ce.condition_field];

        let met = false;
        if (ce.condition_op === '>')  met = Number(fieldVal) > Number(ce.condition_value);
        if (ce.condition_op === '<=') met = Number(fieldVal) <= Number(ce.condition_value);
        if (ce.condition_op === '=')  met = String(fieldVal) === String(ce.condition_value);

        const picked = met ? ce.then_effect : ce.else_effect;
        if (effectMatchesProduct(p, picked)) resolved.push(picked);
      } else {
        const se = entry as SimpleEffect;
        if (effectMatchesProduct(p, se)) resolved.push(se);
      }
    }
  }
  return resolved;
}

// Saturation: products competing on same comm_channel + style lose sales
function computeProductSaturation(p: Product, allProducts: Product[]): number {
  if (allProducts.length <= 1) return 1.0;
  const n = allProducts.length;
  const sameChannel = allProducts.filter(pr => pr.comm_channel === p.comm_channel).length;
  const sameStyle   = allProducts.filter(pr => pr.style === p.style).length;
  const channelDensity = (sameChannel - 1) / (n - 1);
  const styleDensity   = (sameStyle   - 1) / (n - 1);
  const maxDensity = Math.max(channelDensity, styleDensity);
  return Math.round((1.1 - maxDensity * 0.35) * 1000) / 1000;
}

// ── Per-product score ────────────────────────────────────────────────────────
function scoreProduct(p: Product, allProducts: Product[], events: MarketEvent[]): BaseScores {
  const sm  = supplierMod[p.supplier]   ?? supplierMod.usine_europe;
  const sty = styleSalesMod[p.style]    ?? 0.75;
  const pf  = priceTierFactor[p.price_tier] ?? 0.70;
  const dm  = distributionMod[p.distribution] ?? distributionMod.ecommerce;
  const cm  = commMod[p.comm_channel]   ?? commMod.tiktok_insta;
  const sat = computeProductSaturation(p, allProducts);
  const jitter = () => 0.85 + Math.random() * 0.30;

  // Budget factor (saturates at 40k per product)
  const b = Math.min(p.budget / 20_000, 2.0);

  const base: BaseScores = {
    score_ventes:     Math.round(sm.sales         * b * dm.sales * cm.sales * pf * sty * sat * jitter() * 50),
    score_image:      Math.round(sm.image         * b * cm.image * pf             * jitter() * 100),
    score_durabilite: Math.round(sm.sustainability * b                             * jitter() * 100),
    score_fidelite:   Math.round(sm.loyalty        * b * dm.loyalty                * jitter() * 100),
  };

  const effects = resolveEffectsForProduct(p, base, events);
  const s = { ventes: base.score_ventes, image: base.score_image, durabilite: base.score_durabilite, fidelite: base.score_fidelite };
  for (const eff of effects) applySimpleEffect(s, eff);

  return {
    score_ventes:     Math.max(0, Math.min(100, s.ventes)),
    score_image:      Math.max(0, Math.min(100, s.image)),
    score_durabilite: Math.max(0, Math.min(100, s.durabilite)),
    score_fidelite:   Math.max(0, Math.min(100, s.fidelite)),
  };
}

// ── Main computation (product-centric) ──────────────────────────────────────
export function computeRoundResults(
  decisions: Decision[],
  products: Product[],
  activeEvents: MarketEvent[] = []
): Map<string, Scores> {
  const out = new Map<string, Scores>();

  for (const d of decisions) {
    const teamProducts = products.filter(p => p.team_id === d.team_id);
    if (teamProducts.length === 0) {
      out.set(d.team_id, { score_ventes: 0, score_image: 0, score_durabilite: 0, score_fidelite: 0, score_global: 0 });
      continue;
    }

    const fm = focusMod[d.brand_focus ?? 'balanced'] ?? focusMod.balanced;
    const totalBudget = teamProducts.reduce((s, p) => s + p.budget, 0) || 1;

    // Score each product, weighted by its budget share
    let wVentes = 0, wImage = 0, wDurabilite = 0, wFidelite = 0;
    for (const p of teamProducts) {
      const weight = p.budget / totalBudget;
      const ps = scoreProduct(p, products, activeEvents); // all products for saturation
      wVentes     += ps.score_ventes     * weight;
      wImage      += ps.score_image      * weight;
      wDurabilite += ps.score_durabilite * weight;
      wFidelite   += ps.score_fidelite   * weight;
    }

    // Apply brand_focus multiplier
    const s = {
      ventes:     Math.max(0, Math.min(100, Math.round(wVentes     * fm.sales))),
      image:      Math.max(0, Math.min(100, Math.round(wImage      * fm.image))),
      durabilite: Math.max(0, Math.min(100, Math.round(wDurabilite * fm.sustainability))),
      fidelite:   Math.max(0, Math.min(100, Math.round(wFidelite   * fm.loyalty))),
    };

    const score_global = Math.round(s.ventes * 0.3 + s.image * 0.3 + s.durabilite * 0.2 + s.fidelite * 0.2);

    out.set(d.team_id, {
      score_ventes: s.ventes, score_image: s.image,
      score_durabilite: s.durabilite, score_fidelite: s.fidelite, score_global,
    });
  }

  return out;
}

// Legacy compatibility — kept for older calls that don't pass products
export function computeRoundResultsLegacy(
  decisions: Decision[],
  activeEvents: MarketEvent[] = []
): Map<string, Scores> {
  // Convert decisions to pseudo-products
  const pseudoProducts: Product[] = decisions.map(d => ({
    id: d.id,
    team_id: d.team_id,
    session_id: d.session_id ?? '',
    round_number: d.round_number,
    name: 'produit',
    category: 'haut',
    style: d.collection_style ?? 'casual_luxe',
    supplier: d.supplier ?? 'usine_europe',
    price_tier: d.price_tier ?? 'milieu',
    distribution: d.distribution ?? 'ecommerce',
    comm_channel: d.comm_channel ?? 'tiktok_insta',
    budget: (d.budget_fournisseur ?? 0) + (d.budget_collection ?? 0) + (d.budget_prix ?? 0) + (d.budget_distribution ?? 0) + (d.budget_communication ?? 0),
    created_at: '',
  }));
  return computeRoundResults(decisions, pseudoProducts, activeEvents);
}

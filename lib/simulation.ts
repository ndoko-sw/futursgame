import { Decision, MarketEvent, Product, SimpleEffect, ConditionalEffect, MarketEffectEntry } from './types';

type BaseScores = {
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
};

type Scores = BaseScores & { score_global: number };

type ProductScore = BaseScores & { ca: number };

// Base multipliers per supplier
const supplierBase: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
  atelier_abidjan:    { sales: 0.75, image: 0.90, sustainability: 0.98, loyalty: 0.85 },
  usine_europe:       { sales: 0.85, image: 0.80, sustainability: 0.70, loyalty: 0.80 },
  fast_fashion_asie:  { sales: 1.00, image: 0.40, sustainability: 0.25, loyalty: 0.50 },
  capsule_artisanale: { sales: 0.55, image: 0.98, sustainability: 0.90, loyalty: 0.90 },
  collab_createur:    { sales: 0.80, image: 0.90, sustainability: 0.60, loyalty: 0.75 },
};

const styleSalesMod: Record<string, number> = {
  casual_luxe: 0.95, streetwear: 0.90, techwear: 0.80, avant_garde: 0.85, minimaliste: 0.88,
};

const priceTierFactor: Record<string, number> = {
  accessible: 0.70, milieu: 0.85, premium: 1.15, luxe: 1.70,
};

// Prix par tier (pour CA)
const PRICE_PER_UNIT: Record<string, number> = {
  accessible: 35,
  milieu: 90,
  premium: 220,
  luxe: 500,
};

// Per-channel modifiers for distribution
const distChannelMod: Record<string, { sales: number; loyalty: number }> = {
  ecommerce:   { sales: 1.10, loyalty: 1.00 },
  popup:       { sales: 0.90, loyalty: 1.40 },
  multibrand:  { sales: 1.00, loyalty: 0.90 },
  wholesale:   { sales: 1.30, loyalty: 0.80 },
  social_drop: { sales: 1.20, loyalty: 1.10 },
};

// Per-channel modifiers for communication
const commChannelMod: Record<string, { image: number; sales: number }> = {
  tiktok:     { image: 1.10, sales: 1.20 },
  press:      { image: 1.50, sales: 0.80 },
  event:      { image: 1.00, sales: 0.90 },
  influencer: { image: 0.90, sales: 1.30 },
};

const focusMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
  balanced:      { sales: 1,    image: 1,    sustainability: 1,    loyalty: 1    },
  price:         { sales: 1.3,  image: 0.8,  sustainability: 0.7,  loyalty: 0.9  },
  product:       { sales: 0.9,  image: 1.1,  sustainability: 1,    loyalty: 1.2  },
  image:         { sales: 0.8,  image: 1.4,  sustainability: 0.8,  loyalty: 1    },
  sustainability:{ sales: 0.7,  image: 1,    sustainability: 1.5,  loyalty: 1.1  },
};

// Amplificateur budgétaire : [0, 1] — s'ajoute au socle de 1.0
function budgetAmp(amount: number, scale: number): number {
  return Math.min(1.0, Math.sqrt(Math.max(0, amount) / scale));
}

export function computeProductCA(score_ventes: number, price_tier: string): number {
  const units = score_ventes * 25;
  return units * (PRICE_PER_UNIT[price_tier] ?? 90);
}

// Weighted average of channel mods by budget share
function weightedDistMod(p: Product): { sales: number; loyalty: number } {
  const channels: Array<{ key: string; budget: number }> = [
    { key: 'ecommerce',   budget: p.budget_dist_ecommerce   ?? 0 },
    { key: 'popup',       budget: p.budget_dist_popup       ?? 0 },
    { key: 'multibrand',  budget: p.budget_dist_multibrand  ?? 0 },
    { key: 'wholesale',   budget: p.budget_dist_wholesale   ?? 0 },
    { key: 'social_drop', budget: p.budget_dist_social_drop ?? 0 },
  ];
  const total = channels.reduce((s, c) => s + c.budget, 0);
  if (total === 0) return { sales: 1.0, loyalty: 1.0 };
  let sales = 0, loyalty = 0;
  for (const c of channels) {
    const w = c.budget / total;
    const m = distChannelMod[c.key] ?? distChannelMod.ecommerce;
    sales   += m.sales   * w;
    loyalty += m.loyalty * w;
  }
  return { sales, loyalty };
}

function weightedCommMod(p: Product): { image: number; sales: number } {
  const channels: Array<{ key: string; budget: number }> = [
    { key: 'tiktok',     budget: p.budget_comm_tiktok     ?? 0 },
    { key: 'press',      budget: p.budget_comm_press      ?? 0 },
    { key: 'event',      budget: p.budget_comm_event      ?? 0 },
    { key: 'influencer', budget: p.budget_comm_influencer ?? 0 },
  ];
  const total = channels.reduce((s, c) => s + c.budget, 0);
  if (total === 0) return { image: 1.0, sales: 1.0 };
  let image = 0, sales = 0;
  for (const c of channels) {
    const w = c.budget / total;
    const m = commChannelMod[c.key] ?? commChannelMod.tiktok;
    image += m.image * w;
    sales += m.sales * w;
  }
  return { image, sales };
}

function productTotalBudget(p: Product): number {
  return (p.budget_supplier ?? 0) + (p.budget_collection ?? 0) +
    (p.budget_comm_tiktok ?? 0) + (p.budget_comm_press ?? 0) + (p.budget_comm_event ?? 0) + (p.budget_comm_influencer ?? 0) +
    (p.budget_dist_ecommerce ?? 0) + (p.budget_dist_popup ?? 0) + (p.budget_dist_multibrand ?? 0) + (p.budget_dist_wholesale ?? 0) + (p.budget_dist_social_drop ?? 0);
}

// ── Effect resolution ────────────────────────────────────────────────────────
function effectMatchesProduct(p: Product, eff: SimpleEffect): boolean {
  if (eff.type === 'global') return true;
  const targets = eff.target?.split(',').map(t => t.trim()) ?? [];
  if (eff.type === 'supplier_mod')       return targets.includes(p.supplier);
  if (eff.type === 'style_boost')        return targets.includes(p.style);
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

// Saturation: products competing on same style lose sales
function computeProductSaturation(p: Product, allProducts: Product[]): number {
  if (allProducts.length <= 1) return 1.0;
  const n = allProducts.length;
  const sameStyle = allProducts.filter(pr => pr.style === p.style).length;
  const styleDensity = (sameStyle - 1) / (n - 1);
  return Math.round((1.1 - styleDensity * 0.35) * 1000) / 1000;
}

// ── Per-product score using per-channel budgets (budget AMPLIFIES, does not GATE) ──
function scoreProduct(p: Product, allProducts: Product[], events: MarketEvent[]): ProductScore {
  const sm  = supplierBase[p.supplier]      ?? supplierBase.usine_europe;
  const sty = styleSalesMod[p.style]        ?? 0.75;
  const pf  = priceTierFactor[p.price_tier] ?? 0.70;
  const dm  = weightedDistMod(p);
  const cm  = weightedCommMod(p);
  const sat = computeProductSaturation(p, allProducts);

  const totalComm = (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0);
  const totalDist = (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0);

  // Amplificateurs budget (0 à 1 chacun)
  const ampSup  = budgetAmp(p.budget_supplier   ?? 0, 12_000);
  const ampColl = budgetAmp(p.budget_collection ?? 0, 10_000);
  const ampComm = budgetAmp(totalComm,               18_000);
  const ampDist = budgetAmp(totalDist,               18_000);

  // Qualité intrinsèque (décisions seulement, sans budget)
  const qVentes = sm.sales * pf * sty * sat * dm.sales * cm.sales;
  const qImage  = sm.image * pf * cm.image;
  const qDurab  = sm.sustainability;
  const qFidel  = sm.loyalty * dm.loyalty;

  // Score = qualité × (socle 1.0 + amplificateurs) × constante
  // Plancher ≈ 20-35 pour bonne qualité, plafond ≈ 90 avec full budget
  const base: BaseScores = {
    score_ventes:     Math.round(qVentes * (1 + ampSup + ampDist)              * 35),
    score_image:      Math.round(qImage  * (1 + ampSup + ampComm + ampColl)    * 28),
    score_durabilite: Math.round(qDurab  * (1 + ampSup + ampColl)              * 45),
    score_fidelite:   Math.round(qFidel  * (1 + ampSup + ampDist + ampColl)   * 28),
  };

  const effects = resolveEffectsForProduct(p, base, events);
  const s = { ventes: base.score_ventes, image: base.score_image, durabilite: base.score_durabilite, fidelite: base.score_fidelite };
  for (const eff of effects) applySimpleEffect(s, eff);

  const sv = Math.max(0, Math.min(100, s.ventes));
  return {
    score_ventes:     sv,
    score_image:      Math.max(0, Math.min(100, s.image)),
    score_durabilite: Math.max(0, Math.min(100, s.durabilite)),
    score_fidelite:   Math.max(0, Math.min(100, s.fidelite)),
    ca: computeProductCA(sv, p.price_tier),
  };
}

export function computeInvestorGrade(
  scoreGlobal: number,
  scoreDurab: number,
  prevScoreGlobal: number | null
): { grade: string; subsidy: number } {
  const delta = prevScoreGlobal !== null ? (scoreGlobal - prevScoreGlobal) / 100 : 0;
  const raw = scoreGlobal * 0.35 + scoreDurab * 0.30 + Math.max(-1, Math.min(1, delta)) * 35;

  if (raw >= 72) return { grade: 'A', subsidy: 20_000 };
  if (raw >= 58) return { grade: 'B', subsidy: 10_000 };
  if (raw >= 44) return { grade: 'C', subsidy: 0 };
  if (raw >= 30) return { grade: 'D', subsidy: 0 };
  if (raw >= 16) return { grade: 'E', subsidy: -5_000 };
  return { grade: 'F', subsidy: -15_000 };
}

// ── Main computation (product-centric) ──────────────────────────────────────
export function computeRoundResults(
  decisions: Decision[],
  products: Product[],
  activeEvents: MarketEvent[] = []
): Map<string, Scores & { productScores: Record<string, { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number }> }> {
  const out = new Map<string, Scores & { productScores: Record<string, { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number }> }>();

  for (const d of decisions) {
    const teamProducts = products.filter(p => p.team_id === d.team_id);
    if (teamProducts.length === 0) {
      out.set(d.team_id, { score_ventes: 0, score_image: 0, score_durabilite: 0, score_fidelite: 0, score_global: 0, productScores: {} });
      continue;
    }

    const fm = focusMod[d.brand_focus ?? 'balanced'] ?? focusMod.balanced;
    const totalBudget = teamProducts.reduce((s, p) => s + productTotalBudget(p), 0) || 1;

    let wVentes = 0, wImage = 0, wDurabilite = 0, wFidelite = 0;
    const productScores: Record<string, { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number }> = {};
    for (const p of teamProducts) {
      const weight = productTotalBudget(p) / totalBudget;
      const ps = scoreProduct(p, products, activeEvents);
      productScores[p.id] = ps;
      wVentes     += ps.score_ventes     * weight;
      wImage      += ps.score_image      * weight;
      wDurabilite += ps.score_durabilite * weight;
      wFidelite   += ps.score_fidelite   * weight;
    }

    const s = {
      ventes:     Math.max(0, Math.min(100, Math.round(wVentes     * fm.sales))),
      image:      Math.max(0, Math.min(100, Math.round(wImage      * fm.image))),
      durabilite: Math.max(0, Math.min(100, Math.round(wDurabilite * fm.sustainability))),
      fidelite:   Math.max(0, Math.min(100, Math.round(wFidelite   * fm.loyalty))),
    };

    // Bonus score_global (cohérence décisionnelle)
    const spentBudget = teamProducts.reduce((sum, p) => sum + productTotalBudget(p), 0);
    const totalBudgetAvail = (d as any).budget_available ?? spentBudget;
    const efficiencyBonus = totalBudgetAvail > 0 ? Math.min(0.10, 0.10 * (spentBudget / totalBudgetAvail)) : 0;

    // Cohérence focus/dépenses
    const focusKey = d.brand_focus ?? 'balanced';
    const spendByCategory = {
      comm: teamProducts.reduce((sum,p) => sum+(p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0), 0),
      dist: teamProducts.reduce((sum,p) => sum+(p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0), 0),
      coll: teamProducts.reduce((sum,p) => sum+(p.budget_collection??0), 0),
      supp: teamProducts.reduce((sum,p) => sum+(p.budget_supplier??0), 0),
    };
    const topCategory = Object.entries(spendByCategory).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const focusCoherenceMap: Record<string, string> = { image:'comm', price:'dist', product:'coll', sustainability:'coll', balanced:'' };
    const focusBonus = (focusKey !== 'balanced' && topCategory === focusCoherenceMap[focusKey]) ? 0.05 : 0;

    // Synergy comm+dist
    const hasCommAndDist = spendByCategory.comm > 0 && spendByCategory.dist > 0;
    const synergyBonus = hasCommAndDist ? 0.03 : 0;

    const rawGlobal = s.ventes * 0.30 + s.image * 0.25 + s.durabilite * 0.20 + s.fidelite * 0.25;
    const score_global = Math.max(0, Math.min(100, Math.round(rawGlobal * (1 + efficiencyBonus + focusBonus + synergyBonus))));

    out.set(d.team_id, { score_ventes: s.ventes, score_image: s.image, score_durabilite: s.durabilite, score_fidelite: s.fidelite, score_global, productScores });
  }

  return out;
}

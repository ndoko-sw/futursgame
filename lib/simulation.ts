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

// ── Phase 1 : ressources partagées & marque ──────────────────────────────────
// Capacité fournisseur : nb d'équipes servies en priorité par tour
const SUPPLIER_CAPACITY: Record<string, number> = {
  capsule_artisanale: 1, atelier_abidjan: 2, collab_createur: 2, usine_europe: 3, fast_fashion_asie: 4,
};
// Demande de marché par style (pool relatif ; sert au partage entre équipes)
const STYLE_DEMAND: Record<string, number> = {
  casual_luxe: 1.0, streetwear: 1.15, techwear: 0.85, avant_garde: 0.8, minimaliste: 1.0,
};
// Synergie valeur de marque ↔ fournisseurs/styles favorisés
const BRAND_VALUE_SYNERGY: Record<string, { suppliers: string[]; styles: string[] }> = {
  panafricain:   { suppliers: ['atelier_abidjan','capsule_artisanale'], styles: ['avant_garde','casual_luxe'] },
  eco:           { suppliers: ['atelier_abidjan','capsule_artisanale','usine_europe'], styles: ['minimaliste'] },
  avant_garde:   { suppliers: ['collab_createur','usine_europe'], styles: ['techwear','avant_garde'] },
  heritage:      { suppliers: ['capsule_artisanale','atelier_abidjan'], styles: ['casual_luxe','minimaliste'] },
  accessible:    { suppliers: ['fast_fashion_asie','usine_europe'], styles: ['streetwear'] },
};
// Positionnement de gamme ↔ tier attendu (cohérence)
const POSITIONING_TIER: Record<string, number> = {
  essentiel: 0.30, democratique: 0.30, contemporain: 0.55, premium: 0.78, luxe: 0.95,
};

// Le prix joue dans deux sens opposés (comme dans la vraie vie) :
// - VOLUME de ventes : plus c'est cher, moins on vend d'unités
const priceVolumeFactor: Record<string, number> = {
  accessible: 1.20, milieu: 1.00, premium: 0.72, luxe: 0.45,
};
// - PRESTIGE (image) : plus c'est cher, plus l'image est désirable
const pricePrestigeFactor: Record<string, number> = {
  accessible: 0.70, milieu: 0.88, premium: 1.18, luxe: 1.45,
};
// Niveau de prestige normalisé d'un tier (pour la cohérence stratégique)
const tierPrestige: Record<string, number> = {
  accessible: 0.20, milieu: 0.45, premium: 0.80, luxe: 1.00,
};

// Profil stratégique des fournisseurs : prestige (haut de gamme), éthique, capacité à scaler
const supplierProfile: Record<string, { prestige: number; ethics: number; scale: number }> = {
  atelier_abidjan:    { prestige: 0.70, ethics: 0.95, scale: 0.50 },
  usine_europe:       { prestige: 0.50, ethics: 0.60, scale: 0.85 },
  fast_fashion_asie:  { prestige: 0.10, ethics: 0.10, scale: 1.00 },
  capsule_artisanale: { prestige: 0.95, ethics: 0.90, scale: 0.30 },
  collab_createur:    { prestige: 0.85, ethics: 0.55, scale: 0.60 },
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

// Activation budgétaire : courbe en S (smoothstep) → [0, 1].
// 0 à budget nul (un produit non financé n'atteint pas le marché),
// montée rapide dans la zone "minimum → optimal", plateau à 1 dès l'optimal
// (inutile de surinvestir). `optimal` = budget où la catégorie est pleinement efficace.
function budgetAmp(amount: number, optimal: number): number {
  const t = Math.max(0, Math.min(1, Math.max(0, amount) / optimal));
  return t * t * (3 - 2 * t); // smoothstep
}

// Budgets "optimaux" par catégorie (au-delà : plateau, pas besoin d'un gros budget)
const OPT_SUPPLIER   = 13_000;
const OPT_COLLECTION = 10_000;
const OPT_COMM       = 15_000;
const OPT_DIST       = 15_000;

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

// ── Cohérence stratégique ────────────────────────────────────────────────────
// Récompense une allocation de budget COHÉRENTE avec la stratégie produit :
// positionnement prix ↔ fournisseur ↔ canaux ↔ focus de marque ↔ tendances marché.
// (Ce n'est PAS de la répartition équitable : c'est de l'alignement, comme dans la vraie vie.)
export type CoherenceSignal = { label: string; good: boolean; weight: number };

export function strategicCoherence(
  p: Product,
  focus: string,
  events: MarketEvent[],
): { mult: number; signals: CoherenceSignal[] } {
  const sp = supplierProfile[p.supplier] ?? supplierProfile.usine_europe;
  const tp = tierPrestige[p.price_tier] ?? 0.45;

  const totalComm = (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0);
  const totalDist = (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0);
  // Part "prestige" de la communication (presse/événement) vs volume (tiktok/influence)
  const commPrestige = totalComm > 0 ? ((p.budget_comm_press??0)+(p.budget_comm_event??0)) / totalComm : 0.5;
  // Part "sélective" de la distribution (popup/multimarque) vs masse (wholesale/social/ecom)
  const distSelective = totalDist > 0 ? ((p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)) / totalDist : 0.5;

  const checks: Array<{ label: string; v: number; weight: number }> = [];

  // 1. Focus de marque ↔ fournisseur
  if (focus === 'image' || focus === 'product') {
    checks.push({ label: 'Fournisseur premium aligné avec un focus haut de gamme', v: sp.prestige, weight: 1.0 });
  } else if (focus === 'price') {
    checks.push({ label: 'Fournisseur capable de scaler pour un focus prix/volume', v: sp.scale, weight: 1.0 });
  } else if (focus === 'sustainability') {
    checks.push({ label: 'Fournisseur éthique aligné avec un focus durabilité', v: sp.ethics, weight: 1.0 });
  }

  // 2. Positionnement prix ↔ prestige du fournisseur (un luxe doit avoir un fournisseur premium)
  checks.push({ label: 'Cohérence prix ↔ qualité du fournisseur', v: 1 - Math.abs(tp - sp.prestige), weight: 0.8 });

  // 3. Positionnement prix ↔ type de communication (luxe = presse/event, accessible = tiktok/influence)
  if (totalComm > 0) {
    checks.push({ label: 'Communication adaptée au positionnement prix', v: 1 - Math.abs(tp - commPrestige), weight: 0.7 });
  }

  // 4. Positionnement prix ↔ distribution (luxe = sélectif, accessible = masse)
  if (totalDist > 0) {
    checks.push({ label: 'Distribution adaptée au positionnement prix', v: 1 - Math.abs(tp - distSelective), weight: 0.7 });
  }

  // 5. Focus image ↔ communication prestige / focus prix ↔ communication volume
  if (totalComm > 0 && focus === 'image') {
    checks.push({ label: 'Communication prestige cohérente avec un focus image', v: commPrestige, weight: 0.6 });
  } else if (totalComm > 0 && focus === 'price') {
    checks.push({ label: 'Communication volume cohérente avec un focus prix', v: 1 - commPrestige, weight: 0.6 });
  }

  // 6. Tendance marché ↔ style (surfer une tendance favorable / aller contre une défavorable)
  for (const ev of events) {
    if (ev.active === false) continue;
    const raw = (ev as any).effect_json;
    const entries: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const e of entries) {
      if (e.type === 'style_boost' && typeof e.target === 'string' && e.target.split(',').map((t: string)=>t.trim()).includes(p.style)) {
        if (e.mult > 1) checks.push({ label: `Style aligné avec la tendance "${ev.name ?? 'du moment'}"`, v: 1, weight: 0.8 });
        else if (e.mult < 1) checks.push({ label: `Style à contre-courant de la tendance "${ev.name ?? 'du moment'}"`, v: 0, weight: 0.8 });
      }
    }
  }

  const wTotal = checks.reduce((s, c) => s + c.weight, 0) || 1;
  const V = checks.reduce((s, c) => s + c.v * c.weight, 0) / wTotal; // [0,1], neutre ≈ 0.5
  const mult = Math.max(0.78, Math.min(1.20, 1 + (V - 0.5) * 0.5));

  const signals: CoherenceSignal[] = checks
    .filter(c => c.v >= 0.66 || c.v <= 0.34)
    .map(c => ({ label: c.label, good: c.v >= 0.66, weight: c.weight }))
    .sort((a, b) => b.weight - a.weight);

  return { mult, signals };
}

// ── Per-product score (budget = activation en courbe-S, modulé par la cohérence) ──
function scoreProduct(p: Product, allProducts: Product[], events: MarketEvent[], focus: string): ProductScore {
  const sm   = supplierBase[p.supplier]           ?? supplierBase.usine_europe;
  const sty  = styleSalesMod[p.style]             ?? 0.75;
  const pVol = priceVolumeFactor[p.price_tier]    ?? 1.0;  // volume de ventes (inverse au prix)
  const pPre = pricePrestigeFactor[p.price_tier]  ?? 0.88; // prestige/image (croît avec le prix)
  const dm  = weightedDistMod(p);
  const cm  = weightedCommMod(p);
  const sat = computeProductSaturation(p, allProducts);

  const totalComm = (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0);
  const totalDist = (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0);

  // Activation budgétaire par catégorie (courbe en S, 0 → 1)
  const ampSup  = budgetAmp(p.budget_supplier   ?? 0, OPT_SUPPLIER);
  const ampColl = budgetAmp(p.budget_collection ?? 0, OPT_COLLECTION);
  const ampComm = budgetAmp(totalComm,               OPT_COMM);
  const ampDist = budgetAmp(totalDist,               OPT_DIST);

  // PLAFOND : qualité intrinsèque issue des décisions (fournisseur, style, tier, canaux)
  const qVentes = sm.sales * pVol * sty * sat * dm.sales * cm.sales; // volume ↓ avec le prix
  const qImage  = sm.image * pPre * cm.image;                         // prestige ↑ avec le prix
  const qDurab  = sm.sustainability;
  const qFidel  = sm.loyalty * dm.loyalty;

  // ACTIVATION : fraction du plafond atteinte selon le financement des catégories
  // pertinentes pour chaque KPI. Un KPI a besoin d'investissement dans SES leviers.
  const aVentes = 0.45 * ampDist + 0.30 * ampSup  + 0.25 * ampComm;
  const aImage  = 0.50 * ampComm + 0.30 * ampColl + 0.20 * ampSup;
  const aDurab  = 0.60 * ampSup  + 0.40 * ampColl;
  const aFidel  = 0.40 * ampDist + 0.30 * ampColl + 0.30 * ampSup;

  // Score = plafond(décisions) × activation(budget) × constante d'échelle.
  // Budget nul → activation ≈ 0 → score ≈ 0 (le produit n'atteint pas le marché).
  // Financement malin et MODESTE (~optimal) → activation ≈ 1 → on touche le plafond.
  // Cohérence stratégique : module la réception marché (ventes/image/fidélité fortement,
  // durabilité faiblement car intrinsèque au sourcing).
  const { mult: coh } = strategicCoherence(p, focus, events);
  const cohSoft = 1 + (coh - 1) * 0.4;

  const base: BaseScores = {
    score_ventes:     Math.round(qVentes * aVentes * 75 * coh),
    score_image:      Math.round(qImage  * aImage  * 67 * coh),
    score_durabilite: Math.round(qDurab  * aDurab  * 92 * cohSoft),
    score_fidelite:   Math.round(qFidel  * aFidel  * 96 * coh),
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

// ── Budget réinvesti d'un tour sur l'autre ───────────────────────────────────
// Le budget du tour suivant n'est PAS un simple report : c'est le réinvestissement
// d'une partie du chiffre d'affaires généré, plus l'épargne conservée, une prime
// de bonne gestion et la subvention investisseur — le tout modulé par un
// coefficient de générosité réglé par le GM dès le début de la partie.
export const BUDGET_GENEROSITY_LEVELS = [
  { key: 'tres_severe',   label: 'Très sévère',   g: 0.55, hint: '−45 % · le moindre faux pas se paie' },
  { key: 'severe',        label: 'Sévère',        g: 0.75, hint: '−25 % · marché tendu' },
  { key: 'equilibre',     label: 'Équilibré',     g: 1.00, hint: 'référence' },
  { key: 'genereux',      label: 'Généreux',      g: 1.30, hint: '+30 % · marché porteur' },
  { key: 'tres_genereux', label: 'Très généreux', g: 1.65, hint: "+65 % · âge d'or" },
] as const;

// Constantes du modèle (transparentes pour réglage)
const BGT_SAVINGS_RATE  = 0.40;   // part du budget non dépensé conservée
const BGT_REINVEST_BASE = 0.18;   // part du CA réinjectée (avant générosité)
const BGT_PERF_PER_PT   = 500;    // prime par point de score global
const BGT_REBOUND_BASE  = 12_000; // filet anti-spirale de la mort
const BGT_FLOOR_BASE    = 25_000; // plancher absolu (avant générosité)
const BGT_CEIL          = 400_000;

export function computeNextBudget(params: {
  budgetRemaining: number; // budget non dépensé ce tour
  roundCA: number;         // chiffre d'affaires généré ce tour
  scoreGlobal: number;     // qualité de gestion (0-100)
  subsidy: number;         // subvention/pénalité investisseur
  generosity: number;      // coefficient g (voir BUDGET_GENEROSITY_LEVELS)
}): {
  budgetNext: number;
  breakdown: { carriedSavings: number; revenueReinvest: number; perfBonus: number; adjustedSubsidy: number; rebound: number; floor: number };
} {
  const g = Math.max(0.3, Math.min(2.5, params.generosity || 1));
  const carriedSavings  = Math.max(0, params.budgetRemaining) * BGT_SAVINGS_RATE;
  const revenueReinvest = Math.max(0, params.roundCA) * BGT_REINVEST_BASE * g;
  const perfBonus       = Math.max(0, params.scoreGlobal) * BGT_PERF_PER_PT * g;
  const adjustedSubsidy = params.subsidy * g;
  const rebound         = BGT_REBOUND_BASE * g;
  const floor           = BGT_FLOOR_BASE * g;

  const raw = carriedSavings + revenueReinvest + perfBonus + adjustedSubsidy + rebound;
  const clamped = Math.max(floor, Math.min(raw, BGT_CEIL));
  const budgetNext = Math.round(clamped / 1000) * 1000; // arrondi au millier

  return { budgetNext, breakdown: { carriedSavings, revenueReinvest, perfBonus, adjustedSubsidy, rebound, floor } };
}

// ── Helpers marque (Phase 1) ─────────────────────────────────────────────────
export function computeBrandEquityGain(notorietyBudget: number, consistent: boolean): number {
  // consistent = même brand_value qu'au tour précédent
  return Math.round(notorietyBudget / 8000 * 4 + (consistent ? 3 : 0));
}

export function computeHype(prevImageScore: number): number {
  // une image forte crée de l'attente pour le prochain lancement
  return prevImageScore >= 65 ? Math.min(100, prevImageScore) : Math.max(0, Math.round(prevImageScore * 0.5));
}

export function generatePressReview(
  ps: { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number },
  productName: string,
): string {
  const { score_ventes: v, score_image: i, score_durabilite: d, score_fidelite: f } = ps;
  const max = Math.max(v, i, d, f);
  if (max < 30) return `« ${productName} » est passé inaperçu cette saison, faute de signal fort.`;
  if (max === i && i >= 60) return `« ${productName} » est salué pour sa désirabilité et son parti pris esthétique.`;
  if (max === d && d >= 60) return `« ${productName} » est loué pour son engagement éthique et la qualité de son sourcing.`;
  if (max === v && v >= 60) return `« ${productName} » signe un carton commercial — la pièce s'est arrachée.`;
  if (max === f && f >= 60) return `« ${productName} » fédère une communauté fidèle qui revient saison après saison.`;
  return `« ${productName} » tire son épingle du jeu sans s'imposer comme une évidence.`;
}

// ── Main computation (product-centric) ──────────────────────────────────────
type ProductScoreOut = { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number };
type TeamResult = Scores & { productScores: Record<string, ProductScoreOut>; leaderKpis: string[]; supplierStatus: string; synergyBonus?: number };

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Fournisseur principal d'une équipe = celui qui équipe le plus de produits
// (départage par budget_supplier total).
function primarySupplier(teamProducts: Product[]): string | null {
  if (teamProducts.length === 0) return null;
  const stats: Record<string, { count: number; budget: number }> = {};
  for (const p of teamProducts) {
    const s = stats[p.supplier] ?? (stats[p.supplier] = { count: 0, budget: 0 });
    s.count += 1;
    s.budget += p.budget_supplier ?? 0;
  }
  return Object.entries(stats).sort((a, b) =>
    b[1].count - a[1].count || b[1].budget - a[1].budget,
  )[0][0];
}

export function computeRoundResults(
  decisions: Decision[],
  products: Product[],
  activeEvents: MarketEvent[] = [],
  teamStats: Record<string, { brand_equity: number; hype: number }> = {},
): Map<string, TeamResult> {
  const out = new Map<string, TeamResult>();

  const teamProductsOf = (teamId: string) => products.filter(p => p.team_id === teamId);
  const focusOf = (d: Decision) => d.brand_focus ?? 'balanced';

  // ── Pass A — fournisseurs partagés ──────────────────────────────────────────
  // Pour chaque fournisseur, classer les équipes qui l'utilisent comme principal
  // par supplier_commitment décroissant. Au-delà de la capacité → 'shortage'.
  const mainSupplierByTeam = new Map<string, string | null>();
  for (const d of decisions) mainSupplierByTeam.set(d.team_id, primarySupplier(teamProductsOf(d.team_id)));

  const teamsBySupplier: Record<string, Decision[]> = {};
  for (const d of decisions) {
    const sup = mainSupplierByTeam.get(d.team_id);
    if (!sup) continue;
    (teamsBySupplier[sup] ??= []).push(d);
  }

  const supplierStatusByTeam = new Map<string, string>();
  for (const [sup, teamDecs] of Object.entries(teamsBySupplier)) {
    if (teamDecs.length <= 1) {
      for (const d of teamDecs) supplierStatusByTeam.set(d.team_id, 'ok');
      continue;
    }
    const cap = SUPPLIER_CAPACITY[sup] ?? 2;
    const ranked = [...teamDecs].sort((a, b) => (b.supplier_commitment ?? 0) - (a.supplier_commitment ?? 0));
    ranked.forEach((d, idx) => supplierStatusByTeam.set(d.team_id, idx < cap ? 'priority' : 'shortage'));
  }

  // ── Pass B — scores produit de base + pénalité shortage + synergies marque ──
  // teamStyleStrength[teamId][style] = somme des score_ventes (post-synergie) des
  // produits de ce style. Sert au partage de demande du Pass C.
  type ScoredProduct = { product: Product; base: ProductScoreOut };
  const scoredByTeam = new Map<string, ScoredProduct[]>();
  const teamStyleStrength = new Map<string, Record<string, number>>();

  for (const d of decisions) {
    const teamProducts = teamProductsOf(d.team_id);
    const focus = focusOf(d);
    const teamMain = mainSupplierByTeam.get(d.team_id);
    const shortage = supplierStatusByTeam.get(d.team_id) === 'shortage';
    const synergy = BRAND_VALUE_SYNERGY[d.brand_value ?? 'panafricain'];
    const posTier = POSITIONING_TIER[d.brand_positioning ?? 'contemporain'] ?? 0.55;

    const scored: ScoredProduct[] = [];
    const strength: Record<string, number> = {};

    for (const p of teamProducts) {
      const ps = scoreProduct(p, products, activeEvents, focus);
      let sv = ps.score_ventes, si = ps.score_image, sd = ps.score_durabilite, sf = ps.score_fidelite;

      // Pénalité production si le fournisseur principal est en pénurie (uniquement
      // sur les produits issus de CE fournisseur).
      if (shortage && p.supplier === teamMain) {
        sv *= 0.78;
        sf *= 0.88;
      }

      // Synergie valeur de marque : supplier OU style favorisé → +8% image/fidélité
      if (synergy && (synergy.suppliers.includes(p.supplier) || synergy.styles.includes(p.style))) {
        si *= 1.08;
        sf *= 1.08;
      }

      // Cohérence positionnement de gamme ↔ prix : écart faible → bonus, fort → malus
      const tp = tierPrestige[p.price_tier] ?? 0.45;
      const gap = Math.abs(tp - posTier);
      const posMult = 1 + (0.18 - gap) * 0.18; // gap 0 → ~+3%, gap 1 → ~-1.5%
      sv *= posMult;
      si *= posMult;

      const out: ProductScoreOut = {
        score_ventes: clamp100(sv),
        score_image: clamp100(si),
        score_durabilite: clamp100(sd),
        score_fidelite: clamp100(sf),
        ca: ps.ca,
      };
      scored.push({ product: p, base: out });
      strength[p.style] = (strength[p.style] ?? 0) + out.score_ventes;
    }

    scoredByTeam.set(d.team_id, scored);
    teamStyleStrength.set(d.team_id, strength);
  }

  // ── Pass C — demande partagée par style ─────────────────────────────────────
  // Les équipes qui se ruent sur le même style se partagent un pool de demande.
  // Formule (par style s, équipe t) :
  //   mult = STYLE_DEMAND[s] * (0.6 + 0.4 * teamStrength/maxStrength)
  //          puis, si N>1 équipes sur ce style, on atténue par 1/sqrt(N) pondéré
  //          par la part de l'équipe : att = part + (1-part)/sqrt(N).
  //   Une équipe SEULE sur un style → N=1, att=1, part=1 → ~100% (pas de pénalité).
  //   Résultat borné [0.4, 1.25].
  const styleTotals: Record<string, number> = {};
  const styleMax: Record<string, number> = {};
  const styleTeamCount: Record<string, number> = {};
  for (const d of decisions) {
    const strength = teamStyleStrength.get(d.team_id) ?? {};
    for (const style of Object.keys(strength)) {
      const val = strength[style];
      if (val <= 0) continue;
      styleTotals[style] = (styleTotals[style] ?? 0) + val;
      styleMax[style] = Math.max(styleMax[style] ?? 0, val);
      styleTeamCount[style] = (styleTeamCount[style] ?? 0) + 1;
    }
  }

  for (const d of decisions) {
    const scored = scoredByTeam.get(d.team_id) ?? [];
    const strength = teamStyleStrength.get(d.team_id) ?? {};
    for (const sp of scored) {
      const style = sp.product.style;
      const teamStrength = strength[style] ?? 0;
      if (teamStrength <= 0) continue;
      const demand = STYLE_DEMAND[style] ?? 1.0;
      const maxStr = styleMax[style] || 1;
      const n = styleTeamCount[style] ?? 1;
      const part = teamStrength / (styleTotals[style] || teamStrength);
      const att = n > 1 ? part + (1 - part) / Math.sqrt(n) : 1;
      let mult = demand * (0.6 + 0.4 * (teamStrength / maxStr)) * att;
      mult = Math.max(0.4, Math.min(1.25, mult));
      sp.base.score_ventes = clamp100(sp.base.score_ventes * mult);
    }
  }

  // ── Pass D — agrégation marque + brand equity & hype ────────────────────────
  for (const d of decisions) {
    const scored = scoredByTeam.get(d.team_id) ?? [];
    const focus = focusOf(d);
    const fm = focusMod[focus] ?? focusMod.balanced;
    const stats = teamStats[d.team_id] ?? { brand_equity: 0, hype: 0 };

    if (scored.length === 0) {
      out.set(d.team_id, {
        score_ventes: 0, score_image: 0, score_durabilite: 0, score_fidelite: 0, score_global: 0,
        productScores: {}, leaderKpis: [], supplierStatus: supplierStatusByTeam.get(d.team_id) ?? 'ok',
      });
      continue;
    }

    const weight = 1 / scored.length;
    let wVentes = 0, wImage = 0, wDurabilite = 0, wFidelite = 0;
    const productScores: Record<string, ProductScoreOut> = {};
    for (const sp of scored) {
      productScores[sp.product.id] = sp.base;
      wVentes += sp.base.score_ventes * weight;
      wImage += sp.base.score_image * weight;
      wDurabilite += sp.base.score_durabilite * weight;
      wFidelite += sp.base.score_fidelite * weight;
    }

    let ventes = wVentes * fm.sales;
    let image = wImage * fm.image;
    let durabilite = wDurabilite * fm.sustainability;
    let fidelite = wFidelite * fm.loyalty;

    // Brand equity : bonus persistant d'image & fidélité
    const equityBonus = Math.round((stats.brand_equity ?? 0) / 40);
    image += equityBonus;
    fidelite += equityBonus;

    // Hype : forte attente → ventes boostées, mais décevoir l'attente pénalise la fidélité
    if ((stats.hype ?? 0) > 0) {
      ventes *= 1 + stats.hype / 600;
      if (image < stats.hype - 18) fidelite *= 0.9;
    }

    const s = {
      ventes: clamp100(ventes),
      image: clamp100(image),
      durabilite: clamp100(durabilite),
      fidelite: clamp100(fidelite),
    };

    // Synergie marque : communication (portée) ET distribution (conversion)
    const teamProducts = scored.map(sp => sp.product);
    const commTotal = teamProducts.reduce((sum,p) => sum+(p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0), 0);
    const distTotal = teamProducts.reduce((sum,p) => sum+(p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0), 0);
    const synergyBonus = (commTotal > 0 && distTotal > 0) ? 0.03 : 0;

    const rawGlobal = s.ventes * 0.30 + s.image * 0.25 + s.durabilite * 0.20 + s.fidelite * 0.25;
    const score_global = clamp100(rawGlobal * (1 + synergyBonus));

    out.set(d.team_id, {
      score_ventes: s.ventes, score_image: s.image, score_durabilite: s.durabilite, score_fidelite: s.fidelite,
      score_global, productScores, leaderKpis: [],
      supplierStatus: supplierStatusByTeam.get(d.team_id) ?? 'ok',
      synergyBonus,
    });
  }

  // ── Pass E — bonus leader (top équipe par KPI) ──────────────────────────────
  const KPI_LEADER: Array<{ key: keyof Scores; label: string }> = [
    { key: 'score_ventes', label: 'ventes' },
    { key: 'score_image', label: 'image' },
    { key: 'score_durabilite', label: 'durabilite' },
    { key: 'score_fidelite', label: 'fidelite' },
  ];
  for (const { key, label } of KPI_LEADER) {
    let bestTeam: string | null = null;
    let bestVal = 0;
    out.forEach((r, teamId) => {
      const v = r[key] as number;
      if (v > bestVal) { bestVal = v; bestTeam = teamId; }
    });
    if (bestTeam && bestVal > 0) {
      const r = out.get(bestTeam)!;
      (r as any)[key] = Math.min(100, (r[key] as number) + 5);
      r.leaderKpis.push(label);
    }
  }

  // Recalcule score_global après bonus leader — en réappliquant le micro-bonus
  // synergie comm+dist (+3%) s'il existait, pour rester cohérent avec le calcul initial.
  out.forEach((r) => {
    const rawGlobal = r.score_ventes * 0.30 + r.score_image * 0.25 + r.score_durabilite * 0.20 + r.score_fidelite * 0.25;
    r.score_global = clamp100(rawGlobal * (1 + (r.synergyBonus ?? 0)));
  });

  return out;
}

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

    const focus = d.brand_focus ?? 'balanced';
    const fm = focusMod[focus] ?? focusMod.balanced;

    // Agrégation à POIDS ÉGAL par produit : un produit raté (sous-financé ou mal
    // positionné) tire la moyenne de la marque vers le bas → incitation à le
    // supprimer plutôt qu'à le garder. (Avant : pondération par budget, ce qui
    // effaçait les produits non financés et contredisait le plancher produit.)
    const weight = teamProducts.length > 0 ? 1 / teamProducts.length : 0;

    let wVentes = 0, wImage = 0, wDurabilite = 0, wFidelite = 0;
    const productScores: Record<string, { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number }> = {};
    for (const p of teamProducts) {
      const ps = scoreProduct(p, products, activeEvents, focus);
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

    // La cohérence stratégique (focus ↔ fournisseur ↔ prix ↔ canaux ↔ tendances)
    // est désormais gérée PAR PRODUIT dans scoreProduct. On garde ici une seule
    // synergie de marque : avoir à la fois de la communication (portée) ET de la
    // distribution (conversion) — l'une sans l'autre plafonne les résultats.
    const commTotal = teamProducts.reduce((sum,p) => sum+(p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0), 0);
    const distTotal = teamProducts.reduce((sum,p) => sum+(p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0), 0);
    const synergyBonus = (commTotal > 0 && distTotal > 0) ? 0.03 : 0;

    const rawGlobal = s.ventes * 0.30 + s.image * 0.25 + s.durabilite * 0.20 + s.fidelite * 0.25;
    const score_global = Math.max(0, Math.min(100, Math.round(rawGlobal * (1 + synergyBonus))));

    out.set(d.team_id, { score_ventes: s.ventes, score_image: s.image, score_durabilite: s.durabilite, score_fidelite: s.fidelite, score_global, productScores });
  }

  return out;
}

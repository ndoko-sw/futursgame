import { Decision, RoundResult } from './types';

export function computeRoundResults(
  decisions: Decision[],
  _round: number
): RoundResult[] {
  return decisions.map((d) => {
    const supplierMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
      atelier_abidjan: { sales: 0.6, image: 0.8, sustainability: 0.95, loyalty: 0.75 },
      usine_europe: { sales: 0.75, image: 0.7, sustainability: 0.65, loyalty: 0.7 },
      fast_fashion_asie: { sales: 0.9, image: 0.3, sustainability: 0.2, loyalty: 0.4 },
      capsule_artisanale: { sales: 0.4, image: 0.95, sustainability: 0.85, loyalty: 0.85 },
      collab_createur: { sales: 0.7, image: 0.85, sustainability: 0.55, loyalty: 0.65 },
    };

    const styleMod: Record<string, number> = {
      street: 0.7, afro: 0.8, sport: 0.65, art: 0.9, minimaliste: 0.85,
    };

    const focusMod: Record<string, { sales: number; image: number; sustainability: number; loyalty: number }> = {
      balanced: { sales: 1, image: 1, sustainability: 1, loyalty: 1 },
      price: { sales: 1.3, image: 0.8, sustainability: 0.7, loyalty: 0.9 },
      product: { sales: 0.9, image: 1.1, sustainability: 1, loyalty: 1.2 },
      image: { sales: 0.8, image: 1.4, sustainability: 0.8, loyalty: 1 },
      sustainability: { sales: 0.7, image: 1, sustainability: 1.5, loyalty: 1.1 },
    };

    const sm = supplierMod[d.supplier] ?? supplierMod.usine_europe;
    const sty = styleMod[d.collection_style] ?? 0.7;
    const fm = focusMod[d.brand_focus] ?? focusMod.balanced;

    const volumeFactor = 0.5 + (d.collection_volume / 100) * 0.5;
    const priceFactor = 0.5 + (d.price / 100) * 0.6;
    const commFactor = 0.5 + (d.comm_budget / 100) * 0.5;

    const jitter = () => 0.85 + Math.random() * 0.3;

    const sales = Math.round(sm.sales * volumeFactor * priceFactor * commFactor * fm.sales * sty * jitter() * 100);
    const image = Math.round(sm.image * (1 - d.price / 200) * fm.image * sty * jitter() * 100);
    const sustainability = Math.round(sm.sustainability * (1 - d.collection_volume / 200) * fm.sustainability * jitter() * 100);
    const loyalty = Math.round(sm.loyalty * (1 - d.price / 250) * fm.loyalty * jitter() * 100);

    const brandScore = Math.round(sales * 0.3 + image * 0.3 + sustainability * 0.2 + loyalty * 0.2);

    return {
      id: '',
      team_id: d.team_id,
      round: _round,
      sales,
      image_score: image,
      sustainability_score: sustainability,
      loyalty_score: loyalty,
      brand_score: brandScore,
      market_share: Math.round(brandScore * 0.15 * jitter()) / 100,
    };
  });
}

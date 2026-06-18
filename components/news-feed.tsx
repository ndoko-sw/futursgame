'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FeedItem = {
  id: string;
  kind: 'tendance' | 'annonce' | 'evenement';
  text: string;
  ts: number; // sort key (ms)
};

const STYLE_LABELS: Record<string, string> = {
  casual_luxe: 'casual luxe', streetwear: 'streetwear', techwear: 'techwear',
  avant_garde: 'avant-garde', minimaliste: 'minimaliste',
};
const TIER_LABELS: Record<string, string> = {
  accessible: 'accessible', milieu: 'milieu de gamme', premium: 'premium', luxe: 'luxe',
};
const KIND_PILL: Record<FeedItem['kind'], { icon: string; label: string; color: string }> = {
  tendance:   { icon: '📰', label: 'TENDANCE',  color: '#2B4A8B' },
  annonce:    { icon: '📣', label: 'ANNONCE',   color: '#B86B4B' },
  evenement:  { icon: '⚡', label: 'ÉVÉNEMENT', color: '#6E6F4B' },
};

const ETHICAL_SUPPLIERS = new Set(['atelier_abidjan', 'capsule_artisanale']);

// Generate 3-5 anonymised rumours from aggregated round activity. No team names.
// Pioche aléatoire parmi les rumeurs dont la condition est remplie → varie chaque tour.
function generateRumours(products: any[], baseTs: number): FeedItem[] {
  const candidates: FeedItem[] = [];
  if (products.length === 0) return candidates;

  const styleCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  const supplierCount: Record<string, number> = {};
  for (const p of products) {
    if (p.style) styleCount[p.style] = (styleCount[p.style] ?? 0) + 1;
    if (p.price_tier) tierCount[p.price_tier] = (tierCount[p.price_tier] ?? 0) + 1;
    if (p.supplier) supplierCount[p.supplier] = (supplierCount[p.supplier] ?? 0) + 1;
  }
  const n = products.length;
  let seq = 0;
  const push = (id: string, kind: FeedItem['kind'], text: string) =>
    candidates.push({ id, kind, ts: baseTs - (seq++), text });

  const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0];
  // — Style dominants —
  if (topStyle && topStyle[1] >= 2)
    push('r-style-up', 'tendance', `Les rédactions bruissent : le ${STYLE_LABELS[topStyle[0]] ?? topStyle[0]} est partout cette saison.`);
  if (topStyle && topStyle[1] >= 3)
    push('r-style-dominant', 'tendance', `Convergence de marché : le ${STYLE_LABELS[topStyle[0]] ?? topStyle[0]} écrase tous les autres styles — la saturation guette.`);

  const topTier = Object.entries(tierCount).sort((a, b) => b[1] - a[1])[0];
  if (topTier && topTier[1] >= 2)
    push('r-tier', 'tendance', `Sur les podiums comme en boutique, le ${TIER_LABELS[topTier[0]] ?? topTier[0]} a la cote.`);

  // — Niches et contre-courant —
  const niche = Object.entries(styleCount).filter(([, c]) => c === 1).map(([s]) => s);
  if (niche.length > 0)
    push('r-niche', 'tendance', `Une maison ose un pari ${STYLE_LABELS[niche[0]] ?? niche[0]} à contre-courant — les initiés murmurent.`);
  if (niche.length >= 2)
    push('r-niche2', 'annonce', `Pluralité des visions : plusieurs maisons jouent la carte de la singularité stylistique. La fragmentation du marché profite aux audacieux.`);

  // — Segments de prix —
  if ((tierCount['accessible'] ?? 0) >= 2)
    push('r-priceswar', 'evenement', `Guerre des prix en vue : plusieurs marques se disputent le segment accessible.`);
  if ((tierCount['accessible'] ?? 0) >= 1)
    push('r-accessible-risk', 'annonce', `Le segment accessible attire, mais les marges s'y effilochent — la pression sur les coûts est réelle.`);
  if ((tierCount['luxe'] ?? 0) >= 2)
    push('r-luxe', 'tendance', `Course au luxe : la rareté et l'exclusivité deviennent le nouveau terrain de jeu.`);
  if ((tierCount['luxe'] ?? 0) >= 1)
    push('r-luxe-brand', 'tendance', `Les pièces luxe créent de l'aspiration — mais la clientèle est exigeante, sans droit à l'erreur.`);
  if ((tierCount['premium'] ?? 0) >= 2)
    push('r-premium', 'tendance', `Le premium tient la corde : entre luxe et accessible, c'est le sweet spot de cette saison.`);
  if ((tierCount['milieu'] ?? 0) >= 2)
    push('r-milieu', 'annonce', `Le milieu de gamme se réinvente : les marques cherchent à justifier leur valeur face aux extrêmes.`);

  // — Éthique & fournisseurs —
  const ethicalProducts = products.filter((p) => ETHICAL_SUPPLIERS.has(p.supplier)).length;
  if (ethicalProducts >= 2)
    push('r-ethics', 'tendance', `Vague éthique : le sourcing atelier et capsule artisanale s'impose comme un argument fort.`);
  if (ethicalProducts >= 1)
    push('r-ethics-light', 'annonce', `L'origine des matières intéresse de plus en plus les acheteurs — la traçabilité devient un outil de différenciation.`);
  if ((supplierCount['fast_fashion_asie'] ?? 0) >= 2)
    push('r-fastfashion', 'evenement', `Alerte fast-fashion : la presse spécialisée scrute de près les marques qui misent sur le volume low-cost.`);
  if ((supplierCount['fast_fashion_asie'] ?? 0) >= 1)
    push('r-fastfashion-light', 'annonce', `L'Asie low-cost offre du volume, mais les critiques ESG se font plus virulentes — à surveiller.`);
  if ((supplierCount['usine_europe'] ?? 0) >= 1)
    push('r-europe', 'tendance', `"Made in Europe" revient en force : les consommateurs valorisent la fabrication locale malgré un coût plus élevé.`);
  if ((supplierCount['collab_createur'] ?? 0) >= 1)
    push('r-collab-createur', 'tendance', `Les collabs créateurs font événement — l'édition limitée génère de la rareté et du désir.`);

  // — Tension fournisseur —
  const hotSupplier = Object.entries(supplierCount).sort((a, b) => b[1] - a[1])[0];
  if (hotSupplier && hotSupplier[1] >= 3)
    push('r-supplier-tension', 'evenement', `Rumeur de tension chez un fournisseur très sollicité — les délais et la capacité inquiètent.`);
  if (hotSupplier && hotSupplier[1] >= 2)
    push('r-supplier-crowd', 'annonce', `Plusieurs maisons se retrouvent chez le même fournisseur — la différenciation va se jouer ailleurs que dans la production.`);

  // — Styles spécifiques —
  if ((styleCount['techwear'] ?? 0) >= 1 || (styleCount['avant_garde'] ?? 0) >= 1)
    push('r-techwear', 'tendance', `Le techwear et l'avant-garde montent : les pièces conceptuelles font le buzz sur les réseaux.`);
  if ((styleCount['minimaliste'] ?? 0) >= 1)
    push('r-minimal', 'tendance', `Retour du minimalisme : les lignes épurées séduisent une clientèle en quête de sens.`);
  if ((styleCount['streetwear'] ?? 0) >= 2)
    push('r-street-saturation', 'evenement', `Le streetwear sature : trop de drops similaires, les consommateurs attendent quelque chose de frais.`);
  if ((styleCount['streetwear'] ?? 0) >= 1)
    push('r-street-collab', 'tendance', `Le streetwear reste un terrain de jeu fertile — collabs, drops surprise, éditions capsule.`);
  if ((styleCount['casual_luxe'] ?? 0) >= 2)
    push('r-casual-luxe', 'tendance', `Le casual luxe confirme sa domination : confort et raffinement, une équation que les clients ne veulent plus quitter.`);

  // — Volume & intensité du marché —
  if (n >= 5)
    push('r-dense', 'evenement', `La saison s'annonce chargée : les drops se multiplient, la concurrence s'intensifie sur tous les segments.`);
  if (n >= 3 && n < 5)
    push('r-active', 'annonce', `Marché animé : plusieurs lancements attendus, les acheteurs sont en veille active.`);
  if (n <= 1)
    push('r-calm', 'annonce', `Calme plat sur le marché : peu de lancements, les acheteurs attendent le prochain mouvement.`);
  if (n === 2)
    push('r-quiet', 'annonce', `Saison mesurée : quelques lancements seulement — la rareté crée naturellement de l'attention.`);

  // — Toujours présents (universels) —
  push('r-niche-bet', 'annonce', `Les acheteurs parient sur la niche : une signature forte vaut mieux qu'un large catalogue tiède.`);
  push('r-trend-predict', 'tendance', `Les prévisions des cabinets de tendance s'accordent : l'authenticité et l'histoire de marque priment sur le produit seul.`);
  push('r-brand-story', 'annonce', `L'ère du "brand storytelling" : sans récit convaincant, même le meilleur produit peine à trouver son public.`);
  push('r-retail-pressure', 'evenement', `La distribution indépendante sous pression : les acheteurs multimarques deviennent plus sélectifs, les commandes se réduisent.`);
  push('r-digital-boost', 'tendance', `Les lancements digitaux performent : les marques qui orchestrent le lancement en ligne avant le physique gagnent en visibilité.`);
  push('r-loyalty-key', 'annonce', `Les marques qui fidélisent surpassent celles qui acquièrent — le coût d'acquisition explose, la rétention devient la priorité.`);
  push('r-press-power', 'tendance', `Les rédactrices mode affûtent leur regard : un mauvais press coverage peut refroidir une collection entière.`);
  push('r-season-close', 'evenement', `Fin de saison approche : les marques qui ont su construire une identité forte entrent dans la prochaine avec un avantage réel.`);

  // Mélange aléatoire puis pioche 3-5
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const count = Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3));
  return shuffled.slice(0, count);
}

export default function NewsFeed({ sessionId, round }: { sessionId: string; round: number }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const load = async () => {
      const [evts, bcasts, prods] = await Promise.all([
        supabase.from('market_events').select('*').eq('session_id', sessionId).eq('round_number', round),
        supabase.from('broadcasts').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(6),
        supabase.from('products').select('style, price_tier, supplier').eq('session_id', sessionId).eq('round_number', round),
      ]);
      if (cancelled) return;

      const feed: FeedItem[] = [];
      const baseTs = Date.now();

      for (const ev of (evts.data ?? []) as any[]) {
        if (ev.active === false) continue;
        feed.push({
          id: `ev-${ev.id}`, kind: 'evenement',
          text: `${ev.name}${ev.description ? ' — ' + ev.description : ''}`,
          ts: new Date(ev.created_at ?? baseTs).getTime(),
        });
      }
      for (const b of (bcasts.data ?? []) as any[]) {
        feed.push({
          id: `bc-${b.id}`, kind: 'annonce', text: b.message,
          ts: new Date(b.created_at ?? baseTs).getTime(),
        });
      }
      feed.push(...generateRumours((prods.data ?? []) as any[], baseTs - 100_000));

      feed.sort((a, b) => b.ts - a.ts);
      setItems(feed);
      setLoading(false);
    };
    load();

    const ch = supabase.channel(`newsfeed-${sessionId}-${round}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts', filter: `session_id=eq.${sessionId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_events', filter: `session_id=eq.${sessionId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [sessionId, round]);

  if (loading || items.length === 0) return null;

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="u-eyebrow" style={{ marginBottom: 20 }}>FIL D&apos;ACTU MODE</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(it => {
          const pill = KIND_PILL[it.kind];
          return (
            <div key={it.id} style={{ borderBottom: '1px solid var(--line)', padding: '14px 0', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{pill.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ background: `${pill.color}18`, color: pill.color, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', padding: '2px 6px', marginRight: 8 }}>{pill.label}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{it.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

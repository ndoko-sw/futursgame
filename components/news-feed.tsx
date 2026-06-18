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

// Generate 2-4 anonymised rumours from aggregated round activity. No team names.
function generateRumours(products: any[], baseTs: number): FeedItem[] {
  const out: FeedItem[] = [];
  if (products.length === 0) return out;

  // Style counts
  const styleCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  for (const p of products) {
    if (p.style) styleCount[p.style] = (styleCount[p.style] ?? 0) + 1;
    if (p.price_tier) tierCount[p.price_tier] = (tierCount[p.price_tier] ?? 0) + 1;
  }

  const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0];
  if (topStyle && topStyle[1] >= 2) {
    out.push({
      id: 'rumour-style', kind: 'tendance', ts: baseTs - 1,
      text: `Les rédactions bruissent : le ${STYLE_LABELS[topStyle[0]] ?? topStyle[0]} est partout cette saison.`,
    });
  }

  const topTier = Object.entries(tierCount).sort((a, b) => b[1] - a[1])[0];
  if (topTier && topTier[1] >= 2) {
    out.push({
      id: 'rumour-tier', kind: 'tendance', ts: baseTs - 2,
      text: `Sur les podiums comme en boutique, le ${TIER_LABELS[topTier[0]] ?? topTier[0]} a la cote.`,
    });
  }

  // Rare / niche style spotted
  const niche = Object.entries(styleCount).filter(([, n]) => n === 1).map(([s]) => s);
  if (niche.length > 0) {
    out.push({
      id: 'rumour-niche', kind: 'tendance', ts: baseTs - 3,
      text: `Une maison ose un pari ${STYLE_LABELS[niche[0]] ?? niche[0]} à contre-courant — les initiés murmurent.`,
    });
  }

  // Volume of activity
  if (products.length >= 4) {
    out.push({
      id: 'rumour-buzz', kind: 'tendance', ts: baseTs - 4,
      text: `La saison s'annonce dense : les drops se multiplient, la concurrence s'intensifie.`,
    });
  }

  return out.slice(0, 4);
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
        supabase.from('products').select('style, price_tier').eq('session_id', sessionId).eq('round_number', round),
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

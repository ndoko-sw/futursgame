'use client';

import { useEffect, useState, useRef } from 'react';
import { useGame } from '@/lib/game-context';
import { supabase } from '@/lib/supabase';
import { RoundResult, MarketEvent, Product } from '@/lib/types';

const KPI_CONFIG = [
  { key: 'score_ventes',     label: 'Ventes',     weight: '30%', color: '#2B4A8B', unit: 'k unités', tooltip: 'Nombre estimé de pièces vendues ce tour (score × 25 unités)' },
  { key: 'score_image',      label: 'Image',      weight: '30%', color: '#B86B4B', unit: '/100',      tooltip: "Perception de ta marque par les clients — cohérence, désirabilité, storytelling" },
  { key: 'score_durabilite', label: 'Impact',     weight: '20%', color: '#127a3e', unit: '/100',      tooltip: "Score d'impact positif : sourcing éthique, qualité, longévité des pièces" },
  { key: 'score_fidelite',   label: 'Fidélité',   weight: '20%', color: '#E63329', unit: '/100',      tooltip: "Taux de clients qui reviennent — distribution, expérience, communauté" },
];

const SUPPLIER_LABELS: Record<string, string> = {
  atelier_abidjan: 'Atelier Abidjan', usine_europe: 'Usine Europe',
  fast_fashion_asie: 'Fast Fashion Asie', capsule_artisanale: 'Capsule artisanale',
  collab_createur: 'Collab créateur',
};
const STYLE_LABELS: Record<string, string> = {
  casual_luxe: 'Casual Luxe', streetwear: 'Streetwear', techwear: 'Techwear',
  avant_garde: 'Avant-garde', minimaliste: 'Minimaliste',
};
const FOCUS_LABELS: Record<string, string> = {
  balanced: 'Équilibré', price: 'Prix', product: 'Produit', image: 'Image', sustainability: 'Durabilité',
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k€` : `${n}€`;
}

function productBudgetSum(p: any) {
  return (p.budget_supplier??0)+(p.budget_collection??0)+
    (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0)+
    (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0);
}

function generateRoundFeedback(
  result: RoundResult,
  products: Product[],
  decision: any,
  events: MarketEvent[],
  roundRank: number,
  totalTeams: number
): { worked: string[]; didnt: string[] } {
  const worked: string[] = [];
  const didnt: string[] = [];
  const sv = result.score_ventes ?? 0;
  const si = result.score_image ?? 0;
  const sd = result.score_durabilite ?? 0;
  const sf = result.score_fidelite ?? 0;
  const HIGH = 62, LOW = 38;

  const totalBudget = products.reduce((s,p) => s + productBudgetSum(p), 0) || 1;
  const supplierBudget = products.reduce((s,p) => s + (p.budget_supplier??0), 0);
  const commBudget = products.reduce((s,p) => s + (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0), 0);
  const distBudget = products.reduce((s,p) => s + (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0), 0);
  const collBudget = products.reduce((s,p) => s + (p.budget_collection??0), 0);

  const primarySupplier = products[0]?.supplier ?? '';
  const primaryStyle = products[0]?.style ?? '';
  const focus = decision?.brand_focus ?? 'balanced';
  const FOCUS_LABELS_FB: Record<string,string> = { balanced:'équilibré', price:'prix', product:'produit', image:'image', sustainability:'durabilité' };
  const SUPP_LABELS: Record<string,string> = { atelier_abidjan:'Atelier Abidjan', usine_europe:'Usine Europe', fast_fashion_asie:'Fast Fashion Asie', capsule_artisanale:'Capsule artisanale', collab_createur:'Collab créateur' };

  const budgetRemaining = (result as any).budget_remaining ?? 0;
  const unusedPct = totalBudget > 0 ? budgetRemaining / (budgetRemaining + totalBudget) : 0;

  // Ventes
  if (sv >= HIGH) {
    worked.push(`Ventes solides (${sv}/100) — ${(sv*25/1000).toFixed(1)}k unités vendues`);
    if (distBudget / totalBudget > 0.25) worked.push('L\'investissement en distribution a bien converti');
  } else if (sv < LOW) {
    didnt.push(`Ventes faibles (${sv}/100) — seulement ${(sv*25/1000).toFixed(1)}k unités`);
    if (distBudget / totalBudget < 0.12) didnt.push('La distribution était sous-financée : peu de points de vente actifs');
    if (supplierBudget / totalBudget < 0.1) didnt.push('Le budget fournisseur était trop faible pour tenir les volumes');
  }

  // Image
  if (si >= HIGH) {
    worked.push(`Image de marque forte (${si}/100)`);
    if (commBudget / totalBudget > 0.2) worked.push('La communication a bien construit ta réputation');
    if (['capsule_artisanale','collab_createur','atelier_abidjan'].includes(primarySupplier)) worked.push(`Le fournisseur "${SUPP_LABELS[primarySupplier]}" renforce ta crédibilité`);
  } else if (si < LOW) {
    didnt.push(`Image de marque fragile (${si}/100)`);
    if (commBudget / totalBudget < 0.1) didnt.push('Budget communication trop faible — la marque manque de visibilité');
    if (primarySupplier === 'fast_fashion_asie') didnt.push('Le sourcing fast-fashion fragilise la perception qualité');
  }

  // Durabilite
  if (sd >= HIGH) {
    worked.push(`Impact éthique reconnu (${sd}/100)`);
    if (['atelier_abidjan','capsule_artisanale'].includes(primarySupplier)) worked.push(`"${SUPP_LABELS[primarySupplier]}" : excellent choix pour l'impact positif`);
  } else if (sd < LOW) {
    if (primarySupplier === 'fast_fashion_asie') didnt.push('Le sourcing fast-fashion pénalise fortement l\'impact éthique');
    else if (collBudget / totalBudget < 0.08) didnt.push('Investis dans la qualité collection pour améliorer l\'impact');
  }

  // Fidélite
  if (sf >= HIGH) {
    worked.push(`Fidélité client élevée (${sf}/100) — ta base de fans se consolide`);
  } else if (sf < LOW) {
    didnt.push(`Fidélité faible (${sf}/100) — les clients ne reviennent pas assez`);
    if (collBudget / totalBudget < 0.08) didnt.push('La qualité collection est un levier clé pour fidéliser');
    if (distBudget / totalBudget < 0.1) didnt.push('Améliore la distribution pour renforcer la relation client');
  }

  // Focus
  if (focus !== 'balanced') {
    const fLabel = FOCUS_LABELS_FB[focus] ?? focus;
    if (result.score_global >= 60) worked.push(`Le focus "${fLabel}" était bien aligné avec le marché ce tour`);
    else if (result.score_global < 40) didnt.push(`Le focus "${fLabel}" n'était pas le bon positionnement ce tour`);
  }

  // Budget non utilisé
  if (unusedPct > 0.25) {
    didnt.push(`${Math.round((unusedPct)*100)}% du budget inutilisé — chaque euro investi aurait amélioré tes scores`);
  }

  // Events actifs
  for (const ev of events.filter(e => e.active !== false)) {
    const entries = Array.isArray(ev.effect_json) ? ev.effect_json : ev.effect_json ? [ev.effect_json] : [];
    for (const e of entries as any[]) {
      if (e.type === 'global' && e.mult > 1) { worked.push(`Événement "${ev.name}" : contexte favorable à toutes les marques`); break; }
      if (e.type === 'style_boost' && e.target?.includes(primaryStyle) && e.mult > 1) { worked.push(`Tendance "${ev.name}" : ton style ${primaryStyle} était en vogue !`); break; }
      if (e.type === 'supplier_mod' && e.target?.includes(primarySupplier) && e.mult > 1) { worked.push(`Événement "${ev.name}" : ton fournisseur en a profité`); break; }
      if (e.type === 'style_boost' && e.target?.includes(primaryStyle) && e.mult < 1) { didnt.push(`Tendance "${ev.name}" : ton style ${primaryStyle} était défavorisé ce tour`); break; }
    }
  }

  return { worked: worked.slice(0,4), didnt: didnt.slice(0,4) };
}

export default function ResultsPage() {
  const { session, team, restoring, allTeams, currentRound } = useGame();
  const [results, setResults] = useState<RoundResult[]>([]);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);
  const [localEvents, setLocalEvents] = useState<MarketEvent[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allDecisions, setAllDecisions] = useState<any[]>([]);

  // Suspense animation state
  const [showSuspense, setShowSuspense] = useState(false);
  const [suspensePhase, setSuspensePhase] = useState(0); // 0=hidden, 1=counting, 2=reveal
  const prevRevealed = useRef<boolean | null>(null);
  const [showPostRoundModal, setShowPostRoundModal] = useState(false);

  useEffect(() => {
    if (!team?.id || !session?.id) return;
    Promise.all([
      supabase.from('results').select('*').eq('team_id', team.id).order('round_number', { ascending: true }),
      supabase.from('results').select('*').eq('session_id', session.id).order('round_number', { ascending: true }),
      supabase.from('market_events').select('*').eq('session_id', session.id),
      supabase.from('products').select('*').eq('team_id', team.id).order('round_number', { ascending: true }),
      supabase.from('decisions').select('*').eq('team_id', team.id).order('round_number', { ascending: true }),
    ]).then(([myR, allR, evts, prods, decs]) => {
      if (myR.data) setResults(myR.data as RoundResult[]);
      if (allR.data) setAllResults(allR.data as RoundResult[]);
      if (evts.data) setLocalEvents(evts.data as MarketEvent[]);
      if (prods.data) setAllProducts(prods.data as Product[]);
      if (decs.data) setAllDecisions(decs.data);
    });
  }, [team?.id, session?.id, session?.results_revealed, currentRound]);

  // Detect when results_revealed flips true → trigger reveal sequence
  useEffect(() => {
    const revealed = !!session?.results_revealed;
    if (prevRevealed.current === false && revealed === true) {
      if ((session?.current_round ?? 0) >= 5) {
        // Tour 5 → séquence complète
        setShowSuspense(true);
        setSuspensePhase(0);
        const timers = [
          setTimeout(() => setSuspensePhase(1), 3000),
          setTimeout(() => setSuspensePhase(2), 7000),
          setTimeout(() => setSuspensePhase(3), 11000),
          setTimeout(() => setSuspensePhase(4), 15000),
          setTimeout(() => setSuspensePhase(5), 19000),
          setTimeout(() => setShowSuspense(false), 27000),
        ];
        return () => timers.forEach(clearTimeout);
      } else {
        // Tours 1-4 → modale post-tour après 1.5s (laisse le temps au fetch)
        setTimeout(() => setShowPostRoundModal(true), 1500);
      }
    }
    prevRevealed.current = revealed;
  }, [session?.results_revealed, session?.current_round]);

  // Realtime: refresh when results are inserted
  useEffect(() => {
    if (!team?.id || !session?.id) return;
    const ch = supabase.channel(`results-${team.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results', filter: `session_id=eq.${session.id}` }, () => {
        supabase.from('results').select('*').eq('team_id', team.id).order('round_number', { ascending: true }).then(({ data }) => { if (data) setResults(data as RoundResult[]); });
        supabase.from('results').select('*').eq('session_id', session.id).order('round_number', { ascending: true }).then(({ data }) => { if (data) setAllResults(data as RoundResult[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [team?.id, session?.id]);

  if (restoring) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span></div>;

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre →</button></a>
      </div>
    );
  }

  const lastResult = results[results.length - 1];
  const resultsRevealed = !!session.results_revealed;
  const isFinalRound = currentRound >= 5;

  // ── Modale post-tour (tours 1-4) ─────────────────────────────────────────────
  if (showPostRoundModal && lastResult && currentRound < 5) {
    const roundDec = allDecisions.find(d => d.round_number === lastResult.round_number);
    const roundProds = allProducts.filter(p => p.round_number === lastResult.round_number);
    const roundEvts = localEvents.filter(e => e.active !== false && e.round_number === lastResult.round_number);
    const roundRank = allResults
      .filter(r => r.round_number === lastResult.round_number)
      .sort((a,b) => (b.score_global??0)-(a.score_global??0))
      .findIndex(r => r.team_id === team?.id) + 1;
    const totalTeams = allTeams.length;
    const { worked, didnt } = generateRoundFeedback(lastResult, roundProds, roundDec, roundEvts, roundRank, totalTeams);

    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
        <div style={{ background:'#fff', maxWidth:480, width:'100%', maxHeight:'85vh', overflowY:'auto', position:'relative' }}>
          {/* Header */}
          <div style={{ background:'#121212', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:'.2em', color:'rgba(255,255,255,.5)', textTransform:'uppercase', marginBottom:4 }}>TOUR {lastResult.round_number} · RÉSULTATS</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff', fontFamily:'IBM Plex Mono, monospace' }}>Score : {lastResult.score_global}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginBottom:4 }}>CLASSEMENT</div>
              <div style={{ fontSize:20, fontWeight:700, color: roundRank === 1 ? '#E63329' : '#fff', fontFamily:'IBM Plex Mono, monospace' }}>#{roundRank}/{totalTeams}</div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'var(--line)' }}>
            {[
              { label:'Ventes', key:'score_ventes', color:'#2B4A8B' },
              { label:'Image',  key:'score_image',  color:'#B86B4B' },
              { label:'Impact', key:'score_durabilite', color:'#127a3e' },
              { label:'Fidél.',  key:'score_fidelite', color:'#E63329' },
            ].map(k => {
              const val = (lastResult as any)[k.key] ?? 0;
              return (
                <div key={k.key} style={{ background:'#fff', padding:'14px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>{k.label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:k.color, fontFamily:'IBM Plex Mono, monospace' }}>{val}</div>
                  <div style={{ height:3, background:'var(--fill)', marginTop:8 }}>
                    <div style={{ height:'100%', width:`${val}%`, background:k.color }}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding:'20px 24px' }}>
            {/* Ce qui a fonctionné */}
            {worked.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, letterSpacing:'.15em', textTransform:'uppercase', color:'#127a3e', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span>✓</span> CE QUI A FONCTIONNÉ
                </div>
                {worked.map((w,i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, lineHeight:1.4 }}>
                    <span style={{ color:'#127a3e', flexShrink:0, marginTop:1 }}>↑</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ce qui n'a pas fonctionné */}
            {didnt.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:10, letterSpacing:'.15em', textTransform:'uppercase', color:'#E63329', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span>✗</span> À AMÉLIORER
                </div>
                {didnt.map((d,i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, lineHeight:1.4 }}>
                    <span style={{ color:'#E63329', flexShrink:0, marginTop:1 }}>↓</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Budget prochain tour */}
            <div style={{ background:'var(--fill)', padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>BUDGET TOUR {lastResult.round_number + 1}</div>
              <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:20, fontWeight:700 }}>{fmt((lastResult as any).budget_next ?? 0)}</div>
            </div>

            <button
              onClick={() => setShowPostRoundModal(false)}
              style={{ width:'100%', background:'#121212', color:'#fff', border:0, padding:'14px', fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', cursor:'pointer' }}
            >
              J'AI COMPRIS — CONTINUER →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Séquence de révélation progressive ──────────────────────────────────────
  if (showSuspense) {
    const KPI_PHASES = [
      { key: 'score_ventes',     label: 'VENTES',   color: '#2B4A8B', unit: (v: number) => `${(v*25/1000).toFixed(1)}k unités` },
      { key: 'score_image',      label: 'IMAGE',    color: '#B86B4B', unit: (v: number) => `${v}/100` },
      { key: 'score_durabilite', label: 'IMPACT',   color: '#127a3e', unit: (v: number) => `${v}/100` },
      { key: 'score_fidelite',   label: 'FIDÉLITÉ', color: '#E63329', unit: (v: number) => `${v}/100` },
    ];

    // Phase 0 = suspense, phases 1-4 = un KPI chacun, phase 5 = podium
    const kpiPhase = suspensePhase >= 1 && suspensePhase <= 4 ? KPI_PHASES[suspensePhase - 1] : null;

    if (suspensePhase === 0) {
      return (
        <div style={{ position:'fixed', inset:0, background:'#121212', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, textAlign:'center' }}>
          <style>{`@keyframes rp{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
          <div style={{ fontSize:11, letterSpacing:'.3em', color:'rgba(255,255,255,.4)', textTransform:'uppercase' }}>TOUR {currentRound} · RÉVÉLATION</div>
          <div style={{ fontSize:80, animation:'rp 1s ease infinite' }}>{isFinalRound ? '🏆' : '⚡'}</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', letterSpacing:'.1em' }}>{isFinalRound ? 'Résultats finaux dans quelques secondes…' : 'Les scores arrivent…'}</div>
          <div style={{ display:'flex', gap:8 }}>
            {[0,1,2].map(i=><span key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#fff', animation:`rp .8s ease ${i*.25}s infinite`, display:'inline-block' }}/>)}
          </div>
        </div>
      );
    }

    if (kpiPhase) {
      const roundRes = allResults.filter(r => r.round_number === currentRound);
      const sorted = [...allTeams].map(tm => {
        const r = roundRes.find(r => r.team_id === tm.id);
        const val = r ? ((r as any)[kpiPhase.key] ?? 0) : 0;
        return { tm, val, isMe: tm.id === team?.id };
      }).sort((a,b) => b.val - a.val);
      const maxVal = Math.max(...sorted.map(s => s.val), 1);

      return (
        <div style={{ position:'fixed', inset:0, background:'#0a0a0a', zIndex:100, display:'flex', flexDirection:'column', padding:'48px 32px' }}>
          <style>{`@keyframes rb{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ fontSize:10, letterSpacing:'.3em', color:'rgba(255,255,255,.35)', textTransform:'uppercase', marginBottom:16 }}>TOUR {currentRound} · RÉVÉLATION</div>
          <div style={{ fontSize:52, fontWeight:900, color:kpiPhase.color, letterSpacing:'.04em', marginBottom:40, animation:'rb .5s ease forwards' }}>{kpiPhase.label}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:22, flex:1, justifyContent:'center' }}>
            {sorted.map(({ tm, val, isMe }, i) => (
              <div key={tm.id} style={{ animation:`rb .4s ease ${i*.12}s both` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:20, fontFamily:'IBM Plex Mono, monospace', fontSize:11, color:'rgba(255,255,255,.35)' }}>#{i+1}</span>
                    <span style={{ width:10, height:10, background:tm.brand_color, borderRadius:'50%', display:'inline-block' }}/>
                    <span style={{ color: isMe ? '#fff' : 'rgba(255,255,255,.7)', fontSize:14, fontWeight: isMe ? 700 : 500, textTransform:'uppercase', letterSpacing:'.06em' }}>
                      {tm.brand_name}{isMe ? ' ✦' : ''}
                    </span>
                  </div>
                  <span style={{ fontFamily:'IBM Plex Mono, monospace', color:kpiPhase.color, fontSize:16, fontWeight:700 }}>{kpiPhase.unit(val)}</span>
                </div>
                <div style={{ height:8, background:'rgba(255,255,255,.07)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(val/maxVal)*100}%`, background:kpiPhase.color, borderRadius:4, transition:'width 1s ease' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (suspensePhase === 5) {
      const sorted = [...allTeams].map(tm => ({
        tm, score: allResults.filter(r => r.team_id === tm.id).reduce((s,r) => s + (r.score_global ?? 0), 0),
        isMe: tm.id === team?.id,
      })).sort((a,b) => b.score - a.score);
      const podium = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
      const heights = [160, 210, 120];
      const medals = ['🥈','🏆','🥉'];
      const ranks = ['2e','1er','3e'];

      return (
        <div style={{ position:'fixed', inset:0, background:'#121212', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:32, padding:'40px 24px' }} onClick={() => setShowSuspense(false)}>
          <style>{`@keyframes podIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ fontSize:10, letterSpacing:'.3em', color:'rgba(255,255,255,.4)', textTransform:'uppercase' }}>{isFinalRound ? 'RÉSULTATS FINAUX' : `CLASSEMENT TOUR ${currentRound}`}</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
            {podium.map((entry, i) => entry && (
              <div key={entry.tm.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, animation:`podIn .6s ease ${i*.2}s both` }}>
                <div style={{ fontSize:32 }}>{medals[i]}</div>
                <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:22, fontWeight:800, color:'#fff' }}>{entry.score}</div>
                <div style={{ width:10, height:10, background:entry.tm.brand_color, borderRadius:'50%' }}/>
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'center', color: entry.isMe ? '#fff' : 'rgba(255,255,255,.7)', maxWidth:80 }}>
                  {entry.tm.brand_name}{entry.isMe ? ' ✦' : ''}
                </div>
                <div style={{ width:90, height:heights[i], background: i===1 ? '#fff' : 'rgba(255,255,255,.1)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: i===1 ? '#121212' : 'rgba(255,255,255,.5)' }}>{ranks[i]}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', letterSpacing:'.1em', marginTop:8 }}>Appuie pour continuer</div>
        </div>
      );
    }

    return null;
  }

  // ── Pending state ────────────────────────────────────────────────────────────
  if (!lastResult || !resultsRevealed) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <div className="wrap">
          <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 32 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <span style={{
                position: 'absolute', inset: 0, border: '2px solid var(--ink)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 1.1s linear infinite', display: 'block',
              }} />
            </div>
            <div>
              <div className="u-label" style={{ marginBottom: 12, color: 'var(--muted)' }}>TOUR {currentRound}</div>
              <h2 style={{ fontSize: 'var(--t-3)', marginBottom: 12 }}>En attente des résultats</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '34ch', lineHeight: 1.5 }}>
                Le Game Master révélera les scores de toutes les équipes dans quelques instants.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {allTeams.map((tm) => (
                <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, background: tm.brand_color, borderRadius: '50%', display: 'inline-block' }} />
                  <span style={{ letterSpacing: '.06em', textTransform: 'uppercase', opacity: .65 }}>{tm.brand_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Revealed state ───────────────────────────────────────────────────────────
  const budget_next = (lastResult as any).budget_next ?? 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="wrap">

        {/* Header */}
        <div className="reveal-fade" style={{ padding: '36px 0 36px', borderBottom: '1px solid var(--line)', marginBottom: 40 }}>
          <span className="u-eyebrow">Tour {lastResult.round_number}/5 · Résultats</span>
          <h2 style={{ margin: '12px 0 12px', fontSize: 'var(--t-3)' }}>
            Score global : <strong style={{ color: 'var(--ink)' }}>{lastResult.score_global ?? '—'}</strong>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Scores calculés sur les décisions de ce tour.</p>
        </div>

        {/* KPI bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginBottom: 48 }}>
          {KPI_CONFIG.map((kpi) => {
            const val = (lastResult as any)[kpi.key] ?? 0;
            const displayVal = kpi.key === 'score_ventes' ? `${(val * 25 / 1000).toFixed(1)}k` : val;
            return (
              <div key={kpi.key} className="reveal-card" style={{ border: '1px solid var(--line)', padding: '20px 20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="u-label">{kpi.label.toUpperCase()}</span>
                    <span title={kpi.tooltip} style={{ cursor: 'help', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>?</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{kpi.weight}</span>
                </div>
                <div style={{ fontSize: 'var(--t-3)', fontWeight: 700, marginBottom: 6 }}>{displayVal}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{kpi.unit}</div>
                <div style={{ height: 4, background: 'var(--fill)' }}>
                  <div style={{ height: '100%', width: `${val}%`, background: kpi.color, transition: 'width .6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Décisions de ce tour — ce que j'ai fait */}
        {(() => {
          const roundDec = allDecisions.find(d => d.round_number === lastResult.round_number);
          const roundProds = allProducts.filter(p => p.round_number === lastResult.round_number);
          if (!roundDec && roundProds.length === 0) return null;

          const commTotal = (p: any) => (p.budget_comm_tiktok??0)+(p.budget_comm_press??0)+(p.budget_comm_event??0)+(p.budget_comm_influencer??0);
          const distTotal = (p: any) => (p.budget_dist_ecommerce??0)+(p.budget_dist_popup??0)+(p.budget_dist_multibrand??0)+(p.budget_dist_wholesale??0)+(p.budget_dist_social_drop??0);

          return (
            <div style={{ marginBottom: 40 }}>
              <div className="u-eyebrow" style={{ marginBottom: 16 }}>MES DÉCISIONS CE TOUR</div>
              {roundDec?.brand_focus && (
                <div style={{ background: 'var(--fill)', padding: '10px 16px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)' }}>Focus marque :</span>
                  <strong>{FOCUS_LABELS[roundDec.brand_focus] ?? roundDec.brand_focus}</strong>
                </div>
              )}
              {roundProds.map(p => {
                const pTotal = (p.budget_supplier??0)+(p.budget_collection??0)+commTotal(p)+distTotal(p);
                const topComm = ['tiktok','press','event','influencer']
                  .map(k => ({ k, v: (p as any)[`budget_comm_${k}`]??0 }))
                  .sort((a,b)=>b.v-a.v).filter(x=>x.v>0)[0];
                const topDist = ['ecommerce','popup','multibrand','wholesale','social_drop']
                  .map(k => ({ k, v: (p as any)[`budget_dist_${k}`]??0 }))
                  .sort((a,b)=>b.v-a.v).filter(x=>x.v>0)[0];
                return (
                  <div key={p.id} style={{ border: '1px solid var(--line)', padding: '14px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'var(--muted)' }}>{fmt(pTotal)} alloués</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, fontSize: 11 }}>
                      <div><span style={{ color: 'var(--muted)' }}>Fournisseur : </span><strong>{SUPPLIER_LABELS[p.supplier]??p.supplier}</strong></div>
                      <div><span style={{ color: 'var(--muted)' }}>Style : </span><strong>{STYLE_LABELS[p.style]??p.style}</strong></div>
                      <div><span style={{ color: 'var(--muted)' }}>Prix : </span><strong style={{ textTransform: 'capitalize' }}>{p.price_tier}</strong></div>
                      {topComm && <div><span style={{ color: 'var(--muted)' }}>Comm : </span><strong style={{ textTransform: 'capitalize' }}>{topComm.k} ({fmt(topComm.v)})</strong></div>}
                      {topDist && <div><span style={{ color: 'var(--muted)' }}>Distrib : </span><strong style={{ textTransform: 'capitalize' }}>{topDist.k} ({fmt(topDist.v)})</strong></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Events that fired this round */}
        {(() => {
          const roundEvts = localEvents.filter(e => e.round_number === lastResult.round_number && e.active !== false);
          if (roundEvts.length === 0) return null;
          return (
            <div style={{ marginBottom: 40 }}>
              <div className="u-eyebrow" style={{ marginBottom: 20 }}>
                ÉVÉNEMENTS DU TOUR {lastResult.round_number}
              </div>
              {roundEvts.map((ev) => (
                <div key={ev.id} style={{
                  borderLeft: `3px solid ${(ev as any).source === 'random' ? 'var(--ink)' : 'var(--scarlet)'}`,
                  padding: '18px 22px', background: 'var(--fill)', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>{(ev as any).source === 'random' ? '🎲' : '🎯'}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{ev.name}</span>
                    <span className="u-label" style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {(ev as any).source === 'random' ? 'ALÉATOIRE' : 'GM'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{ev.description}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Budget formula */}
        {currentRound < 5 && (
          <div style={{ border: '1px solid var(--line)', marginBottom: 48 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <div className="u-eyebrow">BUDGET TOUR {lastResult.round_number + 1}</div>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Non dépensé</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15 }}>{fmt((lastResult as any).budget_remaining ?? 0)}</div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 18 }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Ventes × 2 500€ + bonus</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15 }}>
                  {fmt(((lastResult as any).score_ventes ?? 0) * 2500 + 15000)}
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 18 }}>=</div>
              <div style={{ textAlign: 'center', background: 'var(--ink)', padding: '16px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>Budget suivant</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, color: '#fff' }}>{fmt(budget_next)}</div>
              </div>
            </div>
            <div style={{ padding: '12px 24px', background: 'var(--fill)', fontSize: 11, color: 'var(--muted)' }}>
              Plafonné à 400 000€ — minimum garanti 40 000€
            </div>
          </div>
        )}

        {/* Podium final tour 5 */}
        {results.length >= 5 && (
          <div style={{ marginTop: 16, marginBottom: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 32 }}>🏆 RÉSULTATS FINAUX</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
              {(() => {
                const sorted = [...allTeams].map(tm => ({
                  tm, score: allResults.filter(r => r.team_id === tm.id).reduce((s, r) => s + (r.score_global ?? 0), 0)
                })).sort((a, b) => b.score - a.score);
                const order = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
                const heights = [150, 200, 110];
                const medals = ['🥈', '🏆', '🥉'];
                const ranks = ['2e', '1er', '3e'];
                return order.map((entry, i) => entry && (
                  <div key={entry.tm.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 28 }}>{medals[i]}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, fontWeight: 800 }}>{entry.score}</div>
                    <div style={{ width: 10, height: 10, background: entry.tm.brand_color, borderRadius: '50%' }} />
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', maxWidth: 80, textAlign: 'center' }}>{entry.tm.brand_name}</div>
                    <div style={{
                      width: 90, height: heights[i],
                      background: i === 1 ? '#121212' : 'var(--fill)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: i === 1 ? '#fff' : 'var(--muted)' }}>{ranks[i]}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Courbe de progression */}
        {results.length >= 2 && (
          <div style={{ marginBottom: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 20 }}>PROGRESSION</div>
            <div style={{ border: '1px solid var(--line)', padding: '24px 20px 16px' }}>
              <svg viewBox={`0 0 ${(results.length - 1) * 80 + 40} 90`} style={{ width: '100%', height: 90, overflow: 'visible' }}>
                {(() => {
                  const pts = results.map((r, i) => ({ x: i * 80 + 20, y: 70 - Math.min(r.score_global, 100) * 0.6 }));
                  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <>
                      <path d={d} fill="none" stroke="#121212" strokeWidth="2" />
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={4} fill="#121212" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#aaa">T{results[i].round_number}</text>
                          <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="12" fill="#121212" fontWeight="700">{results[i].score_global}</text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* Historique des tours */}
        {results.length > 1 && (
          <div style={{ marginBottom: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 20 }}>HISTORIQUE DES TOURS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...results].reverse().map((r) => {
                const dec = allDecisions.find(d => d.round_number === r.round_number);
                const prods = allProducts.filter(p => p.round_number === r.round_number);
                return (
                  <div key={r.id} style={{ border: '1px solid var(--line)', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <span className="u-label">TOUR {r.round_number}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 700 }}>{r.score_global}</span>
                    </div>
                    {/* KPIs mini */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                      {KPI_CONFIG.map(k => {
                        const val = (r as any)[k.key] ?? 0;
                        return (
                          <div key={k.key}>
                            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{k.label}</div>
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: k.color }}>
                              {k.key === 'score_ventes' ? `${(val * 25 / 1000).toFixed(1)}k` : val}
                            </div>
                            <div style={{ height: 2, background: 'var(--line)', marginTop: 4 }}>
                              <div style={{ height: '100%', width: `${val}%`, background: k.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Décisions résumées */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {dec?.brand_focus && (
                        <span style={{ fontSize: 10, padding: '3px 8px', background: 'var(--fill)', color: 'var(--muted)', letterSpacing: '.08em' }}>
                          Focus : {FOCUS_LABELS[dec.brand_focus] ?? dec.brand_focus}
                        </span>
                      )}
                      {prods.slice(0, 2).map(p => (
                        <span key={p.id} style={{ fontSize: 10, padding: '3px 8px', background: 'var(--fill)', color: 'var(--muted)', letterSpacing: '.08em' }}>
                          {p.name} · {SUPPLIER_LABELS[p.supplier] ?? p.supplier} · {p.price_tier}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                      Restant : <strong>{fmt((r as any).budget_remaining ?? 0)}</strong>
                      {r.round_number < 5 && <> → Tour suivant : <strong>{fmt((r as any).budget_next ?? 0)}</strong></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Classement ce tour */}
        <div>
          <div className="u-eyebrow" style={{ marginBottom: 24 }}>CLASSEMENT CE TOUR</div>
          <div>
            {allTeams
              .map((tm) => {
                const tmResult = allResults.find(r => r.team_id === tm.id && r.round_number === lastResult.round_number);
                return { tm, score: tmResult?.score_global ?? 0 };
              })
              .sort((a, b) => b.score - a.score)
              .map(({ tm, score }, i) => {
                const isMe = tm.id === team.id;
                return (
                  <div key={tm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
                    borderBottom: '1px solid var(--line)', fontWeight: isMe ? 600 : 400,
                  }}>
                    <span style={{ width: 28, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: i === 0 ? 'var(--scarlet)' : 'var(--muted)', fontWeight: i === 0 ? 700 : 400 }}>
                      #{i + 1}
                    </span>
                    <span style={{ width: 12, height: 12, background: tm.brand_color, flexShrink: 0, display: 'block' }} />
                    <span style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 13 }}>{tm.brand_name}</span>
                    {isMe && <span className="u-label" style={{ color: 'var(--muted)', fontSize: 10 }}>VOUS</span>}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>{score}</span>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    </div>
  );
}

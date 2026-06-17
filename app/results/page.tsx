'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/lib/game-context';
import { supabase } from '@/lib/supabase';
import { RoundResult, MarketEvent } from '@/lib/types';

const KPI_CONFIG = [
  { key: 'score_ventes',     label: 'Ventes',     weight: '30%', color: '#2B4A8B', unit: 'k unités', tooltip: 'Nombre estimé de pièces vendues ce tour (score × 25 unités)' },
  { key: 'score_image',      label: 'Image',      weight: '30%', color: '#B86B4B', unit: '/100',      tooltip: "Perception de ta marque par les clients — cohérence, désirabilité, storytelling" },
  { key: 'score_durabilite', label: 'Impact',     weight: '20%', color: '#127a3e', unit: '/100',      tooltip: "Score d'impact positif : sourcing éthique, qualité, longévité des pièces" },
  { key: 'score_fidelite',   label: 'Fidélité',   weight: '20%', color: '#E63329', unit: '/100',      tooltip: "Taux de clients qui reviennent — distribution, expérience, communauté" },
];

export default function ResultsPage() {
  const { session, team, restoring, allTeams, currentRound } = useGame();
  const [results, setResults] = useState<RoundResult[]>([]);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);
  const [localEvents, setLocalEvents] = useState<MarketEvent[]>([]);

  useEffect(() => {
    if (!team?.id || !session?.id) return;
    Promise.all([
      supabase.from('results').select('*').eq('team_id', team.id).order('round_number', { ascending: true }),
      supabase.from('results').select('*').eq('session_id', session.id).order('round_number', { ascending: true }),
      supabase.from('market_events').select('*').eq('session_id', session.id),
    ]).then(([myR, allR, evts]) => {
      if (myR.data) setResults(myR.data as RoundResult[]);
      if (allR.data) setAllResults(allR.data as RoundResult[]);
      if (evts.data) setLocalEvents(evts.data as MarketEvent[]);
    });
  }, [team?.id, session?.id, session?.results_revealed, currentRound]);

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
  const fmt = (n: number) => n >= 1000
    ? `${(n / 1000).toFixed(0)}k€`
    : `${n}€`;

  // Pending state
  if (!lastResult || !resultsRevealed) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <div className="wrap">
          <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 32 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <span style={{
                position: 'absolute', inset: 0, border: '2px solid var(--ink)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 1.1s linear infinite',
                display: 'block',
              }} />
            </div>
            <div>
              <div className="u-label" style={{ marginBottom: 12, color: 'var(--muted)' }}>TOUR {currentRound}</div>
              <h2 style={{ fontSize: 'var(--t-3)', marginBottom: 12 }}>En attente des résultats</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '34ch', lineHeight: 1.5 }}>
                Le Game Master révélera les scores de toutes les équipes dans quelques instants.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
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

  // Revealed state
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
                    <span title={(kpi as any).tooltip} style={{ cursor: 'help', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>?</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{(kpi as any).weight}</span>
                </div>
                <div style={{ fontSize: 'var(--t-3)', fontWeight: 700, marginBottom: 6 }}>{displayVal}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{(kpi as any).unit}</div>
                <div style={{ height: 4, background: 'var(--fill)' }}>
                  <div style={{ height: '100%', width: `${val}%`, background: kpi.color, transition: 'width .6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Events that fired this round */}
        {(() => {
          const roundEvts = localEvents.filter(e => e.round_number === lastResult.round_number && e.active !== false);
          if (roundEvts.length === 0) return null;
          return (
            <div style={{ marginBottom: 40 }}>
              <div className="u-eyebrow" style={{ marginBottom: 20 }}>
                ÉVÉNEMENTS DU TOUR {lastResult.round_number}
              </div>
              {roundEvts.map((ev, i) => (
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
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                    {ev.description}
                  </p>
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
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15 }}>
                  {fmt((lastResult as any).budget_remaining ?? 0)}
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 18 }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Ventes × 2 000€</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15 }}>
                  {fmt(((lastResult as any).score_ventes ?? 0) * 2000)}
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 18 }}>=</div>
              <div style={{ textAlign: 'center', background: 'var(--ink)', padding: '16px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>Budget suivant</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, color: '#fff' }}>
                  {fmt(Math.min(budget_next, 300_000))}
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 24px', background: 'var(--fill)', fontSize: 11, color: 'var(--muted)' }}>
              Plafonné à 300 000€
            </div>
          </div>
        )}

        {/* Historique des tours */}
        {results.length > 1 && (
          <div style={{ marginBottom: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 20 }}>HISTORIQUE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...results].reverse().map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--line)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span className="u-label">TOUR {r.round_number}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 700 }}>{r.score_global}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { label: 'Ventes', key: 'score_ventes', color: '#2B4A8B' },
                      { label: 'Image', key: 'score_image', color: '#B86B4B' },
                      { label: 'Durabilité', key: 'score_durabilite', color: '#127a3e' },
                      { label: 'Fidélité', key: 'score_fidelite', color: '#E63329' },
                    ].map(k => {
                      const val = (r as any)[k.key] ?? 0;
                      return (
                        <div key={k.key}>
                          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{k.label}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: k.color }}>{val}</div>
                          <div style={{ height: 2, background: 'var(--line)', marginTop: 4 }}>
                            <div style={{ height: '100%', width: `${val}%`, background: k.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                    Budget restant : <strong>{fmt((r as any).budget_remaining ?? 0)}</strong> → Budget tour suivant : <strong>{fmt((r as any).budget_next ?? 0)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courbe de progression */}
        {results.length >= 2 && (
          <div style={{ marginBottom: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 20 }}>PROGRESSION</div>
            <div style={{ border: '1px solid var(--line)', padding: '20px' }}>
              <svg viewBox={`0 0 ${Math.max(results.length - 1, 1) * 80 + 40} 80`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
                {(() => {
                  const pts = results.map((r, i) => ({ x: i * 80 + 20, y: 70 - Math.min(r.score_global, 100) * 0.6 }));
                  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <>
                      <path d={d} fill="none" stroke="#121212" strokeWidth="2" />
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={4} fill="#121212" />
                          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#888">T{results[i].round_number}</text>
                          <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="11" fill="#121212" fontWeight="600">{results[i].score_global}</text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* Podium final tour 5 */}
        {results.length === 5 && (
          <div style={{ marginTop: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 24, textAlign: 'center' }}>🏆 RÉSULTATS FINAUX</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, marginBottom: 32 }}>
              {(() => {
                const sorted = [...allTeams].map(tm => ({
                  tm,
                  score: allResults.filter(r => r.team_id === tm.id).reduce((s, r) => s + (r.score_global ?? 0), 0)
                })).sort((a, b) => b.score - a.score);
                const podium = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
                const heights = [140, 180, 110];
                const positions = ['2e', '1er', '3e'];
                const trophies = ['🥈', '🏆', '🥉'];
                return podium.map((entry, i) => (
                  <div key={entry.tm.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 24 }}>{trophies[i]}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 700 }}>{entry.score}</div>
                    <div style={{ width: 8, height: 8, background: entry.tm.brand_color, borderRadius: '50%' }} />
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', maxWidth: 80 }}>{entry.tm.brand_name}</div>
                    <div style={{ width: 80, height: heights[i], background: i === 1 ? '#121212' : 'var(--fill)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}>
                      <span style={{ fontSize: 10, color: i === 1 ? '#fff' : 'var(--muted)' }}>{positions[i]}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Mini leaderboard */}
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
                    borderBottom: '1px solid var(--line)',
                    fontWeight: isMe ? 600 : 400,
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

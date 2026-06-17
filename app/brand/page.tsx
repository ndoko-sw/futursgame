'use client';

import { useState } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const FOCUS_OPTIONS = [
  { key: 'balanced',       label: 'Équilibrée',     desc: 'Distribution uniforme sur tous les KPIs',         tags: ['Stable'] },
  { key: 'price',          label: 'Prix agressif',   desc: 'Ventes × 1.3 — au détriment de l\'image',        tags: ['Ventes+', 'Image−'] },
  { key: 'product',        label: 'Produit',         desc: 'Image et fidélité boostées par la qualité',       tags: ['Image+', 'Fidélité+'] },
  { key: 'image',          label: 'Image forte',     desc: 'Image × 1.4 — positionnement premium',           tags: ['Image++', 'Ventes−'] },
  { key: 'sustainability', label: 'Durable',         desc: 'Durabilité × 1.5 — attraits consommateurs éco',  tags: ['Durable++', 'Fidélité+'] },
];

const KPI_LABELS = [
  { key: 'score_ventes',      label: 'Ventes',      color: '#2B4A8B' },
  { key: 'score_image',       label: 'Image',       color: '#B86B4B' },
  { key: 'score_durabilite',  label: 'Durabilité',  color: '#127a3e' },
  { key: 'score_fidelite',    label: 'Fidélité',    color: '#E63329' },
];

const CATEGORY_ICONS: Record<string, string> = {
  haut: '👕', bas: '👖', veste: '🧥', robe: '👗', chaussure: '👟', accessoire: '💍',
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}k€` : `${n}€`;
}

export default function BrandPage() {
  const { session, team, restoring, currentRound, roundTimeLeft, decisions, products, results } = useGame();
  const router = useRouter();
  const [expandKpi, setExpandKpi] = useState(false);
  const [savingFocus, setSavingFocus] = useState(false);

  if (restoring) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span>
    </div>
  );

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre une session →</button></a>
      </div>
    );
  }

  if (session.status === 'waiting') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, textAlign: 'center', padding: '0 24px' }}>
        <span style={{ width: 48, height: 48, background: team.brand_color, display: 'block', margin: '0 auto' }} />
        <div>
          <div style={{ fontSize: 'var(--t-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{team.brand_name}</div>
          <div className="u-label" style={{ marginBottom: 20 }}>EN ATTENTE DU GAME MASTER</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6E6F4B', animation: 'pulse 1.4s ease infinite', display: 'inline-block' }} />
            Le game master va lancer le tour d'un instant à l'autre…
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.1em' }}>
          SESSION · {session.code}
        </div>
      </div>
    );
  }

  const isPractice = session.status === 'practice';
  const budget = isPractice ? 999_999 : (team.current_budget ?? 100_000);
  const currentDecision = decisions.find(d => d.round_number === currentRound);
  const isSubmitted = !!currentDecision?.submitted_at;
  const brandFocus = currentDecision?.brand_focus ?? 'balanced';

  const roundProducts = products.filter(p => p.round_number === currentRound);
  const totalAllocated = roundProducts.reduce((sum, p) => sum + p.budget, 0);
  const pct = isPractice ? 0 : Math.min(100, (totalAllocated / budget) * 100);

  const lastResult = results[results.length - 1];

  const handleFocusChange = async (focus: string) => {
    if (isSubmitted || !team || !session) return;
    setSavingFocus(true);
    const { error } = await supabase.from('decisions').upsert(
      {
        team_id: team.id, session_id: session.id, round_number: currentRound,
        brand_focus: focus,
        submitted_at: currentDecision?.submitted_at ?? null,
        total_spent: totalAllocated,
        // champs requis par le schéma legacy
        budget_fournisseur: 0, budget_collection: 0,
        budget_prix: 0, budget_distribution: 0, budget_communication: 0,
      },
      { onConflict: 'team_id,round_number' }
    );
    if (error) toast.error(`Erreur : ${error.message}`);
    setSavingFocus(false);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div className="wrap">

        {/* Brand identity strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '32px 0 8px' }}>
          <span style={{ width: 48, height: 48, background: team.brand_color, flexShrink: 0, display: 'block' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--t-3)', letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: 1 }}>{team.brand_name}</div>
            {team.brand_statement && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>{team.brand_statement}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="u-label">{isPractice ? 'PRATIQUE' : `TOUR ${currentRound}/5`}</div>
          </div>
        </div>

        {/* Budget bar */}
        {!isPractice && (
          <div style={{ margin: '24px 0 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="u-label">BUDGET ALLOUÉ (PRODUITS)</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>
                {fmt(totalAllocated)} / {fmt(budget)}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 95 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(budget - totalAllocated)} disponible</span>
              <span style={{ fontSize: 11, color: pct >= 95 ? 'var(--scarlet)' : 'var(--muted)' }}>{Math.round(pct)}% alloué</span>
            </div>
          </div>
        )}

        {/* Submitted banner */}
        {isSubmitted && (
          <div className="submitlock" style={{ marginBottom: 28 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span>Décisions soumises · en attente des résultats</span>
          </div>
        )}

        {/* Products this round */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="u-eyebrow">Tes produits ce tour</span>
            {!isSubmitted && (
              <button onClick={() => router.push('/produit')} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'underline' }}>
                Gérer →
              </button>
            )}
          </div>
          {roundProducts.length === 0 ? (
            <button
              onClick={() => router.push('/produit')}
              style={{
                width: '100%', border: '1px dashed var(--line)', background: 'none',
                padding: '20px', fontSize: 13, color: '#121212',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>+</span> Créer ton produit →
            </button>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {roundProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => !isSubmitted && router.push('/produit')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    border: '1px solid var(--line)', background: '#fff',
                    cursor: isSubmitted ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{CATEGORY_ICONS[p.category] ?? '📦'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      {p.supplier.replace(/_/g, ' ')} · {p.price_tier}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {isPractice ? '∞' : fmt(p.budget)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Brand focus */}
        <div style={{ marginBottom: 40 }}>
          <span className="u-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Orientation stratégique de la marque</span>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Définit le multiplicateur global appliqué à tous tes produits ce tour.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {FOCUS_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFocusChange(f.key)}
                disabled={isSubmitted || savingFocus}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                  border: `1px solid ${brandFocus === f.key ? '#121212' : 'var(--line)'}`,
                  background: brandFocus === f.key ? 'rgba(18,18,18,.04)' : '#fff',
                  cursor: isSubmitted ? 'not-allowed' : 'pointer', textAlign: 'left', width: '100%',
                  opacity: isSubmitted ? 0.6 : 1,
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${brandFocus === f.key ? '#121212' : '#ccc'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  {brandFocus === f.key && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#121212', display: 'block' }} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.desc}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {f.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--fill)', padding: '2px 7px', color: 'var(--muted)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Last round KPIs */}
        {lastResult && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="u-eyebrow">Scores Tour {lastResult.round_number}</span>
              <button onClick={() => setExpandKpi(!expandKpi)} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
                {expandKpi ? '▲ Réduire' : '▼ Détail'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {KPI_LABELS.map(kpi => {
                const val = (lastResult as any)[kpi.key] ?? 0;
                return (
                  <div key={kpi.key} style={{ border: '1px solid var(--line)', padding: '14px 14px' }}>
                    <div className="u-label" style={{ marginBottom: 8 }}>{kpi.label.toUpperCase()}</div>
                    <div style={{ fontSize: 'var(--t-3)', fontWeight: 700 }}>{val}</div>
                    <div style={{ marginTop: 8, height: 3, background: 'var(--fill)' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: kpi.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {expandKpi && (
              <div style={{ marginTop: 12, background: 'var(--fill)', padding: '14px 18px', fontSize: 13, color: 'var(--muted)' }}>
                Score global = Ventes×30% + Image×30% + Durabilité×20% + Fidélité×20% = <strong style={{ color: 'var(--ink)' }}>{lastResult.score_global ?? '—'}</strong>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Fixed CTA */}
      {!isSubmitted && (
        <div className="fixed-cta" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid var(--line)', padding: '14px 24px',
          display: 'flex', gap: 12, justifyContent: 'flex-end', zIndex: 40,
        }}>
          <button className="btn btn--ghost" onClick={() => router.push('/portfolio')}>Portfolio</button>
          <button className="btn" onClick={() => router.push('/produit')}>
            {roundProducts.length === 0 ? 'Créer un produit →' : 'Gérer mes produits →'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';

const MODULES = [
  { key: 'fournisseur',   label: 'Fournisseur',    icon: '🏭', desc: 'Matières & origine' },
  { key: 'collection',    label: 'Collection',     icon: '✦',  desc: 'Produits & styles' },
  { key: 'prix',          label: 'Prix',           icon: '€',  desc: 'Positionnement tarifaire' },
  { key: 'distribution',  label: 'Distribution',   icon: '⊕',  desc: 'Canaux de vente' },
  { key: 'communication', label: 'Communication',  icon: '◉',  desc: 'Audience & média' },
];

const KPI_LABELS = [
  { key: 'score_ventes',      label: 'Ventes',      color: '#2B4A8B' },
  { key: 'score_image',       label: 'Image',       color: '#B86B4B' },
  { key: 'score_durabilite',  label: 'Durabilité',  color: '#127a3e' },
  { key: 'score_fidelite',    label: 'Fidélité',    color: '#E63329' },
];

export default function BrandPage() {
  const { session, team, restoring, currentRound, roundTimeLeft, decisions, results, lang } = useGame();
  const router = useRouter();
  const [expandKpi, setExpandKpi] = useState(false);

  if (restoring) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span></div>;

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <button className="btn">Rejoindre une session →</button>
        </a>
      </div>
    );
  }

  const lastResult = results[results.length - 1];
  const isPractice = session?.status === 'practice';
  const budget = isPractice ? 999_999 : (team.current_budget ?? 100_000);
  const currentDecision = decisions.find(d => d.round_number === currentRound);
  const totalAllocated = currentDecision ? Object.values({
    budget_fournisseur: currentDecision.budget_fournisseur,
    budget_collection:  currentDecision.budget_collection,
    budget_prix:        currentDecision.budget_prix,
    budget_distribution:currentDecision.budget_distribution,
    budget_communication:currentDecision.budget_communication,
  }).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0) : 0;
  const pct = Math.min(100, (totalAllocated / budget) * 100);

  const fmt = (n: number) => n >= 1000
    ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}k€`
    : `${n}€`;

  const timerMin = Math.floor((roundTimeLeft ?? 0) / 60);
  const timerSec = (roundTimeLeft ?? 0) % 60;
  const timerStr = `${timerMin}:${String(timerSec).padStart(2, '0')}`;

  const submitted = !!currentDecision?.submitted_at;

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
            <div className="u-label">(TOUR {currentRound}/5)</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.3rem', marginTop: 4 }}>{timerStr}</div>
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ margin: '24px 0 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="u-label">BUDGET DISPONIBLE</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>
              {fmt(totalAllocated)} / {isPractice ? '∞' : fmt(budget)}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 95 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(budget - totalAllocated)} restant</span>
            <span style={{ fontSize: 11, color: pct >= 95 ? 'var(--scarlet)' : 'var(--muted)' }}>{Math.round(pct)}% alloué</span>
          </div>
        </div>

        {/* Submitted banner */}
        {submitted && (
          <div className="submitlock" style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span>Décisions soumises · en attente des résultats</span>
          </div>
        )}

        {/* 5 modules grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 48 }}>
          {MODULES.map((mod) => {
            const alloc = currentDecision ? (currentDecision as any)[`budget_${mod.key}`] ?? 0 : 0;
            const modPct = budget > 0 ? Math.round((alloc / budget) * 100) : 0;
            return (
              <button
                key={mod.key}
                onClick={() => router.push(`/produit?module=${mod.key}`)}
                disabled={submitted}
                className="module"
                style={{ textAlign: 'left', cursor: submitted ? 'not-allowed' : 'pointer', opacity: submitted ? .6 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{mod.icon}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{modPct}%</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{mod.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mod.desc}</div>
                <div style={{ marginTop: 14, height: 2, background: 'var(--line)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${modPct}%`, background: 'var(--ink)', transition: 'width .3s' }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {alloc > 0 ? fmt(alloc) : '— non alloué'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Last round KPIs */}
        {lastResult && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span className="u-eyebrow">Scores Tour {lastResult.round_number}</span>
              <button onClick={() => setExpandKpi(!expandKpi)} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
                {expandKpi ? '▲ Réduire' : '▼ Détail'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {KPI_LABELS.map((kpi) => {
                const val = (lastResult as any)[kpi.key] ?? 0;
                return (
                  <div key={kpi.key} style={{ border: '1px solid var(--line)', padding: '16px 14px' }}>
                    <div className="u-label" style={{ marginBottom: 10 }}>{kpi.label.toUpperCase()}</div>
                    <div style={{ fontSize: 'var(--t-3)', fontWeight: 700 }}>{val}</div>
                    <div style={{ marginTop: 10, height: 3, background: 'var(--fill)' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: kpi.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {expandKpi && (
              <div style={{ marginTop: 16, background: 'var(--fill)', padding: '16px 20px', fontSize: 13, color: 'var(--muted)' }}>
                Score global = Ventes×30% + Image×30% + Durabilité×20% + Fidélité×20% = <strong style={{ color: 'var(--ink)' }}>{lastResult.score_global ?? '—'}</strong>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {!submitted && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid var(--line)', padding: '16px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end', zIndex: 40 }}>
            <button className="btn btn--ghost" onClick={() => router.push('/portfolio')}>Portfolio</button>
            <button className="btn" onClick={() => router.push('/produit')}>Allouer le budget →</button>
          </div>
        )}

      </div>
    </div>
  );
}

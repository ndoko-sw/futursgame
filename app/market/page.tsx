'use client';

import { useGame } from '@/lib/game-context';

const METRIC_LABEL: Record<string, string> = {
  all: 'tous les scores', sales: 'Ventes', image: 'Image',
  sustainability: 'Durabilité', loyalty: 'Fidélité',
};

function deriveSignals(effectJson: any): { label: string; category: string; intensity: number; narrative: string }[] {
  if (!effectJson) return [];
  const { type, metric, mult, target } = effectJson;
  const pct = Math.round(Math.abs(mult - 1) * 100);
  const sign = mult >= 1 ? '+' : '-';
  const metricName = METRIC_LABEL[metric] ?? metric;
  const intensity = pct > 30 ? 3 : pct > 15 ? 2 : 1;
  const catMap: Record<string, string> = {
    global: 'economique', channel_boost: 'social', supplier_mod: 'tendance', style_boost: 'tendance',
  };

  let label = '';
  let narrative = '';

  if (type === 'global') {
    label = `${sign}${pct}% ${metricName} — toutes marques`;
    narrative = mult >= 1
      ? `Cet événement booste ${metricName.toLowerCase()} de ${pct}% pour l'ensemble des marques ce tour.`
      : `Cet événement pénalise ${metricName.toLowerCase()} de ${pct}% pour toutes les marques ce tour.`;
  } else if (type === 'channel_boost') {
    label = `Canal "${target}" → ${sign}${pct}% ${metricName}`;
    narrative = `Les marques qui distribuent via le canal "${target}" voient leur ${metricName.toLowerCase()} varier de ${sign}${pct}% ce tour.`;
  } else if (type === 'supplier_mod') {
    label = `Fournisseur "${target}" → ${sign}${pct}% ${metricName}`;
    narrative = `Les marques sourçant chez "${target}" subissent un impact de ${sign}${pct}% sur leur ${metricName.toLowerCase()} ce tour.`;
  } else if (type === 'style_boost') {
    label = `Style "${target}" → ${sign}${pct}% ${metricName}`;
    narrative = `Les marques positionnées sur le style "${target}" bénéficient de ${sign}${pct}% sur leur ${metricName.toLowerCase()} ce tour.`;
  }

  return [{ label, category: catMap[type] ?? 'tendance', intensity, narrative }];
}

const INTENSITY_DOT = (level: number) => (
  <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
    {[1, 2, 3].map((i) => (
      <span
        key={i}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: i <= level ? 'var(--ink)' : 'var(--line)',
          display: 'inline-block',
        }}
      />
    ))}
  </span>
);

const SIGNAL_COLORS: Record<string, string> = {
  tendance:   '#2B4A8B',
  economique: '#6E6F4B',
  social:     '#B86B4B',
  technologie:'#127a3e',
  regulation: '#E63329',
};

export default function MarketPage() {
  const { session, team, marketEvent, currentRound } = useGame();

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre →</button></a>
      </div>
    );
  }

  const signals = deriveSignals((marketEvent as any)?.effect_json);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="wrap">

        {/* Page header */}
        <div style={{ padding: '32px 0 36px', borderBottom: '1px solid var(--line)', marginBottom: 36 }}>
          <span className="u-eyebrow">Tour {currentRound}/5</span>
          <h2 style={{ margin: '10px 0 10px', fontSize: 'var(--t-3)' }}>Signaux de marché</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '52ch', lineHeight: 1.5 }}>
            Analyse ces signaux pour ajuster ta stratégie. Certains événements peuvent amplifier ou réduire l'impact de tes décisions.
          </p>
        </div>

        {/* Active event banner */}
        {marketEvent && (
          <div style={{
            background: 'var(--ink)', color: '#fff', padding: '24px 28px', marginBottom: 40,
            display: 'flex', gap: 24, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>⚡</span>
            <div>
              <div className="u-label" style={{ color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>ÉVÉNEMENT ACTIF</div>
              <div style={{ fontSize: 'var(--t-2)', marginBottom: 8 }}>{marketEvent.name}</div>
              <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 13.5, lineHeight: 1.5, maxWidth: '54ch' }}>
                {marketEvent.description}
              </p>
            </div>
          </div>
        )}

        {!marketEvent && (
          <div style={{ background: 'var(--fill)', padding: '24px 28px', marginBottom: 40, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>◌</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Aucun événement actif ce tour</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Les conditions de marché sont stables.</div>
            </div>
          </div>
        )}

        {/* Signal list */}
        {signals.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div className="u-eyebrow" style={{ marginBottom: 24 }}>SIGNAUX ({signals.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {signals.map((sig: any, i: number) => {
                const cat = sig.category ?? 'tendance';
                const color = SIGNAL_COLORS[cat] ?? '#121212';
                const intensity = sig.intensity ?? 2;
                return (
                  <div key={i} style={{
                    borderBottom: '1px solid var(--line)', padding: '24px 0',
                    display: 'grid', gridTemplateColumns: '6px 1fr auto', gap: 20, alignItems: 'start',
                  }}>
                    <span style={{ width: 6, height: 6, background: color, borderRadius: '50%', marginTop: 6, flexShrink: 0, display: 'block' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{sig.label ?? sig.name}</span>
                        <span style={{ background: `${color}18`, color, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px' }}>{cat}</span>
                      </div>
                      <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, maxWidth: '56ch' }}>
                        {sig.narrative ?? sig.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', paddingTop: 2 }}>
                      {INTENSITY_DOT(intensity)}
                      <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.06em' }}>
                        {intensity === 1 ? 'FAIBLE' : intensity === 2 ? 'MOYEN' : 'FORT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {signals.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p className="u-label" style={{ color: 'var(--faint)' }}>Aucun signal disponible pour ce tour</p>
          </div>
        )}

        {/* Strategy reminder */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 36, marginTop: 12 }}>
          <div className="u-eyebrow" style={{ marginBottom: 20 }}>RAPPEL STRATÉGIQUE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {[
              { label: 'Ventes', weight: '30%', icon: '◈' },
              { label: 'Image',  weight: '30%', icon: '◉' },
              { label: 'Durabilité', weight: '20%', icon: '◌' },
              { label: 'Fidélité',   weight: '20%', icon: '◆' },
            ].map((kpi) => (
              <div key={kpi.label} style={{ border: '1px solid var(--line)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span>{kpi.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{kpi.label}</span>
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>Poids : {kpi.weight}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

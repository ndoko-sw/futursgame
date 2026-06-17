'use client';

import { useGame } from '@/lib/game-context';

type Signal = { label: string; category: string; intensity: number; narrative: string };

const METRIC_HINT: Record<string, { up: string; down: string }> = {
  all:           { up: 'Toutes les dimensions progressent',   down: 'Toutes les dimensions sous pression' },
  sales:         { up: 'Les ventes sont en hausse',          down: 'Les ventes reculent' },
  image:         { up: "L'image de marque est valorisée",    down: "L'image de marque est fragilisée" },
  sustainability:{ up: 'La durabilité prend de la valeur',   down: 'La durabilité est scrutée' },
  loyalty:       { up: 'La fidélité client se renforce',     down: "La fidélité client s'érode" },
};

const TARGET_HINT: Record<string, string> = {
  tiktok_insta:       'TikTok et Instagram',
  press_rp:           'la presse et les relations presse',
  event:              'les événements physiques',
  influencer:         'les campagnes influenceurs',
  fast_fashion_asie:  'les fournisseurs fast-fashion en Asie',
  usine_europe:       'les usines européennes',
  capsule_artisanale: 'les capsules artisanales',
  atelier_abidjan:    'les ateliers artisanaux africains',
  streetwear:         'le style streetwear',
  casual_luxe:        'le style casual luxe',
  techwear:           'le style techwear',
  avant_garde:        'le style avant-garde',
  minimaliste:        'le style minimaliste',
};

function deriveSignalFromEffect(eff: any): Signal | null {
  const { type, metric, mult, target } = eff;
  if (!type || mult == null) return null;
  const up = mult >= 1;
  const intensity = Math.abs(mult - 1) > 0.35 ? 3 : Math.abs(mult - 1) > 0.15 ? 2 : 1;
  const catMap: Record<string, string> = {
    global: 'economique', channel_boost: 'social', supplier_mod: 'tendance', style_boost: 'tendance',
  };
  const mh = METRIC_HINT[metric] ?? { up: 'Signal positif', down: 'Signal négatif' };
  const arrow = up ? '↑' : '↓';

  // Use first target only for hint label (multi-target is internal detail)
  const firstTarget = target?.split(',')[0]?.trim() ?? '';
  const hint = TARGET_HINT[firstTarget] ?? firstTarget;

  if (type === 'global') {
    return {
      label: `${arrow} ${mh[up ? 'up' : 'down']}`,
      category: catMap[type] ?? 'economique', intensity,
      narrative: up
        ? `${mh.up} ce tour pour toutes les marques. Réfléchis à comment en tirer parti.`
        : `${mh.down} ce tour pour toutes les marques. Quelle stratégie pour limiter l'impact ?`,
    };
  }
  if (type === 'channel_boost') {
    return {
      label: `${arrow} Signal sur ${hint}`,
      category: 'social', intensity,
      narrative: up
        ? `Les marques qui communiquent via ${hint} pourraient voir ${mh.up.toLowerCase()} ce tour.`
        : `Les marques qui communiquent via ${hint} risquent que ${mh.down.toLowerCase()} ce tour.`,
    };
  }
  if (type === 'supplier_mod') {
    return {
      label: `${arrow} Signal fournisseur : ${hint}`,
      category: 'tendance', intensity,
      narrative: up
        ? `Les marques sourçant via ${hint} bénéficient d'un contexte favorable ce tour.`
        : `Les marques sourçant via ${hint} sont exposées à des risques ce tour.`,
    };
  }
  if (type === 'style_boost') {
    return {
      label: `${arrow} Tendance style : ${hint}`,
      category: 'tendance', intensity,
      narrative: up
        ? `${mh.up} pour les marques positionnées sur ${hint} ce tour.`
        : `${mh.down} pour les marques positionnées sur ${hint} ce tour.`,
    };
  }
  return null;
}

function deriveSignals(effectJson: any): Signal[] {
  if (!effectJson) return [];
  // Support both array (new) and single object (legacy)
  const entries: any[] = Array.isArray(effectJson) ? effectJson : [effectJson];
  const signals: Signal[] = [];

  for (const entry of entries) {
    if (entry.type === 'conditional') {
      // Show as a tension/uncertainty signal — hint at both directions without revealing which
      const { condition_field, then_effect, else_effect } = entry;
      const fieldLabel: Record<string, string> = {
        score_durabilite: 'vos pratiques durables',
        score_image: 'votre image de marque',
        score_ventes: 'vos ventes passées',
        supplier: 'votre choix de fournisseur',
        comm_channel: 'votre canal de communication',
      };
      const field = fieldLabel[condition_field] ?? condition_field;
      const thenUp = then_effect?.mult >= 1;
      signals.push({
        label: `⚖ Signal conditionnel — résultat selon ${field}`,
        category: 'tendance', intensity: 3,
        narrative: `Cet événement n'aura pas le même impact pour toutes les marques. Selon ${field}, certaines en profiteront fortement, d'autres en pâtiront. Vos décisions passées déterminent de quel côté vous êtes.`,
      });
    } else {
      const sig = deriveSignalFromEffect(entry);
      if (sig) signals.push(sig);
    }
  }
  return signals;
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

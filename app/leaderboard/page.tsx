'use client';

import { useGame } from '@/lib/game-context';

export default function LeaderboardPage() {
  const { session, team, restoring, allResults, allTeams, currentRound } = useGame();

  if (restoring) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span></div>;

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre →</button></a>
      </div>
    );
  }

  // Build cumulative scores per team
  const teamScores = allTeams.map((tm) => {
    const tmResults = allResults.filter(r => r.team_id === tm.id);
    const total = tmResults.reduce((acc, r) => acc + (r.score_global ?? 0), 0);
    const rounds = tmResults.map(r => ({ round: r.round_number, score: r.score_global ?? 0 }));
    return { tm, total, rounds };
  }).sort((a, b) => b.total - a.total);

  const roundNums = Array.from({ length: currentRound }, (_, i) => i + 1);
  const max = teamScores[0]?.total ?? 1;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="wrap">

        {/* Header */}
        <div style={{ padding: '36px 0 40px', borderBottom: '1px solid var(--line)', marginBottom: 48 }}>
          <span className="u-eyebrow">Tour {currentRound}/5</span>
          <h2 style={{ margin: '12px 0 0', fontSize: 'var(--t-3)' }}>Classement général</h2>
        </div>

        {/* Podium top 3 */}
        {teamScores.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 60, minHeight: 160 }}>
            {[teamScores[1], teamScores[0], teamScores[2]].filter(Boolean).map((entry, idx) => {
              const realRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const height = realRank === 1 ? 140 : realRank === 2 ? 100 : 76;
              return (
                <div key={entry.tm.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 100 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: realRank === 1 ? 'var(--scarlet)' : 'var(--muted)' }}>
                    #{realRank}
                  </div>
                  <span style={{ width: 32, height: 32, background: entry.tm.brand_color, display: 'block' }} />
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', lineHeight: 1.2 }}>{entry.tm.brand_name}</div>
                  <div style={{
                    width: '100%', height, background: realRank === 1 ? 'var(--ink)' : 'var(--fill-2)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10,
                  }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: realRank === 1 ? '#fff' : 'var(--ink)' }}>
                      {entry.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div style={{ border: '1px solid var(--line)', marginBottom: 48 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `40px 1fr ${roundNums.map(() => '64px').join(' ')} 80px`,
            gap: 0, padding: '12px 20px',
            borderBottom: '1px solid var(--line)', background: 'var(--fill)',
          }}>
            <span className="u-label">#</span>
            <span className="u-label">MARQUE</span>
            {roundNums.map(r => <span key={r} className="u-label" style={{ textAlign: 'right' }}>T{r}</span>)}
            <span className="u-label" style={{ textAlign: 'right' }}>TOTAL</span>
          </div>
          {teamScores.map(({ tm, total, rounds }, rank) => {
            const isMe = tm.id === team.id;
            return (
              <div
                key={tm.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `40px 1fr ${roundNums.map(() => '64px').join(' ')} 80px`,
                  gap: 0, padding: '14px 20px',
                  borderBottom: '1px solid var(--line)',
                  background: isMe ? 'var(--fill)' : undefined,
                  fontWeight: isMe ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: rank === 0 ? 'var(--scarlet)' : 'var(--muted)', fontWeight: rank === 0 ? 700 : 400 }}>
                  {rank + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 12, height: 12, background: tm.brand_color, flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.05em' }}>{tm.brand_name}</span>
                  {isMe && <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em' }}>VOUS</span>}
                </div>
                {roundNums.map(r => {
                  const rr = rounds.find(x => x.round === r);
                  return (
                    <span key={r} style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', color: 'var(--muted)' }}>
                      {rr ? rr.score : '—'}
                    </span>
                  );
                })}
                <span style={{ fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', fontWeight: 700 }}>
                  {total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bars */}
        <div>
          <div className="u-eyebrow" style={{ marginBottom: 24 }}>COMPARAISON</div>
          {teamScores.map(({ tm, total }, rank) => {
            const isMe = tm.id === team.id;
            const w = max > 0 ? (total / max) * 100 : 0;
            return (
              <div key={tm.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: tm.brand_color, display: 'block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: isMe ? 600 : 400 }}>{tm.brand_name}</span>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: rank === 0 ? 'var(--scarlet)' : 'var(--muted)' }}>{total}</span>
                </div>
                <div style={{ height: 6, background: 'var(--fill)' }}>
                  <div style={{ height: '100%', width: `${w}%`, background: rank === 0 ? 'var(--ink)' : tm.brand_color, opacity: rank === 0 ? 1 : .65, transition: 'width .4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

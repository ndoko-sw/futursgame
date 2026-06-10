'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/lib/game-context';
import { supabase } from '@/lib/supabase';
import type { RoundResult, Team } from '@/lib/types';

interface Entry { team: Team; total: number; rounds: number[] }

export default function LeaderboardPage() {
  const { lang, session, allTeams } = useGame();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (!session || !allTeams.length) return;

    async function load() {
      const { data } = await supabase
        .from('results').select('*')
        .in('team_id', allTeams.map((t) => t.id));

      const results = (data || []) as RoundResult[];
      const list = allTeams.map((team) => {
        const tr = results.filter((r) => r.team_id === team.id);
        const total = tr.reduce((s, r) => s + r.brand_score, 0);
        const rounds = [1,2,3,4,5].map((i) => tr.find((r) => r.round === i)?.brand_score ?? 0);
        return { team, total, rounds };
      });
      list.sort((a, b) => b.total - a.total);
      setEntries(list);
    }

    load();

    const ch = supabase.channel(`lb-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${session.id}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [session, allTeams]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label">JOIN A SESSION FIRST</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 space-y-12">

      <div className="space-y-2 fade-up">
        <span className="label">(SESSION {session.code})</span>
        <h1 className="page-title">{lang === 'fr' ? 'Classement' : 'Leaderboard'}</h1>
      </div>

      {entries.length === 0 ? (
        <p className="label py-8 text-center">
          {lang === 'fr' ? 'AUCUN RÉSULTAT POUR LE MOMENT' : 'NO RESULTS YET'}
        </p>
      ) : (
        <div className="fade-up-d1">
          {/* Table head */}
          <div className="flex items-center gap-4 pb-3 border-b border-[#ebebeb]">
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1" />
            {[1,2,3,4,5].map((r) => (
              <div key={r} className="w-10 text-center label hidden sm:block">R{r}</div>
            ))}
            <div className="w-16 text-right label">TOTAL</div>
          </div>

          {entries.map((entry, i) => (
            <div
              key={entry.team.id}
              className="flex items-center gap-4 py-4 border-b border-[#f5f5f5]"
            >
              {/* Rank */}
              <div className="w-8 flex-shrink-0 text-center">
                {i === 0
                  ? <span className="text-[0.7rem] font-medium" style={{ color: '#E63329' }}>01</span>
                  : <span className="label">{String(i + 1).padStart(2, '0')}</span>}
              </div>

              {/* Brand */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: entry.team.brand_color }} />
                <div className="min-w-0">
                  <span className="text-[0.75rem] tracking-wider text-[#121212] uppercase block truncate">
                    {entry.team.brand_name}
                  </span>
                  {entry.team.brand_statement && (
                    <span className="text-[0.65rem] text-[#bbb] italic block truncate">
                      {entry.team.brand_statement}
                    </span>
                  )}
                </div>
              </div>

              {/* Round scores */}
              {entry.rounds.map((score, ri) => (
                <div key={ri} className="w-10 text-center hidden sm:block">
                  <span className="label">{score > 0 ? score : '—'}</span>
                </div>
              ))}

              {/* Total */}
              <div className="w-16 text-right flex-shrink-0">
                <span
                  className="text-[1.094rem] font-light"
                  style={{ color: i === 0 ? '#E63329' : '#121212' }}
                >
                  {entry.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

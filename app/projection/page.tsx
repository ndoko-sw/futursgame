'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Session = { id: string; code: string; status: string; current_round: number; results_revealed: boolean };
type Team = { id: string; brand_name: string; brand_color: string; cumulative_score: number };

function ProjectionInner() {
  const searchParams = useSearchParams();
  const code = (searchParams.get('code') ?? '').toUpperCase();
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Resolve session from code
  useEffect(() => {
    if (!code) { setError('Aucun code de session fourni (?code=XXXX).'); return; }
    supabase.from('sessions').select('*').eq('code', code).maybeSingle().then(({ data }) => {
      if (!data) { setError(`Session "${code}" introuvable.`); return; }
      setSession(data as Session);
    });
  }, [code]);

  // Load teams + subscribe to realtime; light polling as fallback
  useEffect(() => {
    if (!session?.id) return;
    const sid = session.id;
    const loadTeams = () => supabase.from('teams').select('*').eq('session_id', sid).then(({ data }) => { if (data) setTeams(data as Team[]); });
    const loadSession = () => supabase.from('sessions').select('*').eq('id', sid).maybeSingle().then(({ data }) => { if (data) setSession(data as Session); });
    loadTeams();

    const ch = supabase.channel(`projection-${sid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sid}` }, loadTeams)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sid}` }, (p) => setSession(p.new as Session))
      .subscribe();

    const iv = setInterval(() => { loadTeams(); loadSession(); }, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [session?.id]);

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 22, letterSpacing: '.04em' }}>{error}</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, letterSpacing: '.2em' }}>CHARGEMENT…</div>
      </div>
    );
  }

  const sorted = [...teams].sort((a, b) => (b.cumulative_score ?? 0) - (a.cumulative_score ?? 0));
  const revealed = !!session.results_revealed;
  const maxScore = Math.max(...sorted.map(t => t.cumulative_score ?? 0), 1);
  const statusLabel = session.status === 'ended' ? 'Session terminée'
    : revealed ? 'Résultats révélés'
    : session.status === 'active' ? 'Tour en cours'
    : session.status === 'practice' ? 'Tour pratique'
    : 'En attente';

  // Podium when revealed
  const podium = revealed ? [sorted[1], sorted[0], sorted[2]].filter(Boolean) : [];
  const heights = [220, 300, 160];
  const medals = ['🥈', '🏆', '🥉'];

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', padding: '48px 64px', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes pjIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}} @keyframes pjBar{from{width:0}to{width:var(--w)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: '.4em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: 12 }}>FUTURS DROPS · {session.code}</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1 }}>CLASSEMENT</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: 8 }}>
            {session.current_round === 0 ? 'PRATIQUE' : `TOUR ${session.current_round}/5`}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 18, color: revealed ? '#4ade80' : '#C8911A' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: revealed ? '#4ade80' : '#C8911A', display: 'inline-block', animation: 'pjIn 1s ease' }} />
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Podium (revealed) */}
      {podium.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 28, marginBottom: 56 }}>
          {podium.map((entry, i) => entry && (
            <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: `pjIn .7s ease ${i * 0.2}s both` }}>
              <div style={{ fontSize: 44 }}>{medals[i]}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 34, fontWeight: 900 }}>{entry.cumulative_score ?? 0}</div>
              <div style={{ width: 16, height: 16, background: entry.brand_color, borderRadius: '50%' }} />
              <div style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', maxWidth: 180 }}>{entry.brand_name}</div>
              <div style={{ width: 180, height: heights[i], background: i === 1 ? '#fff' : 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: i === 1 ? '#0a0a0a' : 'rgba(255,255,255,.5)' }}>{i === 1 ? '1er' : i === 0 ? '2e' : '3e'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full ranking bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1, justifyContent: 'center' }}>
        {sorted.length === 0 && (
          <div style={{ fontSize: 24, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>En attente des marques…</div>
        )}
        {sorted.map((tm, i) => (
          <div key={tm.id} style={{ animation: `pjIn .5s ease ${i * 0.08}s both` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 26, color: i === 0 ? '#E63329' : 'rgba(255,255,255,.4)', width: 48, fontWeight: i === 0 ? 800 : 400 }}>#{i + 1}</span>
                <span style={{ width: 22, height: 22, background: tm.brand_color, display: 'inline-block' }} />
                <span style={{ fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{tm.brand_name}</span>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 34, fontWeight: 900 }}>{tm.cumulative_score ?? 0}</span>
            </div>
            <div style={{ height: 14, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((tm.cumulative_score ?? 0) / maxScore) * 100}%`, background: tm.brand_color, transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectionPage() {
  return <Suspense><ProjectionInner /></Suspense>;
}

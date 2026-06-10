'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { supabase } from '@/lib/supabase';
import { computeRoundResults } from '@/lib/simulation';
import { toast } from 'sonner';
import type { Decision, Session } from '@/lib/types';
import { Play, Pause, SkipForward, Square, Zap, RefreshCw } from 'lucide-react';

const ROUND_SEC = 12 * 60;

const EVENTS = [
  { title_fr: 'Pénurie de coton bio', title_en: 'Organic cotton shortage',
    description_fr: 'Les prix du coton bio augmentent de 20%. Les marques éthiques voient leurs coûts grimper.',
    description_en: 'Organic cotton prices increase 20%. Ethical brands see costs rise.',
    effect_json: { sustainability_cost: 20 } },
  { title_fr: 'Influenceur viral — Afro vibes', title_en: 'Viral influencer — Afro vibes',
    description_fr: 'Un créateur majeur porte la tendance Afro. Les marques Afro gagnent en visibilité.',
    description_en: 'A major creator wears the Afro trend. Afro brands gain visibility.',
    effect_json: { afro_image_boost: 15 } },
  { title_fr: 'Régulation Fast Fashion EU', title_en: 'EU Fast Fashion Regulation',
    description_fr: 'Nouvelle directive européenne pénalise les marques à production rapide.',
    description_en: 'New EU directive penalizes fast production brands.',
    effect_json: { fast_fashion_penalty: 25 } },
  { title_fr: 'Hype capsule limitée', title_en: 'Limited capsule hype',
    description_fr: 'Les drops limités créent un buzz inédit. Les capsules s\'arrachent.',
    description_en: 'Limited drops create unprecedented buzz. Capsules fly off shelves.',
    effect_json: { capsule_sales_boost: 20 } },
];

export default function AdminPage() {
  const { lang, session, setSession, allTeams, currentRound } = useGame();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    const ch = supabase.channel('admin-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, loadSessions)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadSessions() {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (data) setSessions(data as Session[]);
  }

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const selectSess = (s: Session) => { setSession(s); setSelectedId(s.id); };

  const startPractice = () => wrap(async () => {
    if (!session) return;
    const roundEndsAt = new Date(Date.now() + ROUND_SEC * 1000).toISOString();
    const { error } = await supabase.from('sessions').update({ status: 'practice', current_round: 0, round_ends_at: roundEndsAt }).eq('id', session.id);
    if (error) throw error;
    toast.success(lang === 'fr' ? 'Pratique lancée' : 'Practice started');
  });

  const nextRound = () => wrap(async () => {
    if (!session) return;
    const next = currentRound + 1;
    const roundEndsAt = new Date(Date.now() + ROUND_SEC * 1000).toISOString();
    const { error } = await supabase.from('sessions').update({ current_round: next, round_ends_at: roundEndsAt, status: 'active' }).eq('id', session.id);
    if (error) throw error;
    toast.success(`Round ${next} started`);
  });

  const pause = () => wrap(async () => {
    if (!session) return;
    const { error } = await supabase.from('sessions').update({ status: 'paused', round_ends_at: null }).eq('id', session.id);
    if (error) throw error;
  });

  const resume = () => wrap(async () => {
    if (!session) return;
    const roundEndsAt = new Date(Date.now() + ROUND_SEC * 1000).toISOString();
    const { error } = await supabase.from('sessions').update({ status: currentRound === 0 ? 'practice' : 'active', round_ends_at: roundEndsAt }).eq('id', session.id);
    if (error) throw error;
  });

  const endSession = () => wrap(async () => {
    if (!session) return;
    const { error } = await supabase.from('sessions').update({ status: 'finished', round_ends_at: null }).eq('id', session.id);
    if (error) throw error;
  });

  const computeResults = () => wrap(async () => {
    if (!session) return;
    const { data: dec } = await supabase.from('decisions').select('*').eq('round', currentRound);
    if (!dec?.length) { toast.error('No decisions for this round'); return; }

    const res = computeRoundResults(dec as Decision[], currentRound);
    for (const r of res) {
      const { error } = await supabase.from('results').upsert(
        { team_id: r.team_id, round: r.round, sales: r.sales, image_score: r.image_score, sustainability_score: r.sustainability_score, loyalty_score: r.loyalty_score, brand_score: r.brand_score, market_share: r.market_share },
        { onConflict: 'team_id,round' }
      );
      if (error) throw error;
      const { data: allRes } = await supabase.from('results').select('brand_score').eq('team_id', r.team_id);
      const cum = (allRes || []).reduce((s, x) => s + x.brand_score, 0);
      await supabase.from('teams').update({ cumulative_score: cum }).eq('id', r.team_id);
    }

    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    await supabase.from('market_events').insert({ session_id: session.id, round: currentRound, ...ev });
    toast.success(lang === 'fr' ? 'Résultats calculés' : 'Results computed');
  });

  const roundLabel = session
    ? (currentRound === 0 ? 'PRACTICE' : `ROUND ${currentRound} / 5`)
    : '—';

  const statusColor = (s: string) => {
    if (s === 'active' || s === 'practice') return 'text-green-700 border-green-200';
    if (s === 'paused') return 'text-amber-700 border-amber-200';
    if (s === 'finished') return 'text-[#bbb] border-[#ebebeb]';
    return 'text-[#888] border-[#ddd]';
  };

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 space-y-12">

      <div className="space-y-2 fade-up">
        <span className="label">(GAME MASTER)</span>
        <h1 className="page-title">{lang === 'fr' ? 'Panneau de contrôle' : 'Control Panel'}</h1>
      </div>

      {/* Sessions list */}
      <div className="space-y-5 fade-up-d1">
        <div className="flex items-center justify-between">
          <span className="label">(SESSIONS)</span>
          <button onClick={loadSessions} className="text-[#ccc] hover:text-[#888] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="label py-4">
            {lang === 'fr' ? 'AUCUNE SESSION — CRÉER DEPUIS L\'ACCUEIL' : 'NO SESSIONS — CREATE FROM HOME'}
          </p>
        ) : (
          <div>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSess(s)}
                className={`w-full flex items-center justify-between py-4 px-4 border-b border-[#f5f5f5] transition-colors text-left hover:bg-[#fafafa] ${selectedId === s.id ? 'bg-[#f7f7f7]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[0.875rem] text-[#121212]">{s.code}</span>
                  <span className="label">Round {s.current_round}</span>
                </div>
                <span className={`label px-2 py-0.5 border ${statusColor(s.status)}`}>{s.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      {session && (
        <div className="space-y-7 fade-up-d2">
          <div className="rule" />
          <div className="flex items-center justify-between">
            <span className="label">({roundLabel})</span>
            <span className="label">{allTeams.length} {lang === 'fr' ? 'ÉQUIPES' : 'TEAMS'}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.status === 'waiting' && (
              <button onClick={startPractice} disabled={loading} className="btn btn-primary">
                <Play className="w-3.5 h-3.5" />
                {lang === 'fr' ? 'DÉMARRER PRATIQUE' : 'START PRACTICE'}
              </button>
            )}
            {(session.status === 'practice' || session.status === 'active') && (
              <>
                <button onClick={pause} disabled={loading} className="btn btn-outline">
                  <Pause className="w-3.5 h-3.5" />
                  PAUSE
                </button>
                {currentRound < 5 && (
                  <button onClick={nextRound} disabled={loading} className="btn btn-primary">
                    <SkipForward className="w-3.5 h-3.5" />
                    {lang === 'fr' ? 'TOUR SUIVANT' : 'NEXT ROUND'}
                  </button>
                )}
              </>
            )}
            {session.status === 'paused' && (
              <button onClick={resume} disabled={loading} className="btn btn-primary">
                <Play className="w-3.5 h-3.5" />
                {lang === 'fr' ? 'REPRENDRE' : 'RESUME'}
              </button>
            )}
            <button onClick={computeResults} disabled={loading} className="btn btn-outline">
              <Zap className="w-3.5 h-3.5" />
              {lang === 'fr' ? 'CALCULER RÉSULTATS' : 'COMPUTE RESULTS'}
            </button>
            <button onClick={endSession} disabled={loading} className="btn btn-outline border-red-200 text-red-500 hover:border-red-400">
              <Square className="w-3.5 h-3.5" />
              {lang === 'fr' ? 'TERMINER' : 'END'}
            </button>
          </div>

          {allTeams.length > 0 && (
            <div className="space-y-3">
              <span className="label">({lang === 'fr' ? 'ÉQUIPES' : 'TEAMS'})</span>
              {allTeams.map((tm) => (
                <div key={tm.id} className="flex items-center gap-3 py-2.5 border-b border-[#f5f5f5]">
                  <div className="w-3 h-3" style={{ backgroundColor: tm.brand_color }} />
                  <span className="text-[0.75rem] text-[#555] tracking-wider uppercase">{tm.brand_name}</span>
                  <span className="ml-auto label">{tm.cumulative_score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { computeRoundResults } from '@/lib/simulation';

const GM_PASSWORD = 'djassa';

type Session = {
  id: string; code: string; status: string; current_round: number;
  results_revealed: boolean; round_ends_at: string | null;
};
type Team = { id: string; brand_name: string; brand_color: string; current_budget: number };
type Decision = { id: string; team_id: string; round_number: number; submitted_at: string | null; [k: string]: any };
type Event = { id: string; name: string; description: string; active: boolean; round_number: number };

export default function GameMasterPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [computing, setComputing] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 40)]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (data) setSessions(data as Session[]);
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadSessions();
  }, [authed, loadSessions]);

  // Load session data
  useEffect(() => {
    if (!activeSession) return;
    const load = async () => {
      const [t, d, e] = await Promise.all([
        supabase.from('teams').select('*').eq('session_id', activeSession.id),
        supabase.from('decisions').select('*').eq('session_id', activeSession.id),
        supabase.from('market_events').select('*').eq('session_id', activeSession.id),
      ]);
      if (t.data) setTeams(t.data as Team[]);
      if (d.data) setDecisions(d.data as Decision[]);
      if (e.data) setEvents(e.data as Event[]);
    };
    load();

    // Realtime
    const ch = supabase.channel(`gm-${activeSession.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${activeSession.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions', filter: `session_id=eq.${activeSession.id}` }, load)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [activeSession]);

  // Auth
  const handleAuth = () => {
    if (pwd === GM_PASSWORD) { setAuthed(true); setPwdError(false); }
    else { setPwdError(true); }
  };

  // Create session
  const createSession = async () => {
    setCreating(true);
    const code = sessionCode.toUpperCase().trim() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase.from('sessions').insert({ code, status: 'waiting', current_round: 1 }).select().single();
    if (error) { addLog(`Erreur : ${error.message}`); }
    else { addLog(`Session ${code} créée`); setActiveSession(data as Session); await loadSessions(); }
    setCreating(false);
  };

  // Start session
  const startSession = async (status: 'practice' | 'active') => {
    if (!activeSession) return;
    const ends = new Date(Date.now() + (status === 'practice' ? 5 : 10) * 60_000).toISOString();
    const round = status === 'active' && activeSession.current_round === 0 ? 1 : activeSession.current_round;
    await supabase.from('sessions').update({ status, round_ends_at: ends, current_round: round }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, status, round_ends_at: ends, current_round: round } : prev);
    addLog(status === 'practice' ? 'Tour pratique lancé (5 min)' : `Tour ${round} lancé (10 min)`);
  };

  // Reveal results
  const revealResults = async () => {
    if (!activeSession) return;
    if (activeSession.results_revealed) { addLog('Résultats déjà révélés pour ce tour'); return; }
    const roundDecisions = decisions.filter(d => d.round_number === activeSession.current_round);
    const submitted = roundDecisions.filter(d => d.submitted_at);
    const missing = teams.length - submitted.length;
    if (missing > 0) {
      const ok = window.confirm(`⚠️ ${missing} équipe(s) n'ont pas encore soumis leurs décisions. Révéler quand même ?`);
      if (!ok) return;
    }
    setComputing(true);
    addLog('Calcul des scores…');
    try {
      const roundEvents = events.filter(e => e.active && e.round_number === activeSession.current_round);
      const scoresMap = computeRoundResults(roundDecisions as any, roundEvents as any);
      for (const team of teams) {
        const dec = roundDecisions.find(d => d.team_id === team.id);
        if (!dec) continue;
        const scores = scoresMap.get(team.id) ?? { score_ventes: 0, score_image: 0, score_durabilite: 0, score_fidelite: 0, score_global: 0 };
        const totalSpent = (dec.budget_fournisseur ?? 0) + (dec.budget_collection ?? 0) + (dec.budget_prix ?? 0) + (dec.budget_distribution ?? 0) + (dec.budget_communication ?? 0);
        const budgetRemaining = Math.max(0, (team.current_budget ?? 100_000) - totalSpent);
        const budgetNext = Math.min(budgetRemaining + scores.score_ventes * 2000, 300_000);
        await supabase.from('results').insert({
          session_id: activeSession.id, team_id: team.id, round_number: activeSession.current_round,
          event_id: roundEvents[0]?.id ?? null, budget_remaining: budgetRemaining, budget_next: budgetNext,
          ...scores,
        });
        await supabase.from('teams').update({ current_budget: budgetNext }).eq('id', team.id);
      }
      await supabase.from('sessions').update({ results_revealed: true }).eq('id', activeSession.id);
      setActiveSession(prev => prev ? { ...prev, results_revealed: true } : prev);
      addLog('Résultats révélés ✓');
    } catch (err: any) {
      addLog(`Erreur : ${err.message}`);
    }
    setComputing(false);
  };

  // Next round
  const nextRound = async () => {
    if (!activeSession) return;
    const nextRound = activeSession.current_round + 1;
    const ends = new Date(Date.now() + 10 * 60_000).toISOString();
    await supabase.from('sessions').update({
      current_round: nextRound, status: 'active',
      results_revealed: false, round_ends_at: ends,
    }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, current_round: nextRound, status: 'active', results_revealed: false, round_ends_at: ends } : prev);
    addLog(`Tour ${nextRound} lancé`);
  };

  // End session
  const endSession = async () => {
    if (!activeSession) return;
    await supabase.from('sessions').update({ status: 'ended' }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, status: 'ended' } : prev);
    addLog('Session terminée');
  };

  // Add event
  const addEvent = async () => {
    if (!activeSession || !newEventName.trim()) return;
    const { data } = await supabase.from('market_events').insert({
      session_id: activeSession.id, round_number: activeSession.current_round,
      name: newEventName.trim(), description: newEventDesc.trim(), active: true,
    }).select().single();
    if (data) {
      setEvents(prev => [...prev, data as Event]);
      setNewEventName(''); setNewEventDesc('');
      addLog(`Événement "${data.name}" ajouté`);
    }
  };

  // Toggle event active
  const toggleEvent = async (ev: Event) => {
    await supabase.from('market_events').update({ active: !ev.active }).eq('id', ev.id);
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, active: !e.active } : e));
  };

  /* ─── AUTH CARD ─── */
  if (!authed) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212' }}>
        <div style={{ width: 360, background: '#fff', padding: 40, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#888', marginBottom: 12 }}>FUTURS DROPS · ACCÈS ANIMATEUR</div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Game Master</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 10, letterSpacing: '.12em', color: '#888' }}>MOT DE PASSE</label>
            <input
              type="password" value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{
                border: `1px solid ${pwdError ? '#E63329' : '#ddd'}`, padding: '12px 14px',
                fontSize: 16, outline: 'none', background: '#F4F3F1',
              }}
              autoFocus placeholder="••••••"
            />
            {pwdError && <span style={{ fontSize: 12, color: '#E63329' }}>Mot de passe incorrect</span>}
          </div>
          <button onClick={handleAuth} style={{ background: '#121212', color: '#fff', border: 0, padding: '14px 0', fontSize: 14, letterSpacing: '.1em', cursor: 'pointer' }}>
            ENTRER →
          </button>
        </div>
      </div>
    );
  }

  /* ─── GM PANEL ─── */
  const currentRoundDecisions = decisions.filter(d => d.round_number === (activeSession?.current_round ?? 1));
  const submittedCount = currentRoundDecisions.filter(d => d.submitted_at).length;

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F3F1' }}>
      {/* Top bar */}
      <div style={{ background: '#121212', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#fff', fontSize: 13, letterSpacing: '.1em' }}>FUTURS DROPS · GM</span>
          {activeSession && (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
              {activeSession.code}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {activeSession && (
            <button
              onClick={() => setShowQr(true)}
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: 0, padding: '7px 14px', fontSize: 11, letterSpacing: '.08em', cursor: 'pointer' }}
            >
              QR →
            </button>
          )}
          <a href="/" style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, textDecoration: 'none' }}>Vue joueur</a>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>

        {/* Session selector */}
        {!activeSession && (
          <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 32, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem' }}>Créer ou rejoindre une session</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <input
                value={sessionCode} onChange={e => setSessionCode(e.target.value.toUpperCase())}
                placeholder="CODE PERSONNALISÉ (optionnel)"
                style={{ flex: 1, border: '1px solid #e0ddd9', padding: '11px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.12em', background: '#F4F3F1', outline: 'none' }}
                maxLength={6}
              />
              <button
                onClick={createSession} disabled={creating}
                style={{ background: '#121212', color: '#fff', border: 0, padding: '11px 24px', fontSize: 13, cursor: 'pointer', letterSpacing: '.06em' }}
              >
                {creating ? '…' : 'CRÉER →'}
              </button>
            </div>
            {sessions.length > 0 && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 12 }}>SESSIONS EXISTANTES</div>
                {sessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14 }}>{s.code}</span>
                      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>{s.status}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>Tour {s.current_round}</span>
                    </div>
                    <button
                      onClick={() => setActiveSession(s)}
                      style={{ background: '#121212', color: '#fff', border: 0, padding: '7px 16px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Gérer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSession && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.12fr 1fr', gap: 16 }}>

            {/* ── COL 1 — Controls ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Session info */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>SESSION</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22 }}>{activeSession.code}</span>
                  <span style={{ fontSize: 11, background: '#F4F3F1', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '.08em', alignSelf: 'center' }}>
                    {activeSession.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Tour {activeSession.current_round}/5 · {teams.length} marque{teams.length > 1 ? 's' : ''}</div>
              </div>

              {/* Controls */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 6 }}>CONTRÔLES</div>

                {activeSession.status === 'waiting' && (
                  <>
                    <button onClick={() => startSession('practice')} style={btnStyle('#6E6F4B')}>▶ Tour pratique (5 min)</button>
                    <button onClick={() => startSession('active')} style={btnStyle('#121212')}>▶ Lancer Tour 1 (10 min)</button>
                  </>
                )}
                {activeSession.status === 'practice' && (
                  <button onClick={() => startSession('active')} style={btnStyle('#121212')}>▶ Fin pratique → Tour 1</button>
                )}
                {activeSession.status === 'active' && !activeSession.results_revealed && (
                  <button onClick={revealResults} disabled={computing} style={btnStyle('#E63329')}>
                    {computing ? '… Calcul en cours' : '⚡ Révéler résultats'}
                  </button>
                )}
                {activeSession.status === 'active' && activeSession.results_revealed && activeSession.current_round < 5 && (
                  <button onClick={nextRound} style={btnStyle('#121212')}>▶ Tour {activeSession.current_round + 1}</button>
                )}
                {activeSession.current_round >= 5 && activeSession.results_revealed && (
                  <button onClick={endSession} style={btnStyle('#888')}>■ Terminer la session</button>
                )}
              </div>

              {/* Submission status */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>SOUMISSIONS T{activeSession.current_round}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>{submittedCount}/{teams.length}</div>
                <div style={{ height: 4, background: '#eee', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: teams.length > 0 ? `${(submittedCount / teams.length) * 100}%` : '0%', background: '#127a3e', transition: 'width .3s' }} />
                </div>
                {teams.map(tm => {
                  const dec = currentRoundDecisions.find(d => d.team_id === tm.id);
                  const submitted = !!dec?.submitted_at;
                  return (
                    <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eeeb', fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, background: tm.brand_color, display: 'block', flexShrink: 0 }} />
                      <span style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.04em' }}>{tm.brand_name}</span>
                      <span style={{ fontSize: 11, color: submitted ? '#127a3e' : '#B86B4B' }}>
                        {submitted ? '✓' : '…'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Log */}
              <div style={{ background: '#121212', border: '1px solid #222', padding: 20, maxHeight: 200, overflow: 'auto' }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#555', marginBottom: 10 }}>LOG</div>
                {log.map((l, i) => (
                  <div key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#aaa', marginBottom: 4 }}>{l}</div>
                ))}
              </div>
            </div>

            {/* ── COL 2 — Team decisions ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 20 }}>DÉCISIONS TOUR {activeSession.current_round}</div>
                {teams.length === 0 && (
                  <p style={{ fontSize: 13, color: '#aaa' }}>Aucune marque connectée</p>
                )}
                {teams.map(tm => {
                  const dec = currentRoundDecisions.find(d => d.team_id === tm.id);
                  const modules = ['fournisseur', 'collection', 'prix', 'distribution', 'communication'];
                  const total = dec ? modules.reduce((s, m) => s + (dec[`budget_${m}`] ?? 0), 0) : 0;
                  return (
                    <div key={tm.id} style={{ borderBottom: '1px solid #f0eeeb', paddingBottom: 20, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ width: 12, height: 12, background: tm.brand_color, display: 'block', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>{tm.brand_name}</span>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#888' }}>
                          {(total / 1000).toFixed(0)}k€
                        </span>
                      </div>
                      {dec && modules.map(m => {
                        const v = dec[`budget_${m}`] ?? 0;
                        const budget = tm.current_budget ?? 100_000;
                        const pct = budget > 0 ? (v / budget) * 100 : 0;
                        return (
                          <div key={m} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                              <span style={{ textTransform: 'uppercase', letterSpacing: '.06em', color: '#888' }}>{m}</span>
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#888' }}>{(v / 1000).toFixed(0)}k€ · {Math.round(pct)}%</span>
                            </div>
                            <div style={{ height: 3, background: '#eee' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#121212' }} />
                            </div>
                          </div>
                        );
                      })}
                      {!dec && <p style={{ fontSize: 11, color: '#aaa' }}>— aucune décision</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COL 3 — Events ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 20 }}>ÉVÉNEMENTS DE MARCHÉ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  <input
                    value={newEventName} onChange={e => setNewEventName(e.target.value)}
                    placeholder="Nom de l'événement"
                    style={{ border: '1px solid #e0ddd9', background: '#F4F3F1', padding: '10px 13px', fontSize: 13, outline: 'none' }}
                  />
                  <textarea
                    value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)}
                    placeholder="Description / impact narratif"
                    rows={3}
                    style={{ border: '1px solid #e0ddd9', background: '#F4F3F1', padding: '10px 13px', fontSize: 13, outline: 'none', resize: 'vertical' }}
                  />
                  <button onClick={addEvent} disabled={!newEventName.trim()} style={btnStyle('#121212')}>
                    + Ajouter
                  </button>
                </div>
                {events.length === 0 && <p style={{ fontSize: 12, color: '#aaa' }}>Aucun événement</p>}
                {events.map(ev => (
                  <div key={ev.id} style={{ border: '1px solid #e8e6e3', padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 12 }}>{ev.name}</div>
                      <button
                        onClick={() => toggleEvent(ev)}
                        style={{
                          background: ev.active ? '#121212' : '#F4F3F1',
                          color: ev.active ? '#fff' : '#888',
                          border: '1px solid ' + (ev.active ? '#121212' : '#e0ddd9'),
                          padding: '4px 10px', fontSize: 10, cursor: 'pointer', letterSpacing: '.06em', flexShrink: 0,
                        }}
                      >
                        {ev.active ? 'ACTIF' : 'OFF'}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#888', lineHeight: 1.4, margin: 0 }}>{ev.description}</p>
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 8 }}>Tour {ev.round_number}</div>
                  </div>
                ))}
              </div>

              {/* Session URL */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>LIEN JOUEURS</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, background: '#F4F3F1', padding: '12px 14px', wordBreak: 'break-all', marginBottom: 12 }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/
                </div>
                <button
                  onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + '/'); }}
                  style={btnStyle('#6E6F4B')}
                >
                  Copier le lien
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* QR overlay */}
      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div style={{ background: '#fff', padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#888' }}>PARTAGEZ CE CODE</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 48, fontWeight: 700 }}>{activeSession?.code}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Les joueurs entrent ce code sur la page d'accueil</div>
            <button onClick={() => setShowQr(false)} style={btnStyle('#121212')}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 0, padding: '11px 16px',
    fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' as const,
    cursor: 'pointer', width: '100%', textAlign: 'center' as const,
  };
}

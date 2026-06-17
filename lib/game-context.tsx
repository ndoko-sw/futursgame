'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, Team, Lang, Decision, RoundResult, MarketEvent, Product } from '@/lib/types';
import { t } from '@/lib/i18n';

interface GameContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  session: Session | null;
  team: Team | null;
  restoring: boolean;
  currentRound: number;
  roundTimeLeft: number | null;
  decisions: Decision[];
  products: Product[];
  results: RoundResult[];
  allResults: RoundResult[];
  marketEvent: MarketEvent | null;
  allMarketEvents: MarketEvent[];
  allTeams: Team[];
  joinSession: (code: string, brandName: string, brandColor: string, brandStatement: string, productName?: string, productCategory?: string, productStyle?: string) => Promise<void>;
  createSession: () => Promise<string>;
  submitDecision: (decision: Omit<Decision, 'id' | 'team_id' | 'submitted_at'>) => Promise<void>;
  leaveSession: () => void;
  setSession: (session: Session | null) => void;
  setTeam: (team: Team | null) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>;
}

const GameContext = createContext<GameContextType | null>(null);

const LS_SESSION = 'futurs_session_id';
const LS_TEAM = 'futurs_team_id';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);
  const [marketEvent, setMarketEvent] = useState<MarketEvent | null>(null);
  const [allMarketEvents, setAllMarketEvents] = useState<MarketEvent[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(true);

  const currentRound = session?.current_round ?? 0;

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(LS_SESSION);
    const savedTeamId = localStorage.getItem(LS_TEAM);
    if (!savedSessionId || !savedTeamId) { setRestoring(false); return; }

    supabase.from('sessions').select('*').eq('id', savedSessionId).single().then(({ data: s }) => {
      if (!s || s.status === 'ended') {
        localStorage.removeItem(LS_SESSION);
        localStorage.removeItem(LS_TEAM);
        setRestoring(false);
        return;
      }
      setSession(s as Session);
      supabase.from('teams').select('*').eq('id', savedTeamId).single().then(({ data: t }) => {
        if (t) setTeam(t as Team);
        setRestoring(false);
      });
    });
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, lang, vars),
    [lang]
  );

  // Refs so realtime callbacks always see latest values without triggering re-subscription
  const sessionRef = useRef(session);
  const teamRef = useRef(team);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { teamRef.current = team; }, [team]);

  // Realtime: subscribe once per session.id — stable, no teardown on every update
  useEffect(() => {
    if (!session?.id) return;
    const sessionId = session.id;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as Session;
          setSession(updated);
          if (updated.status === 'ended') {
            localStorage.removeItem(LS_SESSION);
            localStorage.removeItem(LS_TEAM);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => {
          supabase.from('teams').select('*').eq('session_id', sessionId).then(({ data }) => {
            if (data) {
              setAllTeams(data as Team[]);
              const me = data.find((t: any) => t.id === teamRef.current?.id);
              if (me) setTeam(me as Team);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decisions', filter: `session_id=eq.${sessionId}` },
        () => {
          const tid = teamRef.current?.id;
          if (tid) {
            supabase.from('decisions').select('*').eq('team_id', tid).then(({ data }) => {
              if (data) setDecisions(data as Decision[]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `session_id=eq.${sessionId}` },
        () => {
          const tid = teamRef.current?.id;
          if (tid) {
            supabase.from('products').select('*').eq('team_id', tid).order('created_at', { ascending: true }).then(({ data }) => {
              if (data) setProducts(data as Product[]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results', filter: `session_id=eq.${sessionId}` },
        () => {
          const tid = teamRef.current?.id;
          if (tid) {
            supabase.from('results').select('*').eq('team_id', tid).then(({ data }) => {
              if (data) setResults(data as RoundResult[]);
            });
          }
          supabase.from('results').select('*').eq('session_id', sessionId).order('round_number', { ascending: true }).then(({ data }) => {
            if (data) setAllResults(data as RoundResult[]);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_events', filter: `session_id=eq.${sessionId}` },
        () => {
          supabase.from('market_events').select('*').eq('session_id', sessionId).then(({ data }) => {
            if (data) {
              setAllMarketEvents(data as MarketEvent[]);
              const round = sessionRef.current?.current_round ?? 0;
              const active = data.filter((e: any) => e.round_number === round && e.active !== false);
              if (active.length > 0) setMarketEvent(active[0] as MarketEvent);
              else setMarketEvent(null);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, team?.id]); // stable — only re-subscribe if session or team ID changes

  // Polling fallback: re-fetch session every 4s whenever session is active (realtime can miss updates)
  useEffect(() => {
    if (!session?.id || session?.status === 'ended') return;
    const sessionId = session.id;
    const iv = setInterval(async () => {
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (!data) return;
      if (
        data.status !== session.status ||
        data.current_round !== session.current_round ||
        data.results_revealed !== session.results_revealed
      ) {
        setSession(data as Session);
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [session?.id, session?.status, session?.current_round, session?.results_revealed]);

  // Timer countdown
  useEffect(() => {
    if (!session?.round_ends_at) {
      setRoundTimeLeft(null);
      return;
    }

    const tick = () => {
      const diff = new Date(session.round_ends_at!).getTime() - Date.now();
      setRoundTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.round_ends_at]);

  // Load teams, allResults + market events on session change or reveal
  useEffect(() => {
    if (!session) return;
    supabase.from('teams').select('*').eq('session_id', session.id).then(({ data }) => {
      if (data) setAllTeams(data as Team[]);
    });
    supabase.from('results').select('*').eq('session_id', session.id).order('round_number', { ascending: true }).then(({ data }) => {
      if (data) setAllResults(data as RoundResult[]);
    });
    supabase.from('market_events').select('*').eq('session_id', session.id).then(({ data }) => {
      if (data) {
        setAllMarketEvents(data as MarketEvent[]);
        const active = data.filter((e: any) => e.round_number === session.current_round && e.active !== false);
        if (active.length > 0) setMarketEvent(active[0] as MarketEvent);
        else setMarketEvent(null);
      }
    });
  }, [session?.id, session?.current_round, session?.results_revealed]);

  // Reload team data when team, round, or results_revealed changes
  useEffect(() => {
    if (!team) return;
    supabase.from('decisions').select('*').eq('team_id', team.id).order('round_number', { ascending: true }).then(({ data }) => {
      if (data) setDecisions(data as Decision[]);
    });
    supabase.from('products').select('*').eq('team_id', team.id).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });
    supabase.from('results').select('*').eq('team_id', team.id).order('round_number', { ascending: true }).then(({ data }) => {
      if (data) setResults(data as RoundResult[]);
    });
  }, [team?.id, currentRound, session?.results_revealed]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const createSession = async () => {
    const code = generateCode();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ code, status: 'waiting', current_round: 0 })
      .select()
      .single();
    if (error) throw error;
    setSession(data as Session);
    return code;
  };

  const joinSession = async (code: string, brandName: string, brandColor: string, brandStatement: string, productName?: string, productCategory?: string, productStyle?: string) => {
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    if (sessionError || !sessionData) throw new Error('Code de session invalide');
    if (sessionData.status !== 'waiting') throw new Error('Cette session est déjà en cours ou terminée');

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        session_id: sessionData.id,
        brand_name: brandName,
        brand_color: brandColor,
        brand_statement: brandStatement,
        current_budget: 100000,
      })
      .select()
      .single();
    if (teamError) throw teamError;

    // Create first product for round 1 with correct schema
    if (productName && productCategory && productStyle) {
      await supabase.from('products').insert({
        session_id: sessionData.id,
        team_id: teamData.id,
        round_number: 1,
        name: productName,
        category: productCategory,
        style: productStyle,
        supplier: 'usine_europe',
        price_tier: 'milieu',
        budget_supplier: 0, budget_collection: 0,
        budget_comm_tiktok: 0, budget_comm_press: 0, budget_comm_event: 0, budget_comm_influencer: 0,
        budget_dist_ecommerce: 0, budget_dist_popup: 0, budget_dist_multibrand: 0, budget_dist_wholesale: 0, budget_dist_social_drop: 0,
      });
    }

    setSession(sessionData as Session);
    setTeam(teamData as Team);
    localStorage.setItem(LS_SESSION, sessionData.id);
    localStorage.setItem(LS_TEAM, teamData.id);
  };

  const submitDecision = async (decision: Omit<Decision, 'id' | 'team_id' | 'submitted_at'>) => {
    if (!team || !session) return;
    const { error } = await supabase
      .from('decisions')
      .upsert(
        { team_id: team.id, submitted_at: new Date().toISOString(), ...decision, session_id: session.id },
        { onConflict: 'team_id,round_number' }
      );
    if (error) throw error;
  };

  return (
    <GameContext.Provider
      value={{
        lang,
        setLang,
        t: translate,
        session,
        team,
        restoring,
        currentRound,
        roundTimeLeft,
        decisions,
        products,
        results,
        allResults,
        marketEvent,
        allMarketEvents,
        allTeams,
        joinSession,
        createSession,
        submitDecision,
        leaveSession: () => {
          localStorage.removeItem(LS_SESSION);
          localStorage.removeItem(LS_TEAM);
          setSession(null);
          setTeam(null);
          setDecisions([]);
          setProducts([]);
          setResults([]);
          setAllResults([]);
          setAllTeams([]);
          setAllMarketEvents([]);
          setMarketEvent(null);
        },
        setSession,
        setTeam,
        setProducts,
        setDecisions,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

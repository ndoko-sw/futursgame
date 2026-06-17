'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, Team, Lang, Decision, RoundResult, MarketEvent } from '@/lib/types';
import { t } from '@/lib/i18n';

interface GameContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  session: Session | null;
  team: Team | null;
  currentRound: number;
  roundTimeLeft: number | null;
  decisions: Decision[];
  results: RoundResult[];
  marketEvent: MarketEvent | null;
  allTeams: Team[];
  joinSession: (code: string, brandName: string, brandColor: string, brandStatement: string, productName?: string, productCategory?: string, productStyle?: string) => Promise<void>;
  createSession: () => Promise<string>;
  submitDecision: (decision: Omit<Decision, 'id' | 'team_id' | 'submitted_at'>) => Promise<void>;
  setSession: (session: Session | null) => void;
  setTeam: (team: Team | null) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const LS_SESSION = 'futurs_session_id';
const LS_TEAM = 'futurs_team_id';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [marketEvent, setMarketEvent] = useState<MarketEvent | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);

  const currentRound = session?.current_round ?? 0;

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(LS_SESSION);
    const savedTeamId = localStorage.getItem(LS_TEAM);
    if (!savedSessionId || !savedTeamId) return;

    supabase.from('sessions').select('*').eq('id', savedSessionId).single().then(({ data: s }) => {
      if (!s || s.status === 'ended') {
        localStorage.removeItem(LS_SESSION);
        localStorage.removeItem(LS_TEAM);
        return;
      }
      setSession(s as Session);
    });
    supabase.from('teams').select('*').eq('id', savedTeamId).single().then(({ data: t }) => {
      if (t) setTeam(t as Team);
    });
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, lang, vars),
    [lang]
  );

  // Realtime: subscribe to session changes
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
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
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${session.id}` },
        () => {
          supabase.from('teams').select('*').eq('session_id', session.id).then(({ data }) => {
            if (data) setAllTeams(data as Team[]);
          });
        }
        )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decisions', filter: `team_id=eq.${team?.id}` },
        () => {
          if (team) {
            supabase.from('decisions').select('*').eq('team_id', team.id).then(({ data }) => {
              if (data) setDecisions(data as Decision[]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        () => {
          if (team) {
            supabase.from('results').select('*').eq('team_id', team.id).then(({ data }) => {
              if (data) setResults(data as RoundResult[]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_events', filter: `session_id=eq.${session.id}` },
        () => {
          supabase
            .from('market_events')
            .select('*')
            .eq('session_id', session.id)
            .eq('round_number', currentRound)
            .then(({ data }) => {
              if (data && data.length > 0) setMarketEvent(data[0] as MarketEvent);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, team, currentRound]);

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

  // Load teams + market event on session change
  useEffect(() => {
    if (!session) return;
    supabase.from('teams').select('*').eq('session_id', session.id).then(({ data }) => {
      if (data) setAllTeams(data as Team[]);
    });
    supabase.from('market_events').select('*').eq('session_id', session.id).eq('round_number', session.current_round).then(({ data }) => {
      if (data && data.length > 0) setMarketEvent(data[0] as MarketEvent);
      else setMarketEvent(null);
    });
  }, [session?.id, session?.current_round]);

  // Load team decisions/results on team change
  useEffect(() => {
    if (!team) return;
    supabase.from('decisions').select('*').eq('team_id', team.id).then(({ data }) => {
      if (data) setDecisions(data as Decision[]);
    });
    supabase.from('results').select('*').eq('team_id', team.id).then(({ data }) => {
      if (data) setResults(data as RoundResult[]);
    });
  }, [team]);

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

    // Save initial product decision (round 1, not yet submitted)
    if (productName && productCategory && productStyle) {
      await supabase.from('decisions').insert({
        session_id: sessionData.id,
        team_id: teamData.id,
        round_number: 1,
        product_name: productName,
        product_category: productCategory,
        product_style: productStyle,
        budget_fournisseur: 0,
        budget_collection: 0,
        budget_prix: 0,
        budget_distribution: 0,
        budget_communication: 0,
        submitted_at: null,
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
        currentRound,
        roundTimeLeft,
        decisions,
        results,
        marketEvent,
        allTeams,
        joinSession,
        createSession,
        submitDecision,
        setSession,
        setTeam,
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

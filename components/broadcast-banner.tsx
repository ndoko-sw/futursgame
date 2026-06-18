'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/lib/game-context';
import { supabase } from '@/lib/supabase';
import { Broadcast } from '@/lib/types';

const LS_SEEN = 'futurs_seen_broadcasts';

const KIND_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  info:   { bg: '#1f2933', fg: '#fff', label: 'ANNONCE' },
  alerte: { bg: '#E63329', fg: '#fff', label: 'ALERTE' },
  hype:   { bg: '#C8911A', fg: '#1a1200', label: 'HYPE' },
};

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_SEEN) ?? '[]')); }
  catch { return new Set(); }
}

export default function BroadcastBanner() {
  const { session } = useGame();
  const [latest, setLatest] = useState<Broadcast | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => { setSeen(readSeen()); }, []);

  useEffect(() => {
    if (!session?.id) return;
    const sessionId = session.id;

    const fetchLatest = () => {
      supabase.from('broadcasts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) setLatest(data[0] as Broadcast);
        });
    };
    fetchLatest();

    const ch = supabase.channel(`broadcasts-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts', filter: `session_id=eq.${sessionId}` },
        (payload) => setLatest(payload.new as Broadcast))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.id]);

  if (!latest || seen.has(latest.id)) return null;

  const style = KIND_STYLE[latest.kind] ?? KIND_STYLE.info;

  const dismiss = () => {
    const next = new Set(seen); next.add(latest.id);
    setSeen(next);
    try { localStorage.setItem(LS_SEEN, JSON.stringify(Array.from(next))); } catch {}
  };

  return (
    <div style={{
      background: style.bg, color: style.fg, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
      fontSize: 13, lineHeight: 1.4,
    }}>
      <span style={{ fontSize: 9, letterSpacing: '.14em', fontWeight: 700, padding: '3px 7px', background: 'rgba(255,255,255,.18)', flexShrink: 0 }}>
        {style.label}
      </span>
      <span style={{ flex: 1 }}>{latest.message}</span>
      <button onClick={dismiss} aria-label="Masquer"
        style={{ background: 'none', border: 0, color: style.fg, cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0, opacity: .8 }}>
        ✕
      </button>
    </div>
  );
}

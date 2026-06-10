'use client';

import { useState } from 'react';
import { useGame } from '@/lib/game-context';
import Image from 'next/image';
import { toast } from 'sonner';
import { ArrowRight, Plus } from 'lucide-react';

const COLORS = ['#121212','#E63329','#C4A35A','#5B7553','#2B4A8B','#8B4513','#888','#D4C5B0'];

export default function HomePage() {
  const { t, lang, session, team, joinSession, createSession, allTeams } = useGame();
  const [code, setCode] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#121212');
  const [statement, setStatement] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  const codeReady = code.length === 6;

  const handleJoin = async () => {
    if (!code || !brandName.trim()) return;
    setLoading(true);
    try {
      await joinSession(code, brandName.trim(), brandColor, statement.trim());
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const c = await createSession();
      toast.success(`Session créée : ${c}`);
      setCreating(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  /* ── Waiting room ─────────────────────────────────────── */
  if (session && team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 fade-up">
        <div className="w-full max-w-sm space-y-10">
          <div className="text-center space-y-5">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center text-white text-xl"
              style={{ backgroundColor: team.brand_color }}
            >
              {team.brand_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="label block mb-3">(YOUR BRAND)</span>
              <h1 className="page-title">{team.brand_name}</h1>
              {team.brand_statement && (
                <p className="text-[#888] text-[0.875rem] mt-2 italic">{team.brand_statement}</p>
              )}
            </div>
          </div>

          <div className="rule" />

          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-[#ebebeb]">
              <span className="label">(SESSION)</span>
              <span className="font-mono text-[0.875rem] text-[#121212]">{session.code}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="label">({t('lobby_teams')})</span>
              <span className="text-[0.875rem] text-[#121212]">{allTeams.length}</span>
            </div>
          </div>

          <div className="rule" />

          <div className="space-y-0">
            {allTeams.map((tm) => (
              <div key={tm.id} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0]">
                <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: tm.brand_color }} />
                <span className="label text-[#121212]">{tm.brand_name}</span>
                {tm.id === team.id && <span className="ml-auto label text-[#aaa]">VOUS</span>}
              </div>
            ))}
          </div>

          {session.status === 'waiting' && (
            <p className="label text-center">
              <span className="pulse inline-block w-1.5 h-1.5 bg-[#ccc] rounded-full mr-2 align-middle" />
              {lang === 'fr' ? 'EN ATTENTE DU GAME MASTER' : 'WAITING FOR GAME MASTER'}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Lobby ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top ticker */}
      <div className="border-b border-[#ebebeb] py-2.5 overflow-hidden">
        <p className="label text-center tracking-[0.2em]">
          FUTURS DROPS&nbsp;&nbsp;—&nbsp;&nbsp;WEAR MEANING, NOT LABELS&nbsp;&nbsp;—&nbsp;&nbsp;FASHION BRAND SIMULATION
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-16">

          {/* Hero title — wordmark + Drops */}
          <div className="text-center space-y-6 fade-up">
            <div className="flex items-center justify-center gap-3">
              <Image
                src="/logo_futurs.webp"
                alt="Futurs"
                width={260}
                height={80}
                style={{ height: '56px', width: 'auto' }}
                priority
              />
              <span
                style={{
                  fontFamily: 'Work Sans, sans-serif',
                  fontSize: 'clamp(2rem, 6vw, 3.337rem)',
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#121212',
                  lineHeight: 1,
                }}
              >
                Drops
              </span>
            </div>
            <span className="label">(FASHION BRAND SIMULATION GAME)</span>
          </div>

          {/* Join form */}
          <div className="space-y-8 fade-up-d1">

            {/* Code */}
            <div className="space-y-3">
              <label className="label block">(CODE SESSION)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder={lang === 'fr' ? 'ENTREZ LE CODE' : 'ENTER CODE'}
                className="w-full bg-transparent border border-[#d0d0d0] focus:border-[#121212] text-[#121212] font-mono text-center text-xl tracking-[0.3em] uppercase placeholder:text-[#ccc] py-4 outline-none transition-colors"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Brand fields — slide in when code complete */}
            {codeReady && (
              <div className="space-y-6 fade-up">
                <div className="rule" />

                <div className="space-y-3">
                  <label className="label block">({lang === 'fr' ? 'NOM DE MARQUE' : 'BRAND NAME'})</label>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder={lang === 'fr' ? 'VOTRE MARQUE' : 'YOUR BRAND'}
                    className="w-full bg-transparent border border-[#d0d0d0] focus:border-[#121212] text-[#121212] text-sm tracking-widest uppercase placeholder:text-[#ccc] px-4 py-3 outline-none transition-colors"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-3">
                  <label className="label block">({lang === 'fr' ? 'COULEUR' : 'COLOR'})</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setBrandColor(c)}
                        className="w-8 h-8 flex-shrink-0 transition-all"
                        style={{
                          backgroundColor: c,
                          outline: brandColor === c ? '2px solid #121212' : 'none',
                          outlineOffset: '2px',
                          transform: brandColor === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label block">({lang === 'fr' ? 'ADN DE MARQUE' : 'BRAND DNA'})</label>
                  <input
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder={lang === 'fr' ? 'UNE LIGNE. VOTRE ADN.' : 'ONE LINE. YOUR DNA.'}
                    className="w-full bg-transparent border border-[#d0d0d0] focus:border-[#121212] text-[#121212] text-xs tracking-wider placeholder:text-[#ccc] px-4 py-3 outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleJoin}
                  disabled={loading || !brandName.trim()}
                  className="btn btn-primary w-full py-4"
                >
                  {loading ? '...' : t('lobby_join')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="rule" />

            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="btn btn-outline w-full"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('lobby_create')}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? '...' : (lang === 'fr' ? 'CRÉER UNE SESSION' : 'CREATE SESSION')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

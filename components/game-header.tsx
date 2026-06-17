'use client';

import { useGame } from '@/lib/game-context';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/',            fr: 'Accueil',    en: 'Home' },
  { href: '/brand',       fr: 'Ma Marque',  en: 'My Brand',   session: true },
{ href: '/market',      fr: 'Marché',     en: 'Market',     session: true },
  { href: '/results',     fr: 'Résultats',  en: 'Results',    session: true },
  { href: '/leaderboard', fr: 'Classement', en: 'Ranking',    session: true },
];

const BNAV = [
  { href: '/',           fr: 'Accueil',    en: 'Home',      icon: <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor"><path d="M3 10.5 L11 4 L19 10.5 V19 H3 Z"/></svg> },
  { href: '/brand',      fr: 'Marque',     en: 'Brand',     session: true, icon: <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor"><path d="M4 4 H11 L18.5 11.5 L11 19 L3.5 11.5 Z"/><circle cx="8" cy="8" r="1.4"/></svg> },
  { href: '/market',     fr: 'Marché',     en: 'Market',    session: true, icon: <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor"><path d="M3 17 L8.5 10.5 L12.5 13.5 L19 5.5"/><line x1="3" y1="19.5" x2="19" y2="19.5"/></svg> },
  { href: '/results',    fr: 'Résultats',  en: 'Results',   session: true, icon: <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor"><circle cx="11" cy="11" r="7.5"/><path d="M11 7v4l3 2"/></svg> },
  { href: '/leaderboard',fr: 'Classement', en: 'Ranking',   session: true, icon: <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor"><line x1="4" y1="7" x2="15" y2="7"/><line x1="4" y1="11" x2="18" y2="11"/><line x1="4" y1="15" x2="10" y2="15"/></svg> },
];

export default function GameHeader() {
  const { lang, setLang, session, team, roundTimeLeft, currentRound, leaveSession } = useGame();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  if (pathname === '/gamemaster') return null;

  const links = NAV.filter((n) => !n.session || session);
  const blinks = BNAV.filter((n) => !n.session || session);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const time = roundTimeLeft !== null ? fmt(roundTimeLeft) : null;
  const urgent = roundTimeLeft !== null && roundTimeLeft < 120;
  const isPractice = session?.status === 'practice';
  const timerDone = !isPractice && roundTimeLeft === 0 && session?.status === 'active' && !session.results_revealed;

  return (
    <>
      {/* ── ANNOUNCE BAR ── */}
      <div style={{
        background: '#121212', color: '#fff',
        fontSize: '10.5px', letterSpacing: '.34em', textTransform: 'uppercase',
        padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <span className="ticker-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ paddingRight: '4em' }}>
              FUTURS DROPS — CRÉE UNE SCIENCE QUI SE TRANSFORME EN IMPACT — CONSTRUIS UNE GAME QUI TE RESSEMBLE
            </span>
          ))}
        </span>
      </div>

      {/* ── STICKY ZONE (banners + header) ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 60 }}>

      {/* PRACTICE BANNER */}
      {isPractice && (
        <div className="practice-banner">
          <span className="sq" />
          <span className="practice-banner__t">Tour Pratique — Budget illimité</span>
          {time && <><span className="practice-banner__t"> —</span><span className="practice-banner__tmr">{time}</span></>}
        </div>
      )}

      {/* ROUND TIMER BANNER (tours réels uniquement) */}
      {!isPractice && session?.status === 'active' && time && (
        <div style={{
          background: urgent ? '#E63329' : '#121212',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: '8px 24px', fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase',
          transition: 'background .4s',
        }}>
          <span>Tour {String(currentRound).padStart(2, '0')} / 05</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.3)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.4s ease infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, letterSpacing: '.08em', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid rgba(18,18,18,0.14)',
      }}>
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: 74, gap: 16 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setDrawerOpen(true)} style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', background: 'none', border: 0, cursor: 'pointer' }} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="2" y1="6" x2="20" y2="6"/><line x1="2" y1="11" x2="20" y2="11"/><line x1="2" y1="16" x2="20" y2="16"/>
              </svg>
            </button>
          </div>

          {/* CENTER — wordmark */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, justifySelf: 'center', textDecoration: 'none' }}>
            <Image src="/futurs-logo.jpg" alt="Futurs" width={120} height={40} style={{ height: 30, width: 'auto' }} priority />
            <span style={{ fontSize: 13, letterSpacing: '.42em', textTransform: 'uppercase', fontWeight: 500, color: '#121212', paddingLeft: 12, borderLeft: '1px solid rgba(18,18,18,0.14)' }}>
              Drops
            </span>
          </Link>

          {/* RIGHT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            {/* Budget pill */}
            {team && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, border: '1px solid rgba(18,18,18,.14)', padding: '7px 14px', whiteSpace: 'nowrap' }} className="hidden-mobile">
                <span style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Budget</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, letterSpacing: '.04em' }}>{session?.status === 'practice' ? '∞ illimité' : `${(team.current_budget ?? 100000).toLocaleString('fr-FR')} €`}</span>
              </div>
            )}
            {/* Timer */}
            {time && !isPractice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: urgent ? '#E63329' : '#121212', border: '1px solid rgba(18,18,18,0.14)', padding: '7px 12px' }} className="hidden-mobile">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: urgent ? '#E63329' : '#121212', animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, letterSpacing: '.06em', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
              </div>
            )}
            {/* Desktop subnav */}
            <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center' }}>
              {links.map((item) => (
                <Link key={item.href} href={item.href} style={{
                  position: 'relative', margin: '0 17px',
                  fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase',
                  color: pathname === item.href ? '#121212' : '#9A9A9A',
                  textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: 'Work Sans, sans-serif',
                }}>
                  {lang === 'fr' ? item.fr : item.en}
                  {pathname === item.href && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -27, height: 2, background: '#121212' }} />}
                </Link>
              ))}
            </nav>
            {/* Lang toggle */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(18,18,18,0.14)', height: 34 }}>
              {(['fr', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  background: lang === l ? '#121212' : 'none', color: lang === l ? '#fff' : '#6E6E6E',
                  border: 0, padding: '0 11px', height: '100%', fontSize: 11, letterSpacing: '.14em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE BUDGET ROW ── */}
      {session && (
        <div className="show-mobile" style={{ borderBottom: '1px solid rgba(18,18,18,.14)', background: '#fff' }}>
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', height: 44 }}>
            {/* Tour */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 16 }}>
              <span style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Tour</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, lineHeight: 1.2 }}>{isPractice ? 'P' : `${String(currentRound).padStart(2, '0')} / 05`}</span>
            </div>
            {/* Séparateur */}
            <div style={{ width: 1, height: 28, background: 'var(--line)', marginRight: 16, flexShrink: 0 }} />
            {/* Timer */}
            {/* Budget */}
            {team && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '8px', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Budget</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, lineHeight: 1.2 }}>{isPractice ? '∞' : `${(team.current_budget ?? 100000).toLocaleString('fr-FR')} €`}</span>
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* end sticky zone */}

      {/* ── DRAWER ── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(18,18,18,.4)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 'min(320px, 84vw)', background: '#fff', padding: '34px 36px', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.4s cubic-bezier(.22,.61,.36,1) both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
              <span style={{ fontSize: 11, letterSpacing: '.28em', textTransform: 'uppercase', color: '#121212' }}>Menu</span>
              <button onClick={() => setDrawerOpen(false)} style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', background: 'none', border: 0, cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            </div>
            {team && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid rgba(18,18,18,0.14)' }}>
                <span style={{ width: 46, height: 46, background: team.brand_color, display: 'block', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 15, letterSpacing: '.06em', textTransform: 'uppercase' }}>{team.brand_name}</div>
                  {team.brand_statement && <div style={{ fontSize: 12, color: '#6E6E6E', marginTop: 4 }}>{team.brand_statement}</div>}
                </div>
              </div>
            )}
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {links.map((item, i) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} style={{
                  background: 'none', border: 0, textAlign: 'left', padding: '16px 0',
                  borderBottom: '1px solid rgba(18,18,18,0.14)',
                  fontSize: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.02em',
                  color: '#121212', textDecoration: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  fontFamily: 'Work Sans, sans-serif',
                }}>
                  {lang === 'fr' ? item.fr : item.en}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9A9A9A' }}>0{i + 1}</span>
                </Link>
              ))}
            </nav>
            <div style={{ marginTop: 'auto', paddingTop: 24 }}>
              <div style={{ display: 'flex', border: '1px solid rgba(18,18,18,0.14)', width: 'fit-content', marginBottom: 18 }}>
                {(['fr', 'en'] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? '#121212' : 'none', color: lang === l ? '#fff' : '#6E6E6E', border: 0, padding: '0 11px', height: 34, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              {session && (
                <button
                  onClick={() => { leaveSession(); router.push('/'); setDrawerOpen(false); }}
                  style={{ background: 'none', border: '1px solid rgba(18,18,18,.2)', color: '#9A9A9A', padding: '10px 16px', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer', width: '100%', marginBottom: 16 }}
                >
                  Quitter la session
                </button>
              )}
              <p style={{ fontStyle: 'italic', fontSize: 12, color: '#9A9A9A' }}>« Porte du sens, pas des étiquettes. »</p>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav className="show-mobile" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,.97)', backdropFilter: 'saturate(140%) blur(10px)',
        borderTop: '1px solid #121212',
        display: 'grid', gridTemplateColumns: `repeat(${blinks.length}, 1fr)`,
      }}>
        {blinks.map((item) => (
          <button key={item.href} onClick={() => router.push(item.href)} style={{
            background: pathname === item.href ? '#121212' : 'none',
            color: pathname === item.href ? '#fff' : 'var(--muted)',
            border: 0, borderRight: '1px solid rgba(18,18,18,.14)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '9px 2px', minHeight: 60, cursor: 'pointer', transition: '.16s',
          }}>
            <span style={{ width: 21, height: 21, display: 'block' }}>{item.icon}</span>
            <span style={{ fontSize: '8.5px', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {lang === 'fr' ? item.fr : item.en}
            </span>
          </button>
        ))}
      </nav>

      {/* ── ADMIN FAB ── */}
      {session && (
        <button onClick={() => setAdminOpen(true)} style={{
          position: 'fixed', right: 20, bottom: 80, zIndex: 70,
          width: 46, height: 46, border: '1px solid rgba(18,18,18,.14)',
          background: '#fff', display: 'grid', placeItems: 'center',
          opacity: .15, transition: 'opacity .25s', cursor: 'pointer',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '.15')}
          aria-label="Game Master"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="10" cy="10" r="2.6"/>
            <path d="M10 1.5v2.5M10 16v2.5M18.5 10H16M4 10H1.5M15.8 4.2l-1.8 1.8M6 14l-1.8 1.8M15.8 15.8 14 14M6 6 4.2 4.2"/>
          </svg>
        </button>
      )}

      {/* ── TIMER DONE MODAL ── */}
      {timerDone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(18,18,18,0.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          animation: 'revealFade .35s ease both',
        }}>
          <div style={{
            background: '#fff', padding: '52px 48px', maxWidth: 440, width: '90vw',
            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 24,
            animation: 'revealUp .4s cubic-bezier(.22,.61,.36,1) both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, border: '2px solid #121212', borderRadius: '50%',
                fontSize: 22,
              }}>
                ◎
              </span>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#888', marginBottom: 14 }}>
                Tour {currentRound} · Temps écoulé
              </div>
              <h2 style={{ fontSize: '1.45rem', margin: 0, lineHeight: 1.25, letterSpacing: '.01em' }}>
                Les décisions sont figées.
              </h2>
            </div>
            <p style={{ color: '#6E6E6E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Le Game Master analyse les résultats de ce tour.
              Ils apparaîtront ici dans quelques instants — restez sur cette page.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#121212', animation: 'pulse 1.4s ease infinite' }} />
              <span style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#888' }}>
                En attente des résultats
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN OVERLAY ── */}
      {adminOpen && (
        <div className="adminov open">
          <div className="adminov__bar">
            <div className="ttl"><span>⚙</span><span>Game Master · Futurs Drops</span></div>
            <div className="right">
              {time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#E63329' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E63329', animation: 'pulse 1.4s ease infinite' }} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16 }}>{time}</span>
                </div>
              )}
              <button onClick={() => setAdminOpen(false)} style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', background: 'none', border: 0, cursor: 'pointer', color: '#fff' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            </div>
          </div>
          <div className="adminov__body">
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 24 }}>
              Pour le panneau complet avec contrôles de session, décisions équipes et événements :
            </p>
            <a href="/gamemaster" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#121212', color: '#fff', border: '1px solid #121212',
              padding: '15px 30px', fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', textDecoration: 'none',
            }}>
              Ouvrir le panel GM →
            </a>
          </div>
        </div>
      )}

    </>
  );
}

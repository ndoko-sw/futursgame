'use client';

import { useGame } from '@/lib/game-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  {
    href: '/',
    fr: 'Accueil',
    en: 'Home',
    icon: (
      <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor">
        <path d="M3 10.5 L11 4 L19 10.5 V19 H3 Z" />
      </svg>
    ),
  },
  {
    href: '/brand',
    fr: 'Ma Marque',
    en: 'My Brand',
    session: true,
    icon: (
      <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor">
        <path d="M4 4 H11 L18.5 11.5 L11 19 L3.5 11.5 Z" />
        <circle cx="8" cy="8" r="1.4" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    fr: 'Portfolio',
    en: 'Portfolio',
    session: true,
    icon: (
      <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor">
        <rect x="3.5" y="3.5" width="6.5" height="6.5" />
        <rect x="12" y="3.5" width="6.5" height="6.5" />
        <rect x="3.5" y="12" width="6.5" height="6.5" />
        <rect x="12" y="12" width="6.5" height="6.5" />
      </svg>
    ),
  },
  {
    href: '/market',
    fr: 'Marché',
    en: 'Market',
    session: true,
    icon: (
      <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor">
        <path d="M3 17 L8.5 10.5 L12.5 13.5 L19 5.5" />
        <line x1="3" y1="19.5" x2="19" y2="19.5" />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    fr: 'Classement',
    en: 'Ranking',
    session: true,
    icon: (
      <svg viewBox="0 0 22 22" fill="none" strokeWidth="1.4" stroke="currentColor">
        <line x1="4" y1="7" x2="15" y2="7" />
        <line x1="4" y1="11" x2="18" y2="11" />
        <line x1="4" y1="15" x2="10" y2="15" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { lang, session } = useGame();
  const pathname = usePathname();

  const items = ITEMS.filter((i) => !i.session || session);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'saturate(140%) blur(10px)',
        borderTop: '1px solid #121212',
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '9px 2px',
              minHeight: '60px',
              color: active ? '#ffffff' : '#6E6E6E',
              background: active ? '#121212' : 'transparent',
              borderRight: '1px solid rgba(18,18,18,0.14)',
              transition: 'color 0.16s, background 0.16s',
              textDecoration: 'none',
            }}
          >
            <span style={{ width: 21, height: 21, display: 'block' }}>{item.icon}</span>
            <span
              style={{
                fontSize: '8.5px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'Work Sans, sans-serif',
              }}
            >
              {lang === 'fr' ? item.fr : item.en}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

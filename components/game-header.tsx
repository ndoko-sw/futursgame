'use client';

import { useGame } from '@/lib/game-context';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Globe, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/',            key: 'nav_home' },
  { href: '/brand',       key: 'nav_brand',       session: true },
  { href: '/results',     key: 'nav_results',     session: true },
  { href: '/market',      key: 'nav_market',      session: true },
  { href: '/leaderboard', key: 'nav_leaderboard', session: true },
  { href: '/admin',       key: 'nav_admin' },
];

export default function GameHeader() {
  const { t, lang, setLang, session, roundTimeLeft, currentRound } = useGame();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = NAV.filter((n) => !n.session || session);

  const fmt = (s: number | null) => {
    if (s === null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const time = fmt(roundTimeLeft);
  const urgent = roundTimeLeft !== null && roundTimeLeft < 120;
  const roundLabel = currentRound === 0
    ? (lang === 'fr' ? 'PRATIQUE' : 'PRACTICE')
    : `${lang === 'fr' ? 'TOUR' : 'ROUND'} ${currentRound}`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ebebeb]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-6">

          {/* LEFT — graffiti logo */}
          <Link href="/" className="flex-shrink-0 flex items-center hover:opacity-70 transition-opacity duration-150">
            <Image
              src="/598371131_17842253229656170_5960993698326355628_n.jpg"
              alt="Futurs"
              width={120}
              height={48}
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              priority
            />
          </Link>

          {/* CENTER — wordmark + Drops */}
          <div className="hidden sm:flex items-center gap-0 flex-shrink-0">
            <Image
              src="/logo_futurs.webp"
              alt="futurs"
              width={80}
              height={28}
              style={{ height: '17px', width: 'auto' }}
            />
            <span
              style={{
                fontFamily: 'Work Sans, sans-serif',
                fontSize: '0.7rem',
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#121212',
                marginLeft: '0.3em',
                lineHeight: 1,
              }}
            >
              Drops
            </span>
          </div>

          {/* RIGHT — nav + timer + lang */}
          <div className="flex items-center gap-1">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 h-14 flex items-center label transition-colors ${
                    pathname === item.href
                      ? 'text-[#121212]'
                      : 'text-[#bbb] hover:text-[#121212]'
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Timer */}
            {time && (
              <div className="hidden lg:flex items-center gap-2 px-3 border-l border-[#ebebeb] ml-1">
                <span className="label">{roundLabel}</span>
                <span
                  className={`font-mono text-[0.7rem] tabular-nums ${urgent ? 'text-[#E63329]' : 'text-[#bbb]'}`}
                >
                  {time}
                </span>
              </div>
            )}

            {/* Lang */}
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 label text-[#bbb] hover:text-[#121212] transition-colors px-2"
            >
              <Globe className="w-3 h-3" />
              {lang.toUpperCase()}
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden text-[#888] hover:text-[#121212] transition-colors p-1"
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {open && (
        <div className="fixed inset-0 z-40 bg-white pt-14 md:hidden">
          <nav className="flex flex-col">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-8 py-5 label border-b border-[#ebebeb] transition-colors ${
                  pathname === item.href ? 'text-[#121212]' : 'text-[#bbb] hover:text-[#121212]'
                }`}
              >
                ({t(item.key)})
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

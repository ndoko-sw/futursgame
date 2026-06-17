'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { productImageUrl } from '@/lib/product-image';
import { toast } from 'sonner';

const COLORS = [
  { name: 'Encre',          hex: '#121212' },
  { name: 'Terre d\'Argile', hex: '#B86B4B' },
  { name: 'Sable',          hex: '#C4A35A' },
  { name: 'Kaki',           hex: '#6E6F4B' },
  { name: 'Indigo',         hex: '#2B4A8B' },
  { name: 'Brique',         hex: '#7A3B2E' },
  { name: 'Mastic',         hex: '#8C8880' },
  { name: 'Taupe',          hex: '#C9B79C' },
];

const CATEGORIES = [
  { key: 'haut',       label: 'Haut' },
  { key: 'bas',        label: 'Bas' },
  { key: 'veste',      label: 'Veste' },
  { key: 'robe',       label: 'Robe' },
  { key: 'accessoire', label: 'Accessoire' },
  { key: 'chaussure',  label: 'Chaussure' },
];

const STYLES = [
  { key: 'luxe',    label: 'Casual Luxe' },
  { key: 'street',  label: 'Streetwear' },
  { key: 'tech',    label: 'Techwear' },
  { key: 'avant',   label: 'Avant-garde' },
  { key: 'minimal', label: 'Minimaliste' },
];

export default function HomePage() {
  const { lang, session, team, joinSession, allTeams } = useGame();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [code, setCode] = useState('');
  // Step 2
  const [brandName, setBrandName] = useState('');
  const [brandStatement, setBrandStatement] = useState('');
  const [brandColor, setBrandColor] = useState('#B86B4B');
  // Step 3
  const [productName, setProductName] = useState('DROP 01');
  const [category, setCategory] = useState('haut');
  const [style, setStyle] = useState('luxe');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && team && (session.status === 'active' || session.status === 'practice')) {
      router.push('/brand');
    }
  }, [session?.status, team, router]);

  // Waiting room
  if (session && team && session.status === 'waiting') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 40 }} className="fade-up">
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ width: 56, height: 56, background: team.brand_color, display: 'block', margin: '0 auto' }} />
            <div>
              <span className="u-label" style={{ display: 'block', marginBottom: 8 }}>(VOTRE MARQUE)</span>
              <h1 style={{ fontSize: 'var(--t-4)', letterSpacing: '-.01em' }}>{team.brand_name}</h1>
              {team.brand_statement && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>{team.brand_statement}</p>}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="u-label">(SESSION)</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14 }}>{session.code}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="u-label">(MARQUES)</span>
              <span style={{ fontSize: 14 }}>{allTeams.length}</span>
            </div>
          </div>

          <div>
            {allTeams.map((tm) => (
              <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(18,18,18,.08)' }}>
                <span style={{ width: 12, height: 12, background: tm.brand_color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase' }}>{tm.brand_name}</span>
                {tm.id === team.id && <span className="u-label" style={{ marginLeft: 'auto', color: '#aaa' }}>VOUS</span>}
              </div>
            ))}
          </div>

          <p className="u-label" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--faint)', animation: 'pulse 1.4s ease infinite', display: 'inline-block' }} />
            {lang === 'fr' ? 'EN ATTENTE DU GAME MASTER' : 'WAITING FOR GAME MASTER'}
          </p>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    setLoading(true);
    try {
      await joinSession(code, brandName.trim() || 'MARQUE', brandColor, brandStatement.trim(), productName.trim() || 'DROP 01', category, style);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>
      <div className="wrap">

        {/* Step indicators */}
        <div className="onb__steps">
          {[
            { n: 1, label: 'Rejoindre' },
            { n: 2, label: 'Ma marque' },
            { n: 3, label: 'Premier produit' },
          ].map(({ n, label }, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? '1' : undefined }}>
              <button
                onClick={() => step > n && setStep(n)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, cursor: step > n ? 'pointer' : 'default', padding: 0 }}
              >
                <span className={`stepdot${step === n ? ' active' : step > n ? ' done' : ' locked'}`}>
                  {step > n ? '✓' : n}
                </span>
                <span className="u-label" style={{ color: step >= n ? 'var(--ink)' : 'var(--faint)' }}>{label}</span>
              </button>
              {i < 2 && <span style={{ flex: 1, height: 1, background: 'var(--line)', margin: '0 12px' }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1 — Session code ── */}
        {step === 1 && (
          <div className="onb__body fade-up">
            {/* Left ink panel */}
            <div className="onb__panel onb__panel--ink">
              <span className="u-eyebrow" style={{ color: 'rgba(255,255,255,.6)' }}>Le simulateur de marque</span>
              <h1 style={{ fontSize: 'clamp(3rem,6vw,6.4rem)', lineHeight: .9, letterSpacing: '-.02em', color: '#fff', margin: '24px 0 16px' }}>
                FUTURS<br />DROPS
              </h1>
              <p style={{ color: 'rgba(255,255,255,.65)', maxWidth: '30ch', fontSize: 14, lineHeight: 1.55 }}>
                5 tours, une marque à construire.<br />Chaque décision engage ton budget.
              </p>
              <div style={{ marginTop: 48 }}>
                <div className="u-label" style={{ color: 'rgba(255,255,255,.55)', marginBottom: 10 }}>Budget de départ</div>
                <div style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>100 000 €</div>
              </div>
            </div>

            {/* Right form */}
            <div className="onb__panel">
              <span className="u-eyebrow">Rejoindre une session</span>
              <h3 style={{ margin: '14px 0 8px', fontSize: 'var(--t-2)' }}>Code de session</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 32, lineHeight: 1.5 }}>
                Saisis le code communiqué par l'animateur.
              </p>
              <div className="field" style={{ marginBottom: 36 }}>
                <label className="u-label">CODE DE SESSION</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="DJASSA"
                  maxLength={8}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '2rem', letterSpacing: '.4em',
                    textTransform: 'uppercase', textAlign: 'center',
                  }}
                  autoComplete="off" spellCheck={false}
                />
              </div>
              <button
                className="btn"
                onClick={() => code.length >= 2 && setStep(2)}
                disabled={code.length < 2}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Brand identity ── */}
        {step === 2 && (
          <div className="onb__body fade-up">
            <div className="onb__panel">
              <span className="u-eyebrow">Créer ma marque</span>
              <h3 style={{ margin: '14px 0 30px', fontSize: 'var(--t-2)' }}>Identité de marque</h3>

              <div className="field" style={{ marginBottom: 26 }}>
                <label className="u-label">NOM DE LA MARQUE</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="MAISON DJASSA"
                  style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '1.15rem' }}
                  autoComplete="off"
                />
              </div>

              <div className="field" style={{ marginBottom: 34 }}>
                <label className="u-label">DÉCLARATION (UNE LIGNE)</label>
                <input
                  value={brandStatement}
                  onChange={(e) => setBrandStatement(e.target.value)}
                  placeholder="Le sens avant l'étiquette"
                />
              </div>

              <label className="u-label" style={{ display: 'block', marginBottom: 14 }}>COULEUR DE MARQUE</label>
              <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setBrandColor(c.hex)}
                    title={c.name}
                    style={{
                      width: 40, height: 40, background: c.hex, border: 0,
                      borderRight: '1px solid var(--line)', cursor: 'pointer',
                      transform: brandColor === c.hex ? 'scaleY(1.3)' : 'scaleY(1)',
                      outline: brandColor === c.hex ? '2px solid #121212' : 'none',
                      outlineOffset: 2,
                      transition: 'transform .18s',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '.1em', color: 'var(--muted)', marginTop: 12 }}>
                {COLORS.find(c => c.hex === brandColor)?.name?.toUpperCase()} · {brandColor}
              </p>
            </div>

            {/* Right — preview */}
            <div className="onb__panel onb__panel--ink">
              <span className="u-eyebrow" style={{ color: 'rgba(255,255,255,.55)' }}>Aperçu marque</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ width: 64, height: 64, background: brandColor, flexShrink: 0, display: 'block' }} />
                  <div>
                    <div style={{ fontSize: 'var(--t-2)', letterSpacing: '.06em', textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
                      {brandName || 'MAISON DJASSA'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
                      {brandStatement || 'Le sens avant l\'étiquette'}
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="btn"
                onClick={() => brandName.trim() && setStep(3)}
                disabled={!brandName.trim()}
                style={{ background: '#fff', color: '#121212', borderColor: '#fff', alignSelf: 'flex-start' }}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — First product ── */}
        {step === 3 && (
          <div className="onb__body fade-up">
            <div className="onb__panel">
              <span className="u-eyebrow">Premier produit</span>
              <h3 style={{ margin: '14px 0 14px', fontSize: 'var(--t-2)' }}>Créer ton produit</h3>

              <div style={{ background: 'var(--fill)', borderLeft: '2px solid var(--ink)', padding: '12px 16px', fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.45 }}>
                Tour 1 : un seul produit. Tu pourras en ajouter aux tours suivants (max 3 actifs).
              </div>

              <div className="field" style={{ marginBottom: 26 }}>
                <label className="u-label">NOM DU PRODUIT</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="DROP 01"
                  style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}
                />
              </div>

              <label className="u-label" style={{ display: 'block', marginBottom: 12 }}>CATÉGORIE</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    style={{
                      border: `1px solid ${category === cat.key ? 'var(--ink)' : 'var(--line)'}`,
                      background: category === cat.key ? 'var(--ink)' : 'var(--bg)',
                      color: category === cat.key ? '#fff' : 'var(--ink)',
                      padding: '10px 12px', fontSize: 12,
                      letterSpacing: '.06em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <label className="u-label" style={{ display: 'block', marginBottom: 12 }}>STYLE</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STYLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStyle(s.key)}
                    style={{
                      border: `1px solid ${style === s.key ? 'var(--ink)' : 'var(--line)'}`,
                      background: style === s.key ? 'var(--ink)' : 'transparent',
                      color: style === s.key ? '#fff' : 'var(--ink)',
                      padding: '8px 14px', fontSize: 12,
                      letterSpacing: '.06em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all .15s', borderRadius: 2,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right — preview + start */}
            <div className="onb__panel onb__panel--ink">
              <span className="u-eyebrow" style={{ color: 'rgba(255,255,255,.55)' }}>Prêt à jouer</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                <div style={{ position: 'relative', width: 160, aspectRatio: '3/4', marginBottom: 16, background: '#fff' }}>
                  <Image
                    src={productImageUrl(category, style)}
                    alt={`${category} ${style}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>
                <div style={{ color: '#fff', fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>
                  {productName || 'DROP 01'}
                </div>
                <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, marginTop: 6, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {CATEGORIES.find(c => c.key === category)?.label?.toUpperCase()} · {STYLES.find(s => s.key === style)?.label?.toUpperCase()}
                </div>
              </div>
              <button
                className="btn"
                onClick={handleJoin}
                disabled={loading}
                style={{ background: '#fff', color: '#121212', borderColor: '#fff', alignSelf: 'flex-start' }}
              >
                {loading ? '…' : 'Commencer la simulation →'}
              </button>
            </div>
          </div>
        )}

        {/* GM discreet link */}
        <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 40 }}>
          <a href="/gamemaster" className="gmlink">
            {lang === 'fr' ? 'Espace Game Master · accès animateur →' : 'Game Master access →'}
          </a>
        </div>

      </div>

    </div>
  );
}

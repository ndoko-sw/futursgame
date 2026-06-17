'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';
import Image from 'next/image';
import { productImageUrl } from '@/lib/product-image';

/* ─── Module definitions ─── */
const MODULES = [
  {
    key: 'fournisseur',
    label: 'Fournisseur',
    icon: '🏭',
    desc: 'D\'où vient ta matière première et comment sont fabriqués tes produits.',
    impacte: ['Durabilité', 'Image'],
    options: [
      { key: 'atelier_abidjan',    label: 'Atelier Abidjan',     desc: 'Production locale, savoir-faire artisanal', tags: ['Durable', 'Image+'] },
      { key: 'usine_europe',       label: 'Usine Europe',         desc: 'Qualité certifiée, délais maîtrisés',       tags: ['Qualité', 'Standard'] },
      { key: 'fast_fashion_asie',  label: 'Fast Fashion Asie',    desc: 'Volume maximal, coût minimal',              tags: ['Volume', 'Durable−'] },
      { key: 'capsule_artisanale', label: 'Capsule Artisanale',   desc: 'Pièces uniques, positioning premium',       tags: ['Premium', 'Ventes−'] },
      { key: 'collab_createur',    label: 'Collab Créateur',      desc: 'Co-création avec un designer émergent',     tags: ['Buzz', 'Image+'] },
    ],
  },
  {
    key: 'collection',
    label: 'Collection',
    icon: '✦',
    desc: 'Le style et le volume de ta collection ce tour.',
    impacte: ['Ventes', 'Fidélité'],
    options: [
      { key: 'casual_luxe',   label: 'Casual Luxe',   desc: 'Accessible mais raffiné',           tags: ['Polyvalent'] },
      { key: 'streetwear',    label: 'Streetwear',     desc: 'Culture urbaine, drop culture',     tags: ['Buzz', 'Youth'] },
      { key: 'techwear',      label: 'Techwear',       desc: 'Fonctionnel, futuriste',            tags: ['Niche'] },
      { key: 'avant_garde',   label: 'Avant-garde',    desc: 'Art wearable, concept fort',        tags: ['Image+', 'Ventes−'] },
      { key: 'minimaliste',   label: 'Minimaliste',    desc: 'Épuré, intemporel',                 tags: ['Premium', 'Fidélité+'] },
    ],
  },
  {
    key: 'prix',
    label: 'Prix',
    icon: '€',
    desc: 'Positionnement tarifaire de ta collection.',
    impacte: ['Ventes', 'Image'],
    options: [
      { key: 'accessible',  label: 'Accessible',  desc: '< 50€ · Volume élevé, marges réduites',   tags: ['Ventes+', 'Image−'] },
      { key: 'milieu',      label: 'Milieu',       desc: '50–120€ · Équilibre volume / marge',       tags: ['Équilibré'] },
      { key: 'premium',     label: 'Premium',      desc: '120–300€ · Marges fortes, volume limité',  tags: ['Image+', 'Ventes−'] },
      { key: 'luxe',        label: 'Luxe',         desc: '> 300€ · Exclusivité maximale',            tags: ['Image++', 'Niche'] },
    ],
  },
  {
    key: 'distribution',
    label: 'Distribution',
    icon: '⊕',
    desc: 'Par quels canaux vont circuler tes produits.',
    impacte: ['Ventes', 'Fidélité'],
    options: [
      { key: 'ecommerce',    label: 'E-commerce',    desc: 'Boutique en ligne DTC',               tags: ['Volume', 'Data'] },
      { key: 'popup',        label: 'Pop-up store',   desc: 'Activation éphémère, expérience',     tags: ['Buzz', 'Fidélité+'] },
      { key: 'multibrand',   label: 'Multi-marques',  desc: 'Présence dans les concept-stores',    tags: ['Image+', 'Marges−'] },
      { key: 'wholesale',    label: 'Wholesale',      desc: 'Distribution en gros, volume',        tags: ['Volume+', 'Image−'] },
      { key: 'social_drop',  label: 'Social Drop',    desc: 'Vente exclusive via réseaux sociaux', tags: ['Youth', 'Hype'] },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: '◉',
    desc: 'Comment tu vas toucher et engager ton audience.',
    impacte: ['Image', 'Fidélité'],
    options: [
      { key: 'tiktok_insta', label: 'TikTok / Insta', desc: 'Contenu social, reach organique',  tags: ['Youth', 'Viral'] },
      { key: 'press_rp',     label: 'Presse & RP',    desc: 'Couverture éditoriale, légitimité', tags: ['Image+', 'Lent'] },
      { key: 'event',        label: 'Événement',       desc: 'Activation physique, expérience',   tags: ['Fidélité+', 'Coût'] },
      { key: 'influencer',   label: 'Influenceurs',    desc: 'Ambassadeurs, conversion rapide',   tags: ['Ventes+', 'Court terme'] },
    ],
  },
];

const FOCUS_OPTIONS = [
  { key: 'balanced',       label: 'Équilibrée',    desc: 'Distribution uniforme' },
  { key: 'price',          label: 'Prix agressif', desc: 'Ventes × 1.3' },
  { key: 'product',        label: 'Produit',       desc: 'Image + Fidélité' },
  { key: 'image',          label: 'Image forte',   desc: 'Image × 1.4' },
  { key: 'sustainability', label: 'Durable',       desc: 'Durabilité × 1.5' },
];

type ModuleKey = 'fournisseur' | 'collection' | 'prix' | 'distribution' | 'communication';

type FormState = {
  supplier: string;
  collection_style: string;
  price_tier: string;
  distribution: string;
  comm_channel: string;
  brand_focus: string;
  budget_fournisseur: number;
  budget_collection: number;
  budget_prix: number;
  budget_distribution: number;
  budget_communication: number;
};

const BUDGET_KEY: Record<string, keyof FormState> = {
  fournisseur: 'budget_fournisseur',
  collection: 'budget_collection',
  prix: 'budget_prix',
  distribution: 'budget_distribution',
  communication: 'budget_communication',
};

function ProduitInner() {
  const { session, team, decisions, currentRound, submitDecision } = useGame();
  const router = useRouter();
  const params = useSearchParams();
  const activeModule = params.get('module') ?? 'fournisseur';

  const isPractice = session?.status === 'practice';
  const budget = isPractice ? 999_999 : (team?.current_budget ?? 100_000);
  const existingDecision = decisions.find(d => d.round_number === currentRound);

  const [form, setForm] = useState<FormState>({
    supplier: existingDecision?.supplier ?? 'usine_europe',
    collection_style: existingDecision?.collection_style ?? 'casual_luxe',
    price_tier: (existingDecision as any)?.price_tier ?? 'milieu',
    distribution: existingDecision?.distribution ?? 'ecommerce',
    comm_channel: existingDecision?.comm_channel ?? 'tiktok_insta',
    brand_focus: existingDecision?.brand_focus ?? 'balanced',
    budget_fournisseur: existingDecision?.budget_fournisseur ?? 0,
    budget_collection: existingDecision?.budget_collection ?? 0,
    budget_prix: existingDecision?.budget_prix ?? 0,
    budget_distribution: existingDecision?.budget_distribution ?? 0,
    budget_communication: existingDecision?.budget_communication ?? 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalAllocated = form.budget_fournisseur + form.budget_collection + form.budget_prix + form.budget_distribution + form.budget_communication;
  const remaining = budget - totalAllocated;
  const pct = Math.min(100, (totalAllocated / budget) * 100);

  const setAlloc = useCallback((mod: string, val: number) => {
    const key = BUDGET_KEY[mod];
    if (!key) return;
    const clamped = Math.max(0, Math.min(val, budget));
    const otherTotal = totalAllocated - (form[key] as number);
    const maxAllowed = budget - otherTotal;
    setForm(prev => ({ ...prev, [key]: Math.min(clamped, maxAllowed) }));
  }, [form, totalAllocated, budget]);

  const currentMod = MODULES.find(m => m.key === activeModule) ?? MODULES[0];
  const currentBudgetKey = BUDGET_KEY[currentMod.key] as keyof FormState;
  const currentAlloc = form[currentBudgetKey] as number;

  const handleSaveModule = async () => {
    if (!team || !session) return;
    setSaved(false);
    try {
      await supabase.from('decisions').upsert(
        {
          team_id: team.id, session_id: session.id, round_number: currentRound,
          supplier: form.supplier, collection_style: form.collection_style,
          price_tier: form.price_tier,
          distribution: form.distribution, comm_channel: form.comm_channel,
          brand_focus: form.brand_focus,
          budget_fournisseur: form.budget_fournisseur,
          budget_collection: form.budget_collection,
          budget_prix: form.budget_prix,
          budget_distribution: form.budget_distribution,
          budget_communication: form.budget_communication,
          total_spent: totalAllocated,
        },
        { onConflict: 'team_id,round_number' }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmit = async () => {
    if (!team || !session) return;
    setSubmitting(true);
    try {
      await supabase.from('decisions').upsert(
        {
          team_id: team.id, session_id: session.id, round_number: currentRound,
          supplier: form.supplier, collection_style: form.collection_style,
          price_tier: form.price_tier,
          distribution: form.distribution, comm_channel: form.comm_channel,
          brand_focus: form.brand_focus,
          budget_fournisseur: form.budget_fournisseur,
          budget_collection: form.budget_collection,
          budget_prix: form.budget_prix,
          budget_distribution: form.budget_distribution,
          budget_communication: form.budget_communication,
          total_spent: totalAllocated,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,round_number' }
      );
      toast.success('Décisions soumises !');
      router.push('/brand');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = !!existingDecision?.submitted_at;

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre →</button></a>
      </div>
    );
  }

  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k€`;

  return (
    <div style={{ paddingBottom: 120 }}>
      <div className="wrap">

        {/* Budget global bar */}
        <div style={{ padding: '24px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="u-label">BUDGET TOUR {currentRound}</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>
              {fmt(totalAllocated)} / {fmt(budget)} · <span style={{ color: remaining < 0 ? 'var(--scarlet)' : 'var(--muted)' }}>{fmt(remaining)} restant</span>
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--fill)', position: 'relative' }}>
            {/* Stacked bars per module */}
            {MODULES.map((mod, i) => {
              const val = form[BUDGET_KEY[mod.key] as keyof FormState] as number;
              const offset = MODULES.slice(0, i).reduce((s, m) => s + (form[BUDGET_KEY[m.key] as keyof FormState] as number), 0);
              const offsetPct = (offset / budget) * 100;
              const widthPct = (val / budget) * 100;
              const colors = ['#2B4A8B', '#B86B4B', '#6E6F4B', '#127a3e', '#E63329'];
              return val > 0 ? (
                <div key={mod.key} style={{
                  position: 'absolute', top: 0, height: '100%',
                  left: `${offsetPct}%`, width: `${widthPct}%`,
                  background: colors[i], transition: 'all .25s',
                }} />
              ) : null;
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {MODULES.map((mod, i) => {
              const val = form[BUDGET_KEY[mod.key] as keyof FormState] as number;
              const colors = ['#2B4A8B', '#B86B4B', '#6E6F4B', '#127a3e', '#E63329'];
              return (
                <div key={mod.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, background: colors[i], display: 'block' }} />
                  <span style={{ textTransform: 'uppercase', letterSpacing: '.06em', color: activeModule === mod.key ? 'var(--ink)' : 'var(--muted)' }}>
                    {mod.label} {val > 0 ? `· ${fmt(val)}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginTop: 32, marginBottom: 0, overflowX: 'auto' }}>
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.key;
            const alloc = form[BUDGET_KEY[mod.key] as keyof FormState] as number;
            return (
              <button
                key={mod.key}
                onClick={() => router.push(`/produit?module=${mod.key}`)}
                style={{
                  padding: '14px 20px', border: 0, background: 'none', cursor: 'pointer',
                  borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--ink)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                  transition: 'color .15s',
                }}
              >
                <span>{mod.icon}</span>
                <span>{mod.label}</span>
                {alloc > 0 && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: isActive ? 'var(--ink)' : 'var(--muted)' }}>
                    {fmt(alloc)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Module content */}
        <div className="produit-grid">

          {/* Left — options + budget slider */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <span className="u-eyebrow">{currentMod.icon} {currentMod.label}</span>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>{currentMod.desc}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {currentMod.impacte.map(k => (
                  <span key={k} style={{ fontSize: 11, border: '1px solid var(--line)', padding: '3px 10px', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {/* Option cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 40 }}>
              {currentMod.options.map((opt) => {
                const optionKey = currentMod.key === 'fournisseur' ? 'supplier'
                  : currentMod.key === 'collection' ? 'collection_style'
                  : currentMod.key === 'prix' ? 'price_tier'
                  : currentMod.key === 'distribution' ? 'distribution'
                  : 'comm_channel';
                const isSelected = form[optionKey as keyof FormState] === opt.key;
                return (
                  <button
                    key={opt.key}
                    disabled={submitted}
                    onClick={() => setForm(prev => ({ ...prev, [optionKey]: opt.key }))}
                    style={{
                      border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--ink)' : 'var(--bg)',
                      color: isSelected ? '#fff' : 'var(--ink)',
                      padding: '16px 18px', textAlign: 'left', cursor: submitted ? 'not-allowed' : 'pointer',
                      transition: 'all .15s', opacity: submitted ? .55 : 1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, opacity: .7, lineHeight: 1.4, marginBottom: 10 }}>{opt.desc}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {opt.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
                          padding: '2px 7px',
                          background: isSelected ? 'rgba(255,255,255,.15)' : 'var(--fill)',
                          color: isSelected ? '#fff' : 'var(--muted)',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Budget allocation for this module */}
            <div style={{ border: '1px solid var(--line)', padding: '28px 28px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span className="u-label">BUDGET {currentMod.label.toUpperCase()}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 700 }}>
                  {fmt(currentAlloc)}
                </span>
              </div>
              {/* Quick % buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {[0, 10, 20, 30, 40, 50].map(p => {
                  const v = Math.round(budget * p / 100);
                  return (
                    <button
                      key={p}
                      disabled={submitted}
                      onClick={() => setAlloc(currentMod.key, v)}
                      style={{
                        border: `1px solid ${currentAlloc === v ? 'var(--ink)' : 'var(--line)'}`,
                        background: currentAlloc === v ? 'var(--ink)' : 'transparent',
                        color: currentAlloc === v ? '#fff' : 'var(--ink)',
                        padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                        letterSpacing: '.06em', transition: 'all .15s',
                      }}
                    >
                      {p}%
                    </button>
                  );
                })}
              </div>
              {/* Slider */}
              <input
                type="range" min={0} max={budget} step={5000}
                value={currentAlloc}
                disabled={submitted}
                onChange={e => setAlloc(currentMod.key, Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ink)', cursor: submitted ? 'not-allowed' : 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                <span>0€</span>
                <span>{fmt(budget / 2)}</span>
                <span>{fmt(budget)}</span>
              </div>
              {/* Remaining budget hint */}
              <div style={{ marginTop: 16, fontSize: 12, color: remaining < 0 ? 'var(--scarlet)' : 'var(--muted)' }}>
                {remaining >= 0
                  ? `${fmt(remaining)} non alloué — tu peux l'utiliser ailleurs`
                  : `Budget dépassé de ${fmt(-remaining)} — réduis un autre module`}
              </div>
            </div>
          </div>

          {/* Right — recap + brand focus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Product preview */}
            {existingDecision?.product_category && existingDecision?.product_style && (
              <div style={{ border: '1px solid var(--line)', padding: '20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 72, aspectRatio: '3/4', flexShrink: 0, background: '#fff' }}>
                  <Image
                    src={productImageUrl(existingDecision.product_category, existingDecision.product_style)}
                    alt={existingDecision.product_name ?? 'Produit'}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {existingDecision.product_name ?? 'Produit'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {existingDecision.product_category} · {existingDecision.product_style}
                  </div>
                </div>
              </div>
            )}

            {/* Allocation recap */}
            <div style={{ border: '1px solid var(--line)', padding: '24px' }}>
              <div className="u-label" style={{ marginBottom: 18 }}>RÉPARTITION BUDGET</div>
              {MODULES.map((mod, i) => {
                const val = form[BUDGET_KEY[mod.key] as keyof FormState] as number;
                const p = budget > 0 ? (val / budget) * 100 : 0;
                const colors = ['#2B4A8B', '#B86B4B', '#6E6F4B', '#127a3e', '#E63329'];
                return (
                  <div key={mod.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{mod.icon}</span> {mod.label}
                      </span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--muted)' }}>
                        {fmt(val)} · {Math.round(p)}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'var(--fill)' }}>
                      <div style={{ height: '100%', width: `${p}%`, background: colors[i], transition: 'width .25s' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{fmt(totalAllocated)}</span>
              </div>
            </div>

            {/* Brand focus */}
            <div style={{ border: '1px solid var(--line)', padding: '24px' }}>
              <div className="u-label" style={{ marginBottom: 16 }}>FOCUS STRATÉGIQUE</div>
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f.key}
                  disabled={submitted}
                  onClick={() => setForm(prev => ({ ...prev, brand_focus: f.key }))}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', marginBottom: 6,
                    border: `1px solid ${form.brand_focus === f.key ? 'var(--ink)' : 'var(--line)'}`,
                    background: form.brand_focus === f.key ? 'var(--ink)' : 'transparent',
                    color: form.brand_focus === f.key ? '#fff' : 'var(--ink)',
                    cursor: submitted ? 'not-allowed' : 'pointer', transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{f.label}</span>
                  <span style={{ fontSize: 11, opacity: .7 }}>{f.desc}</span>
                </button>
              ))}
            </div>

            {/* Save button */}
            {!submitted && (
              <button
                onClick={handleSaveModule}
                style={{
                  border: '1px solid var(--ink)', background: saved ? 'var(--ink)' : 'transparent',
                  color: saved ? '#fff' : 'var(--ink)', padding: '12px', fontSize: 13,
                  cursor: 'pointer', letterSpacing: '.06em', transition: 'all .2s',
                }}
              >
                {saved ? '✓ Sauvegardé' : 'Sauvegarder ce module'}
              </button>
            )}
          </div>

        </div>

        {/* Nav modules mobile */}
        <div style={{ display: 'none' }} className="module-mobile-nav" />

      </div>

      {/* ── Sticky CTA ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderTop: '1px solid var(--line)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 4, background: 'var(--fill)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
            {fmt(totalAllocated)} alloué · {fmt(remaining)} restant
          </div>
        </div>
        {submitted ? (
          <div style={{ background: 'var(--fill)', color: 'var(--muted)', padding: '13px 24px', fontSize: 13, letterSpacing: '.06em' }}>
            ✓ SOUMIS
          </div>
        ) : (
          <button
            className="btn"
            onClick={handleSubmit}
            disabled={submitting || remaining < 0}
            title={remaining < 0 ? 'Budget dépassé' : ''}
          >
            {submitting ? '…' : 'Soumettre les décisions →'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProduitPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="u-label">Chargement…</span></div>}>
      <ProduitInner />
    </Suspense>
  );
}

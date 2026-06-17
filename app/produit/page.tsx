'use client';

import { useState, Suspense } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';

/* ─── Référentiels ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'haut',       label: 'Haut',      icon: '👕' },
  { key: 'bas',        label: 'Bas',        icon: '👖' },
  { key: 'veste',      label: 'Veste',      icon: '🧥' },
  { key: 'robe',       label: 'Robe',       icon: '👗' },
  { key: 'chaussure',  label: 'Chaussure',  icon: '👟' },
  { key: 'accessoire', label: 'Accessoire', icon: '💍' },
];

const STYLES = [
  { key: 'casual_luxe', label: 'Casual Luxe', desc: 'Accessible et raffiné' },
  { key: 'streetwear',  label: 'Streetwear',  desc: 'Culture urbaine, drop culture' },
  { key: 'techwear',    label: 'Techwear',    desc: 'Fonctionnel, futuriste' },
  { key: 'avant_garde', label: 'Avant-garde', desc: 'Art wearable, concept fort' },
  { key: 'minimaliste', label: 'Minimaliste', desc: 'Épuré, intemporel' },
];

const PRICES = [
  { key: 'accessible', label: 'Accessible', desc: '< 50€ · Volume élevé, marges réduites',  tags: ['Ventes+', 'Image−'] },
  { key: 'milieu',     label: 'Milieu',     desc: '50–120€ · Équilibre volume / marge',      tags: ['Équilibré'] },
  { key: 'premium',    label: 'Premium',    desc: '120–300€ · Marges fortes, volume limité', tags: ['Image+', 'Ventes−'] },
  { key: 'luxe',       label: 'Luxe',       desc: '> 300€ · Exclusivité maximale',           tags: ['Image++', 'Niche'] },
];

const SUPPLIERS = [
  { key: 'atelier_abidjan',    label: 'Atelier Abidjan',   desc: 'Production locale, savoir-faire artisanal', impact: 'Durabilité ↑↑ · Image ↑' },
  { key: 'usine_europe',       label: 'Usine Europe',       desc: 'Qualité certifiée, délais maîtrisés',       impact: 'Qualité standard · Équilibré' },
  { key: 'fast_fashion_asie',  label: 'Fast Fashion Asie',  desc: 'Volume maximal, coût minimal',              impact: 'Ventes ↑ · Durabilité ↓↓' },
  { key: 'capsule_artisanale', label: 'Capsule Artisanale', desc: 'Pièces uniques, premium',                   impact: 'Image ↑↑ · Ventes ↓' },
  { key: 'collab_createur',    label: 'Collab Créateur',    desc: 'Co-création avec un designer émergent',     impact: 'Buzz ↑ · Image ↑' },
];

const DIST_CHANNELS = [
  { key: 'ecommerce',   label: 'E-commerce',   desc: 'Boutique en ligne DTC',                impact: 'Volume ↑ · Data' },
  { key: 'popup',       label: 'Pop-up store',  desc: 'Activation éphémère, expérience',      impact: 'Fidélité ↑↑ · Buzz' },
  { key: 'multibrand',  label: 'Multi-marques', desc: 'Présence dans les concept-stores',     impact: 'Image ↑ · Marges ↓' },
  { key: 'wholesale',   label: 'Wholesale',     desc: 'Distribution en gros, volume',         impact: 'Volume ↑↑ · Image ↓' },
  { key: 'social_drop', label: 'Social Drop',   desc: 'Vente exclusive via réseaux sociaux',  impact: 'Hype ↑↑ · Youth' },
];

const COMM_CHANNELS = [
  { key: 'tiktok',     label: 'TikTok / Insta', desc: 'Contenu social, reach organique',  impact: 'Ventes ↑ · Image ↑ · Youth' },
  { key: 'press',      label: 'Presse & RP',    desc: 'Couverture éditoriale, légitimité', impact: 'Image ↑↑ · Slow burn' },
  { key: 'event',      label: 'Événement',      desc: 'Activation physique, expérience',   impact: 'Fidélité ↑↑ · Coût élevé' },
  { key: 'influencer', label: 'Influenceurs',   desc: 'Ambassadeurs, conversion rapide',   impact: 'Ventes ↑↑ · Court terme' },
];

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type ProductForm = {
  name: string;
  category: string;
  style: string;
  supplier: string;
  price_tier: string;
  budget_supplier: number;
  budget_collection: number;
  budget_comm_tiktok: number;
  budget_comm_press: number;
  budget_comm_event: number;
  budget_comm_influencer: number;
  budget_dist_ecommerce: number;
  budget_dist_popup: number;
  budget_dist_multibrand: number;
  budget_dist_wholesale: number;
  budget_dist_social_drop: number;
};

const EMPTY_FORM: ProductForm = {
  name: '', category: 'haut', style: 'casual_luxe', supplier: 'usine_europe', price_tier: 'milieu',
  budget_supplier: 0, budget_collection: 0,
  budget_comm_tiktok: 0, budget_comm_press: 0, budget_comm_event: 0, budget_comm_influencer: 0,
  budget_dist_ecommerce: 0, budget_dist_popup: 0, budget_dist_multibrand: 0, budget_dist_wholesale: 0, budget_dist_social_drop: 0,
};

function productTotal(f: ProductForm) {
  return f.budget_supplier + f.budget_collection +
    f.budget_comm_tiktok + f.budget_comm_press + f.budget_comm_event + f.budget_comm_influencer +
    f.budget_dist_ecommerce + f.budget_dist_popup + f.budget_dist_multibrand + f.budget_dist_wholesale + f.budget_dist_social_drop;
}

function formFromProduct(p: Product): ProductForm {
  return {
    name: p.name, category: p.category, style: p.style,
    supplier: p.supplier, price_tier: p.price_tier,
    budget_supplier: p.budget_supplier ?? 0,
    budget_collection: p.budget_collection ?? 0,
    budget_comm_tiktok: p.budget_comm_tiktok ?? 0,
    budget_comm_press: p.budget_comm_press ?? 0,
    budget_comm_event: p.budget_comm_event ?? 0,
    budget_comm_influencer: p.budget_comm_influencer ?? 0,
    budget_dist_ecommerce: p.budget_dist_ecommerce ?? 0,
    budget_dist_popup: p.budget_dist_popup ?? 0,
    budget_dist_multibrand: p.budget_dist_multibrand ?? 0,
    budget_dist_wholesale: p.budget_dist_wholesale ?? 0,
    budget_dist_social_drop: p.budget_dist_social_drop ?? 0,
  };
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}k€` : `${n}€`;
}

/* ─── Composants ─────────────────────────────────────────────────────────────── */
function BudgetSlider({ label, desc, impact, value, max, onChange }: {
  label: string; desc: string; impact: string;
  value: number; max: number; onChange: (v: number) => void;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600, color: value > 0 ? '#121212' : 'var(--muted)' }}>
          {fmt(value)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{desc}</div>
      <input
        type="range" min={0} max={max} step={5000} value={value}
        onChange={e => onChange(Math.min(Number(e.target.value), max))}
        style={{ width: '100%', accentColor: '#121212' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{impact}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{Math.round(pct)}%</span>
      </div>
      {/* Mini bar */}
      <div style={{ height: 2, background: 'var(--line)', marginTop: 6, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: value > 0 ? '#121212' : 'transparent', transition: 'width .2s' }} />
      </div>
    </div>
  );
}

type Tab = 'identite' | 'fournisseur' | 'distribution' | 'communication' | 'collection';
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'identite',      label: 'Identité',    emoji: '✦' },
  { key: 'fournisseur',   label: 'Fournisseur', emoji: '🏭' },
  { key: 'distribution',  label: 'Distrib.',    emoji: '⊕' },
  { key: 'communication', label: 'Comm.',       emoji: '◉' },
  { key: 'collection',    label: 'Collection',  emoji: '★' },
];

function ProductEditor({ form, setForm, onSave, onDelete, saving, isNew, availableBudget }: {
  form: ProductForm; setForm: (f: ProductForm) => void;
  onSave: () => void; onDelete?: () => void;
  saving: boolean; isNew: boolean; availableBudget: number;
}) {
  const [tab, setTab] = useState<Tab>('identite');
  const spent = productTotal(form);
  const maxForSlider = (current: number) => current + Math.max(0, availableBudget - spent + current);

  const setBudget = (key: keyof ProductForm, val: number) => {
    const otherSpent = spent - (form[key] as number);
    const clamped = Math.min(val, Math.max(0, availableBudget - otherSpent));
    setForm({ ...form, [key]: clamped });
  };

  return (
    <div style={{ border: '1px solid #121212', marginTop: 8 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? '#121212' : 'none',
            color: tab === t.key ? '#fff' : 'var(--muted)',
            border: 0, borderRight: '1px solid var(--line)',
            padding: '9px 12px', fontSize: 10, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <span>{t.emoji}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '18px 18px 14px' }}>

        {/* ── IDENTITÉ ── */}
        {tab === 'identite' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 8, color: 'var(--muted)' }}>Nom du produit</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: DROP 01, Air Djassa…" maxLength={40}
                style={{ width: '100%', border: '1px solid var(--line)', padding: '11px 14px', fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--muted)' }}>Catégorie</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} type="button" onClick={() => setForm({ ...form, category: c.key })} style={{
                    border: `1px solid ${form.category === c.key ? '#121212' : 'var(--line)'}`,
                    background: form.category === c.key ? '#121212' : '#fff',
                    color: form.category === c.key ? '#fff' : '#121212',
                    padding: '8px 4px', fontSize: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{ fontSize: 16 }}>{c.icon}</span><span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--muted)' }}>Style</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STYLES.map(s => (
                  <button key={s.key} type="button" onClick={() => setForm({ ...form, style: s.key })} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1px solid ${form.style === s.key ? '#121212' : 'var(--line)'}`,
                    background: form.style === s.key ? 'rgba(18,18,18,.04)' : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.style === s.key ? '#121212' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.style === s.key && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#121212', display: 'block' }} />}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--muted)' }}>Prix</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRICES.map(p => (
                  <button key={p.key} type="button" onClick={() => setForm({ ...form, price_tier: p.key })} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    border: `1px solid ${form.price_tier === p.key ? '#121212' : 'var(--line)'}`,
                    background: form.price_tier === p.key ? 'rgba(18,18,18,.04)' : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.price_tier === p.key ? '#121212' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {form.price_tier === p.key && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#121212', display: 'block' }} />}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>{p.desc}</span></div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                        {p.tags.map(tag => <span key={tag} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--fill)', padding: '2px 6px', color: 'var(--muted)' }}>{tag}</span>)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FOURNISSEUR ── */}
        {tab === 'fournisseur' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Choisis ton fournisseur, puis investis pour maximiser son impact sur ta collection.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              {SUPPLIERS.map(s => (
                <button key={s.key} type="button" onClick={() => setForm({ ...form, supplier: s.key })} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  border: `1px solid ${form.supplier === s.key ? '#121212' : 'var(--line)'}`,
                  background: form.supplier === s.key ? 'rgba(18,18,18,.04)' : '#fff',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.supplier === s.key ? '#121212' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {form.supplier === s.key && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#121212', display: 'block' }} />}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</div>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6E6F4B', marginTop: 3 }}>{s.impact}</div>
                  </div>
                </button>
              ))}
            </div>
            <BudgetSlider
              label={`Budget fournisseur — ${SUPPLIERS.find(s => s.key === form.supplier)?.label}`}
              desc="Niveau d'investissement dans ce fournisseur. Plus tu investis, plus les avantages de ce fournisseur s'expriment."
              impact="Qualité production · Durabilité · Image"
              value={form.budget_supplier}
              max={maxForSlider(form.budget_supplier)}
              onChange={v => setBudget('budget_supplier', v)}
            />
          </div>
        )}

        {/* ── DISTRIBUTION ── */}
        {tab === 'distribution' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Répartis ton budget entre plusieurs canaux de vente. Chaque euro investi renforce ce canal.
            </p>
            <div style={{ background: 'var(--fill)', padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Total distribution : </span>
              <strong style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                {fmt(form.budget_dist_ecommerce + form.budget_dist_popup + form.budget_dist_multibrand + form.budget_dist_wholesale + form.budget_dist_social_drop)}
              </strong>
            </div>
            {DIST_CHANNELS.map(ch => {
              const key = `budget_dist_${ch.key}` as keyof ProductForm;
              return (
                <BudgetSlider key={ch.key}
                  label={ch.label} desc={ch.desc} impact={ch.impact}
                  value={form[key] as number}
                  max={maxForSlider(form[key] as number)}
                  onChange={v => setBudget(key, v)}
                />
              );
            })}
          </div>
        )}

        {/* ── COMMUNICATION ── */}
        {tab === 'communication' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Répartis ton budget comm entre plusieurs canaux. Investir massivement dans un canal le rend dominant dans ta stratégie.
            </p>
            <div style={{ background: 'var(--fill)', padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Total communication : </span>
              <strong style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                {fmt(form.budget_comm_tiktok + form.budget_comm_press + form.budget_comm_event + form.budget_comm_influencer)}
              </strong>
            </div>
            {COMM_CHANNELS.map(ch => {
              const key = `budget_comm_${ch.key}` as keyof ProductForm;
              return (
                <BudgetSlider key={ch.key}
                  label={ch.label} desc={ch.desc} impact={ch.impact}
                  value={form[key] as number}
                  max={maxForSlider(form[key] as number)}
                  onChange={v => setBudget(key, v)}
                />
              );
            })}
          </div>
        )}

        {/* ── COLLECTION / QUALITÉ ── */}
        {tab === 'collection' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
              Investis dans la qualité intrinsèque de ton produit — matières, finitions, design. Cela renforce l'image et la fidélité indépendamment des canaux de comm ou de distribution.
            </p>
            <BudgetSlider
              label="Investissement qualité produit"
              desc="Finitions, matières premium, soin du design. Impacte l'image et la fidélité de manière durable."
              impact="Image ↑ · Fidélité ↑ · Durabilité ↑"
              value={form.budget_collection}
              max={maxForSlider(form.budget_collection)}
              onChange={v => setBudget('budget_collection', v)}
            />
            {/* Récap visuel */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Récapitulatif budget produit</div>
              {[
                { label: 'Fournisseur', value: form.budget_supplier, color: '#2B4A8B' },
                { label: 'Distribution', value: form.budget_dist_ecommerce + form.budget_dist_popup + form.budget_dist_multibrand + form.budget_dist_wholesale + form.budget_dist_social_drop, color: '#B86B4B' },
                { label: 'Communication', value: form.budget_comm_tiktok + form.budget_comm_press + form.budget_comm_event + form.budget_comm_influencer, color: '#6E6F4B' },
                { label: 'Qualité collection', value: form.budget_collection, color: '#E63329' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, background: row.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12 }}>{row.label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fmt(row.value)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 36, textAlign: 'right' }}>
                    {spent > 0 ? Math.round((row.value / spent) * 100) : 0}%
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700 }}>{fmt(spent)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          {onDelete && (
            <button type="button" onClick={onDelete}
              style={{ border: '1px solid rgba(230,51,41,.4)', color: '#E63329', background: 'none', padding: '10px 14px', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Supprimer
            </button>
          )}
          <button type="button" onClick={onSave} disabled={saving || !form.name.trim()}
            style={{
              background: saving || !form.name.trim() ? 'var(--fill)' : '#121212',
              color: saving || !form.name.trim() ? 'var(--muted)' : '#fff',
              border: 0, padding: '10px 24px', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', marginLeft: 'auto',
            }}>
            {saving ? 'Sauvegarde…' : isNew ? 'Créer le produit' : 'Sauvegarder ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────────────────────────── */
function ProduitInner() {
  const { session, team, restoring, decisions, products, setProducts, currentRound, roundTimeLeft } = useGame();
  const router = useRouter();

  const isPractice = session?.status === 'practice';
  const totalBudget = isPractice ? 999_999 : (team?.current_budget ?? 100_000);
  const maxProducts = currentRound === 1 || isPractice ? 1 : 3;

  const roundProducts = products.filter(p => p.round_number === currentRound);
  const totalAllocated = roundProducts.reduce((sum, p) => sum + (
    (p.budget_supplier ?? 0) + (p.budget_collection ?? 0) +
    (p.budget_comm_tiktok ?? 0) + (p.budget_comm_press ?? 0) + (p.budget_comm_event ?? 0) + (p.budget_comm_influencer ?? 0) +
    (p.budget_dist_ecommerce ?? 0) + (p.budget_dist_popup ?? 0) + (p.budget_dist_multibrand ?? 0) + (p.budget_dist_wholesale ?? 0) + (p.budget_dist_social_drop ?? 0)
  ), 0);

  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [editForms, setEditForms] = useState<Record<string, ProductForm>>({});
  const [newForm, setNewForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentDecision = decisions.find(d => d.round_number === currentRound);
  const isSubmitted = !!currentDecision?.submitted_at;
  const canUnsubmit = isSubmitted && (roundTimeLeft ?? 0) > 0 && session?.status === 'active';

  if (restoring) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span>
    </div>
  );
  if (!session || !team) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <a href="/"><button className="btn">Rejoindre une session →</button></a>
    </div>
  );

  const getEditForm = (p: Product) => editForms[p.id] ?? formFromProduct(p);

  // Budget disponible pour un produit donné (budget total moins ce qu'allouent les autres produits)
  const availableFor = (editingId: string | 'new') => {
    const othersTotal = roundProducts
      .filter(p => p.id !== editingId)
      .reduce((s, p) => {
        const f = editForms[p.id];
        return s + (f ? productTotal(f) : (
          (p.budget_supplier ?? 0) + (p.budget_collection ?? 0) +
          (p.budget_comm_tiktok ?? 0) + (p.budget_comm_press ?? 0) + (p.budget_comm_event ?? 0) + (p.budget_comm_influencer ?? 0) +
          (p.budget_dist_ecommerce ?? 0) + (p.budget_dist_popup ?? 0) + (p.budget_dist_multibrand ?? 0) + (p.budget_dist_wholesale ?? 0) + (p.budget_dist_social_drop ?? 0)
        ));
      }, 0);
    return Math.max(0, totalBudget - othersTotal);
  };

  const handleSaveExisting = async (p: Product) => {
    const form = getEditForm(p);
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('products').update({
      name: form.name, category: form.category, style: form.style,
      supplier: form.supplier, price_tier: form.price_tier,
      budget_supplier: form.budget_supplier, budget_collection: form.budget_collection,
      budget_comm_tiktok: form.budget_comm_tiktok, budget_comm_press: form.budget_comm_press,
      budget_comm_event: form.budget_comm_event, budget_comm_influencer: form.budget_comm_influencer,
      budget_dist_ecommerce: form.budget_dist_ecommerce, budget_dist_popup: form.budget_dist_popup,
      budget_dist_multibrand: form.budget_dist_multibrand, budget_dist_wholesale: form.budget_dist_wholesale,
      budget_dist_social_drop: form.budget_dist_social_drop,
    }).eq('id', p.id);
    if (error) { toast.error('Erreur lors de la sauvegarde'); }
    else {
      toast.success('Produit sauvegardé ✓');
      setExpandedId(null);
      setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, ...form } : pr));
      const { [p.id]: _, ...rest } = editForms;
      setEditForms(rest);
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('products').insert({
      team_id: team.id, session_id: session.id, round_number: currentRound,
      name: newForm.name, category: newForm.category, style: newForm.style,
      supplier: newForm.supplier, price_tier: newForm.price_tier,
      budget_supplier: newForm.budget_supplier, budget_collection: newForm.budget_collection,
      budget_comm_tiktok: newForm.budget_comm_tiktok, budget_comm_press: newForm.budget_comm_press,
      budget_comm_event: newForm.budget_comm_event, budget_comm_influencer: newForm.budget_comm_influencer,
      budget_dist_ecommerce: newForm.budget_dist_ecommerce, budget_dist_popup: newForm.budget_dist_popup,
      budget_dist_multibrand: newForm.budget_dist_multibrand, budget_dist_wholesale: newForm.budget_dist_wholesale,
      budget_dist_social_drop: newForm.budget_dist_social_drop,
    }).select().single();
    if (error) { toast.error('Erreur lors de la création'); }
    else {
      toast.success('Produit créé !');
      setProducts(prev => [...prev, data as Product]);
      setNewForm({ ...EMPTY_FORM });
      setExpandedId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (p: Product) => {
    await supabase.from('products').delete().eq('id', p.id);
    setProducts(prev => prev.filter(pr => pr.id !== p.id));
    setExpandedId(null);
    toast.success('Produit supprimé');
  };

  const handleSubmit = async () => {
    if (roundProducts.length === 0) { toast.error('Crée au moins un produit avant de soumettre'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('decisions').upsert(
      {
        team_id: team.id, session_id: session.id, round_number: currentRound,
        brand_focus: currentDecision?.brand_focus ?? 'balanced',
        total_spent: totalAllocated,
        submitted_at: new Date().toISOString(),
        budget_fournisseur: 0, budget_collection: 0, budget_prix: 0, budget_distribution: 0, budget_communication: 0,
      },
      { onConflict: 'team_id,round_number' }
    );
    if (error) toast.error('Erreur lors de la soumission');
    else toast.success('Décisions soumises !');
    setSubmitting(false);
  };

  const handleUnsubmit = async () => {
    await supabase.from('decisions').update({ submitted_at: null })
      .eq('team_id', team.id).eq('round_number', currentRound);
    toast.success('Soumission annulée — tu peux modifier tes décisions');
  };

  const pct = isPractice ? 0 : Math.min(100, (totalAllocated / totalBudget) * 100);

  return (
    <div style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <div style={{ padding: '24px 0 16px' }}>
          <button onClick={() => router.push('/brand')} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', padding: 0, marginBottom: 10 }}>
            ← Retour marque
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 'var(--t-3)', letterSpacing: '.04em', textTransform: 'uppercase', margin: 0 }}>Tes Produits</h1>
            <span className="u-label">{isPractice ? 'PRATIQUE' : `TOUR ${currentRound} / 5`}</span>
          </div>
        </div>

        {/* Budget global */}
        {!isPractice && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="u-label">BUDGET TOTAL ALLOUÉ</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fmt(totalAllocated)} / {fmt(totalBudget)}</span>
            </div>
            <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
              <span>{fmt(totalBudget - totalAllocated)} disponible</span>
              <span style={{ color: pct >= 100 ? 'var(--scarlet)' : 'inherit' }}>{Math.round(pct)}%</span>
            </div>
          </div>
        )}

        {isSubmitted && (
          <div className="submitlock" style={{ marginBottom: 16 }}>
            <span>✓</span><span>Décisions soumises · en attente des résultats</span>
          </div>
        )}

        {/* Liste produits */}
        <div style={{ marginBottom: 12 }}>
          {roundProducts.length === 0 && (
            <div style={{ border: '1px dashed var(--line)', padding: '28px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
              {currentRound === 1 || isPractice ? 'Crée ton premier produit pour ce tour.' : 'Tu peux créer jusqu\'à 3 produits.'}
            </div>
          )}
          {roundProducts.map(p => {
            const isExpanded = expandedId === p.id;
            const catIcon = CATEGORIES.find(c => c.key === p.category)?.icon ?? '📦';
            const pSpent = (p.budget_supplier ?? 0) + (p.budget_collection ?? 0) +
              (p.budget_comm_tiktok ?? 0) + (p.budget_comm_press ?? 0) + (p.budget_comm_event ?? 0) + (p.budget_comm_influencer ?? 0) +
              (p.budget_dist_ecommerce ?? 0) + (p.budget_dist_popup ?? 0) + (p.budget_dist_multibrand ?? 0) + (p.budget_dist_wholesale ?? 0) + (p.budget_dist_social_drop ?? 0);
            return (
              <div key={p.id} style={{ border: '1px solid var(--line)', marginBottom: 8 }}>
                <button type="button" onClick={() => !isSubmitted && setExpandedId(isExpanded ? null : p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', background: 'none', border: 0, cursor: isSubmitted ? 'default' : 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>{catIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name || '(sans nom)'}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {SUPPLIERS.find(s => s.key === p.supplier)?.label} · {STYLES.find(s => s.key === p.style)?.label} · {p.price_tier}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600 }}>{fmt(pSpent)}</div>
                    {!isSubmitted && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{isExpanded ? '▲' : '▼ Modifier'}</div>}
                  </div>
                </button>
                {!isPractice && (
                  <div style={{ height: 2, background: 'var(--line)', margin: '0 16px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (pSpent / totalBudget) * 100)}%`, background: 'var(--ink)' }} />
                  </div>
                )}
                {isExpanded && !isSubmitted && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <ProductEditor
                      form={getEditForm(p)}
                      setForm={f => setEditForms(prev => ({ ...prev, [p.id]: f }))}
                      onSave={() => handleSaveExisting(p)}
                      onDelete={() => handleDelete(p)}
                      saving={saving} isNew={false}
                      availableBudget={availableFor(p.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nouveau produit */}
        {!isSubmitted && roundProducts.length < maxProducts && (
          <div style={{ marginBottom: 20 }}>
            {expandedId === 'new' ? (
              <ProductEditor form={newForm} setForm={setNewForm}
                onSave={handleCreate} saving={saving} isNew
                availableBudget={availableFor('new')} />
            ) : (
              <button type="button" onClick={() => setExpandedId('new')} style={{
                width: '100%', border: '1px dashed var(--line)', background: 'none',
                padding: '16px', fontSize: 13, color: '#121212',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 20 }}>+</span> Nouveau produit
                {maxProducts > 1 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>({roundProducts.length}/{maxProducts})</span>}
              </button>
            )}
          </div>
        )}

        {/* Warnings */}
        {!isSubmitted && !isPractice && totalBudget - totalAllocated > 20_000 && roundProducts.length > 0 && (
          <div style={{ background: '#F0F4FF', border: '1px solid #2B4A8B', padding: '10px 14px', fontSize: 12, marginBottom: 10, color: '#2B4A8B' }}>
            💡 {fmt(totalBudget - totalAllocated)} non alloué — investis-le dans tes produits pour de meilleurs résultats.
          </div>
        )}
      </div>

      {/* CTA fixe */}
      <div className="fixed-cta" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid var(--line)', zIndex: 40 }}>
        {!isPractice && (
          <div style={{ height: 3, background: 'var(--line)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 20px', alignItems: 'center' }}>
          {!isPractice && (
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 'auto' }}>
              {fmt(totalAllocated)} alloué · {fmt(totalBudget - totalAllocated)} restant
            </span>
          )}
          {canUnsubmit && (
            <button onClick={handleUnsubmit} style={{ border: '1px solid var(--line)', background: '#fff', padding: '10px 16px', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Modifier
            </button>
          )}
          {!isSubmitted && (
            <button className="btn" onClick={handleSubmit} disabled={submitting || roundProducts.length === 0}
              style={{ opacity: submitting || roundProducts.length === 0 ? 0.5 : 1 }}>
              {submitting ? 'Soumission…' : isPractice ? 'Valider (pratique)' : 'Soumettre →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProduitPage() {
  return <Suspense><ProduitInner /></Suspense>;
}

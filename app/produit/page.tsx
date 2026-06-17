'use client';

import { useState, useCallback, Suspense } from 'react';
import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';

const CATEGORIES = [
  { key: 'haut',       label: 'Haut',       icon: '👕' },
  { key: 'bas',        label: 'Bas',         icon: '👖' },
  { key: 'veste',      label: 'Veste',       icon: '🧥' },
  { key: 'robe',       label: 'Robe',        icon: '👗' },
  { key: 'chaussure',  label: 'Chaussure',   icon: '👟' },
  { key: 'accessoire', label: 'Accessoire',  icon: '💍' },
];

const STYLES = [
  { key: 'casual_luxe',  label: 'Casual Luxe',  desc: 'Accessible et raffiné' },
  { key: 'streetwear',   label: 'Streetwear',    desc: 'Culture urbaine, drop culture' },
  { key: 'techwear',     label: 'Techwear',      desc: 'Fonctionnel, futuriste' },
  { key: 'avant_garde',  label: 'Avant-garde',   desc: 'Art wearable, concept fort' },
  { key: 'minimaliste',  label: 'Minimaliste',   desc: 'Épuré, intemporel' },
];

const SUPPLIERS = [
  { key: 'atelier_abidjan',    label: 'Atelier Abidjan',    desc: 'Production locale, savoir-faire artisanal', tags: ['Durable+', 'Image+'] },
  { key: 'usine_europe',       label: 'Usine Europe',        desc: 'Qualité certifiée, délais maîtrisés',       tags: ['Qualité', 'Standard'] },
  { key: 'fast_fashion_asie',  label: 'Fast Fashion Asie',   desc: 'Volume maximal, coût minimal',              tags: ['Volume+', 'Durable−'] },
  { key: 'capsule_artisanale', label: 'Capsule Artisanale',  desc: 'Pièces uniques, positionnement premium',    tags: ['Image++', 'Ventes−'] },
  { key: 'collab_createur',    label: 'Collab Créateur',     desc: 'Co-création avec un designer émergent',     tags: ['Buzz+', 'Image+'] },
];

const PRICES = [
  { key: 'accessible', label: 'Accessible', desc: '< 50€ · Volume élevé, marges réduites',   tags: ['Ventes+', 'Image−'] },
  { key: 'milieu',     label: 'Milieu',     desc: '50–120€ · Équilibre volume / marge',       tags: ['Équilibré'] },
  { key: 'premium',    label: 'Premium',    desc: '120–300€ · Marges fortes, volume limité',  tags: ['Image+', 'Ventes−'] },
  { key: 'luxe',       label: 'Luxe',       desc: '> 300€ · Exclusivité maximale',            tags: ['Image++', 'Niche'] },
];

const DISTRIBUTIONS = [
  { key: 'ecommerce',   label: 'E-commerce',   desc: 'Boutique en ligne DTC',               tags: ['Volume', 'Data'] },
  { key: 'popup',       label: 'Pop-up store',  desc: 'Activation éphémère, expérience',     tags: ['Buzz', 'Fidélité+'] },
  { key: 'multibrand',  label: 'Multi-marques', desc: 'Présence dans les concept-stores',    tags: ['Image+', 'Marges−'] },
  { key: 'wholesale',   label: 'Wholesale',     desc: 'Distribution en gros, volume',        tags: ['Volume+', 'Image−'] },
  { key: 'social_drop', label: 'Social Drop',   desc: 'Vente exclusive via réseaux sociaux', tags: ['Hype', 'Youth'] },
];

const COMMS = [
  { key: 'tiktok_insta', label: 'TikTok / Insta', desc: 'Contenu social, reach organique',  tags: ['Youth', 'Viral'] },
  { key: 'press_rp',     label: 'Presse & RP',    desc: 'Couverture éditoriale, légitimité', tags: ['Image+', 'Lent'] },
  { key: 'event',        label: 'Événement',       desc: 'Activation physique, expérience',  tags: ['Fidélité+', 'Coût'] },
  { key: 'influencer',   label: 'Influenceurs',    desc: 'Ambassadeurs, conversion rapide',  tags: ['Ventes+', 'Court terme'] },
];

type ProductForm = {
  name: string;
  category: string;
  style: string;
  supplier: string;
  price_tier: string;
  distribution: string;
  comm_channel: string;
  budget: number;
};

const DEFAULT_FORM: ProductForm = {
  name: '',
  category: 'haut',
  style: 'casual_luxe',
  supplier: 'usine_europe',
  price_tier: 'milieu',
  distribution: 'ecommerce',
  comm_channel: 'tiktok_insta',
  budget: 0,
};

type Tab = 'identite' | 'fournisseur' | 'prix' | 'distribution' | 'communication' | 'budget';

const TABS: { key: Tab; label: string }[] = [
  { key: 'identite',      label: 'Identité' },
  { key: 'fournisseur',   label: 'Fournisseur' },
  { key: 'prix',          label: 'Prix' },
  { key: 'distribution',  label: 'Distribution' },
  { key: 'communication', label: 'Comm.' },
  { key: 'budget',        label: 'Budget' },
];

function fmt(n: number) {
  return n >= 1000
    ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}k€`
    : `${n}€`;
}

function RadioOption({ label, desc, tags, selected, onClick }: {
  label: string; desc: string; tags?: string[]; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
        border: `1px solid ${selected ? '#121212' : 'var(--line)'}`,
        background: selected ? 'rgba(18,18,18,.04)' : '#fff',
        cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 8,
        transition: 'border-color .15s, background .15s',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? '#121212' : '#ccc'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#121212', display: 'block' }} />}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
        {tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
                background: 'var(--fill)', padding: '2px 7px', color: 'var(--muted)',
              }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function ProductEditor({
  form, setForm, onSave, onDelete, saving, isNew, totalBudget, otherBudget
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
  isNew: boolean;
  totalBudget: number;
  otherBudget: number;
}) {
  const [tab, setTab] = useState<Tab>('identite');
  const maxBudget = totalBudget - otherBudget;
  const remaining = maxBudget - form.budget;

  return (
    <div style={{ border: '1px solid #121212', marginTop: 8, background: '#fafafa' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? '#121212' : 'none',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              border: 0, borderRight: '1px solid var(--line)',
              padding: '10px 14px', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 20px 16px' }}>
        {/* Identité */}
        {tab === 'identite' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 8, color: 'var(--muted)' }}>
                Nom du produit
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: DROP 01, Air Djassa…"
                maxLength={40}
                style={{
                  width: '100%', border: '1px solid var(--line)', padding: '11px 14px',
                  fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--muted)' }}>
                Catégorie
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.key })}
                    style={{
                      border: `1px solid ${form.category === c.key ? '#121212' : 'var(--line)'}`,
                      background: form.category === c.key ? '#121212' : '#fff',
                      color: form.category === c.key ? '#fff' : '#121212',
                      padding: '10px 6px', fontSize: 11, cursor: 'pointer', letterSpacing: '.06em',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--muted)' }}>
                Style
              </label>
              {STYLES.map(s => (
                <RadioOption
                  key={s.key}
                  label={s.label}
                  desc={s.desc}
                  selected={form.style === s.key}
                  onClick={() => setForm({ ...form, style: s.key })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fournisseur */}
        {tab === 'fournisseur' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              D'où vient la matière première et comment le produit est fabriqué.
            </p>
            {SUPPLIERS.map(s => (
              <RadioOption
                key={s.key} label={s.label} desc={s.desc} tags={s.tags}
                selected={form.supplier === s.key}
                onClick={() => setForm({ ...form, supplier: s.key })}
              />
            ))}
          </div>
        )}

        {/* Prix */}
        {tab === 'prix' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Positionnement tarifaire — impacte les ventes et l'image de marque.
            </p>
            {PRICES.map(p => (
              <RadioOption
                key={p.key} label={p.label} desc={p.desc} tags={p.tags}
                selected={form.price_tier === p.key}
                onClick={() => setForm({ ...form, price_tier: p.key })}
              />
            ))}
          </div>
        )}

        {/* Distribution */}
        {tab === 'distribution' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Par quels canaux ce produit sera vendu.
            </p>
            {DISTRIBUTIONS.map(d => (
              <RadioOption
                key={d.key} label={d.label} desc={d.desc} tags={d.tags}
                selected={form.distribution === d.key}
                onClick={() => setForm({ ...form, distribution: d.key })}
              />
            ))}
          </div>
        )}

        {/* Communication */}
        {tab === 'communication' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Comment tu vas communiquer et toucher ton audience pour ce produit.
            </p>
            {COMMS.map(c => (
              <RadioOption
                key={c.key} label={c.label} desc={c.desc} tags={c.tags}
                selected={form.comm_channel === c.key}
                onClick={() => setForm({ ...form, comm_channel: c.key })}
              />
            ))}
          </div>
        )}

        {/* Budget */}
        {tab === 'budget' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
              Budget à allouer à ce produit (fabrication, comm, distribution…).
            </p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Budget produit</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, fontWeight: 600 }}>{fmt(form.budget)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(form.budget, maxBudget)}
                step={5000}
                value={form.budget}
                onChange={e => {
                  const v = Math.min(Number(e.target.value), maxBudget);
                  setForm({ ...form, budget: v });
                }}
                style={{ width: '100%', accentColor: '#121212' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                <span>0€</span>
                <span>{fmt(Math.max(form.budget, maxBudget))}</span>
              </div>
            </div>
            <div style={{ background: 'var(--fill)', padding: '12px 16px', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Budget restant (autres produits)</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: remaining < 0 ? '#E63329' : 'var(--ink)' }}>{fmt(remaining)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Budget total disponible</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{fmt(totalBudget)}</span>
              </div>
            </div>
            {/* Raccourcis rapides */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[0.25, 0.5, 0.75, 1].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, budget: Math.round(Math.min(totalBudget * p, maxBudget) / 5000) * 5000 })}
                  style={{
                    border: '1px solid var(--line)', background: '#fff', padding: '6px 12px',
                    fontSize: 11, letterSpacing: '.1em', cursor: 'pointer',
                  }}
                >
                  {Math.round(p * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between' }}>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{ border: '1px solid rgba(230,51,41,.4)', color: '#E63329', background: 'none', padding: '10px 16px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            style={{
              background: saving || !form.name.trim() ? 'var(--fill)' : '#121212',
              color: saving || !form.name.trim() ? 'var(--muted)' : '#fff',
              border: 0, padding: '10px 24px', fontSize: 11, letterSpacing: '.12em',
              textTransform: 'uppercase', cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
              marginLeft: 'auto',
            }}
          >
            {saving ? 'Sauvegarde…' : isNew ? 'Créer le produit' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProduitInner() {
  const { session, team, restoring, decisions, products, setProducts, currentRound, roundTimeLeft } = useGame();
  const router = useRouter();

  const isPractice = session?.status === 'practice';
  const totalBudget = isPractice ? 999_999 : (team?.current_budget ?? 100_000);
  const maxProducts = currentRound === 1 || isPractice ? 1 : 3;

  // Products for this round
  const roundProducts = products.filter(p => p.round_number === currentRound);
  const totalAllocated = roundProducts.reduce((sum, p) => sum + p.budget, 0);

  // Editing state
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [editForms, setEditForms] = useState<Record<string, ProductForm>>({});
  const [newForm, setNewForm] = useState<ProductForm>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Current decision (for submitted status)
  const currentDecision = decisions.find(d => d.round_number === currentRound);
  const isSubmitted = !!currentDecision?.submitted_at;
  const canUnsubmit = isSubmitted && (roundTimeLeft ?? 0) > 0 && session?.status === 'active';

  if (restoring) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="u-label" style={{ color: 'var(--muted)' }}>Chargement…</span>
    </div>
  );

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre une session →</button></a>
      </div>
    );
  }

  const getEditForm = (p: Product): ProductForm =>
    editForms[p.id] ?? {
      name: p.name, category: p.category, style: p.style,
      supplier: p.supplier, price_tier: p.price_tier,
      distribution: p.distribution, comm_channel: p.comm_channel,
      budget: p.budget,
    };

  const otherBudget = (id: string | 'new') =>
    roundProducts.filter(p => p.id !== id).reduce((s, p) => {
      const form = editForms[p.id];
      return s + (form ? form.budget : p.budget);
    }, 0);

  const handleSaveExisting = async (p: Product) => {
    const form = getEditForm(p);
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('products').update({
      name: form.name, category: form.category, style: form.style,
      supplier: form.supplier, price_tier: form.price_tier,
      distribution: form.distribution, comm_channel: form.comm_channel,
      budget: form.budget,
    }).eq('id', p.id);
    if (error) { toast.error('Erreur lors de la sauvegarde'); }
    else {
      toast.success('Produit sauvegardé');
      setExpandedId(null);
      // Realtime will update, but optimistic update for UX
      setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, ...form } : pr));
      const { [p.id]: _, ...rest } = editForms;
      setEditForms(rest);
    }
    setSaving(false);
  };

  const handleCreateProduct = async () => {
    if (!newForm.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('products').insert({
      team_id: team.id, session_id: session.id, round_number: currentRound,
      name: newForm.name, category: newForm.category, style: newForm.style,
      supplier: newForm.supplier, price_tier: newForm.price_tier,
      distribution: newForm.distribution, comm_channel: newForm.comm_channel,
      budget: newForm.budget,
    }).select().single();
    if (error) { toast.error('Erreur lors de la création'); }
    else {
      toast.success('Produit créé !');
      setProducts(prev => [...prev, data as Product]);
      setNewForm({ ...DEFAULT_FORM });
      setExpandedId(null);
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (p: Product) => {
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) { toast.error('Erreur lors de la suppression'); }
    else {
      toast.success('Produit supprimé');
      setProducts(prev => prev.filter(pr => pr.id !== p.id));
      setExpandedId(null);
    }
  };

  const handleSubmit = async () => {
    if (roundProducts.length === 0) { toast.error('Crée au moins un produit avant de soumettre'); return; }
    setSubmitting(true);
    const total_spent = roundProducts.reduce((s, p) => s + p.budget, 0);
    const { error } = await supabase.from('decisions').upsert(
      {
        team_id: team.id, session_id: session.id, round_number: currentRound,
        brand_focus: currentDecision?.brand_focus ?? 'balanced',
        total_spent,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,round_number' }
    );
    if (error) { toast.error('Erreur lors de la soumission'); }
    else { toast.success('Décisions soumises !'); }
    setSubmitting(false);
  };

  const handleUnsubmit = async () => {
    const { error } = await supabase.from('decisions').update({ submitted_at: null })
      .eq('team_id', team.id).eq('round_number', currentRound);
    if (error) { toast.error('Erreur'); }
    else { toast.success('Soumission annulée — tu peux modifier tes décisions'); }
  };

  const pct = isPractice ? 0 : Math.min(100, (totalAllocated / totalBudget) * 100);

  return (
    <div style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <div style={{ padding: '28px 0 16px' }}>
          <button onClick={() => router.push('/brand')} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Retour marque
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 'var(--t-3)', letterSpacing: '.04em', textTransform: 'uppercase', margin: 0 }}>Tes Produits</h1>
            <span className="u-label">{isPractice ? 'PRATIQUE' : `TOUR ${currentRound} / 5`}</span>
          </div>
        </div>

        {/* Budget bar */}
        {!isPractice && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="u-label">BUDGET TOTAL</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                {fmt(totalAllocated)} / {fmt(totalBudget)}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${pct}%`, background: pct >= 100 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--muted)' }}>
              <span>{fmt(totalBudget - totalAllocated)} disponible</span>
              <span style={{ color: pct >= 100 ? 'var(--scarlet)' : 'var(--muted)' }}>{Math.round(pct)}% alloué</span>
            </div>
          </div>
        )}

        {/* Submitted banner */}
        {isSubmitted && (
          <div className="submitlock" style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span>Décisions soumises · en attente des résultats</span>
          </div>
        )}

        {/* Product list */}
        <div style={{ marginBottom: 16 }}>
          {roundProducts.length === 0 && (
            <div style={{ border: '1px dashed var(--line)', padding: '32px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
              Aucun produit créé pour ce tour.{currentRound === 1 || isPractice ? ' Tu peux créer 1 produit.' : ' Tu peux créer jusqu\'à 3 produits.'}
            </div>
          )}

          {roundProducts.map(p => {
            const isExpanded = expandedId === p.id;
            const catIcon = CATEGORIES.find(c => c.key === p.category)?.icon ?? '📦';
            const editForm = getEditForm(p);
            return (
              <div key={p.id} style={{ border: '1px solid var(--line)', marginBottom: 8 }}>
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitted) setExpandedId(isExpanded ? null : p.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                    width: '100%', background: 'none', border: 0,
                    cursor: isSubmitted ? 'default' : 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{catIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name || '(sans nom)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {CATEGORIES.find(c => c.key === p.category)?.label} · {STYLES.find(s => s.key === p.style)?.label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600 }}>{fmt(p.budget)}</div>
                    {!isSubmitted && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{isExpanded ? '▲ Fermer' : '▼ Modifier'}</div>}
                  </div>
                </button>

                {/* Budget mini-bar */}
                {!isPractice && (
                  <div style={{ height: 2, background: 'var(--line)', margin: '0 16px 0' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (p.budget / totalBudget) * 100)}%`, background: 'var(--ink)' }} />
                  </div>
                )}

                {/* Editor */}
                {isExpanded && !isSubmitted && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <ProductEditor
                      form={editForm}
                      setForm={f => setEditForms(prev => ({ ...prev, [p.id]: f }))}
                      onSave={() => handleSaveExisting(p)}
                      onDelete={() => handleDeleteProduct(p)}
                      saving={saving}
                      isNew={false}
                      totalBudget={totalBudget}
                      otherBudget={otherBudget(p.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New product button / form */}
        {!isSubmitted && roundProducts.length < maxProducts && (
          <div style={{ marginBottom: 24 }}>
            {expandedId === 'new' ? (
              <ProductEditor
                form={newForm}
                setForm={setNewForm}
                onSave={handleCreateProduct}
                saving={saving}
                isNew
                totalBudget={totalBudget}
                otherBudget={otherBudget('new')}
              />
            ) : (
              <button
                type="button"
                onClick={() => setExpandedId('new')}
                style={{
                  width: '100%', border: '1px dashed var(--line)', background: 'none',
                  padding: '16px', fontSize: 13, color: '#121212',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>+</span>
                Nouveau produit
                {maxProducts > 1 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>({roundProducts.length}/{maxProducts})</span>}
              </button>
            )}
          </div>
        )}

        {/* Warnings */}
        {!isSubmitted && roundProducts.some(p => !p.name) && (
          <div style={{ background: '#FFF8E7', border: '1px solid #F0C35A', padding: '10px 16px', fontSize: 12, marginBottom: 12, color: '#856A00' }}>
            ⚠ Un ou plusieurs produits n'ont pas de nom.
          </div>
        )}
        {!isSubmitted && !isPractice && totalBudget - totalAllocated > 20000 && roundProducts.length > 0 && (
          <div style={{ background: '#F0F4FF', border: '1px solid #2B4A8B', padding: '10px 16px', fontSize: 12, marginBottom: 12, color: '#2B4A8B' }}>
            💡 {fmt(totalBudget - totalAllocated)} de budget non alloué — investis-le dans tes produits pour de meilleurs résultats.
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed-cta" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid var(--line)', zIndex: 40,
      }}>
        {/* Progress bar */}
        {!isPractice && (
          <div style={{ height: 3, background: 'var(--line)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--scarlet)' : 'var(--ink)', transition: 'width .3s' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 24px', alignItems: 'center' }}>
          {!isPractice && (
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 'auto' }}>
              {fmt(totalAllocated)} alloué · {fmt(totalBudget - totalAllocated)} restant
            </span>
          )}
          {canUnsubmit && (
            <button
              onClick={handleUnsubmit}
              style={{ border: '1px solid var(--line)', background: '#fff', color: '#121212', padding: '10px 18px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Modifier
            </button>
          )}
          {!isSubmitted && (
            <button
              className="btn"
              onClick={handleSubmit}
              disabled={submitting || roundProducts.length === 0}
              style={{ opacity: submitting || roundProducts.length === 0 ? 0.5 : 1 }}
            >
              {submitting ? 'Soumission…' : isPractice ? 'Valider (pratique)' : 'Soumettre →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProduitPage() {
  return (
    <Suspense>
      <ProduitInner />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Supplier, CollectionStyle, Distribution, CommChannel, BrandFocus, DecisionForm } from '@/lib/types';

const SUPPLIERS: { value: Supplier; fr: string; en: string; tip_fr: string; tip_en: string }[] = [
  { value: 'atelier_abidjan',   fr: 'Atelier Abidjan',    en: 'Atelier Abidjan',
    tip_fr: 'Artisanal, éthique, coût élevé — booste durabilité et authenticité.',
    tip_en: 'Artisanal, ethical, higher cost — boosts sustainability and authenticity.' },
  { value: 'usine_europe',      fr: 'Usine Europe',       en: 'Factory Europe',
    tip_fr: 'Bonne qualité, coût moyen — fiabilité et image stable.',
    tip_en: 'Good quality, mid cost — stable reliability and image.' },
  { value: 'fast_fashion_asie', fr: 'Fast Fashion Asie',  en: 'Fast Fashion Asia',
    tip_fr: 'Coût minimal mais nuit à l\'image et à la durabilité.',
    tip_en: 'Minimal cost but hurts brand image and sustainability.' },
  { value: 'capsule_artisanale',fr: 'Capsule artisanale', en: 'Artisanal Capsule',
    tip_fr: 'Ultra-premium, volumes très limités — exclusivité maximale.',
    tip_en: 'Ultra-premium, very limited volume — maximum exclusivity.' },
  { value: 'collab_createur',   fr: 'Collab créateur',   en: 'Designer Collab',
    tip_fr: 'Collab designer — génère du buzz, coût élevé.',
    tip_en: 'Designer collaboration — generates buzz, high cost.' },
];

const STYLES: { value: CollectionStyle; fr: string; en: string }[] = [
  { value: 'street',      fr: 'Street',      en: 'Street' },
  { value: 'afro',        fr: 'Afro',        en: 'Afro' },
  { value: 'sport',       fr: 'Sport',       en: 'Sport' },
  { value: 'art',         fr: 'Art',         en: 'Art' },
  { value: 'minimaliste', fr: 'Minimaliste', en: 'Minimalist' },
];

const DISTS: { value: Distribution; fr: string; en: string }[] = [
  { value: 'ecommerce',  fr: 'E-commerce',    en: 'E-commerce' },
  { value: 'popup',      fr: 'Pop-up',         en: 'Pop-up' },
  { value: 'multibrand', fr: 'Multi-brand',    en: 'Multi-brand' },
  { value: 'wholesale',  fr: 'Wholesale',      en: 'Wholesale' },
  { value: 'social_drop',fr: 'Social drop',    en: 'Social drop' },
];

const CHANNELS: { value: CommChannel; fr: string; en: string }[] = [
  { value: 'tiktok_insta', fr: 'TikTok / Insta', en: 'TikTok / Insta' },
  { value: 'press_rp',     fr: 'Presse / RP',     en: 'Press / PR' },
  { value: 'event',        fr: 'Événement',        en: 'Event' },
  { value: 'influencer',   fr: 'Influenceur',      en: 'Influencer' },
];

const FOCUSES: { value: BrandFocus; fr: string; en: string; tip_fr: string; tip_en: string }[] = [
  { value: 'balanced',      fr: 'Équilibré',   en: 'Balanced',
    tip_fr: 'Stratégie équilibrée — aucun malus, aucun bonus.',
    tip_en: 'Balanced strategy — no penalty, no bonus.' },
  { value: 'price',         fr: 'Prix',        en: 'Price',
    tip_fr: 'Amplifie l\'impact prix sur les ventes (+30%).',
    tip_en: 'Amplifies price impact on sales (+30%).' },
  { value: 'product',       fr: 'Produit',     en: 'Product',
    tip_fr: 'Booste fidélité et image produit (+20%).',
    tip_en: 'Boosts loyalty and product image (+20%).' },
  { value: 'image',         fr: 'Image',       en: 'Image',
    tip_fr: 'Amplifie image de marque (+40%).',
    tip_en: 'Amplifies brand image (+40%).' },
  { value: 'sustainability', fr: 'Durabilité', en: 'Sustainability',
    tip_fr: 'Multiplie l\'impact durabilité (+50%).',
    tip_en: 'Multiplies sustainability impact (+50%).' },
];

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 py-7 border-b border-[#ebebeb]">
      <span className="label">({label})</span>
      {children}
    </div>
  );
}

function Pills<T extends string>({
  options, selected, onSelect, lang,
}: {
  options: { value: T; fr: string; en: string; tip_fr?: string; tip_en?: string }[];
  selected: T;
  onSelect: (v: T) => void;
  lang: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const label = lang === 'fr' ? o.fr : o.en;
        const tip = lang === 'fr' ? o.tip_fr : o.tip_en;
        return (
          <div key={o.value} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(o.value)}
              className={`pill ${selected === o.value ? 'active' : ''}`}
            >
              {label}
            </button>
            {tip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-[#ccc] cursor-help hover:text-[#888] transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] bg-[#121212] border-[#333] text-white/80 text-[0.7rem] rounded-none">
                  {tip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RangeField({
  value, onChange, leftLabel, rightLabel,
}: { value: number; onChange: (v: number) => void; leftLabel: string; rightLabel: string }) {
  const pct = value + '%';
  return (
    <div className="space-y-3">
      <input
        type="range"
        min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-px appearance-none cursor-pointer focus:outline-none"
        style={{
          background: `linear-gradient(to right, #121212 ${pct}, #e0e0e0 ${pct})`,
        }}
      />
      <div className="flex justify-between">
        <span className="label">{leftLabel}</span>
        <span className="label">{rightLabel}</span>
      </div>
    </div>
  );
}

export default function BrandPage() {
  const { t, lang, session, team, currentRound, decisions, submitDecision } = useGame();

  const [form, setForm] = useState<DecisionForm>({
    supplier: 'usine_europe',
    collection_style: 'minimaliste',
    collection_volume: 40,
    price: 55,
    distribution: 'ecommerce',
    comm_budget: 50,
    comm_channel: 'tiktok_insta',
    brand_focus: 'balanced',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ex = decisions.find((d) => d.round === currentRound);
    if (ex) {
      setForm({ supplier: ex.supplier, collection_style: ex.collection_style, collection_volume: ex.collection_volume, price: ex.price, distribution: ex.distribution, comm_budget: ex.comm_budget, comm_channel: ex.comm_channel, brand_focus: ex.brand_focus });
      setSubmitted(true);
    } else {
      setSubmitted(false);
    }
  }, [decisions, currentRound]);

  if (!session || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label">JOIN A SESSION FIRST</span>
      </div>
    );
  }

  const set = <K extends keyof DecisionForm>(k: K, v: DecisionForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (submitted) setSubmitted(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitDecision({ round: currentRound, ...form });
      setSubmitted(true);
      toast.success(lang === 'fr' ? 'Choix enregistrés' : 'Choices saved');
    } catch {
      toast.error('Error');
    } finally {
      setLoading(false);
    }
  };

  const roundLabel = currentRound === 0
    ? (lang === 'fr' ? 'TOUR DE PRATIQUE' : 'PRACTICE ROUND')
    : `${lang === 'fr' ? 'TOUR' : 'ROUND'} ${currentRound} / 5`;

  return (
    <TooltipProvider delayDuration={180}>
      <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10 fade-up">
          <div className="space-y-2">
            <span className="label">({roundLabel})</span>
            <h1 className="page-title">{lang === 'fr' ? 'Ma Marque' : 'My Brand'}</h1>
          </div>
          <div
            className="w-10 h-10 flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
            style={{ backgroundColor: team.brand_color }}
          >
            {team.brand_name.charAt(0)}
          </div>
        </div>

        {/* Decisions */}
        <div className="fade-up-d1">
          <Block label={lang === 'fr' ? 'FOURNISSEUR' : 'SUPPLIER'}>
            <Pills options={SUPPLIERS} selected={form.supplier} onSelect={(v) => set('supplier', v)} lang={lang} />
          </Block>

          <Block label={lang === 'fr' ? 'STYLE COLLECTION' : 'COLLECTION STYLE'}>
            <Pills options={STYLES} selected={form.collection_style} onSelect={(v) => set('collection_style', v)} lang={lang} />
          </Block>

          <Block label={lang === 'fr' ? 'VOLUME' : 'VOLUME'}>
            <RangeField value={form.collection_volume} onChange={(v) => set('collection_volume', v)}
              leftLabel={lang === 'fr' ? 'CAPSULE LIMITÉE' : 'LIMITED CAPSULE'}
              rightLabel={lang === 'fr' ? 'GRANDE COLLECTION' : 'LARGE COLLECTION'} />
          </Block>

          <Block label={lang === 'fr' ? 'POSITIONNEMENT PRIX' : 'PRICE POSITIONING'}>
            <RangeField value={form.price} onChange={(v) => set('price', v)}
              leftLabel={lang === 'fr' ? 'ENTRÉE DE GAMME' : 'ENTRY-LEVEL'}
              rightLabel={lang === 'fr' ? 'LUXE ACCESSIBLE' : 'ACCESSIBLE LUXURY'} />
          </Block>

          <Block label="DISTRIBUTION">
            <Pills options={DISTS} selected={form.distribution} onSelect={(v) => set('distribution', v)} lang={lang} />
          </Block>

          <Block label={lang === 'fr' ? 'BUDGET COMM' : 'COMM BUDGET'}>
            <RangeField value={form.comm_budget} onChange={(v) => set('comm_budget', v)}
              leftLabel={lang === 'fr' ? 'MODÉRÉ' : 'MODERATE'}
              rightLabel={lang === 'fr' ? 'AGRESSIF' : 'AGGRESSIVE'} />
          </Block>

          <Block label={lang === 'fr' ? 'CANAL COMM' : 'COMM CHANNEL'}>
            <Pills options={CHANNELS} selected={form.comm_channel} onSelect={(v) => set('comm_channel', v)} lang={lang} />
          </Block>

          <Block label={lang === 'fr' ? 'FOCUS DE MARQUE' : 'BRAND FOCUS'}>
            <Pills options={FOCUSES} selected={form.brand_focus} onSelect={(v) => set('brand_focus', v)} lang={lang} />
          </Block>
        </div>

        {/* Submit */}
        <div className="pt-10 fade-up-d2">
          {submitted ? (
            <div className="flex items-center justify-center gap-3 py-4 border border-[#ebebeb]">
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="label text-green-700">
                {lang === 'fr' ? 'CHOIX ENREGISTRÉS' : 'CHOICES SAVED'}
              </span>
              <button
                onClick={() => setSubmitted(false)}
                className="ml-4 label text-[#bbb] hover:text-[#121212] transition-colors"
              >
                {lang === 'fr' ? 'MODIFIER' : 'EDIT'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary w-full py-4"
            >
              {loading ? '...' : (lang === 'fr' ? 'SOUMETTRE MES CHOIX' : 'SUBMIT MY CHOICES')}
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

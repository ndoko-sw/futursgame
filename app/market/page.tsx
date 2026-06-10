'use client';

import { useGame } from '@/lib/game-context';
import { AlertCircle, TrendingUp, Eye } from 'lucide-react';

const INSIGHTS = {
  fr: [
    { title: 'Tendance minimaliste en hausse',
      body: 'Les consommateurs privilégient les pièces intemporelles et versatiles face à la saturation du marché. Un ADN lisible surperforme.' },
    { title: 'Conscience éthique croissante',
      body: 'La traçabilité est devenue un critère d\'achat majeur. 62% des 18–30 ans vérifient l\'origine avant d\'acheter.' },
    { title: 'Social drops et rareté',
      body: 'Les marques créant de l\'urgence et de la rareté réalisent jusqu\'à 3× plus de conversions sur les lancements.' },
  ],
  en: [
    { title: 'Minimalist trend rising',
      body: 'Consumers prefer timeless pieces amid market saturation. A clear DNA outperforms.' },
    { title: 'Growing ethical awareness',
      body: 'Traceability became a key purchase criterion. 62% of 18–30s check origin before buying.' },
    { title: 'Social drops and scarcity',
      body: 'Brands creating urgency and scarcity see up to 3× more conversions on launch.' },
  ],
};

export default function MarketPage() {
  const { lang, session, marketEvent, currentRound } = useGame();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label">JOIN A SESSION FIRST</span>
      </div>
    );
  }

  const roundLabel = currentRound === 0
    ? (lang === 'fr' ? 'PRATIQUE' : 'PRACTICE')
    : `${lang === 'fr' ? 'TOUR' : 'ROUND'} ${currentRound}`;

  const insights = INSIGHTS[lang];

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 space-y-14">

      {/* Header */}
      <div className="space-y-2 fade-up">
        <span className="label">({roundLabel})</span>
        <h1 className="page-title">{lang === 'fr' ? 'Perspectives Marché' : 'Market Outlook'}</h1>
      </div>

      {/* Round event */}
      {marketEvent && (
        <div className="border-l-2 border-[#E63329] pl-6 space-y-3 fade-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#E63329]" />
            <span className="label" style={{ color: '#E63329' }}>
              ({lang === 'fr' ? 'ÉVÉNEMENT DU TOUR' : 'ROUND EVENT'})
            </span>
          </div>
          <h2 className="text-[1.367rem] font-light text-[#121212]">
            {lang === 'fr' ? marketEvent.title_fr : marketEvent.title_en}
          </h2>
          <p className="text-[0.875rem] text-[#888] leading-relaxed">
            {lang === 'fr' ? marketEvent.description_fr : marketEvent.description_en}
          </p>
        </div>
      )}

      <div className="rule" />

      {/* Insights */}
      <div className="fade-up-d1">
        <span className="label block mb-8">({lang === 'fr' ? 'INSIGHTS MARCHÉ' : 'MARKET INSIGHTS'})</span>
        {insights.map((item, i) => (
          <div key={i} className="flex gap-6 py-6 border-b border-[#ebebeb]">
            <div className="flex-shrink-0 mt-0.5">
              {i === 0 ? <TrendingUp className="w-3.5 h-3.5 text-[#ccc]" />
                       : <Eye className="w-3.5 h-3.5 text-[#ccc]" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-[0.875rem] font-medium text-[#121212] tracking-wide">{item.title}</h3>
              <p className="text-[0.875rem] text-[#888] leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Segments */}
      <div className="space-y-5 fade-up-d2">
        <span className="label">({lang === 'fr' ? 'SEGMENTS EN CROISSANCE' : 'GROWING SEGMENTS'})</span>
        <div className="grid grid-cols-3 gap-px bg-[#ebebeb]">
          {[
            { label: lang === 'fr' ? 'Artisanal' : 'Artisan',        pct: '+18%' },
            { label: lang === 'fr' ? 'Éco-responsable' : 'Eco',       pct: '+24%' },
            { label: lang === 'fr' ? 'Capsule' : 'Capsule',            pct: '+31%' },
          ].map((s) => (
            <div key={s.label} className="bg-white p-6 text-center space-y-1">
              <span className="text-[2.136rem] font-light text-[#121212]">{s.pct}</span>
              <p className="label block">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

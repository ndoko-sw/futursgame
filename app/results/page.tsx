'use client';

import { useGame } from '@/lib/game-context';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ResultsPage() {
  const { lang, session, team, results, currentRound } = useGame();

  if (!session || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label">JOIN A SESSION FIRST</span>
      </div>
    );
  }

  const result = results.find((r) => r.round === currentRound)
    ?? results.sort((a, b) => b.round - a.round)[0];
  const prev = result ? results.find((r) => r.round === result.round - 1) : null;

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label">{lang === 'fr' ? 'RÉSULTATS À VENIR' : 'RESULTS COMING SOON'}</span>
      </div>
    );
  }

  const delta = (k: 'sales' | 'image_score' | 'sustainability_score' | 'loyalty_score') => {
    if (!prev) return null;
    return result[k] - prev[k];
  };

  const metrics = [
    { key: 'sales' as const,                label: lang === 'fr' ? 'VENTES' : 'SALES',           w: '30%', value: result.sales },
    { key: 'image_score' as const,          label: 'IMAGE',                                        w: '30%', value: result.image_score },
    { key: 'sustainability_score' as const, label: lang === 'fr' ? 'DURABILITÉ' : 'SUSTAINABILITY',w: '20%', value: result.sustainability_score },
    { key: 'loyalty_score' as const,        label: lang === 'fr' ? 'FIDÉLITÉ' : 'LOYALTY',         w: '20%', value: result.loyalty_score },
  ];

  const radarData = metrics.map((m) => ({ subject: m.label, value: m.value, fullMark: 150 }));
  const barData   = metrics.map((m) => ({
    name: m.label,
    value: Math.round(m.value * parseFloat(m.w) / 100),
  }));

  const roundLabel = result.round === 0
    ? (lang === 'fr' ? 'PRATIQUE' : 'PRACTICE')
    : `${lang === 'fr' ? 'TOUR' : 'ROUND'} ${result.round}`;

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 space-y-14">

      {/* Header */}
      <div className="flex items-end justify-between fade-up">
        <div className="space-y-2">
          <span className="label">({roundLabel})</span>
          <h1 className="page-title">{lang === 'fr' ? 'Résultats' : 'Results'}</h1>
        </div>
        <div className="text-right">
          <span className="label block mb-1">({lang === 'fr' ? 'BRAND SCORE' : 'BRAND SCORE'})</span>
          <span className="text-[3.337rem] font-light leading-none text-[#121212]">{result.brand_score}</span>
        </div>
      </div>

      <div className="rule" />

      {/* Metric grid — flush tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#ebebeb] fade-up-d1">
        {metrics.map((m) => {
          const d = delta(m.key);
          return (
            <div key={m.key} className="bg-white p-5 space-y-2">
              <span className="label">{m.label} <span className="opacity-40">{m.w}</span></span>
              <div className="flex items-baseline gap-2">
                <span className="text-[2.136rem] font-light leading-none text-[#121212]">{m.value}</span>
                {d !== null && (
                  <span className={`text-[0.7rem] flex items-center gap-0.5 ${d >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {d >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {d > 0 ? '+' : ''}{d}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-10 fade-up-d2">

        {/* Radar */}
        <div className="space-y-4">
          <span className="label">({lang === 'fr' ? 'PROFIL' : 'PROFILE'})</span>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="#ebebeb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 9, fill: '#888', fontWeight: 400, letterSpacing: '0.08em' }}
                stroke="none"
              />
              <Radar dataKey="value" stroke="#121212" fill="#121212" fillOpacity={0.06} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar */}
        <div className="space-y-4">
          <span className="label">({lang === 'fr' ? 'CONTRIBUTION SCORE' : 'SCORE CONTRIBUTION'})</span>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical" barSize={10}>
              <XAxis type="number" tick={{ fontSize: 9, fill: '#aaa' }} stroke="#ebebeb" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#888' }} stroke="none" width={95} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 0, fontSize: 11, color: '#121212' }}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar dataKey="value" fill="#121212" radius={[0, 1, 1, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rule" />

      {/* Market share */}
      <div className="space-y-3 fade-up-d3">
        <div className="flex items-center justify-between">
          <span className="label">({lang === 'fr' ? 'PART DE MARCHÉ' : 'MARKET SHARE'})</span>
          <span className="text-[1.709rem] font-light text-[#121212]">{result.market_share}%</span>
        </div>
        <div className="h-px bg-[#ebebeb] overflow-hidden">
          <div
            className="h-full bg-[#121212] transition-all duration-700"
            style={{ width: `${Math.min(result.market_share, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

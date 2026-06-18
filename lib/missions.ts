// Secret per-round missions. Each team gets one random mission at round start.
// Evaluated at reveal against the team's computed result. Reward added to cumulative score.

import { Product } from './types';

export type MissionResult = {
  score_global: number;
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
  productScores?: Record<string, { score_ventes: number; score_image: number; score_durabilite: number; score_fidelite: number; ca: number }>;
};

export type Mission = {
  key: string;
  title: string;
  description: string; // player-facing hint, no exact threshold
  reward: number;
  check: (
    result: MissionResult,
    products: Product[],
    decision: any,
    prevResult: MissionResult | null,
  ) => boolean;
};

// Styles considered "rare" if used by few products overall is hard to know per-team;
// we approximate "niche" via techwear/avant_garde which have lower base demand.
const NICHE_STYLES = ['techwear', 'avant_garde'];

export const MISSIONS: Mission[] = [
  {
    key: 'coup_de_maitre',
    title: '🎯 Coup de maître',
    description: 'Réalise un tour véritablement exceptionnel : vise un score global très élevé.',
    reward: 10,
    check: (r) => (r.score_global ?? 0) >= 75,
  },
  {
    key: 'ethique_avant_tout',
    title: '🎯 Éthique avant tout',
    description: 'Fais de la durabilité ton arme : pousse ton impact éthique au sommet.',
    reward: 8,
    check: (r) => (r.score_durabilite ?? 0) >= 70,
  },
  {
    key: 'carton_commercial',
    title: '🎯 Carton commercial',
    description: 'Fais exploser tes ventes ce tour-ci, peu importe le reste.',
    reward: 8,
    check: (r) => (r.score_ventes ?? 0) >= 70,
  },
  {
    key: 'comeback',
    title: '🎯 Comeback',
    description: 'Rebondis fort : progresse nettement par rapport à ton tour précédent.',
    reward: 9,
    check: (r, _p, _d, prev) => prev != null && (r.score_global ?? 0) - (prev.score_global ?? 0) >= 15,
  },
  {
    key: 'coherence_parfaite',
    title: '🎯 Cohérence parfaite',
    description: 'Construis une marque solide : une image forte ET une fidélité forte.',
    reward: 9,
    check: (r) => (r.score_image ?? 0) >= 65 && (r.score_fidelite ?? 0) >= 65,
  },
  {
    key: 'niche_maline',
    title: '🎯 Niche maline',
    description: 'Mise sur un style pointu et fais-en un succès commercial.',
    reward: 10,
    check: (r, products) => {
      const ps = r.productScores ?? {};
      return products.some(p => NICHE_STYLES.includes(p.style) && (ps[p.id]?.ca ?? 0) >= 250_000);
    },
  },
  {
    key: 'icone_image',
    title: '🎯 Icône de désirabilité',
    description: 'Deviens la marque la plus désirable : pousse ton image au plus haut.',
    reward: 8,
    check: (r) => (r.score_image ?? 0) >= 75,
  },
  {
    key: 'communaute_fidele',
    title: '🎯 Communauté fidèle',
    description: 'Fédère une base de fans qui revient : vise une fidélité élevée.',
    reward: 8,
    check: (r) => (r.score_fidelite ?? 0) >= 72,
  },
];

export function pickRandomMission(): Mission {
  return MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
}

export function getMissionByKey(key: string): Mission | undefined {
  return MISSIONS.find(m => m.key === key);
}

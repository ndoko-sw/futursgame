import { Lang } from './types';

const translations: Record<string, Record<Lang, string>> = {
  // App
  app_title: { fr: 'Futurs Drops', en: 'Futurs Drops' },
  app_tagline: { fr: 'Wear meaning, not labels.', en: 'Wear meaning, not labels.' },

  // Nav
  nav_home: { fr: 'Accueil', en: 'Home' },
  nav_brand: { fr: 'Ma Marque', en: 'My Brand' },
  nav_results: { fr: 'Résultats', en: 'Results' },
  nav_market: { fr: 'Marché', en: 'Market' },
  nav_leaderboard: { fr: 'Classement', en: 'Leaderboard' },
  nav_admin: { fr: 'Admin', en: 'Admin' },

  // Lobby
  lobby_title: { fr: 'Rejoindre une session', en: 'Join a session' },
  lobby_code_label: { fr: 'Code de session', en: 'Session code' },
  lobby_code_placeholder: { fr: 'Ex: ABC123', en: 'E.g. ABC123' },
  lobby_join: { fr: 'Rejoindre', en: 'Join' },
  lobby_or_create: { fr: 'ou créer une nouvelle session', en: 'or create a new session' },
  lobby_create: { fr: 'Créer une session', en: 'Create session' },
  lobby_create_title: { fr: 'Créer votre marque', en: 'Create your brand' },
  lobby_brand_name: { fr: 'Nom de marque', en: 'Brand name' },
  lobby_brand_name_placeholder: { fr: 'Ex: Mosaïque', en: 'E.g. Mosaic' },
  lobby_brand_color: { fr: 'Couleur de marque', en: 'Brand color' },
  lobby_brand_statement: { fr: 'Déclaration de marque', en: 'Brand statement' },
  lobby_brand_statement_placeholder: { fr: 'Une ligne qui définit votre ADN', en: 'One line that defines your DNA' },
  lobby_start: { fr: 'Lancer la partie', en: 'Start game' },
  lobby_waiting: { fr: 'En attente de joueurs...', en: 'Waiting for players...' },
  lobby_teams: { fr: 'Équipes', en: 'Teams' },

  // Brand decisions
  brand_title: { fr: 'Ma Marque', en: 'My Brand' },
  brand_round: { fr: 'Tour', en: 'Round' },
  brand_practice: { fr: 'Tour de pratique', en: 'Practice round' },
  brand_submit: { fr: 'Soumettre mes choix', en: 'Submit my choices' },
  brand_submitted: { fr: 'Choix soumis', en: 'Choices submitted' },
  brand_time_left: { fr: 'Temps restant', en: 'Time left' },

  // Decision labels
  decision_supplier: { fr: 'Fournisseur', en: 'Supplier' },
  decision_collection: { fr: 'Collection', en: 'Collection' },
  decision_price: { fr: 'Prix', en: 'Price' },
  decision_distribution: { fr: 'Distribution', en: 'Distribution' },
  decision_communication: { fr: 'Communication', en: 'Communication' },
  decision_brand_focus: { fr: 'Focus de marque', en: 'Brand Focus' },

  // Supplier options
  supplier_atelier_abidjan: { fr: 'Atelier Abidjan', en: 'Atelier Abidjan' },
  supplier_usine_europe: { fr: 'Usine Europe', en: 'Factory Europe' },
  supplier_fast_fashion_asie: { fr: 'Fast Fashion Asie', en: 'Fast Fashion Asia' },
  supplier_capsule_artisanale: { fr: 'Capsule artisanale', en: 'Artisanal Capsule' },
  supplier_collab_createur: { fr: 'Collab créateur', en: 'Designer Collab' },

  // Supplier tooltips
  tooltip_atelier_abidjan: { fr: 'Artisanal, éthique, coût plus élevé — booste durabilité et authenticité', en: 'Artisanal, ethical, higher cost — boosts sustainability and authenticity' },
  tooltip_usine_europe: { fr: 'Bonne qualité, coût moyen — équilibre fiabilité et image', en: 'Good quality, mid cost — balances reliability and image' },
  tooltip_fast_fashion_asie: { fr: 'Coût faible mais nuit à votre image et durabilité', en: 'Low cost but hurts your image and sustainability' },
  tooltip_capsule_artisanale: { fr: 'Premium, très limité — exclusivité maximale, volume minimal', en: 'Premium, very limited — maximum exclusivity, minimal volume' },
  tooltip_collab_createur: { fr: 'Collaboration designer — génère du buzz, coût élevé', en: 'Designer collaboration — generates buzz, high cost' },

  // Collection styles
  style_street: { fr: 'Street', en: 'Street' },
  style_afro: { fr: 'Afro', en: 'Afro' },
  style_sport: { fr: 'Sport', en: 'Sport' },
  style_art: { fr: 'Art', en: 'Art' },
  style_minimaliste: { fr: 'Minimaliste', en: 'Minimalist' },

  // Volume
  volume_limited: { fr: 'Capsule limitée', en: 'Limited capsule' },
  volume_large: { fr: 'Grande collection', en: 'Large collection' },

  // Price
  price_entry: { fr: 'Entrée de gamme', en: 'Entry-level' },
  price_luxury: { fr: 'Luxe accessible', en: 'Accessible luxury' },

  // Distribution
  dist_ecommerce: { fr: 'E-commerce', en: 'E-commerce' },
  dist_popup: { fr: 'Pop-up', en: 'Pop-up' },
  dist_multibrand: { fr: 'Multi-brand boutique', en: 'Multi-brand boutique' },
  dist_wholesale: { fr: 'Wholesale', en: 'Wholesale' },
  dist_social_drop: { fr: 'Social drop', en: 'Social drop' },

  // Communication channels
  comm_tiktok_insta: { fr: 'TikTok / Insta', en: 'TikTok / Insta' },
  comm_press_rp: { fr: 'Presse / RP', en: 'Press / PR' },
  comm_event: { fr: 'Événement', en: 'Event' },
  comm_influencer: { fr: 'Influenceur', en: 'Influencer' },

  // Communication budget
  comm_budget_low: { fr: 'Budget modéré', en: 'Moderate budget' },
  comm_budget_high: { fr: 'Budget agressif', en: 'Aggressive budget' },

  // Brand focus
  focus_balanced: { fr: 'Équilibré', en: 'Balanced' },
  focus_price: { fr: 'Prix', en: 'Price' },
  focus_product: { fr: 'Produit', en: 'Product' },
  focus_image: { fr: 'Image', en: 'Image' },
  focus_sustainability: { fr: 'Durabilité', en: 'Sustainability' },

  // Results
  results_title: { fr: 'Résultats du tour', en: 'Round results' },
  results_sales: { fr: 'Ventes', en: 'Sales' },
  results_image: { fr: 'Image', en: 'Image' },
  results_sustainability: { fr: 'Durabilité', en: 'Sustainability' },
  results_loyalty: { fr: 'Fidélité', en: 'Loyalty' },
  results_brand_score: { fr: 'Score de marque', en: 'Brand Score' },
  results_market_share: { fr: 'Part de marché', en: 'Market share' },

  // Market
  market_title: { fr: 'Perspectives marché', en: 'Market outlook' },
  market_event: { fr: 'Événement du tour', en: 'Round event' },

  // Leaderboard
  leaderboard_title: { fr: 'Classement', en: 'Leaderboard' },
  leaderboard_rank: { fr: 'Rang', en: 'Rank' },
  leaderboard_brand: { fr: 'Marque', en: 'Brand' },
  leaderboard_score: { fr: 'Score', en: 'Score' },

  // Admin
  admin_title: { fr: 'Panneau de contrôle', en: 'Control panel' },
  admin_start_session: { fr: 'Démarrer la session', en: 'Start session' },
  admin_next_round: { fr: 'Lancer le tour suivant', en: 'Launch next round' },
  admin_pause: { fr: 'Pause', en: 'Pause' },
  admin_resume: { fr: 'Reprendre', en: 'Resume' },
  admin_end_session: { fr: 'Terminer la session', en: 'End session' },
  admin_current_round: { fr: 'Tour actuel', en: 'Current round' },
  admin_timer: { fr: 'Minuteur', en: 'Timer' },
  admin_project_results: { fr: 'Projeter les résultats', en: 'Project results' },

  // General
  round: { fr: 'Tour {n}', en: 'Round {n}' },
  minutes: { fr: 'min', en: 'min' },
  seconds: { fr: 's', en: 's' },
};

export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  let text = translations[key]?.[lang] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export default translations;

export type SessionStatus = 'waiting' | 'practice' | 'active' | 'paused' | 'finished' | 'ended';

export interface Session {
  id: string;
  code: string;
  status: SessionStatus;
  current_round: number;
  round_ends_at: string | null;
  results_revealed: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  brand_name: string;
  brand_color: string;
  brand_statement: string | null;
  cumulative_score: number;
  current_budget: number;
  created_at: string;
}

export type Supplier = 'atelier_abidjan' | 'usine_europe' | 'fast_fashion_asie' | 'capsule_artisanale' | 'collab_createur';
export type CollectionStyle = 'casual_luxe' | 'streetwear' | 'techwear' | 'avant_garde' | 'minimaliste';
export type Distribution = 'ecommerce' | 'popup' | 'multibrand' | 'wholesale' | 'social_drop';
export type CommChannel = 'tiktok_insta' | 'press_rp' | 'event' | 'influencer';
export type BrandFocus = 'balanced' | 'price' | 'product' | 'image' | 'sustainability';

export interface Decision {
  id: string;
  session_id: string;
  team_id: string;
  round_number: number;
  supplier?: Supplier;
  collection_style?: CollectionStyle;
  collection_volume?: number;
  price?: number;
  distribution?: Distribution;
  comm_budget?: number;
  comm_channel?: CommChannel;
  brand_focus?: BrandFocus;
  budget_fournisseur: number;
  budget_collection: number;
  budget_prix: number;
  budget_distribution: number;
  budget_communication: number;
  total_spent?: number;
  product_name?: string;
  product_category?: string;
  product_style?: string;
  submitted_at: string | null;
}

export interface RoundResult {
  id: string;
  session_id: string;
  team_id: string;
  round_number: number;
  event_id: string | null;
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
  score_global: number;
  budget_remaining: number;
  budget_next: number;
}

export type MarketEffectType =
  | 'channel_boost'
  | 'supplier_mod'
  | 'style_boost'
  | 'global';

export type MarketMetric = 'sales' | 'image' | 'sustainability' | 'loyalty' | 'all';

export interface MarketEffectData {
  type: MarketEffectType;
  target?: string;
  metric: MarketMetric;
  mult: number;
}

export interface MarketEvent {
  id: string;
  session_id: string;
  round_number: number;
  name: string;
  description: string;
  active: boolean;
  effects?: any[];
  effect_json?: MarketEffectData;
}

export type Lang = 'fr' | 'en';

export interface DecisionForm {
  supplier?: Supplier;
  collection_style?: CollectionStyle;
  collection_volume?: number;
  price?: number;
  distribution?: Distribution;
  comm_budget?: number;
  comm_channel?: CommChannel;
  brand_focus?: BrandFocus;
  budget_fournisseur: number;
  budget_collection: number;
  budget_prix: number;
  budget_distribution: number;
  budget_communication: number;
  product_name?: string;
  product_category?: string;
  product_style?: string;
}

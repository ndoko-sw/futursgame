export type SessionStatus = 'waiting' | 'practice' | 'active' | 'paused' | 'finished';

export interface Session {
  id: string;
  code: string;
  status: SessionStatus;
  current_round: number;
  round_ends_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  brand_name: string;
  brand_color: string;
  brand_statement: string | null;
  cumulative_score: number;
  created_at: string;
}

export type Supplier = 'atelier_abidjan' | 'usine_europe' | 'fast_fashion_asie' | 'capsule_artisanale' | 'collab_createur';
export type CollectionStyle = 'street' | 'afro' | 'sport' | 'art' | 'minimaliste';
export type Distribution = 'ecommerce' | 'popup' | 'multibrand' | 'wholesale' | 'social_drop';
export type CommChannel = 'tiktok_insta' | 'press_rp' | 'event' | 'influencer';
export type BrandFocus = 'balanced' | 'price' | 'product' | 'image' | 'sustainability';

export interface Decision {
  id: string;
  team_id: string;
  round: number;
  supplier: Supplier;
  collection_style: CollectionStyle;
  collection_volume: number;
  price: number;
  distribution: Distribution;
  comm_budget: number;
  comm_channel: CommChannel;
  brand_focus: BrandFocus;
  submitted_at: string;
}

export interface RoundResult {
  id: string;
  team_id: string;
  round: number;
  sales: number;
  image_score: number;
  sustainability_score: number;
  loyalty_score: number;
  brand_score: number;
  market_share: number;
}

export interface MarketEvent {
  id: string;
  session_id: string;
  round: number;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  effect_json: Record<string, number>;
}

export type Lang = 'fr' | 'en';

export interface DecisionForm {
  supplier: Supplier;
  collection_style: CollectionStyle;
  collection_volume: number;
  price: number;
  distribution: Distribution;
  comm_budget: number;
  comm_channel: CommChannel;
  brand_focus: BrandFocus;
}

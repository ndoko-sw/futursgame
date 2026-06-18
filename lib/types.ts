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
  brand_equity?: number;
  hype?: number;
  created_at: string;
}

export type Broadcast = { id: string; session_id: string; message: string; kind: string; created_at: string };

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
  price_tier?: string;
  distribution?: Distribution;
  comm_budget?: number;
  comm_channel?: CommChannel;
  brand_focus?: BrandFocus;
  brand_positioning?: string;
  brand_value?: string;
  notoriety_budget?: number;
  supplier_commitment?: number;
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
  event_ids: string[];
  score_ventes: number;
  score_image: number;
  score_durabilite: number;
  score_fidelite: number;
  score_global: number;
  budget_remaining: number;
  budget_next: number;
  investor_grade?: string;    // 'A'|'B'|'C'|'D'|'E'|'F'
  subsidy_amount?: number;    // montant subvention appliqué au budget suivant
  leader_kpis?: string[];
  press_reviews?: Record<string, string>;
  supplier_status?: string;
  product_scores?: Record<string, {  // clé = product.id
    score_ventes: number;
    score_image: number;
    score_durabilite: number;
    score_fidelite: number;
    ca: number;  // chiffre d'affaires en euros
  }>;
}

export type TeamEvent = {
  id: string;
  session_id: string;
  team_id: string;
  round_number: number;
  name: string;
  description_fr?: string;
  effect_json: MarketEffectEntry[];
  triggered_by: 'auto' | 'gm';
  created_at: string;
};

export type SimpleEffect = {
  type: 'global' | 'channel_boost' | 'supplier_mod' | 'style_boost' | 'distribution_boost';
  metric: 'all' | 'sales' | 'image' | 'sustainability' | 'loyalty';
  mult: number;
  target?: string; // single or comma-separated for multi-target
};

export type ConditionalEffect = {
  type: 'conditional';
  condition_field:
    | 'score_durabilite' | 'score_image' | 'score_ventes' | 'score_fidelite'
    | 'supplier' | 'comm_channel' | 'collection_style' | 'distribution' | 'price_tier' | 'brand_focus';
  condition_op: '>' | '<=' | '=';
  condition_value: number | string;
  then_effect: SimpleEffect;
  else_effect: SimpleEffect;
};

export type MarketEffectEntry = SimpleEffect | ConditionalEffect;
export type MarketEffectData = MarketEffectEntry[];

export interface MarketEvent {
  id: string;
  session_id: string;
  round_number: number;
  name: string;
  description: string;
  active: boolean;
  source?: 'random' | 'gm';
  effects?: any[];
  effect_json?: MarketEffectData;
}

export interface Product {
  id: string;
  team_id: string;
  session_id: string;
  round_number: number;
  name: string;
  category: string;
  style: string;
  supplier: string;
  price_tier: string;
  // Budget par décision (€ investis dans chaque choix)
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
  created_at: string;
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

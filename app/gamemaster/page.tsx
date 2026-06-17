'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { computeRoundResults } from '@/lib/simulation';

const GM_PASSWORD = 'djassa';
const LS_GM_SESSION = 'futurs_gm_session_id';

type Session = {
  id: string; code: string; status: string; current_round: number;
  results_revealed: boolean; round_ends_at: string | null;
};
type Team = { id: string; brand_name: string; brand_color: string; current_budget: number; cumulative_score: number };
type Decision = { id: string; team_id: string; round_number: number; submitted_at: string | null; [k: string]: any };
type Event = { id: string; name: string; description: string; active: boolean; round_number: number; effect_json?: any };

type EventEntry = {
  id: string; name: string; description: string; category: string; intensity: number;
  effect_json: any[]; // array of SimpleEffect | ConditionalEffect
  effectLabel: string; // GM-only mechanical summary
};

// ── POOL ALÉATOIRE (tirés automatiquement 1-2 par tour) ──
const RANDOM_POOL: EventEntry[] = [
  // Canal Comm.
  {
    id: 'r1', name: 'TikTok Viral', category: 'social', intensity: 3,
    description: "Un son afro-trap cumule 80M de vues en 72h et déclenche une vague de vidéos mode. Les créateurs de contenu s'emparent du mouvement — les marques actives sur TikTok et Instagram voient leur portée exploser.",
    effect_json: [{ type: 'channel_boost', target: 'tiktok_insta', metric: 'sales', mult: 1.55 }],
    effectLabel: '+55% Ventes → tiktok_insta',
  },
  {
    id: 'r2', name: 'Couverture presse éditoriale', category: 'tendance', intensity: 2,
    description: "Vogue Africa et ELLE consacrent leurs couvertures à la renaissance de la mode indépendante. Les médias cherchent des marques avec une vision éditoriale forte — la presse devient le canal le plus valorisé.",
    effect_json: [{ type: 'channel_boost', target: 'press_rp', metric: 'image', mult: 1.65 }],
    effectLabel: '+65% Image → press_rp',
  },
  {
    id: 'r3', name: 'Fashion Week Buzz', category: 'tendance', intensity: 2,
    description: "Paris, Lagos, Dakar — trois Fashion Weeks simultanées concentrent tous les regards. Les marques présentes en événement physique captent l'attention des acheteurs, journalistes et créateurs de tendances.",
    effect_json: [
      { type: 'channel_boost', target: 'event', metric: 'sales', mult: 1.4 },
      { type: 'channel_boost', target: 'event', metric: 'image', mult: 1.4 },
    ],
    effectLabel: '+40% Ventes + Image → event',
  },
  {
    id: 'r4', name: 'Méga-collab influenceur', category: 'social', intensity: 3,
    description: "Un collectif de créateurs 'nouvelle génération' signe des partnerships exclusifs avec des marques indépendantes. Les campagnes influenceurs authentiques génèrent un reach record — le ROI des collaborations explose.",
    effect_json: [{ type: 'channel_boost', target: 'influencer', metric: 'sales', mult: 1.6 }],
    effectLabel: '+60% Ventes → influencer',
  },
  // Fournisseur
  {
    id: 'r5', name: 'Backlash Fast Fashion EU', category: 'social', intensity: 3,
    description: "Une commission parlementaire européenne publie un rapport explosif sur les conditions de travail des usines fast-fashion en Asie. La pression des consommateurs pousse à un rejet massif des marques associées à ce sourcing.",
    effect_json: [{ type: 'supplier_mod', target: 'fast_fashion_asie', metric: 'image', mult: 0.4 }],
    effectLabel: '-60% Image → fast_fashion_asie',
  },
  {
    id: 'r6', name: 'Made in Europe Premium', category: 'tendance', intensity: 2,
    description: "Après des années de délocalisation, le 'Made in Europe' revient comme argument différenciant premium. 67% des acheteurs mode sont prêts à payer plus pour la traçabilité et la proximité de production.",
    effect_json: [{ type: 'supplier_mod', target: 'usine_europe', metric: 'image', mult: 1.45 }],
    effectLabel: '+45% Image → usine_europe',
  },
  {
    id: 'r7', name: 'Hype capsule artisanale', category: 'tendance', intensity: 3,
    description: "Les drops en édition limitée artisanale s'arrachent en quelques minutes. La rareté crée l'urgence — les marques sourçant en capsule voient des files d'attente, des listes de pré-commande et un engouement inédit sur les réseaux.",
    effect_json: [{ type: 'supplier_mod', target: 'capsule_artisanale', metric: 'sales', mult: 1.7 }],
    effectLabel: '+70% Ventes → capsule_artisanale',
  },
  {
    id: 'r8', name: 'Spotlight artisanat africain', category: 'tendance', intensity: 2,
    description: "Un documentaire Netflix sur l'artisanat africain bat des records d'audience dans 40 pays. Le savoir-faire des ateliers d'Abidjan est sous les projecteurs — une clientèle mondiale s'intéresse à l'authenticité et à l'histoire derrière chaque pièce.",
    effect_json: [{ type: 'supplier_mod', target: 'atelier_abidjan', metric: 'loyalty', mult: 1.6 }],
    effectLabel: '+60% Fidélité → atelier_abidjan',
  },
  // Style
  {
    id: 'r9', name: 'Streetwear domine', category: 'tendance', intensity: 2,
    description: "Entre rappeurs, sportifs et célébrités, le streetwear dicte les codes de la saison. Les collaborations entre sport et mode se multiplient — les marques streetwear profitent d'un alignement parfait avec l'air du temps.",
    effect_json: [{ type: 'style_boost', target: 'streetwear', metric: 'sales', mult: 1.5 }],
    effectLabel: '+50% Ventes → streetwear',
  },
  {
    id: 'r10', name: 'Minimalisme premium', category: 'tendance', intensity: 2,
    description: "Le 'quiet luxury' s'installe durablement dans les comportements d'achat haut de gamme. Les clients aisés fuient l'ostentation — le minimalisme épuré, discret et de qualité devient le marqueur du vrai bon goût.",
    effect_json: [{ type: 'style_boost', target: 'minimaliste', metric: 'image', mult: 1.55 }],
    effectLabel: '+55% Image → minimaliste',
  },
  {
    id: 'r11', name: 'Avant-garde au musée', category: 'tendance', intensity: 2,
    description: "Le Centre Pompidou et le MoMA organisent une exposition commune 'Mode comme langage'. Les marques avant-garde gagnent une légitimité culturelle rare — la presse spécialisée les consacre, les collectionneurs s'y intéressent.",
    effect_json: [
      { type: 'style_boost', target: 'avant_garde', metric: 'sales', mult: 1.4 },
      { type: 'style_boost', target: 'avant_garde', metric: 'image', mult: 1.4 },
    ],
    effectLabel: '+40% Ventes + Image → avant_garde',
  },
  {
    id: 'r12', name: 'Techwear grand public', category: 'tendance', intensity: 2,
    description: "Les innovations textiles (thermo-régulation, imperméabilité avancée, matières recyclées) sortent du segment outdoor. Le grand public adopte le techwear comme style quotidien — les marques pionnières captent une demande massive.",
    effect_json: [{ type: 'style_boost', target: 'techwear', metric: 'sales', mult: 1.5 }],
    effectLabel: '+50% Ventes → techwear',
  },
  // Distribution (r13-r14)
  {
    id: 'r13', name: 'Boom e-commerce mode', category: 'tendance', intensity: 2,
    description: "Les plateformes e-commerce mode explosent leurs benchmarks : +180% de trafic sur les boutiques en ligne indépendantes ce trimestre. Les marques qui vendent en direct digital capturent une demande massive sans intermédiaire.",
    effect_json: [{ type: 'distribution_boost', target: 'ecommerce', metric: 'sales', mult: 1.5 }],
    effectLabel: '+50% Ventes → distribution ecommerce',
  },
  {
    id: 'r14', name: 'Hype social drop', category: 'social', intensity: 3,
    description: "Les drops exclusifs en direct sur Instagram Live et TikTok Shop créent des files d'attente virtuelles. Les marques qui maîtrisent le social drop voient leur fanbase s'engager comme jamais — ventes et fidélité s'envolent ensemble.",
    effect_json: [
      { type: 'distribution_boost', target: 'social_drop', metric: 'sales', mult: 1.45 },
      { type: 'distribution_boost', target: 'social_drop', metric: 'loyalty', mult: 1.3 },
    ],
    effectLabel: '+45% Ventes + 30% Fidélité → distribution social_drop',
  },
  // Price tier (r15-r16)
  {
    id: 'r15', name: "Crise du pouvoir d'achat", category: 'economique', intensity: 3,
    description: "Les ménages resserrent les cordons de la bourse. Les arbitrages de consommation se font au détriment du moyen et haut de gamme. Les marques accessibles captent un flux de clients qui descendent en gamme.",
    effect_json: [{
      type: 'conditional', condition_field: 'price_tier', condition_op: '=', condition_value: 'accessible',
      then_effect: { type: 'global', metric: 'sales', mult: 1.4 },
      else_effect: { type: 'global', metric: 'sales', mult: 0.78 },
    }],
    effectLabel: 'Accessible Ventes ×1.4 / Milieu-Premium-Luxe Ventes ×0.78',
  },
  {
    id: 'r16', name: 'Le luxe résiste', category: 'economique', intensity: 2,
    description: "Paradoxe économique classique : le luxe tient quand le milieu de gamme vacille. Les clients ultra-premium consolident leurs achats identitaires — leurs dépenses de statut résistent à l'incertitude économique.",
    effect_json: [{
      type: 'conditional', condition_field: 'price_tier', condition_op: '=', condition_value: 'luxe',
      then_effect: { type: 'global', metric: 'image', mult: 1.5 },
      else_effect: { type: 'global', metric: 'image', mult: 0.9 },
    }],
    effectLabel: 'Luxe Image ×1.5 / autres Image ×0.9',
  },
  // Fournisseur non encore ciblé (r17)
  {
    id: 'r17', name: 'Collab créateur en or', category: 'tendance', intensity: 2,
    description: "Un directeur artistique reconnu signe des collaborations exclusives avec des maisons indépendantes. Les marques qui ont misé sur la co-création artistique voient leur image propulsée dans une autre dimension — l'effet halo dure plusieurs saisons.",
    effect_json: [{ type: 'supplier_mod', target: 'collab_createur', metric: 'image', mult: 1.7 }],
    effectLabel: '+70% Image → collab_createur',
  },
  // Global nouveaux (r18-r20)
  {
    id: 'r18', name: 'Rapport IPCC mode', category: 'social', intensity: 3,
    description: "Le dernier rapport du GIEC désigne l'industrie de la mode comme le deuxième secteur le plus polluant au monde. Les médias grand public s'en emparent — la durabilité s'impose sur l'agenda de chaque consommateur, sans exception.",
    effect_json: [{ type: 'global', metric: 'sustainability', mult: 1.5 }],
    effectLabel: '+50% Durabilité — toutes marques',
  },
  {
    id: 'r19', name: 'Ère du contenu long', category: 'social', intensity: 2,
    description: "La fatigue des formats courts (Reels 15s, TikTok) pousse les audiences vers le contenu approfondi : documentaires, interviews longues, chroniques presse. La communication éditoriale et événementielle construit une relation plus durable avec le public.",
    effect_json: [{ type: 'channel_boost', target: 'press_rp,event', metric: 'loyalty', mult: 1.4 }],
    effectLabel: '+40% Fidélité → press_rp + event',
  },
  {
    id: 'r20', name: 'Boycott textiles synthétiques', category: 'social', intensity: 2,
    description: "Une campagne virale expose l'impact des microfibres synthétiques sur les océans. Les consommateurs se tournent vers les matières naturelles et artisanales. Les marques sourçant éthiquement gagnent en légitimité, les fast-fashion paient le prix.",
    effect_json: [
      { type: 'supplier_mod', target: 'capsule_artisanale,atelier_abidjan', metric: 'image', mult: 1.3 },
      { type: 'supplier_mod', target: 'fast_fashion_asie', metric: 'image', mult: 0.6 },
    ],
    effectLabel: 'Capsule+Abidjan Image ×1.3 / Fast Fashion Image ×0.6',
  },
  // Distribution (r21-r23)
  {
    id: 'r21', name: 'Pop-up fever', category: 'tendance', intensity: 2,
    description: "Les pop-ups éphémères envahissent les capitales de la mode. Paris, Lagos, Dakar — les espaces temporels ultra-curatés créent l'événement. Les marques qui distribuent en pop-up génèrent un buzz local fort et construisent une relation directe avec leurs clients.",
    effect_json: [
      { type: 'distribution_boost', target: 'popup', metric: 'image', mult: 1.3 },
      { type: 'distribution_boost', target: 'popup', metric: 'loyalty', mult: 1.4 },
    ],
    effectLabel: '+30% Image + 40% Fidélité → distribution popup',
  },
  {
    id: 'r22', name: 'Retail revival', category: 'tendance', intensity: 2,
    description: "Contre toute attente, le retail physique multibrand connaît un renouveau. Les clients reviennent en boutique pour toucher, essayer, vivre l'expérience. Les marques présentes chez les multibrandistes profitent d'un trafic en magasin historiquement haut.",
    effect_json: [{ type: 'distribution_boost', target: 'multibrand', metric: 'sales', mult: 1.4 }],
    effectLabel: '+40% Ventes → distribution multibrand',
  },
  {
    id: 'r23', name: 'Wholesale boom', category: 'economique', intensity: 2,
    description: "Les grands acheteurs wholesale reviennent en force après deux ans de prudence. Les commandes groupées repartent — les marques qui distribuent en wholesale signent des deals massifs et renforcent la confiance de leurs acheteurs récurrents.",
    effect_json: [
      { type: 'distribution_boost', target: 'wholesale', metric: 'sales', mult: 1.3 },
      { type: 'distribution_boost', target: 'wholesale', metric: 'loyalty', mult: 1.2 },
    ],
    effectLabel: '+30% Ventes + 20% Fidélité → distribution wholesale',
  },
  // Price tier (r24)
  {
    id: 'r24', name: 'Le milieu retrouve son sens', category: 'economique', intensity: 2,
    description: "Ni luxe hors de portée, ni fast-fashion sans âme. La génération des 25-35 ans plébiscite le milieu de gamme qualitatif. Le rapport qualité-prix éthique redevient le critère numéro un — les marques qui se positionnent juste bénéficient d'un vent porteur.",
    effect_json: [{
      type: 'conditional', condition_field: 'price_tier', condition_op: '=', condition_value: 'milieu',
      then_effect: { type: 'global', metric: 'sales', mult: 1.3 },
      else_effect: { type: 'global', metric: 'sales', mult: 0.88 },
    }],
    effectLabel: 'Milieu Ventes ×1.3 / autres Ventes ×0.88',
  },
  // Fournisseur (r25-r26)
  {
    id: 'r25', name: 'Relocalisation industrielle', category: 'economique', intensity: 2,
    description: "Les gouvernements européens lancent des programmes de subventions massifs pour rapatrier la production textile. Les marques qui produisent en Europe bénéficient d'une prime d'image et de crédibilité — la souveraineté industrielle devient un argument marketing puissant.",
    effect_json: [
      { type: 'supplier_mod', target: 'usine_europe', metric: 'sales', mult: 1.3 },
      { type: 'supplier_mod', target: 'usine_europe', metric: 'loyalty', mult: 1.25 },
    ],
    effectLabel: '+30% Ventes + 25% Fidélité → usine_europe',
  },
  {
    id: 'r26', name: 'Craftsmanship africain', category: 'tendance', intensity: 2,
    description: "Le savoir-faire artisanal africain est consacré par une rétrospective au Centre Pompidou. Les maisons de luxe s'y intéressent, les prescripteurs s'en emparent. Les marques qui travaillent avec des ateliers africains voient leur image et leurs ventes s'élever au niveau de l'artisanat de haute qualité.",
    effect_json: [
      { type: 'supplier_mod', target: 'atelier_abidjan', metric: 'image', mult: 1.5 },
      { type: 'supplier_mod', target: 'atelier_abidjan', metric: 'sales', mult: 1.25 },
    ],
    effectLabel: '+50% Image + 25% Ventes → atelier_abidjan',
  },
  // Global (r27-r28)
  {
    id: 'r27', name: 'Ère de la communauté', category: 'social', intensity: 2,
    description: "Les clients ne veulent plus acheter une marque — ils veulent en faire partie. Les communautés de marque (Discord, newsletters, événements privés) explosent. Ce tour, toutes les marques bénéficient d'une montée de la fidélité client, mais celles qui ont investi dans la relation long terme en profitent davantage.",
    effect_json: [{ type: 'global', metric: 'loyalty', mult: 1.3 }],
    effectLabel: '+30% Fidélité — toutes marques',
  },
  {
    id: 'r28', name: 'Saison sans soldes', category: 'economique', intensity: 2,
    description: "Les nouvelles réglementations anti-overstock limitent les promotions massives. Les prix se tiennent, les marges se préservent. Les marques qui résistent à la tentation des rabais voient leurs ventes progresser — la rareté et le prix juste deviennent des atouts.",
    effect_json: [{ type: 'global', metric: 'sales', mult: 1.25 }],
    effectLabel: '+25% Ventes — toutes marques',
  },
  // Conditionnel brand_focus (r29)
  {
    id: 'r29', name: 'Sustainability is the new luxury', category: 'social', intensity: 3,
    description: "Un rapport McKinsey révèle que 74% des millennials premium sont prêts à payer plus pour des marques authentiquement durables. Les marques dont c'est le cœur de positionnement explosent en image. Les autres sont perçues comme en retard sur leur époque.",
    effect_json: [{
      type: 'conditional', condition_field: 'brand_focus', condition_op: '=', condition_value: 'sustainability',
      then_effect: { type: 'global', metric: 'image', mult: 1.5 },
      else_effect: { type: 'global', metric: 'image', mult: 0.85 },
    }],
    effectLabel: 'Focus durabilité → Image ×1.5 / autres Image ×0.85',
  },
  // Style (r30)
  {
    id: 'r30', name: 'Luxe sportswear fusion', category: 'tendance', intensity: 2,
    description: "Les frontières entre sport et luxe tombent définitivement. Les sneakers à 600€, les joggings en cachemire, les vestes de sport brodées — la fusion casual luxe et techwear s'impose comme le style aspirationnel dominant de la saison.",
    effect_json: [
      { type: 'style_boost', target: 'casual_luxe,techwear', metric: 'sales', mult: 1.35 },
    ],
    effectLabel: '+35% Ventes → casual_luxe + techwear',
  },
  // Conditionnel durabilité (r31)
  {
    id: 'r31', name: 'Labels éco certifiés', category: 'social', intensity: 2,
    description: "L'Union Européenne impose un système de certification écologique obligatoire pour les marques de mode. Les certifiées gagnent une prime d'image immédiate. Les autres subissent une pression réglementaire qui fragilise leur positionnement — les consommateurs les regardent désormais avec plus de méfiance.",
    effect_json: [{
      type: 'conditional', condition_field: 'score_durabilite', condition_op: '>', condition_value: 70,
      then_effect: { type: 'global', metric: 'image', mult: 1.4 },
      else_effect: { type: 'global', metric: 'image', mult: 0.8 },
    }],
    effectLabel: 'Durabilité >70 → Image ×1.4 / sinon ×0.8',
  },
  // Canal dual (r32)
  {
    id: 'r32', name: 'TikTok ban partiel', category: 'social', intensity: 3,
    description: "Plusieurs gouvernements imposent des restrictions d'accès à TikTok pour les mineurs. Le reach des créateurs chute de 30%, les algorithmes se réorganisent. Les campagnes influenceurs perdent aussi en efficacité dans ce contexte de méfiance envers le digital. Les stratégies de contenu doivent pivoter.",
    effect_json: [
      { type: 'channel_boost', target: 'tiktok_insta', metric: 'sales', mult: 0.7 },
      { type: 'channel_boost', target: 'influencer', metric: 'sales', mult: 0.85 },
    ],
    effectLabel: 'TikTok/Insta Ventes ×0.7 / Influencer Ventes ×0.85',
  },
  // Global jokers (A-C)
  {
    id: 'rA', name: 'Scandale greenwashing', category: 'social', intensity: 3,
    description: "Changing Markets publie un rapport dévastateur sur les fausses allégations écologiques dans la mode. Les médias distinguent les marques vraiment engagées des impostures — le marché sanctionne sévèrement celles dont la durabilité est de façade.",
    effect_json: [{
      type: 'conditional', condition_field: 'score_durabilite', condition_op: '>', condition_value: 60,
      then_effect: { type: 'global', metric: 'image', mult: 1.5 },
      else_effect: { type: 'global', metric: 'image', mult: 0.55 },
    }],
    effectLabel: 'Durabilité >60 → Image ×1.5 / sinon ×0.55',
  },
  {
    id: 'rB', name: 'Boom de la seconde main', category: 'economique', intensity: 3,
    description: "Vinted et Depop explosent en Europe et en Afrique. La mode circulaire cannibale les ventes du neuf — mais les marques avec une forte image s'en sortent mieux : leurs pièces se revendent bien et renforcent leur statut.",
    effect_json: [
      { type: 'global', metric: 'sales', mult: 0.8 },
      { type: 'conditional', condition_field: 'score_image', condition_op: '>', condition_value: 60,
        then_effect: { type: 'global', metric: 'image', mult: 1.1 },
        else_effect: { type: 'global', metric: 'image', mult: 0.9 },
      },
    ],
    effectLabel: 'Ventes ×0.8 toutes + Image >60 → ×1.1 / sinon ×0.9',
  },
  {
    id: 'rC', name: 'Diaspora Spotlight', category: 'social', intensity: 2,
    description: "CNN, Vogue Africa et BBC consacrent un dossier mondial sur la mode diaspora. Les marques avec un fournisseur africain deviennent les références du mouvement — les autres bénéficient d'un rayonnement culturel plus modeste.",
    effect_json: [{
      type: 'conditional', condition_field: 'supplier', condition_op: '=', condition_value: 'atelier_abidjan',
      then_effect: { type: 'supplier_mod', target: 'atelier_abidjan', metric: 'all', mult: 1.6 },
      else_effect: { type: 'global', metric: 'image', mult: 1.2 },
    }],
    effectLabel: 'Abidjan → tous ×1.6 / autres → Image ×1.2',
  },
];

// ── CATALOGUE GM (choix manuel, 1 par tour) ──
const GM_CATALOG: EventEntry[] = [
  // Canal Comm.
  {
    id: 'D', name: 'Algorithme TikTok cassé', category: 'social', intensity: 3,
    description: "TikTok modifie son algorithme — les petits créateurs authentiques sont favorisés, les contenus sponsorisés rétrogradés. Les marques qui misaient tout sur TikTok/Insta voient leur reach chuter. Celles qui privilégient la presse et les événements physiques en profitent.",
    effect_json: [
      { type: 'channel_boost', target: 'tiktok_insta', metric: 'sales', mult: 0.6 },
      { type: 'channel_boost', target: 'press_rp,event', metric: 'image', mult: 1.35 },
    ],
    effectLabel: 'TikTok/Insta Ventes ×0.6 / Presse+Event Image ×1.35',
  },
  {
    id: 'E', name: 'Boycott pub digitale', category: 'social', intensity: 2,
    description: "Un mouvement citoyen viral appelle à ignorer toute publicité digitale payante. La communication authentique — éditoriale, événementielle, presse — reprend de la valeur. Les influenceurs rémunérés perdent massivement en crédibilité.",
    effect_json: [
      { type: 'channel_boost', target: 'influencer', metric: 'sales', mult: 0.65 },
      { type: 'channel_boost', target: 'press_rp', metric: 'image', mult: 1.45 },
    ],
    effectLabel: 'Influencer Ventes ×0.65 / Presse Image ×1.45',
  },
  // Fournisseur
  {
    id: 'F', name: 'Pénurie coton mondiale', category: 'economique', intensity: 3,
    description: "Une sécheresse en Asie centrale dévaste les récoltes de coton. Les chaînes fast-fashion asiatiques sont bloquées, délais allongés, coûts explosés. Les capsules artisanales et ateliers locaux, indépendants de ces filières, s'en sortent bien mieux.",
    effect_json: [
      { type: 'supplier_mod', target: 'fast_fashion_asie', metric: 'sales', mult: 0.45 },
      { type: 'supplier_mod', target: 'capsule_artisanale,atelier_abidjan', metric: 'sales', mult: 1.3 },
    ],
    effectLabel: 'FastFashionAsie Ventes ×0.45 / Capsule+Abidjan Ventes ×1.3',
  },
  {
    id: 'G', name: 'Révélations travail forcé', category: 'social', intensity: 3,
    description: "Un reportage d'investigation choc révèle les conditions dans les usines asiatiques low-cost. Les marques éthiques récoltent la confiance des consommateurs — leur fidélité bondit. Les autres paient le prix fort de leur silence.",
    effect_json: [
      { type: 'supplier_mod', target: 'fast_fashion_asie', metric: 'image', mult: 0.3 },
      { type: 'supplier_mod', target: 'usine_europe,atelier_abidjan', metric: 'loyalty', mult: 1.5 },
    ],
    effectLabel: 'FastFashionAsie Image ×0.3 / Europe+Abidjan Fidélité ×1.5',
  },
  // Style
  {
    id: 'H', name: 'Nostalgie années 90', category: 'tendance', intensity: 2,
    description: "Le revival Y2K et 90s explose : JNCO, baby tees, bomber jackets partout. Les marques streetwear et casual luxe captent l'attention d'une génération nostalgique. L'avant-garde et le minimalisme, jugés trop 'froids', peinent à s'imposer ce trimestre.",
    effect_json: [
      { type: 'style_boost', target: 'streetwear,casual_luxe', metric: 'sales', mult: 1.45 },
      { type: 'style_boost', target: 'avant_garde,minimaliste', metric: 'image', mult: 0.8 },
    ],
    effectLabel: 'Streetwear+CasualLuxe Ventes ×1.45 / AvantGarde+Minimaliste Image ×0.8',
  },
  {
    id: 'I', name: 'Gender fluid mainstream', category: 'tendance', intensity: 2,
    description: "Les frontières de genre tombent dans la mode. Le genderless devient la norme dans les médias et les campagnes. Les marques avant-garde, casual luxe et techwear — premières à avoir anticipé cette évolution culturelle — en récoltent les bénéfices.",
    effect_json: [
      { type: 'style_boost', target: 'avant_garde,casual_luxe,techwear', metric: 'image', mult: 1.4 },
    ],
    effectLabel: 'AvantGarde+CasualLuxe+Techwear Image ×1.4',
  },
  // Global
  {
    id: 'J', name: 'Crise logistique mondiale', category: 'economique', intensity: 3,
    description: "Grève des transporteurs mondiaux, blocage au détroit de Malacca. Les délais de livraison explosent, les marges se compriment sur toute la chaîne. Aucune marque n'est épargnée — les ventes reculent sur tous les segments ce tour.",
    effect_json: [{ type: 'global', metric: 'sales', mult: 0.65 }],
    effectLabel: 'Ventes ×0.65 — toutes marques',
  },
  {
    id: 'K', name: 'Paris Fashion Week Totale', category: 'tendance', intensity: 2,
    description: "L'édition la plus regardée de l'histoire — 120 pays en live stream, 2 milliards d'impressions. Toutes les marques bénéficient d'un halo d'image exceptionnel ce tour. Carte joker du GM pour booster l'image globale et dynamiser la compétition.",
    effect_json: [{ type: 'global', metric: 'image', mult: 1.35 }],
    effectLabel: 'Image ×1.35 — toutes marques',
  },
];

export default function GameMasterPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const selectSession = (s: Session | null) => {
    if (s) localStorage.setItem(LS_GM_SESSION, s.id);
    else localStorage.removeItem(LS_GM_SESSION);
    setActiveSession(s);
  };
  const [teams, setTeams] = useState<Team[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [acting, setActing] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [gmTimeLeft, setGmTimeLeft] = useState<number | null>(null);

  const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 40)]);

  // GM timer countdown
  useEffect(() => {
    if (!activeSession?.round_ends_at) { setGmTimeLeft(null); return; }
    const tick = () => {
      const diff = new Date(activeSession.round_ends_at!).getTime() - Date.now();
      setGmTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeSession?.round_ends_at]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (data) setSessions(data as Session[]);
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadSessions();
    // Restore GM active session from localStorage
    const savedId = localStorage.getItem(LS_GM_SESSION);
    if (savedId) {
      supabase.from('sessions').select('*').eq('id', savedId).single().then(({ data }) => {
        if (data && data.status !== 'ended') setActiveSession(data as Session);
        else localStorage.removeItem(LS_GM_SESSION);
      });
    }
  }, [authed, loadSessions]);

  // Load session data
  useEffect(() => {
    if (!activeSession) return;
    const load = async () => {
      const [t, d, e] = await Promise.all([
        supabase.from('teams').select('*').eq('session_id', activeSession.id),
        supabase.from('decisions').select('*').eq('session_id', activeSession.id),
        supabase.from('market_events').select('*').eq('session_id', activeSession.id),
      ]);
      if (t.data) setTeams(t.data as Team[]);
      if (d.data) setDecisions(d.data as Decision[]);
      if (e.data) setEvents(e.data as Event[]);
    };
    load();

    // Realtime
    const ch = supabase.channel(`gm-${activeSession.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${activeSession.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions', filter: `session_id=eq.${activeSession.id}` }, load)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [activeSession]);

  // Auth
  const handleAuth = () => {
    if (pwd === GM_PASSWORD) { setAuthed(true); setPwdError(false); }
    else { setPwdError(true); }
  };

  // Create session
  const createSession = async () => {
    setCreating(true);
    const code = sessionCode.toUpperCase().trim() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase.from('sessions').insert({ code, status: 'waiting', current_round: 1 }).select().single();
    if (error) { addLog(`Erreur : ${error.message}`); }
    else { addLog(`Session ${code} créée`); selectSession(data as Session); await loadSessions(); }
    setCreating(false);
  };

  // Helper — fire random events for a given round (with dedup read from DB to avoid stale state)
  const fireRandomEvents = async (roundNum: number) => {
    const { data: existing } = await supabase
      .from('market_events')
      .select('name')
      .eq('session_id', activeSession!.id)
      .eq('source', 'random');
    const alreadyFired = new Set((existing ?? []).map((e: any) => e.name));
    const available = RANDOM_POOL.filter(e => !alreadyFired.has(e.name));
    if (available.length === 0) return;
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const count = Math.min(Math.random() < 0.6 ? 1 : 2, shuffled.length);
    for (const ev of shuffled.slice(0, count)) {
      const { data } = await supabase.from('market_events').insert({
        session_id: activeSession!.id, round_number: roundNum,
        name: ev.name, description: ev.description,
        effect_json: ev.effect_json, active: true, source: 'random',
      }).select().single();
      if (data) { setEvents(prev => [...prev, data as Event]); addLog(`🎲 [AUTO T${roundNum}] "${ev.name}"`); }
    }
  };

  // Start session
  const startSession = async (status: 'practice' | 'active') => {
    if (!activeSession || acting) return;
    setActing(true);
    const ends = new Date(Date.now() + (status === 'practice' ? 5 : 10) * 60_000).toISOString();
    // Practice uses round 0 to avoid collision with Tour 1 (round 1) decisions
    const round = status === 'practice' ? 0 : Math.max(1, activeSession.current_round);

    // Fire random events for Tour 1 when starting the real game
    if (status === 'active') await fireRandomEvents(round);

    await supabase.from('sessions').update({ status, round_ends_at: ends, current_round: round }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, status, round_ends_at: ends, current_round: round } : prev);
    addLog(status === 'practice' ? 'Tour pratique lancé · round 0 (budget libre)' : `Tour ${round} lancé (10 min)`);
    setActing(false);
  };

  // Reveal results
  const revealResults = async () => {
    if (!activeSession) return;
    if (activeSession.results_revealed) { addLog('Résultats déjà révélés pour ce tour'); return; }
    const roundDecisions = decisions.filter(d => d.round_number === activeSession.current_round);
    const submitted = roundDecisions.filter(d => d.submitted_at);
    const missing = teams.length - submitted.length;
    if (missing > 0) {
      const ok = window.confirm(`⚠️ ${missing} équipe(s) n'ont pas encore soumis leurs décisions. Révéler quand même ?`);
      if (!ok) return;
    }
    setComputing(true);
    addLog('Calcul des scores…');
    try {
      const roundEvents = events.filter(e => e.active && e.round_number === activeSession.current_round);
      const scoresMap = computeRoundResults(roundDecisions as any, roundEvents as any);
      for (const team of teams) {
        const dec = roundDecisions.find(d => d.team_id === team.id);
        if (!dec) continue;
        const scores = scoresMap.get(team.id) ?? { score_ventes: 0, score_image: 0, score_durabilite: 0, score_fidelite: 0, score_global: 0 };
        const totalSpent = (dec.budget_fournisseur ?? 0) + (dec.budget_collection ?? 0) + (dec.budget_prix ?? 0) + (dec.budget_distribution ?? 0) + (dec.budget_communication ?? 0);
        const budgetRemaining = Math.max(0, (team.current_budget ?? 100_000) - totalSpent);
        const budgetNext = Math.min(budgetRemaining + scores.score_ventes * 2000, 300_000);
        await supabase.from('results').insert({
          session_id: activeSession.id, team_id: team.id, round_number: activeSession.current_round,
          event_id: roundEvents[0]?.id ?? null,
          event_ids: roundEvents.map(e => e.id),
          budget_remaining: budgetRemaining, budget_next: budgetNext,
          ...scores,
        });
        await supabase.from('teams').update({
          current_budget: budgetNext,
          cumulative_score: (team.cumulative_score ?? 0) + scores.score_global,
        }).eq('id', team.id);
      }
      await supabase.from('sessions').update({ results_revealed: true }).eq('id', activeSession.id);
      setActiveSession(prev => prev ? { ...prev, results_revealed: true } : prev);
      addLog('Résultats révélés ✓');
    } catch (err: any) {
      addLog(`Erreur : ${err.message}`);
    }
    setComputing(false);
  };

  // Next round — auto-fire random events (with dedup)
  const nextRound = async () => {
    if (!activeSession || acting) return;
    setActing(true);
    const next = activeSession.current_round + 1;
    const ends = new Date(Date.now() + 10 * 60_000).toISOString();

    await fireRandomEvents(next);

    await supabase.from('sessions').update({
      current_round: next, status: 'active',
      results_revealed: false, round_ends_at: ends,
    }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, current_round: next, status: 'active', results_revealed: false, round_ends_at: ends } : prev);
    addLog(`Tour ${next} lancé`);
    setActing(false);
  };

  // End session
  const endSession = async () => {
    if (!activeSession || acting) return;
    setActing(true);
    await supabase.from('sessions').update({ status: 'ended' }).eq('id', activeSession.id);
    setActiveSession(prev => prev ? { ...prev, status: 'ended' } : prev);
    localStorage.removeItem(LS_GM_SESSION);
    addLog('Session terminée');
    setActing(false);
  };

  // Add GM event (manual pick from D-K or custom)
  const addEvent = async () => {
    if (!activeSession) return;
    const entry = selectedCatalogId ? GM_CATALOG.find(e => e.id === selectedCatalogId) : null;
    const name = entry ? entry.name : newEventName.trim();
    const description = entry ? entry.description : newEventDesc.trim();
    if (!name) return;
    const { data } = await supabase.from('market_events').insert({
      session_id: activeSession.id, round_number: activeSession.current_round,
      name, description, active: true, source: 'gm',
      effect_json: entry ? entry.effect_json : null,
    }).select().single();
    if (data) {
      setEvents(prev => [...prev, data as Event]);
      setSelectedCatalogId(null); setNewEventName(''); setNewEventDesc('');
      addLog(`🎯 [GM] "${data.name}" ajouté T${activeSession.current_round}`);
    }
  };

  // Toggle event active
  const toggleEvent = async (ev: Event) => {
    await supabase.from('market_events').update({ active: !ev.active }).eq('id', ev.id);
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, active: !e.active } : e));
    addLog(`Événement "${ev.name}" → ${!ev.active ? 'ACTIF' : 'OFF'}`);
  };

  /* ─── AUTH CARD ─── */
  if (!authed) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212' }}>
        <div style={{ width: 360, background: '#fff', padding: 40, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#888', marginBottom: 12 }}>FUTURS DROPS · ACCÈS ANIMATEUR</div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Game Master</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 10, letterSpacing: '.12em', color: '#888' }}>MOT DE PASSE</label>
            <input
              type="password" value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{
                border: `1px solid ${pwdError ? '#E63329' : '#ddd'}`, padding: '12px 14px',
                fontSize: 16, outline: 'none', background: '#F4F3F1',
              }}
              autoFocus placeholder="••••••"
            />
            {pwdError && <span style={{ fontSize: 12, color: '#E63329' }}>Mot de passe incorrect</span>}
          </div>
          <button onClick={handleAuth} style={{ background: '#121212', color: '#fff', border: 0, padding: '14px 0', fontSize: 14, letterSpacing: '.1em', cursor: 'pointer' }}>
            ENTRER →
          </button>
        </div>
      </div>
    );
  }

  /* ─── GM PANEL ─── */
  const currentRoundDecisions = decisions.filter(d => d.round_number === (activeSession?.current_round ?? 1));
  const submittedCount = currentRoundDecisions.filter(d => d.submitted_at).length;

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F3F1' }}>
      {/* Top bar */}
      <div style={{ background: '#121212', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#fff', fontSize: 13, letterSpacing: '.1em' }}>FUTURS DROPS · GM</span>
          {activeSession && (
            <>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
                {activeSession.code}
              </span>
              <button
                onClick={() => selectSession(null)}
                style={{ background: 'none', color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.2)', padding: '4px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '.06em' }}
              >
                ← Sessions
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {gmTimeLeft !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: gmTimeLeft < 120 ? '#E63329' : '#4ade80', animation: 'pulse 1.4s ease infinite', flexShrink: 0 }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, color: gmTimeLeft < 120 ? '#E63329' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(gmTimeLeft / 60)}:{String(gmTimeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          )}
          {activeSession && (
            <button
              onClick={() => setShowQr(true)}
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: 0, padding: '7px 14px', fontSize: 11, letterSpacing: '.08em', cursor: 'pointer' }}
            >
              QR →
            </button>
          )}
          <a href="/" style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, textDecoration: 'none' }}>Vue joueur</a>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>

        {/* Session selector */}
        {!activeSession && (
          <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 32, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem' }}>Créer ou rejoindre une session</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <input
                value={sessionCode} onChange={e => setSessionCode(e.target.value.toUpperCase())}
                placeholder="CODE PERSONNALISÉ (optionnel)"
                style={{ flex: 1, border: '1px solid #e0ddd9', padding: '11px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.12em', background: '#F4F3F1', outline: 'none' }}
                maxLength={6}
              />
              <button
                onClick={createSession} disabled={creating}
                style={{ background: '#121212', color: '#fff', border: 0, padding: '11px 24px', fontSize: 13, cursor: 'pointer', letterSpacing: '.06em' }}
              >
                {creating ? '…' : 'CRÉER →'}
              </button>
            </div>
            {sessions.length > 0 && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 12 }}>SESSIONS EXISTANTES</div>
                {sessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14 }}>{s.code}</span>
                      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>{s.status}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>Tour {s.current_round}</span>
                    </div>
                    <button
                      onClick={() => selectSession(s)}
                      style={{ background: '#121212', color: '#fff', border: 0, padding: '7px 16px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Gérer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSession && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.12fr 1fr', gap: 16 }}>

            {/* ── COL 1 — Controls ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Session info */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>SESSION</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22 }}>{activeSession.code}</span>
                  <span style={{ fontSize: 11, background: '#F4F3F1', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '.08em', alignSelf: 'center' }}>
                    {activeSession.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{activeSession.current_round === 0 ? 'Tour Pratique' : `Tour ${activeSession.current_round}/5`} · {teams.length} marque{teams.length > 1 ? 's' : ''}</div>
              </div>

              {/* Controls */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 6 }}>CONTRÔLES</div>

                {activeSession.status === 'waiting' && (
                  <>
                    <button onClick={() => startSession('practice')} disabled={acting} style={btnStyle('#6E6F4B', acting)}>▶ Tour pratique (5 min)</button>
                    <button onClick={() => startSession('active')} disabled={acting} style={btnStyle('#121212', acting)}>▶ Lancer Tour 1 (10 min)</button>
                  </>
                )}
                {activeSession.status === 'practice' && (
                  <button onClick={() => startSession('active')} disabled={acting} style={btnStyle('#121212', acting)}>▶ Fin pratique → Tour 1</button>
                )}
                {activeSession.status === 'active' && !activeSession.results_revealed && (
                  <button onClick={revealResults} disabled={computing || acting} style={btnStyle('#E63329', computing || acting)}>
                    {computing ? '… Calcul en cours' : '⚡ Révéler résultats'}
                  </button>
                )}
                {activeSession.status === 'active' && activeSession.results_revealed && activeSession.current_round < 5 && (
                  <button onClick={nextRound} disabled={acting} style={btnStyle('#121212', acting)}>
                    {acting ? '…' : `▶ Tour ${activeSession.current_round + 1}`}
                  </button>
                )}
                {activeSession.current_round >= 5 && activeSession.results_revealed && (
                  <button onClick={endSession} disabled={acting} style={btnStyle('#888', acting)}>■ Terminer la session</button>
                )}
              </div>

              {/* Submission status */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>SOUMISSIONS {activeSession.current_round === 0 ? 'PRATIQUE' : `T${activeSession.current_round}`}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>{submittedCount}/{teams.length}</div>
                <div style={{ height: 4, background: '#eee', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: teams.length > 0 ? `${(submittedCount / teams.length) * 100}%` : '0%', background: '#127a3e', transition: 'width .3s' }} />
                </div>
                {teams.map(tm => {
                  const dec = currentRoundDecisions.find(d => d.team_id === tm.id);
                  const submitted = !!dec?.submitted_at;
                  return (
                    <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eeeb', fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, background: tm.brand_color, display: 'block', flexShrink: 0 }} />
                      <span style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.04em' }}>{tm.brand_name}</span>
                      <span style={{ fontSize: 11, color: submitted ? '#127a3e' : '#B86B4B' }}>
                        {submitted ? '✓' : '…'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Log */}
              <div style={{ background: '#121212', border: '1px solid #222', padding: 20, maxHeight: 200, overflow: 'auto' }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#555', marginBottom: 10 }}>LOG</div>
                {log.map((l, i) => (
                  <div key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#aaa', marginBottom: 4 }}>{l}</div>
                ))}
              </div>
            </div>

            {/* ── COL 2 — Team decisions ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 20 }}>DÉCISIONS {activeSession.current_round === 0 ? 'PRATIQUE' : `TOUR ${activeSession.current_round}`}</div>
                {teams.length === 0 && (
                  <p style={{ fontSize: 13, color: '#aaa' }}>Aucune marque connectée</p>
                )}
                {teams.map(tm => {
                  const dec = currentRoundDecisions.find(d => d.team_id === tm.id);
                  const modules = ['fournisseur', 'collection', 'prix', 'distribution', 'communication'];
                  const total = dec ? modules.reduce((s, m) => s + (dec[`budget_${m}`] ?? 0), 0) : 0;
                  return (
                    <div key={tm.id} style={{ borderBottom: '1px solid #f0eeeb', paddingBottom: 20, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ width: 12, height: 12, background: tm.brand_color, display: 'block', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>{tm.brand_name}</span>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#888' }}>
                          {(total / 1000).toFixed(0)}k€
                        </span>
                      </div>
                      {dec && modules.map(m => {
                        const v = dec[`budget_${m}`] ?? 0;
                        const budget = tm.current_budget ?? 100_000;
                        const pct = budget > 0 ? (v / budget) * 100 : 0;
                        return (
                          <div key={m} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                              <span style={{ textTransform: 'uppercase', letterSpacing: '.06em', color: '#888' }}>{m}</span>
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#888' }}>{(v / 1000).toFixed(0)}k€ · {Math.round(pct)}%</span>
                            </div>
                            <div style={{ height: 3, background: '#eee' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#121212' }} />
                            </div>
                          </div>
                        );
                      })}
                      {!dec && <p style={{ fontSize: 11, color: '#aaa' }}>— aucune décision</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COL 3 — Events ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Random events fired this round (info only) */}
              {(() => {
                const randomThisRound = events.filter(e => (e as any).source === 'random' && e.round_number === activeSession.current_round);
                return randomThisRound.length > 0 ? (
                  <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#666', marginBottom: 14 }}>🎲 ÉVÉNEMENTS ALÉATOIRES {activeSession.current_round === 0 ? 'PRATIQUE' : `T${activeSession.current_round}`}</div>
                    {randomThisRound.map(ev => {
                      const entry = RANDOM_POOL.find(r => r.name === ev.name);
                      return (
                        <div key={ev.id} style={{ borderBottom: '1px solid #2a2a2a', paddingBottom: 12, marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{ev.name}</span>
                            <button
                              onClick={() => toggleEvent(ev)}
                              style={{
                                background: ev.active ? '#127a3e' : '#333',
                                color: ev.active ? '#fff' : '#666',
                                border: 0, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                              }}
                            >
                              {ev.active ? 'ACTIF' : 'OFF'}
                            </button>
                          </div>
                          {entry && <div style={{ fontSize: 10, color: '#555', letterSpacing: '.05em' }}>⚡ {entry.effectLabel}</div>}
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}

              {/* GM catalog D-K */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 16 }}>🎯 CARTES GM — {activeSession.current_round === 0 ? 'PRATIQUE' : `TOUR ${activeSession.current_round}`}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {GM_CATALOG.map(entry => {
                    const sel = selectedCatalogId === entry.id;
                    const CAT_COLORS: Record<string, string> = { tendance: '#2B4A8B', economique: '#6E6F4B', social: '#B86B4B' };
                    const color = CAT_COLORS[entry.category] ?? '#121212';
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedCatalogId(sel ? null : entry.id)}
                        style={{
                          background: sel ? '#121212' : '#F4F3F1',
                          color: sel ? '#fff' : '#121212',
                          border: `1px solid ${sel ? '#121212' : '#e0ddd9'}`,
                          padding: '10px 13px', fontSize: 12, cursor: 'pointer',
                          textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{entry.id} — {entry.name}</span>
                        <span style={{ fontSize: 10, letterSpacing: '.05em', color: sel ? 'rgba(255,255,255,.6)' : color }}>
                          {entry.effectLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom narrative event */}
                {!selectedCatalogId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, padding: '12px', background: '#F4F3F1', border: '1px solid #e0ddd9' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.1em', color: '#aaa' }}>OU ÉVÉNEMENT NARRATIF LIBRE</div>
                    <input
                      value={newEventName} onChange={e => setNewEventName(e.target.value)}
                      placeholder="Nom de l'événement"
                      style={{ border: '1px solid #e0ddd9', background: '#fff', padding: '9px 12px', fontSize: 13, outline: 'none' }}
                    />
                    <textarea
                      value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)}
                      placeholder="Description narrative (sans effet mécanique)"
                      rows={2}
                      style={{ border: '1px solid #e0ddd9', background: '#fff', padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                )}

                <button
                  onClick={addEvent}
                  disabled={!selectedCatalogId && !newEventName.trim()}
                  style={btnStyle('#121212', !selectedCatalogId && !newEventName.trim())}
                >
                  {selectedCatalogId
                    ? `▶ Activer : ${GM_CATALOG.find(e => e.id === selectedCatalogId)?.name}`
                    : '+ Ajouter événement narratif'
                  }
                </button>

                {/* GM events already added this session */}
                {events.filter(e => (e as any).source === 'gm').length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.1em', color: '#aaa', marginBottom: 10 }}>CARTES JOUÉES</div>
                    {events.filter(e => (e as any).source === 'gm').map(ev => {
                      const entry = GM_CATALOG.find(c => c.name === ev.name);
                      return (
                        <div key={ev.id} style={{ border: '1px solid #e8e6e3', padding: '11px 13px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{ev.name}</span>
                            <button
                              onClick={() => toggleEvent(ev)}
                              style={{
                                background: ev.active ? '#121212' : '#F4F3F1',
                                color: ev.active ? '#fff' : '#888',
                                border: '1px solid ' + (ev.active ? '#121212' : '#e0ddd9'),
                                padding: '3px 9px', fontSize: 10, cursor: 'pointer',
                              }}
                            >
                              {ev.active ? 'ACTIF' : 'OFF'}
                            </button>
                          </div>
                          {entry && <div style={{ fontSize: 10, color: '#127a3e' }}>⚡ {entry.effectLabel}</div>}
                          <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>T{ev.round_number}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Session URL */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e3', padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 14 }}>LIEN JOUEURS</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, background: '#F4F3F1', padding: '12px 14px', wordBreak: 'break-all', marginBottom: 12 }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/
                </div>
                <button
                  onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + '/'); }}
                  style={btnStyle('#6E6F4B')}
                >
                  Copier le lien
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* QR overlay */}
      {showQr && activeSession && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 320 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#888' }}>SCANNEZ POUR REJOINDRE</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : 'https://futursgame.vercel.app') + '/')}&format=png&margin=2`}
              alt="QR Code"
              width={220}
              height={220}
              style={{ margin: '0 auto', display: 'block' }}
            />
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#888', marginBottom: 8 }}>OU ENTREZ LE CODE</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 48, fontWeight: 700, letterSpacing: '.1em' }}>{activeSession.code}</div>
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{typeof window !== 'undefined' ? window.location.origin : 'futursgame.vercel.app'}/</div>
            <button onClick={() => setShowQr(false)} style={btnStyle('#121212')}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    background: disabled ? '#aaa' : bg, color: '#fff', border: 0, padding: '11px 16px',
    fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' as const,
    cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', textAlign: 'center' as const,
    opacity: disabled ? 0.6 : 1, transition: 'opacity .2s',
  };
}

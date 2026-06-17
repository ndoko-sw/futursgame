# Futurs Drops — Session Context
> Dernière mise à jour : 2026-06-12  
> À utiliser pour reprendre la session sur mobile (claude.ai ou Claude Code)

---

## Projet en une phrase
**Futurs Drops** est un jeu multijoueur de simulation de marque de mode (inspiré Cesim), brandé futursdjassa.com, destiné à un popup lors de la fashion week de Paris.  
Stack: **Next.js 13.5.1 + TypeScript + Tailwind + Supabase (realtime)**

---

## Répertoire du projet
```
/Users/samy-williamndoko/Projects/futursgame/
```
Repo GitHub public : https://github.com/ndoko-sw/futursgame

---

## Variables d'environnement (`.env.local` — NE PAS COMMITTER)
```
NEXT_PUBLIC_SUPABASE_URL=https://vuyjiqkmglcemnruiwnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_93sr8t9hUWSBM5EUD-U5Mw_7y8Juj56
```
> Note: `sb_publishable_...` est le nouveau format supabase-js v2.58+ — c'est correct.

---

## Architecture Supabase
- Projet : `vuyjiqkmglcemnruiwnx`
- Tables : `sessions`, `teams`, `decisions`, `results`, `market_events`
- RLS : policies `anon` open (migration 002 déjà appliquée)
- Realtime : activé sur toutes les tables (déjà dans publication bolt.new)
- Migrations appliquées :
  - `20260610145014_001_create_game_schema.sql` ✅
  - `20260610160000_002_fix_rls_anon.sql` ✅

---

## Design System (tokens)
| Token | Valeur |
|-------|--------|
| Background | `#FFFFFF` |
| Ink | `#121212` |
| Scarlet | `#E63329` (timer urgent + rank #1 SEULEMENT) |
| Green | `#127a3e` (états positifs) |
| Border-radius | `0` partout |
| Font principale | Work Sans (300, 400, 500) |
| Font nombres/mono | IBM Plex Mono (400) |
| Muted text | `#9A9A9A` |
| Subtle text | `#6E6E6E` |

---

## Mécanique du jeu
- **5 tours simultanés** (12 min chacun)
- **Budget** : 100 000 € par équipe par tour
- **Brand Score** = Ventes 30% + Image 30% + Durabilité 20% + Fidélité 20%
- **Produits** : max 1 (Tour 1) / 2 (Tour 2) / 3 (Tour 3+)
- **5 styles fixés** : `casual_luxe | streetwear | techwear | avant_garde | minimaliste`
- **Modules de budget** : 01 Fournisseur, 02 Collection, 04 Distribution, 05 Communication
- **Pas de budget** sur : 03 Prix (libre), 06 Focus (choix stratégique uniquement)
- **Panel admin** : accessible via `⚙` FAB (15% opacité) + `Cmd/Ctrl+Shift+A` — PAS dans la nav joueur

---

## Fichiers clés créés / modifiés

### Composants V3 (Claude Design)
- `components/game-header.tsx` — header frosted glass, timer pill, drawer hamburger (sans admin), mobile budget row
- `components/bottom-nav.tsx` — nav mobile bas (5 items, actif = fond noir, `md:hidden`)
- `components/garment-svgs.tsx` — 6 SVG flat-sketch fashion : haut, bas, veste, robe, acc, chaussure

### Pages
- `app/page.tsx` — home (join session)
- `app/brand/page.tsx` — Ma Marque : identité + focus + budget
- `app/portfolio/page.tsx` — Portfolio produits avec garment SVG ✅ NOUVEAU
- `app/market/page.tsx` — Marché + événements
- `app/leaderboard/page.tsx` — Classement temps réel
- `app/results/page.tsx` — Résultats fin de tour
- `app/admin/page.tsx` — Panel Game Master

### Core
- `lib/types.ts` — types TypeScript (CollectionStyle, Team, Decision, etc.)
- `lib/simulation.ts` — moteur de calcul `computeRoundResults()`
- `lib/supabase.ts` — client Supabase avec realtime
- `lib/game-context.tsx` — Context React + subscriptions realtime + timer
- `app/globals.css` — tokens CSS V3, classes utilitaires (.wrap, .alloc-table, .garment-catgrid, etc.)
- `app/layout.tsx` — layout root avec GameHeader + BottomNav

### Assets
- `public/futurs-logo.png` (logo principal)
- `public/futurs-logo.jpg`
- `public/logo_futurs.webp`

---

## État actuel
Les modifications Claude Design V3 ont été intégrées :
- ✅ Header V3 avec announcement bar, frosted glass, hamburger drawer, mobile budget row
- ✅ Bottom nav mobile (5 items, sans admin)
- ✅ Composant GarmentSVG (6 silhouettes flat-sketch)
- ✅ globals.css enrichi : wrap, alloc-table, garment-catgrid, score-card, rank-badge, product-tabs, event-ticker
- ✅ Page Portfolio créée avec tabs produits et barre budget

---

## Ce qui reste à faire (prochaine session)

### Court terme
1. **Tester le projet en local** : `cd /Users/samy-williamndoko/Projects/futursgame && npm run dev`
2. **Page brand/portfolio** : implémenter la saisie produit (nom, style, garment, prix, couleur) dans `app/brand/page.tsx` — stocker dans `decisions.data.products[]`
3. **Moteur simulation** : affiner `lib/simulation.ts` — ajouter events de marché qui modifient les scores
4. **Budget 100k€** : vérifier que `game-context.tsx` passe le budget restant à l'UI

### Moyen terme
5. **Page résultats** : graphiques Brand Score par équipe, comparaison tours
6. **Panel admin** : bouton "Ajouter événement marché" fonctionnel
7. **Mobile test** : tester sur vrai téléphone (safe area, scroll, bottom nav)

### Futur (sprint séparé)
- Déploiement Vercel → `game.futursdjassa.com`
- Multi-session (plusieurs parties simultanées)
- Export résultats PDF

---

## Lancer le projet
```bash
cd /Users/samy-williamndoko/Projects/futursgame
npm run dev
# → http://localhost:3000
```

## Accès admin (en jeu)
- URL : `/admin`
- Shortcut : `Cmd+Shift+A` (ou `Ctrl+Shift+A`)
- FAB ⚙ dans le coin bas-droit (15% opacité)

---

## Références Claude Design V3 (source)
Fichiers extraits dans `/tmp/futursdropv3/futurs-drops/project/` :
- `Futurs Drops V3.html` — prototype HTML complet (900 lignes)
- `styles-v3.css` — CSS complet (802 lignes)  
- `app-v3.js` — moteur JS (668 lignes) : router, timer, budget, i18n, admin, SVG garments

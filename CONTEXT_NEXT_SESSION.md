# Futurs Drops — Contexte pour nouvelle session
> Généré le : 2026-06-16  
> Projet : `/Users/samy-williamndoko/Projects/futursgame`  
> Repo GitHub : https://github.com/ndoko-sw/futursgame

---

## Ce que c'est

**Futurs Drops** — jeu multijoueur de simulation de marque de mode pour popup fashion week futursdjassa.com.  
Stack : Next.js 13.5.1 + TypeScript + Tailwind + Supabase (realtime).

---

## Lancer le projet

```bash
cd /Users/samy-williamndoko/Projects/futursgame
npm run dev
# → http://localhost:3000
```

Supabase déjà configuré dans `.env.local` (ne pas committer) :
```
NEXT_PUBLIC_SUPABASE_URL=https://vuyjiqkmglcemnruiwnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_93sr8t9hUWSBM5EUD-U5Mw_7y8Juj56
```

---

## Architecture des pages

| URL | Rôle |
|-----|------|
| `/` | Accueil joueur — saisir code session + créer marque |
| `/brand` | Décisions tour : budget 100k€ + fournisseur + style + prix + distribution + comm |
| `/portfolio` | Récap collection + breakdown budget + résultats du tour |
| `/market` | Événements marché actifs + insights |
| `/leaderboard` | Classement temps réel |
| `/results` | Graphiques résultats (radar + bar chart) |
| `/gamemaster` | **Panel Game Master** (mot de passe requis) |
| `/admin` | Redirige → `/gamemaster` |

---

## Game Master

**URL** : http://localhost:3000/gamemaster  
**Mot de passe** : `futursdjassa26`  
**Accès depuis la home** : lien discret "ACCÈS ORCHESTRATEUR" en bas de page

### Ce que peut faire le GM :
- Créer / sélectionner des sessions
- Voir les équipes connectées + qui a soumis ses décisions ce tour
- Démarrer pratique / passer au tour suivant / pause / reprendre / terminer
- **Activer des événements marché** depuis un catalogue de 16 événements organisés en 4 catégories
- Calculer les résultats (applique les événements actifs dans le score)

### Catalogue événements (16 entrées) :
- **Canal comm** : TikTok Viral, Couverture presse, Fashion Week buzz, Mega-collab influenceur
- **Fournisseur** : Backlash Fast Fashion EU, Made in Europe Premium, Hype capsule artisanale, Spotlight artisanat africain
- **Style** : Streetwear domine, Minimalisme premium, Avant-garde au musée, Techwear mainstream
- **Global** : Crise économique, Crise durabilité mondiale, Paris FW buzz total, Boom fidélité client

---

## Mécanique de jeu

- **5 tours** (12 min chacun) + 1 tour pratique (tour 0)
- **Budget** : 100 000 € par équipe par tour → 4 modules : Fournisseur, Collection, Distribution, Communication
- **Brand Score** = Ventes×30% + Image×30% + Durabilité×20% + Fidélité×20%
- **Produits max** : 1 (tour 1) / 2 (tour 2) / 3 (tours 3-5)
- **5 styles** : `casual_luxe | streetwear | techwear | avant_garde | minimaliste`
- **Modules budget** : 01 Fournisseur, 02 Collection, 04 Distribution, 05 Communication
- **Pas de budget** pour : 03 Prix (slider libre), 06 Focus (choix stratégique)

---

## Base de données Supabase

Tables : `sessions`, `teams`, `decisions`, `results`, `market_events`  
Migrations appliquées :
- `001_create_game_schema.sql` ✅
- `002_fix_rls_anon.sql` ✅  
- `003_add_budget_columns.sql` ✅ (budget_fournisseur, budget_collection, budget_distribution, budget_communication)

---

## Design system

| Token | Valeur |
|-------|--------|
| Fond | `#FFFFFF` |
| Encre | `#121212` |
| Scarlet | `#E63329` (timer urgent + rank #1 SEULEMENT) |
| Vert | `#127a3e` (états positifs) |
| Border-radius | `0` partout |
| Font | Work Sans (300/400/500) |
| Nombres | IBM Plex Mono (400) |

---

## Fichiers clés

```
lib/
  types.ts          — tous les types TypeScript (MarketEffectData, Decision, etc.)
  simulation.ts     — computeRoundResults(decisions, round, activeEvents)
  game-context.tsx  — Provider React + Supabase realtime + timer
  supabase.ts       — client Supabase

app/
  page.tsx          — home / lobby joueur
  brand/page.tsx    — décisions + budget 100k€
  portfolio/page.tsx
  market/page.tsx
  leaderboard/page.tsx
  results/page.tsx
  gamemaster/page.tsx  — panel GM complet (auth + sessions + events)

components/
  game-header.tsx   — announcement bar + header frosted glass + drawer
  bottom-nav.tsx    — nav mobile 5 items
  garment-svgs.tsx  — 6 SVGs flat-sketch mode
```

---

## Ce qui reste à faire (prochaines sessions)

### Prioritaire
1. **Fix logo flou** — remplacer `public/futurs-logo.png` (320×320, flou) par la version nette fournie par l'utilisateur. Copier simplement le fichier PNG net dans `public/futurs-logo.png`.
2. **Tester le flow complet** en local avec vraies équipes :
   - GM crée session → joueurs rejoignent → GM lance tour → joueurs soumettent → GM active événement → GM calcule → classement
3. **Market page** : afficher les événements actifs du tour (lecture temps réel depuis `market_events` via `game-context.tsx`)
4. **Page résultats** : vérifier que les graphiques recharts s'affichent correctement

### Court terme
5. **Timer auto-fin de round** : quand `round_ends_at` expire, passer automatiquement au statut `paused` côté serveur (actuellement le GM doit manuellement calculer)
6. **Page résultats classement final** : afficher podium après round 5 + stats récapitulatives par équipe
7. **Persistance session joueur** : si le joueur ferme et rouvre l'app, retrouver sa session via localStorage

### Déploiement (sprint séparé)
8. Vercel → `game.futursdjassa.com`
9. Variable `NEXT_PUBLIC_SUPABASE_*` dans Vercel env vars

---

## Notes importantes

- Le GM n'est PAS un joueur — il n'a pas de marque, il orchestre
- Les événements marché activés par le GM s'appliquent au calcul des scores du tour en cours
- L'auth GM est client-side (localStorage) — suffisant pour un usage popup event
- La simulation intègre un jitter aléatoire (±15%) pour rendre chaque tour imprévisible
- `comm_budget` dans la DB est dérivé automatiquement du `budget_communication` en % (pour compatibilité)

# Futurs Drops — Contexte de session

## Projet
Jeu de simulation de marque de mode multijoueur pour le popup **futursdjassa.com** (fashion week).
- **Repo GitHub** : ndoko-sw/futursgame  
- **Déployé sur** : https://futursgame.vercel.app  
- **Stack** : Next.js 13.5 App Router, TypeScript, Supabase (Realtime + RLS)  
- **Répertoire local** : `/Users/samy-williamndoko/Projects/futursgame/`

## Contraintes de sécurité (NE PAS MODIFIER)
- Mot de passe GM : `djassa` — hardcodé, à conserver tel quel
- GitHub PAT : conservé dans le code existant jusqu'à la finalisation du jeu (ne pas recopier le token en clair dans des fichiers — GitHub bloque le push via secret scanning)

## Migrations Supabase exécutées (toutes validées ✅)
1. `20260618_scoring_v2.sql` — `results` +investor_grade/subsidy_amount/product_scores ; table `team_events`
2. `20260618_phase1.sql` — `decisions` +brand_positioning/brand_value/notoriety_budget/supplier_commitment ; `teams` +brand_equity/hype ; `results` +leader_kpis/press_reviews/supplier_status ; table `broadcasts`
3. `20260618_phase2.sql` — table `team_missions`
4. `20260618_phase3.sql` — `sessions` +round_duration_seconds/paused_remaining_seconds/collab_enabled ; table `collaborations` avec RLS

## Architecture du moteur de scoring (`lib/simulation.ts`)

### Modèle S-curve (smoothstep)
```typescript
function budgetAmp(amount: number, optimal: number): number {
  const t = Math.max(0, Math.min(1, Math.max(0, amount) / optimal));
  return t * t * (3 - 2 * t); // 0 budget = 0 score, optimal = plein potentiel
}
// OPT_SUPPLIER=13000, OPT_COLLECTION=10000, OPT_COMM=15000, OPT_DIST=15000
```

### Moteur de cohérence stratégique
`strategicCoherence(product, focus, events)` → multiplicateur [0.78, 1.20] selon cohérence prix↔fournisseur↔canaux de comm↔focus marque↔tendances marché.

### 5 passes de scoring (`computeRoundResults`)
1. Capacité fournisseurs (pénalités si dépassement : ventes ×0.78, fidélité ×0.88)
2. Scores produits + cohérence + synergie brand value
3. Demande de marché partagée par style (`STYLE_DEMAND`)
4. Brand equity / hype loop
5. Bonus leader KPI

### Constantes clés
- `SUPPLIER_CAPACITY` : `{ capsule_artisanale:1, atelier_abidjan:2, collab_createur:2, usine_europe:3, fast_fashion_asie:4 }`
- `POSITIONING_TIER` : `{ essentiel:0.30, contemporain:0.55, premium:0.78, luxe:0.95 }`
- Agrégation égale (1/n par produit, pas pondérée par budget)
- Scoring déterministe — **ZÉRO aléatoire** dans le scoring

## Images produit (`lib/product-image.ts`)
```typescript
const STYLE_FILE: Record<string, string> = {
  casual_luxe: 'luxe', streetwear: 'street', techwear: 'tech',
  avant_garde: 'avant', minimaliste: 'minimal',
  luxe: 'luxe', street: 'street', tech: 'tech', avant: 'avant', minimal: 'minimal',
};
// URL pattern : {SUPABASE_URL}/storage/v1/object/public/image%20produit/{categorie}_{style}.png
// Ex : haut_street.png, veste_luxe.png — tous vérifiés 200 HTTP
```

## Fichiers principaux

| Fichier | Rôle |
|---|---|
| `lib/simulation.ts` | Moteur de scoring complet |
| `lib/product-image.ts` | Mapping styles → noms de fichiers Supabase |
| `lib/missions.ts` | 8 missions secrètes avec `check()` |
| `lib/types.ts` | Types TypeScript (Decision, Team, RoundResult, Broadcast, TeamEvent, Collaboration) |
| `app/gamemaster/page.tsx` | Console GM : reveal, undo, carryOver, timer, broadcasts, events, collab |
| `app/brand/page.tsx` | Décisions marque + collab propose/accept/refuse |
| `app/produit/page.tsx` | Éditeur produits + cohérence live + delete |
| `app/results/page.tsx` | Résultats par équipe, podium suspense tour 5, débrief saison |
| `app/projection/page.tsx` | Mode grand écran optionnel `/projection?code=XXXX` |
| `components/broadcast-banner.tsx` | Bandeau marquee scrollant (34s, badge fixe, ✕ fixe) |
| `components/news-feed.tsx` | Fil d'actu mode (~35 rumeurs, pioche 3-5 par tour) |
| `components/game-header.tsx` | Header avec timer, drawer GM à gauche |
| `app/globals.css` | Ticker 60s, keyframes bcMarquee |
| `app/page.tsx` | Lobby : 16 couleurs de marque, rejoindre/créer session |

## Règles métier importantes

### Timer
- `round_ends_at` en DB → countdown dans le header
- `paused_remaining_seconds` → affiche "EN PAUSE"
- GM peut : changer durée, +1/+2 min, pause/reprise
- `canEdit = roundOpen && !isSubmitted` où `roundOpen = !results_revealed && !timerExpired`

### Un-submit
- Bouton "Modifier mes décisions" disponible tant que le timer tourne
- Mécanisme simple : `submitted_at = null` (pas de changement de structure DB)

### Collaborations
- Activable par le GM avant le tour 1 uniquement — figé une fois lancé
- Propose/accepte/refuse via table `collaborations`
- Bonus appliqués au moment du `revealResults()`

### Missions secrètes
- Assignées au début de chaque tour par `revealResults()` pour le tour suivant
- Table `team_missions` ; reward en points cumulés
- `undoReveal()` remet `completed: false`

### anti-double-reveal
- Guard en mémoire dans `revealResults()` + vérification DB existence résultat

### carryOverProducts
- Lock `carryingOverRef` (mémoire) + vérification existence en DB pour le round cible

## Contraintes utilisateur (NE PAS ENFREINDRE)
- Scoring **déterministe** — aucun `Math.random()` dans le scoring
- Pas de feature "recommandation du board"
- Pas de `prêt investisseur` (trop financier, pas mode)
- Focus tags (Ventes+/Image−) retirés — les joueurs ne voient pas les répercussions chiffrées du focus
- Bandeau broadcast en **marquee** (défile), pas statique
- Ticker header à **60s** exactement (ne pas changer)
- Mode `/projection` est optionnel/additif — les animations GM inline sont indépendantes
- Collab uniquement activable par GM avant tour 1

## État actuel
- Toutes les migrations sont exécutées ✅
- Build Next.js propre (`tsc --noEmit` + `npm run build` passent)
- Vercel déployé automatiquement via push GitHub
- Le jeu n'a pas encore été testé en session live multi-équipes

## Prochaines vérifications recommandées (playtest)
1. Session avec ≥ 3 équipes pour valider capacité fournisseur partagée
2. Collab inter-équipes : propose → accepte → bonus scoring
3. Timer : pause/reprise/extension en cours de partie
4. Un-submit avant expiration du timer
5. Tour 5 : suspense podium + débrief rétrospective saison
6. Missions secrètes : attribution + validation + reward

## Notes de débogage historiques
- `market_events` n'a pas de colonne `round` — utiliser `round_number`
- `round_results` n'est pas le bon nom de table — c'est `results`
- `CREATE POLICY IF NOT EXISTS` est invalide en Postgres — utiliser `DROP POLICY IF EXISTS` + `CREATE POLICY`
- Slider drift : toujours utiliser `max={availableBudget}` stable, jamais une valeur dynamique
- Focus auto-submit : toujours passer `submitted_at: null` explicitement dans les upserts de décision

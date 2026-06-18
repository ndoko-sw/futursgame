const SUPABASE_URL = 'https://vuyjiqkmglcemnruiwnx.supabase.co';
const BUCKET = 'image%20produit';

// Les fichiers Supabase utilisent des noms de style ABRÉGÉS
// (haut_street.png, veste_luxe.png, …). On mappe les clés de style du jeu
// vers ces suffixes.
const STYLE_FILE: Record<string, string> = {
  casual_luxe: 'luxe',
  streetwear:  'street',
  techwear:    'tech',
  avant_garde: 'avant',
  minimaliste: 'minimal',
  // tolérance si une clé déjà abrégée est passée
  luxe: 'luxe', street: 'street', tech: 'tech', avant: 'avant', minimal: 'minimal',
};

export function productImageUrl(category: string, style: string): string {
  const cat = (category ?? 'haut').toLowerCase();
  const rawSty = (style ?? 'casual_luxe').toLowerCase();
  const sty = STYLE_FILE[rawSty] ?? rawSty;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${cat}_${sty}.png`;
}

const SUPABASE_URL = 'https://vuyjiqkmglcemnruiwnx.supabase.co';
const BUCKET = 'image%20produit';

export function productImageUrl(category: string, style: string): string {
  const cat = (category ?? 'haut').toLowerCase();
  const sty = (style ?? 'luxe').toLowerCase();
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${cat}_${sty}.png`;
}

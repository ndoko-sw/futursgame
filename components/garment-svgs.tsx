// Fashion flat-sketch SVG illustrations for garment categories
// Inline SVGs — editorial line-art style, stroke-width 1.2, no fill

export type GarmentKey = 'haut' | 'bas' | 'veste' | 'robe' | 'acc' | 'chaussure';

export interface GarmentDef {
  key: GarmentKey;
  fr: string;
  en: string;
  svg: string;
}

const G = (inner: string) =>
  `<svg viewBox="0 0 70 80" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`;

export const GARMENTS: GarmentDef[] = [
  {
    key: 'haut',
    fr: 'Haut',
    en: 'Top',
    svg: G(
      '<path d="M26 14 L16 19 L10 30 L18 35 L22 31 L22 67 L48 67 L48 31 L52 35 L60 30 L54 19 L44 14"/>' +
      '<path d="M26 14 Q35 21 44 14"/>' +
      '<path d="M35 21 L35 67" stroke-dasharray="2 2"/>' +
      '<path d="M22 62 L48 62" stroke-dasharray="2 2"/>'
    ),
  },
  {
    key: 'bas',
    fr: 'Bas',
    en: 'Bottom',
    svg: G(
      '<path d="M23 16 L47 16 L45 67 L37 67 L35 34 L33 67 L25 67 Z"/>' +
      '<path d="M23 23 L47 23"/>' +
      '<circle cx="35" cy="19.5" r="1.3"/>' +
      '<path d="M35 23 L35 34" stroke-dasharray="2 2"/>' +
      '<path d="M37 67 L36 42 M33 67 L34 42" stroke-dasharray="2 2"/>'
    ),
  },
  {
    key: 'veste',
    fr: 'Veste · Manteau',
    en: 'Jacket · Coat',
    svg: G(
      '<path d="M24 15 L13 21 L16 32 L19 30 L19 64 L51 64 L51 30 L54 32 L57 21 L46 15"/>' +
      '<path d="M28 16 L35 30 L42 16"/>' +
      '<path d="M35 30 L35 64" stroke-dasharray="2 2"/>' +
      '<circle cx="35" cy="40" r="1.2"/>' +
      '<circle cx="35" cy="48" r="1.2"/>' +
      '<path d="M24 52 L31 52 M39 52 L46 52"/>'
    ),
  },
  {
    key: 'robe',
    fr: 'Robe · Combinaison',
    en: 'Dress · Jumpsuit',
    svg: G(
      '<path d="M27 15 L21 19 L25 30 L27 28 L26 36 L15 66 L55 66 L44 36 L43 28 L45 30 L49 19 L43 15"/>' +
      '<path d="M27 15 L35 29 L43 15"/>' +
      '<path d="M26 36 L44 36" stroke-dasharray="2 2"/>' +
      '<path d="M35 29 L35 36" stroke-dasharray="2 2"/>'
    ),
  },
  {
    key: 'acc',
    fr: 'Accessoire',
    en: 'Accessory',
    svg: G(
      '<path d="M26 30 Q35 13 44 30"/>' +
      '<path d="M16 30 L54 30 L51 65 L19 65 Z"/>' +
      '<path d="M17 46 L53 46"/>' +
      '<rect x="32" y="43" width="6" height="5"/>' +
      '<path d="M21 56 L49 56" stroke-dasharray="2 2"/>'
    ),
  },
  {
    key: 'chaussure',
    fr: 'Chaussure',
    en: 'Shoe',
    svg: G(
      '<path d="M9 58 L61 58 L60 63 L11 63 Z"/>' +
      '<path d="M11 58 C11 47 19 43 29 43 L41 45 C49 47 55 51 58 58"/>' +
      '<path d="M24 43 L26 38 L33 38 L35 45"/>' +
      '<path d="M27 47 L35 45 M28 51 L36 49 M30 55 L37 53" stroke-dasharray="2 2"/>' +
      '<path d="M56 58 L56 50"/>'
    ),
  },
];

export function GarmentSVG({ gkey, className = '' }: { gkey: GarmentKey; className?: string }) {
  const g = GARMENTS.find((x) => x.key === gkey) ?? GARMENTS[0];
  return (
    <svg
      viewBox="0 0 70 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: g.svg.replace(/<svg[^>]*>|<\/svg>/g, '') }}
    />
  );
}

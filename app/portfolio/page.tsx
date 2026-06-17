'use client';

import { useGame } from '@/lib/game-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { productImageUrl } from '@/lib/product-image';

const MAX_PRODUCTS = 3;

export default function PortfolioPage() {
  const { session, team, decisions, currentRound } = useGame();
  const router = useRouter();

  if (!session || !team) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <a href="/"><button className="btn">Rejoindre →</button></a>
      </div>
    );
  }

  // Collect all unique products across decisions
  const allProducts: Array<{ name: string; category: string; style: string; addedRound: number }> = [];
  decisions.forEach((d) => {
    if (d.product_name && !allProducts.find(p => p.name === d.product_name)) {
      allProducts.push({
        name: d.product_name,
        category: d.product_category ?? 'haut',
        style: d.product_style ?? 'luxe',
        addedRound: d.round_number,
      });
    }
  });

  const slots = Array.from({ length: MAX_PRODUCTS }, (_, i) => allProducts[i] ?? null);
  const canAddProduct = allProducts.length < MAX_PRODUCTS && currentRound > 1;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="wrap">

        {/* Header */}
        <div style={{ padding: '36px 0 40px', borderBottom: '1px solid var(--line)', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 32, height: 32, background: team.brand_color, display: 'block' }} />
            <div>
              <span className="u-eyebrow">Portfolio de</span>
              <h2 style={{ margin: '4px 0 0', fontSize: 'var(--t-3)' }}>{team.brand_name}</h2>
            </div>
          </div>
        </div>

        {/* Slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 56 }}>
          {slots.map((product, i) => {
            if (product) {
              return (
                <div key={i} style={{ border: '1px solid var(--line)' }}>
                  {/* Product image */}
                  <div style={{ aspectRatio: '3/4', background: '#fff', position: 'relative', borderBottom: '1px solid var(--line)' }}>
                    <Image
                      src={productImageUrl(product.category, product.style)}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>
                  <div style={{ padding: '16px 16px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      {product.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ border: '1px solid var(--line)', fontSize: 10, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {product.category}
                      </span>
                      <span style={{ border: '1px solid var(--line)', fontSize: 10, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {product.style}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Lancé T{product.addedRound}
                    </div>
                  </div>
                </div>
              );
            }

            // Empty / locked slot
            const isLocked = i > 0 && i >= allProducts.length && currentRound <= i;
            return (
              <div
                key={i}
                style={{
                  border: `1px dashed ${isLocked ? 'var(--line)' : 'var(--ink)'}`,
                  aspectRatio: '3/4', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16,
                  cursor: isLocked ? 'default' : canAddProduct ? 'pointer' : 'default',
                  opacity: isLocked ? .4 : 1,
                }}
                onClick={() => !isLocked && canAddProduct && router.push('/produit?new=1')}
              >
                {isLocked ? (
                  <>
                    <span style={{ fontSize: 24, opacity: .35 }}>🔒</span>
                    <span className="u-label" style={{ color: 'var(--faint)', fontSize: 10 }}>DÉBLOQUE T{i + 1}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 28 }}>+</span>
                    <span className="u-label" style={{ fontSize: 10 }}>{canAddProduct ? 'AJOUTER UN PRODUIT' : 'SLOT DISPONIBLE'}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Info banner */}
        <div style={{ background: 'var(--fill)', padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>ⓘ</span>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Tu peux avoir jusqu'à <strong style={{ color: 'var(--ink)' }}>3 produits actifs</strong>.
            Chaque produit actif dilue ton budget de communication, mais élargit ton reach.
            Ajoute un produit depuis le module <em>Collection</em> à partir du Tour 2.
          </div>
        </div>

      </div>
    </div>
  );
}

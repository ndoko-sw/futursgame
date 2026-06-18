'use client';

// Pied de page discret — « fait avec amour par » + miniature.
// Volontairement très petit pour ne pas gêner la navigation.
export default function SiteFooter() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '20px 16px 28px',
        opacity: 0.55,
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'var(--muted, #888)',
          fontFamily: 'IBM Plex Mono, monospace',
        }}
      >
        fait avec amour par
      </span>
      <img
        src="https://vuyjiqkmglcemnruiwnx.supabase.co/storage/v1/object/public/futurslogo/Screenshot%202026-06-18%20at%2019.12.32.png"
        alt="Futurs"
        height={16}
        style={{ height: 16, width: 'auto', objectFit: 'contain', display: 'block' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </footer>
  );
}

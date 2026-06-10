import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Work Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Modular scale 1.25, base 14px
        'scale-xs':   ['0.700rem', { lineHeight: '1.4', letterSpacing: '0.10em' }],
        'scale-sm':   ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
        'scale-base': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'scale-md':   ['1.094rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'scale-lg':   ['1.367rem', { lineHeight: '1.2', letterSpacing: '0.02em' }],
        'scale-xl':   ['1.709rem', { lineHeight: '1.1', letterSpacing: '0.03em' }],
        'scale-2xl':  ['2.136rem', { lineHeight: '1.0', letterSpacing: '0.03em' }],
        'scale-3xl':  ['2.670rem', { lineHeight: '1.0', letterSpacing: '0.04em' }],
        'scale-4xl':  ['3.337rem', { lineHeight: '0.95', letterSpacing: '0.04em' }],
      },
      colors: {
        ink: '#121212',
        paper: '#FFFFFF',
        mist: '#f5f5f5',
        scarlet: '#E63329',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: { lg: '0px', md: '0px', sm: '0px' },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;

import type { Config } from 'tailwindcss';

// Design direction: a back-office ledger tool, not a marketing SaaS template.
// The audience (Indian SMBs, distributors, CA offices) lives in spreadsheets
// and paper invoices all day — the palette and type lean into that (paper
// background, ink text, a ledger green for the brand/accent) rather than the
// generic dark-mode-plus-neon-accent or cream-plus-terracotta defaults.
//
// Fonts are system stacks, not next/font/google — this keeps `next build`
// runnable in network-restricted environments (no Google Fonts CDN access
// needed at build time). Swap in next/font/local with real files, or
// next/font/google once you're building somewhere with normal internet
// access, for more distinctive type.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        surface: '#FCFBF8',
        ink: {
          DEFAULT: '#1B2430',
          muted: '#5B6472',
          faint: '#8A93A0',
        },
        border: '#D9D3C7',
        ledger: {
          DEFAULT: '#3F5A44',
          dark: '#2E4433',
          light: '#E7EDE7',
        },
        ochre: {
          DEFAULT: '#B8862B',
          light: '#F5EBD6',
        },
        brick: {
          DEFAULT: '#A8402F',
          light: '#F6E4E0',
        },
      },
      fontFamily: {
        display: ['ui-serif', 'Iowan Old Style', 'Georgia', 'Cambria', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};

export default config;

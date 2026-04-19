/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base
        'bg-base': '#0a0a0a',
        'bg-surface': '#0f0f0f',
        'bg-raised': '#141414',
        'bg-card': '#1a1a1a',
        'border': '#2a2a2a',
        'border-subtle': '#1f1f1f',
        // Text
        'text-primary': '#f5f5f5',
        'text-secondary': '#9a9a9a',
        'text-muted': '#5a5a5a',
        // Status — the ONLY accent colours
        'status-kept': '#22c55e',
        'status-broken': '#ef4444',
        'status-progress': '#f59e0b',
        'status-partial': '#a855f7',
        'status-expired': '#6b7280',
        'status-unverified': '#3b82f6',
        // Issue status
        'issue-open': '#f59e0b',
        'issue-acknowledged': '#3b82f6',
        'issue-resolved': '#22c55e',
        'issue-disputed': '#ef4444',
        // News accent
        'gold': '#b8860b',
        'gold-light': '#d4a017',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'headline': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'article': ['1.125rem', { lineHeight: '1.8' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      maxWidth: {
        'content': '72rem',
        'article': '48rem',
        'narrow': '36rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

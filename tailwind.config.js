/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        desk: token('desk'),
        paper: token('paper'),
        ink: token('ink'),
        'ink-soft': token('ink-soft'),
        rule: token('rule'),
        proof: token('proof'),
        'proof-wash': token('proof-wash'),
        'on-proof': token('on-proof'),
        pencil: token('pencil'),
        marker: token('marker'),
        'marker-ink': token('marker-ink'),
        go: token('go'),
      },
      fontFamily: {
        sans: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sheet: '3px',
        control: '6px',
      },
      boxShadow: {
        sheet: '0 1px 0 rgb(var(--shadow) / 0.06), 0 12px 32px -18px rgb(var(--shadow) / 0.45)',
      },
    },
  },
  plugins: [],
};

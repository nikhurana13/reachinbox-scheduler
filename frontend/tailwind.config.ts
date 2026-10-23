import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F6F3',
        card: '#FFFFFF',
        ink: { DEFAULT: '#1B1F24', soft: '#5B6169', faint: '#8A9098' },
        line: '#E3E4DE',
        brand: { DEFAULT: '#2342C8', dark: '#1A33A0', tint: '#E9EDFB' },
        sent: { DEFAULT: '#1E7A4F', tint: '#E4F3EB' },
        wait: { DEFAULT: '#9A6212', tint: '#FBF0DC' },
        fail: { DEFAULT: '#B42318', tint: '#FCE9E7' },
      },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
      borderRadius: { ctl: '8px', panel: '12px' },
    },
  },
  plugins: [],
};
export default config;

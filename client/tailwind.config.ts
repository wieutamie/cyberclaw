import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF0090',
          accent: '#FF4F79',
        },
        bg: '#17183B',
        surface: {
          DEFAULT: '#602F4B',
          alt: '#412431',
        },
        muted: '#64748B',
        // Status palette (per PRD §4.1): distinct semantic colors so danger,
        // warning and clean are never confused.
        //  - danger  #FF0000 → Malicious  (white bold text on top)
        //  - warning #FF7300 → Suspicious (white bold text on top)
        //  - clean   #11FF00 → Harmless   (dark ink #17183B text on top)
        // `neutral` covers undetected/timeout/failure — intentionally NOT
        // green so an unknown result is never mistaken for "safe".
        status: {
          danger: '#FF0000',
          warning: '#FF7300',
          clean: '#11FF00',
          neutral: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        // Flat, subtle elevation only — no neon/glow anywhere in the UI.
        card: '0 8px 24px rgba(0, 0, 0, 0.35)',
        soft: '0 4px 14px rgba(0, 0, 0, 0.25)',
        none: 'none',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
    },
  },
  plugins: [animate],
} satisfies Config;

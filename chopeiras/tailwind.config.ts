import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        fundo: v('fundo'),
        superficie: v('superficie'),
        borda: v('borda'),
        texto: v('texto'),
        suave: v('suave'),
        marca: v('marca'),       // âmbar da cervejaria
        'marca-forte': v('marca-forte'),
        cevada: v('cevada'),     // amarelo do selo
        malte: v('malte'),       // marrom escuro
        ok: v('ok'),
        alerta: v('alerta'),
        perigo: v('perigo'),
        info: v('info'),
        roxo: v('roxo'),
        ciano: v('ciano'),
      },
      fontFamily: { sans: ['var(--fonte)', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
    },
  },
  plugins: [],
} satisfies Config;

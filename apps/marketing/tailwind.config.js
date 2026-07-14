/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0c1520',
          soft: '#152030',
          muted: '#2a3a4d',
        },
        paper: {
          DEFAULT: '#f4f6f8',
          elev: '#ffffff',
          line: '#dde3ea',
        },
        accent: {
          DEFAULT: '#0d6e66',
          bright: '#1a9a8f',
          deep: '#0a524c',
        },
        cobalt: {
          DEFAULT: '#1a456e',
          soft: '#2d5f8a',
        },
        mist: '#5f7082',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '72rem',
        wide: '84rem',
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(ellipse 70% 50% at 75% 35%, rgba(13,110,102,0.14), transparent 55%), radial-gradient(ellipse 45% 35% at 15% 75%, rgba(26,69,110,0.1), transparent 50%), linear-gradient(168deg, #0a121c 0%, #0c1520 50%, #121c28 100%)',
        'section-wash':
          'linear-gradient(180deg, #f4f6f8 0%, #ffffff 100%)',
        'teal-tint':
          'linear-gradient(180deg, #eef6f5 0%, #f4f6f8 100%)',
      },
      boxShadow: {
        elev: '0 1px 0 rgba(12,21,32,0.04), 0 16px 48px rgba(12,21,32,0.08)',
        glass: '0 8px 32px rgba(12,21,32,0.06)',
      },
      animation: {
        'fade-up': 'fadeUp 0.65s ease-out both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

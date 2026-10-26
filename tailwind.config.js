/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        paper: '#F6F4EF',
        ink: { DEFAULT: '#14211F', soft: '#5B6B68', mute: '#8C9895' },
        brand: { DEFAULT: '#0F766E', dark: '#0B5750', soft: '#E3F1EE' },
        gain: '#15803D',
        loss: '#B91C1C',
        warn: '#B45309',
      },
      boxShadow: { card: '0 1px 2px rgba(20,33,31,.05), 0 6px 20px -8px rgba(20,33,31,.10)' },
    },
  },
  plugins: [],
}

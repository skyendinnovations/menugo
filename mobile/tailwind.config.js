/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App background layers
        bg: {
          primary: '#0F172A',
          card: '#1E293B',
          elevated: '#334155',
          input: '#1E293B',
        },
        // Brand colors
        brand: {
          DEFAULT: '#F97316',
          dark: '#EA580C',
          light: '#FB923C',
          muted: '#F9731620',
        },
        // Semantic
        border: {
          DEFAULT: '#334155',
          subtle: '#1E293B',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App background layers
        bg: {
          primary: '#FFFFFF',
          card: '#FFFFFF',
          elevated: '#F3F4F6',
          input: '#F3F4F6',
        },
        // Brand colors
        brand: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          light: '#F87171',
          muted: '#FEE2E2',
        },
        // Semantic
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#F3F4F6',
        },
      },
    },
  },
  plugins: [],
};

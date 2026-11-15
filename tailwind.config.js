/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ht: {
          bg: '#0c1310',
          panel: '#131d18',
          card: '#19261f',
          border: '#273a30',
          accent: '#28a745',
          emerald: '#10b981',
          gold: '#eab308',
        },
      },
    },
  },
  plugins: [],
};

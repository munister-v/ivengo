/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        tile: {
          blue: '#005ab8',
          pink: '#f48ba2',
          teal: '#c0e5e7',
          coal: '#1a1a1a',
          amber: '#F5EFE8',
          rose: '#C0392B',
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f0eb',
          500: '#7b4053',
          600: '#65283d',
          700: '#501a2c',
        },
        tile: {
          blue: '#6f5367',
          pink: '#d9b9bd',
          teal: '#aebdb3',
          coal: '#501a2c',
          amber: '#f5f0eb',
          rose: '#9c3f4f',
        },
      },
      fontFamily: {
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
        mono: ['Courier New', 'Courier', 'ui-monospace', 'monospace'],
        sans: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

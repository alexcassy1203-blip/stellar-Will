/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#fcfbf9',
          100: '#f5f3f0',
          200: '#ebe6e0',
          300: '#dcd5cc',
          400: '#c5bcb0',
          500: '#aa9f91',
          600: '#8f8374',
          700: '#756b5f',
          800: '#5c544a',
          900: '#47423b',
          950: '#2b2924',
        },
        primary: {
          500: '#8B0000',
          600: '#5C0000',
        }
      },
      backgroundImage: {
        'white-marble': "url('/src/assets/italian_white_marble.png')",
        'red-marble': "url('/src/assets/red_marble.png')",
      }
    },
  },
  plugins: [],
}

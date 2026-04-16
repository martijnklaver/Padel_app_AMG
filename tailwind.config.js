/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EF7D2D',
          hover: '#d96a1a',
          light: '#fde8d5',
        },
      },
    },
  },
  plugins: [],
}

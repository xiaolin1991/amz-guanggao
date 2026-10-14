/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amazon: {
          dark: '#131921',
          light: '#232F3E',
          orange: '#FF9900',
          blue: '#146EB4',
          yellow: '#FEBD69'
        }
      }
    },
  },
  plugins: [],
}

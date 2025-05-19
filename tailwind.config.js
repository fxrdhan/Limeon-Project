/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/react-tailwindcss-datepicker/dist/index.esm.{js,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          'Avenir',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        primary: "#14b8a6", // teal-500
        secondary: "#2dd4bf", // teal-600
        accent: "#ec4899", // pink-500
        neutral: "#fbbc05", // yellow-500
      },
    },
  },
  plugins: [],
}
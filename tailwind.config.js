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
        primary: "rgb(59, 130, 246)", // blue-500
        secondary: "#4285f4", // blue-500
        accent: "#ea4335", // red-500
        neutral: "#fbbc05", // yellow-500
      },
    },
  },
  plugins: [],
}
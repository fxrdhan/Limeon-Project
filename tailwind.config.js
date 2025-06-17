/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        primary: "#14b8a6", // teal-500
        secondary: "#2dd4bf", // teal-600
        accent: "#e11d48", // rose-600
        neutral: "#fbbc05", // yellow-500
        danger: "#ef4444", // red-500
        warning: "#f97316", // orange-500
      },
    },
  },
  plugins: [],
};

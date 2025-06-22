/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Open Sans",
          "system-ui",
          "Avenir",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        primary: "oklch(50.8% 0.118 165.612)",
        secondary: "oklch(59.6% 0.145 163.225)",
        accent: "#e11d48", // rose-600
        neutral: "#fbbc05", // yellow-500
        danger: "#ef4444", // red-500
        warning: "#f97316", // orange-500
      },
    },
  },
  plugins: [],
};

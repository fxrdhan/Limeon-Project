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
        // accent: "oklch(51.4% 0.222 16.935)",
        neutral: "oklch(79.5% 0.184 86.047)",
        danger: "oklch(57.7% 0.245 27.325)",
        warning: "oklch(70.5% 0.213 47.604)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Cabinet Grotesk'", "'DM Sans'", "sans-serif"],
      },
      colors: {
        vault: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c0d3ff",
          300: "#91b2ff",
          400: "#5885ff",
          500: "#2f5fff",
          600: "#1a3fff",
          700: "#1230e8",
          800: "#1428bc",
          900: "#172694",
          950: "#0f1660",
        },
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b8b8c0",
          400: "#92929d",
          500: "#747482",
          600: "#5e5e6b",
          700: "#4d4d58",
          800: "#424249",
          900: "#3a3a40",
          950: "#111114",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

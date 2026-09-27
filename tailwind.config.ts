import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ["Tajawal", "sans-serif"],
        serif: ["Tajawal", "serif"],
      },
      colors: {
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        foreground: "var(--foreground)",
        "foreground-secondary": "var(--foreground-secondary)",
        card: "var(--card)",
        border: "var(--border)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        primary: {
          DEFAULT: "var(--foreground)",
          foreground: "var(--background)",
        },
        secondary: {
          DEFAULT: "var(--background-secondary)",
          foreground: "var(--foreground)",
        },
        accent: {
          DEFAULT: "var(--gold)",
          foreground: "var(--gold-contrast)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light: "var(--gold)",
          dark: "var(--gold-muted)",
        },
        brand: {
          dark: "#241B1A",
          light: "#F7F2EA",
        },
        rose: "var(--rose)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderColor: {
        border: "var(--border)",
      },
      boxShadow: {
        luxury: "var(--shadow-luxury)",
      },
    },
  },
  plugins: [],
} satisfies Config;

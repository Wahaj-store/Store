import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ["Tajawal", "sans-serif"],
        serif: ["Tajawal", "serif"], // لدعم الطابع الفاخر والتحريري
      },
      colors: {
        gold: {
          DEFAULT: "var(--gold, #C5A059)",
          light: "#E5C585",
          dark: "#9A7B38",
        },
        brand: {
          dark: "#1A1A1A",
          light: "#F9F8F6",
        }
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(197, 160, 89, 0.15)",
      }
    },
  },
  plugins: [],
} satisfies Config;

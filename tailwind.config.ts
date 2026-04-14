import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NutriPlan palette — migrated from prototype CSS :root vars
        cream: {
          DEFAULT: "#FFFBF0",
          50: "#FFFDF7",
          100: "#FFFBF0",
          200: "#FFF5D9",
          300: "#FFEDC0",
        },
        parchment: {
          DEFAULT: "#F5EDDA",
          50: "#FAF6EE",
          100: "#F5EDDA",
          200: "#EDD9B5",
          300: "#E4C48F",
        },
        bark: {
          DEFAULT: "#6B4C35",
          50: "#F3EDE8",
          100: "#D9C2B0",
          200: "#A67D5D",
          300: "#6B4C35",
          400: "#4A3323",
          500: "#2E1F15",
        },
        sage: {
          DEFAULT: "#7A9E7E",
          50: "#EEF4EF",
          100: "#C8DCC9",
          200: "#9BBFA0",
          300: "#7A9E7E",
          400: "#587460",
          500: "#3A4D3D",
        },
        amber: {
          DEFAULT: "#D4813A",
          50: "#FAF0E6",
          100: "#F0CFA0",
          200: "#E5A85C",
          300: "#D4813A",
          400: "#A85E20",
          500: "#7A4315",
        },
        // shadcn/ui semantic tokens mapped to NutriPlan palette
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["Playfair Display", ...fontFamily.serif],
        sans: ["DM Sans", ...fontFamily.sans],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

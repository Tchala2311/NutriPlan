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
        /* ── NutriPlan core palette ───────────────────────────────
           DNA: Apple clarity · Nike vitality · Loro Piana luxury
           ────────────────────────────────────────────────────── */
        cream: {
          DEFAULT: "#FFFBF0",
          50:  "#FFFDF8",
          100: "#FFFBF0",
          200: "#FFF5D9",
          300: "#FFEDC0",
        },
        parchment: {
          DEFAULT: "#F5EDDA",
          50:  "#FAF6EE",
          100: "#F5EDDA",
          200: "#EDD9B5",
          300: "#E4C48F",
        },
        bark: {
          DEFAULT: "#6B4C35",
          50:  "#F3EDE8",
          100: "#D9C2B0",
          200: "#A67D5D",
          300: "#6B4C35",
          400: "#4A3323",
          500: "#2E1F15",
        },
        stone: {
          DEFAULT: "#8A8078",
          50:  "#F8F7F6",
          100: "#EFEDEA",
          200: "#D9D4CD",
          300: "#B8B0A6",
          400: "#8A8078",
          500: "#5C534A",
        },
        sage: {
          DEFAULT: "#7A9E7E",
          50:  "#EEF4EF",
          100: "#C8DCC9",
          200: "#9BBFA0",
          300: "#7A9E7E",
          400: "#587460",
          500: "#3A4D3D",
        },
        vital: {
          DEFAULT: "#3DC496",
          50:  "#E8F8F2",
          100: "#BEEDDA",
          200: "#7EDAB8",
          300: "#3DC496",
          400: "#1EA876",
          500: "#0D7A55",
        },
        amber: {
          DEFAULT: "#D4813A",
          50:  "#FAF0E6",
          100: "#F0CFA0",
          200: "#E5A85C",
          300: "#D4813A",
          400: "#A85E20",
          500: "#7A4315",
        },

        /* ── shadcn/ui semantic tokens ──────────────────────── */
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      fontFamily: {
        display: ["Playfair Display", ...fontFamily.serif],
        sans:    ["DM Sans", ...fontFamily.sans],
        mono:    ["DM Mono", "ui-monospace", ...fontFamily.mono],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],    /* 11px */
        xs:    ["0.8125rem", { lineHeight: "1.5" }],    /* 13px */
        sm:    ["0.9375rem", { lineHeight: "1.55" }],   /* 15px */
        base:  ["1rem",      { lineHeight: "1.6" }],    /* 16px */
        md:    ["1.0625rem", { lineHeight: "1.55" }],   /* 17px */
        lg:    ["1.1875rem", { lineHeight: "1.5" }],    /* 19px */
        xl:    ["1.375rem",  { lineHeight: "1.4" }],    /* 22px */
        "2xl": ["1.75rem",   { lineHeight: "1.3" }],   /* 28px */
        "3xl": ["2.125rem",  { lineHeight: "1.2" }],   /* 34px */
        "4xl": ["2.75rem",   { lineHeight: "1.12" }],  /* 44px */
        "5xl": ["3.5rem",    { lineHeight: "1.05" }],  /* 56px */
        "6xl": ["4.5rem",    { lineHeight: "1.0" }],   /* 72px */
        "7xl": ["5.75rem",   { lineHeight: "1.0" }],   /* 92px */
      },

      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
        "26":  "6.5rem",
        "30":  "7.5rem",
        "sidebar": "16rem",   /* 256px sidebar width */
        "header":  "4rem",    /* 64px header height */
      },

      borderRadius: {
        xs:   "4px",
        sm:   "6px",
        DEFAULT: "var(--radius)",
        md:   "10px",
        lg:   "14px",
        xl:   "20px",
        "2xl": "28px",
      },

      boxShadow: {
        "warm-xs":  "0 1px 2px rgba(74, 51, 35, 0.06)",
        "warm-sm":  "0 1px 4px rgba(74, 51, 35, 0.08), 0 1px 2px rgba(74, 51, 35, 0.04)",
        "warm-md":  "0 4px 12px rgba(74, 51, 35, 0.10), 0 2px 4px rgba(74, 51, 35, 0.06)",
        "warm-lg":  "0 8px 24px rgba(74, 51, 35, 0.12), 0 4px 8px rgba(74, 51, 35, 0.06)",
        "warm-xl":  "0 16px 48px rgba(74, 51, 35, 0.14), 0 6px 16px rgba(74, 51, 35, 0.08)",
        "warm-2xl": "0 24px 64px rgba(74, 51, 35, 0.18), 0 8px 24px rgba(74, 51, 35, 0.10)",
        "amber-glow": "0 4px 20px rgba(212, 129, 58, 0.24)",
        "vital-glow": "0 4px 20px rgba(61, 196, 150, 0.22)",
      },

      transitionTimingFunction: {
        "out-expo":  "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out":    "cubic-bezier(0.4, 0, 0.2, 1)",
        "spring":    "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      transitionDuration: {
        "80":  "80ms",
        "150": "150ms",
        "220": "220ms",
        "350": "350ms",
        "400": "400ms",
      },

      letterSpacing: {
        tighter: "-0.04em",
        tight:   "-0.02em",
        snug:    "-0.01em",
        normal:  "0",
        wide:    "0.04em",
        wider:   "0.08em",
        luxury:  "0.12em",
        widest:  "0.16em",
      },

      maxWidth: {
        content: "70rem",    /* 1120px */
        prose:   "42.5rem",  /* 680px */
        sidebar: "16rem",    /* 256px */
      },

      backgroundImage: {
        "hero-gradient": "linear-gradient(160deg, #FFF5D9 0%, #F5EDDA 40%, #FFFBF0 100%)",
        "card-gradient":  "linear-gradient(135deg, #FAF6EE 0%, #F5EDDA 100%)",
        "bark-gradient":  "linear-gradient(135deg, #6B4C35 0%, #4A3323 100%)",
        "vital-gradient": "linear-gradient(135deg, #7A9E7E 0%, #3DC496 100%)",
        "warm-gradient":  "linear-gradient(135deg, #6B4C35 0%, #D4813A 100%)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-vital": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-up":   "accordion-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in":        "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in":       "scale-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "shimmer":        "shimmer 1.5s infinite",
        "pulse-vital":    "pulse-vital 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

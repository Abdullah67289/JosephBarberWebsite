import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1320px" },
    },
    extend: {
      colors: {
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Brand palette — warm barbershop gold on deep charcoal.
        gold: {
          50: "#fbf6ed",
          100: "#f4e7c9",
          200: "#ecd6a0",
          300: "#e3c172",
          400: "#d4a843",
          500: "#c4942b",
          600: "#a87a22",
          700: "#85601f",
          800: "#6a4d20",
          900: "#5a421f",
        },
        ink: {
          950: "#0a0a0b",
          900: "#121214",
          800: "#1a1a1d",
          700: "#232327",
          600: "#2e2e33",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px hsl(var(--primary) / 0.45)",
        "card-hover": "0 24px 60px -24px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "barber-stripe":
          "repeating-linear-gradient(45deg, hsl(var(--primary)) 0 12px, transparent 12px 24px)",
        "radial-spot":
          "radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%)",
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pole: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 48px" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "fade-up": "fade-up 0.6s ease-out both",
        pole: "pole 1s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

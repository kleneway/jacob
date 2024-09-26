import { type Config } from "tailwindcss";
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

const safelist = [
  "bg-green-700",
  "bg-red-700",
  "bg-purple-700",
  "bg-github-green",
]; // colors that dynamically generated, need to be whitelisted

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      animation: {
        "bounce-fast": "bounce 0.5s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        meteor: "meteor 5s linear infinite",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        shimmer: "shimmer 4s infinite",
        backgroundPositionSpin:
          "background-position-spin 3000ms infinite alternate",
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
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        "background-position-spin": {
          "0%": { backgroundPosition: "top center" },
          "100%": { backgroundPosition: "bottom center" },
        },
        shimmer: {
          "0%, 90%, 100%": {
            "background-position": "calc(-100% - var(--shimmer-width)) 0",
          },
          "30%, 60%": {
            "background-position": "calc(100% + var(--shimmer-width)) 0",
          },
        },
      },
      colors: {
        beige: "#f8e8e0",
        "dark-beige": "#fcf3ed",
        "dark-blue": "#1D265D",
        "light-blue": "#00ACFF",
        "navy-blue": "#0044FF",
        "github-blue": "#4078c0",
        "github-green": "#1F883D",
        "github-light-green": "#2dba4e",
        "github-red": "#bd2c00",
        "github-orange": "#c9510c",
        "github-purple": "#6e5494",
        pink: "#ff7bff",
        orange: "#FFBA00",
        "base-black": "#191818",
        blueGray: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        coolGray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        trueGray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        warmGray: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
        },
        green: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
        },
        primary: {
          50: "#F0F7FF",
          100: "#E0EFFF",
          200: "#B8DBFF",
          300: "#8FC7FF",
          400: "#66B3FF",
          500: "#3D9FFF",
          600: "#147AFF",
          700: "#0056D6",
          800: "#003E99",
          900: "#00265C",
        },
        secondary: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        aurora: {
          50: "#E0F7FF",
          100: "#B8EEFF",
          200: "#8CE5FF",
          300: "#5EDBFF",
          400: "#36D2FF",
          500: "#00C8FF",
          600: "#00A3D9",
          700: "#007FB3",
          800: "#005C8C",
          900: "#003A66",
        },
        blossom: {
          50: "#FFF0F7",
          100: "#FFD6E8",
          200: "#FFADD2",
          300: "#FF85BC",
          400: "#FF5CA6",
          500: "#FF3390",
          600: "#FF0A7A",
          700: "#DB0064",
          800: "#B7004E",
          900: "#930038",
        },
        meadow: {
          50: "#F0FFF4",
          100: "#D6FFE3",
          200: "#ADFFCA",
          300: "#85FFB1",
          400: "#5CFF98",
          500: "#33FF7F",
          600: "#0AFF66",
          700: "#00DB52",
          800: "#00B743",
          900: "#009334",
        },
        sunset: {
          50: "#FFF7E0",
          100: "#FFEAB8",
          200: "#FFDD8C",
          300: "#FFD05E",
          400: "#FFC336",
          500: "#FFB600",
          600: "#D99B00",
          700: "#B38000",
          800: "#8C6500",
          900: "#664A00",
        },
      },
      fontFamily: {
        sans: ["Inter var", "sans-serif"],
        display: ["Lexend", "sans-serif"],
        gooper: ["Gooper", "sans-serif"],
        figtree: ["Figtree", "sans-serif"],
        crimson: ['"Crimson Text"', "serif"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
    addVariablesForColors,
  ],
  safelist,
} satisfies Config;

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }: any) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const allColors = flattenColorPalette(theme("colors"));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val]),
  );

  addBase({
    ":root": newVars,
  });
}

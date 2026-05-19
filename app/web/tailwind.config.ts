import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6F1",
        ink: "#1F1A14",
        "ink-soft": "#3A322A",
        muted: "#8A7D6D",
        brand: {
          DEFAULT: "#FF8030",
          deep: "#E5651A",
          glow: "#FFB46B",
        },
        gold: "#F2C14E",
        sage: "#7BAE7A",
        coral: "#F08D7E",
        lilac: "#B395E0",
        rose: "#E8B4D9",
        line: "#E8DFD3",
      },
      fontFamily: {
        serif: ["var(--font-instrument)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-quicksand)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        kicker: "0.18em",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        sway: "sway 7s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        reveal: "reveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        blink: "blink 4.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0)" },
          "50%": { transform: "translateY(-14px) rotate(-1.2deg)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "94%, 98%": { transform: "scaleY(0.1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

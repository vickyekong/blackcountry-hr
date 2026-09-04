import type { Config } from "tailwindcss";

const withAlpha = (channel: string) =>
  `rgb(var(${channel}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha("--mist"),
        foreground: withAlpha("--ink"),
        ink: {
          DEFAULT: withAlpha("--ink"),
          soft: withAlpha("--ink-soft"),
        },
        lagoon: {
          DEFAULT: withAlpha("--lagoon"),
          deep: withAlpha("--lagoon-deep"),
          mist: withAlpha("--lagoon-mist"),
        },
        mist: withAlpha("--mist"),
        foam: withAlpha("--foam"),
        sand: withAlpha("--sand"),
        line: withAlpha("--line"),
        muted: withAlpha("--muted"),
        signal: withAlpha("--signal"),
        ok: {
          DEFAULT: withAlpha("--ok"),
          deep: withAlpha("--ok-deep"),
        },
        warn: withAlpha("--warn"),
        sky: withAlpha("--sky"),
        rail: withAlpha("--rail"),
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
        ],
        display: [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
        ],
        marketing: ["var(--font-fraunces)", "Fraunces", "ui-serif", "Georgia"],
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(28, 28, 28, 0.04), 0 12px 28px -16px rgba(28, 28, 28, 0.18)",
        panel: "0 1px 0 rgba(28, 28, 28, 0.04)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;

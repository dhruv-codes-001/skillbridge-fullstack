import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9fe",
          200: "#c7d7fe",
          300: "#a3bdfc",
          400: "#799bfa",
          500: "#4f75f6",
          600: "#3655ec",
          700: "#2741d4",
          800: "#2235ac",
          900: "#203088",
          950: "#171f54",
        },
      },
    },
  },
  plugins: [],
};
export default config;

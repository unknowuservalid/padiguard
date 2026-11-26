import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rice: {
          50: "#f0fdf4",
          100: "#dcfce7",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        ink: "#0f172a",
        amber: "#d97706",
      },
      boxShadow: {
        soft: "0 16px 48px -28px rgba(15, 23, 42, .24)",
      },
    },
  },
  plugins: [],
};

export default config;

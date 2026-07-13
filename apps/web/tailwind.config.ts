import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        field: "#1F7A5A",
        signal: "#E0A100",
        sky: "#2F6FED",
      },
    },
  },
  plugins: [],
};

export default config;

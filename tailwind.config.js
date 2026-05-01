/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        foreground: "#000000",
        muted: "#8e8e93",
        surface: "#f2f2f7",
        primary: "#262626",
        border: "#e5e5ea",
        ring: "#007aff",
        chevron: "#aeaeb2",
        "btn-secondary": "#e8e8e8",
        "btn-secondary-border": "#d1d1d1",
      },
      borderRadius: {
        input: "10px",
        card: "18px",
      },
      fontFamily: {
        sans: ["PublicSans_400Regular", "system-ui", "sans-serif"],
        "sans-medium": ["PublicSans_500Medium", "system-ui", "sans-serif"],
        "sans-semibold": ["PublicSans_600SemiBold", "system-ui", "sans-serif"],
        "sans-bold": ["PublicSans_700Bold", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

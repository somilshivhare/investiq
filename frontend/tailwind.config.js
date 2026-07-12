/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep background palette, custom hues for a premium look
        dark: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          text: '#F8FAFC'     // Slate 50
        },
        brand: {
          emerald: '#10B981', // Emerald 500
          teal: '#14B8A6',    // Teal 500
          gold: '#F59E0B'     // Amber 500
        }
      }
    },
  },
  plugins: [],
}

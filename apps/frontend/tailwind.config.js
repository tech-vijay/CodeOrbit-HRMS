/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#fb2c36', // Wipronix Bright Coral Red
          600: '#E52328', // Signature Wipronix Scarlet Red
          700: '#c91c21',
          800: '#AB1428', // Wipronix Deep Burgundy / Ruby
          900: '#82181a',
          950: '#4c050e',
        },
        orbit: {
          dark: '#F8FAFC',    // Light porcelain background canvas
          card: '#FFFFFF',    // Pure White Card surface
          surface: '#F1F5F9', // Elevated surface
          border: '#E2E8F0',  // Soft crisp border
          muted: '#64748B',   // Muted slate text
          accent: '#E52328',  // Wipronix Scarlet Red
          ruby: '#AB1428',    // Wipronix Burgundy / Ruby
          coral: '#fb2c36',   // Wipronix Coral
          wine: '#7c0b16',
          emerald: '#00bb7f', // Wipronix Green
          amber: '#f99c00',   // Wipronix Amber
          blue: '#3080ff',    // Wipronix Electric Blue
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'orbit-glow': 'conic-gradient(from 180deg at 50% 50%, #E52328 0deg, #AB1428 180deg, #fb2c36 360deg)',
        'wipronix-gradient': 'linear-gradient(135deg, #E52328 0%, #AB1428 100%)',
        'wipronix-glow': 'radial-gradient(circle at top right, rgba(229, 35, 40, 0.08), transparent 70%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-sm': '0 0 16px -2px rgba(229, 35, 40, 0.35)',
        'glow-lg': '0 0 35px -4px rgba(229, 35, 40, 0.5)',
        'glow-ruby': '0 0 25px -4px rgba(171, 20, 40, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

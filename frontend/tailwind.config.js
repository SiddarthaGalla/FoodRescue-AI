/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F8FFF9',
          100: '#DCFCE7',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          800: '#15803D',
          900: '#14532D',
          950: '#07130A',
        },
        accent: {
          DEFAULT: '#10B981',
          hover: '#059669',
        },
        bgLight: '#F8FFF9',
        bgDark: '#07130A',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(22, 163, 74, 0.08)',
        'glass-hover': '0 12px 40px 0 rgba(22, 163, 74, 0.18)',
        'glow': '0 0 25px rgba(34, 197, 94, 0.4)',
        'glow-lg': '0 0 45px rgba(34, 197, 94, 0.6)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}

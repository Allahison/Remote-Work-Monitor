/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0eeff',
          100: '#e0dcff',
          200: '#c4bcff',
          300: '#a594ff',
          400: '#8670ff',
          500: '#6c63ff',
          600: '#5a4de8',
          700: '#4a3dc0',
          800: '#3a2f99',
          900: '#2a2172',
        },
        accent: {
          400: '#38d9f5',
          500: '#00d4ff',
          600: '#00b8d9',
        },
        dark: {
          900: '#0f0f1a',
          800: '#141424',
          700: '#1a1a2e',
          600: '#20203d',
          500: '#2a2a4a',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.12)',
          hover: 'rgba(255, 255, 255, 0.08)',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6c63ff 0%, #00d4ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #141424 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,212,255,0.05) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
        'brand': '0 0 30px rgba(108, 99, 255, 0.4)',
        'brand-sm': '0 0 15px rgba(108, 99, 255, 0.25)',
        'accent': '0 0 20px rgba(0, 212, 255, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

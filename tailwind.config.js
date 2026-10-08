/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf6f2',
          100: '#f5ebe1',
          200: '#ebd7c5',
          300: '#d9bda6',
          400: '#b88968',
          500: '#8a5332', // Rich warm amber brown
          600: '#6d391d', // Roasted mocha
          700: '#542813', // Luxurious dark chocolate
          800: '#3d1b0c', // Deep dark espresso
          900: '#2b1206', // Midnight roasted bean
          950: '#1a0903', // Deepest dark brown
        },
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        }
      },
      backgroundImage: {
        'gradient-brown': 'linear-gradient(135deg, #2b1206 0%, #461e0b 50%, #200d05 100%)',
        'gradient-brown-warm': 'linear-gradient(135deg, #3d1b0c 0%, #632e14 50%, #2c1206 100%)',
        'gradient-brown-hover': 'linear-gradient(135deg, #48200d 0%, #703316 50%, #361608 100%)',
        'gradient-caramel': 'linear-gradient(135deg, #542813 0%, #8a5332 100%)',
        'gradient-bronze': 'linear-gradient(135deg, #3d1b0c 0%, #7a3a19 50%, #b88968 100%)',
        'gradient-card-dark': 'linear-gradient(145deg, #2b1408 0%, #3d1d0c 50%, #1c0a03 100%)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(61, 27, 12, 0.25)' },
          '50%': { boxShadow: '0 0 25px rgba(109, 57, 29, 0.45)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'scale-up': 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'floatSlow 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

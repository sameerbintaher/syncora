/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        accent: {
          amber: '#fbbf24',
          rose: '#fb7185',
          emerald: '#34d399',
          violet: '#a78bfa',
        },
        surface: {
          700: '#171717',
          800: '#0f0f0f',
          900: '#0a0a0a',
          950: '#050505',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'chat': '66.666%',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(10px, -15px) rotate(2deg)' },
          '50%': { transform: 'translate(-5px, -25px) rotate(-1deg)' },
          '75%': { transform: 'translate(-15px, -10px) rotate(1deg)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(15px, 20px)' },
          '66%': { transform: 'translate(-20px, -15px)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-8px, -12px) scale(1.02)' },
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(20px) translateY(-10px)' },
          '50%': { transform: 'translateX(-10px) translateY(15px)' },
          '75%': { transform: 'translateX(-20px) translateY(-5px)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.9' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        shimmer: 'shimmer 3s linear infinite',
        'float-slow': 'floatSlow 20s ease-in-out infinite',
        'float-medium': 'floatMedium 15s ease-in-out infinite',
        'float-fast': 'floatFast 8s ease-in-out infinite',
        drift: 'drift 25s ease-in-out infinite',
        wobble: 'wobble 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(251, 191, 36, 0.25)',
        'glow-lg': '0 0 40px -10px rgba(251, 191, 36, 0.2)',
        'inner-glow': 'inset 0 0 20px -10px rgba(251, 191, 36, 0.15)',
      },
    },
  },
  plugins: [],
};

const colors = require('tailwindcss/colors');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{html,js}',
    './*.html',
  ],
  safelist: [
    'from-purple-400',
    'to-purple-600',
    'hover:bg-gradient-to-r',
    'bg-gradient-to-r',
    'from-purple-500',
    'to-purple-700',
    'from-blue-400',
    'to-blue-600',
    'from-green-400',
    'to-green-600',
    'from-pink-400',
    'to-pink-600',
    'from-yellow-400',
    'to-yellow-600',
    'from-red-400',
    'to-red-600',
    'hover:from-purple-400',
    'hover:to-purple-600',
    'hover:bg-gradient-to-r',
    'bg-gradient-to-l',
    'hover:bg-gradient-to-l',
  ],
  theme: {
    extend: {
      colors: {
        'glass-bg': 'rgba(255, 255, 255, 0.25)',
        'glass-border': 'rgba(255, 255, 255, 0.4)',
        purple: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        blue: {
          400: '#60a5fa',
          600: '#2563eb',
        },
        green: {
          400: '#4ade80',
          600: '#16a34a',
        },
        pink: {
          400: '#f472b6',
          600: '#db2777',
        },
        yellow: {
          400: '#facc15',
          600: '#ca8a04',
        },
        red: {
          400: '#f87171',
          600: '#dc2626',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        sm: '5px',
      },
      borderRadius: {
        xl: '1.5rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

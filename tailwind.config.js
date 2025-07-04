/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{html,js}',
    './*.html',
  ],
  theme: {
    extend: {
      colors: {
        'glass-bg': 'rgba(255, 255, 255, 0.25)',
        'glass-border': 'rgba(255, 255, 255, 0.4)',
        // demais cores do relatório…
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
  plugins: [],
};

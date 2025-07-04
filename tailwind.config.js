/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'glass-bg': 'rgba(255, 255, 255, 0.25)',
        'glass-border': 'rgba(255, 255, 255, 0.4)',
        // …adicione aqui outras cores do relatório
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        sm: '5px',
        // …outros níveis, se quiser
      },
      borderRadius: {
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.legacy.html',
    './src/**/*.{js,html}',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Noto Serif TC"', '"Noto Sans TC"', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        shell: '0.75rem',
      },
      boxShadow: {
        shell: '0 8px 30px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};

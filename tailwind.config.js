/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './src/index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007aff',
          dark: '#006ae6',
          light: '#4da3ff'
        },
        danger: {
          DEFAULT: '#f44336',
          dark: '#d32f2f',
          light: '#ff6b5b'
        },
        success: {
          DEFAULT: '#4caf50',
          dark: '#388e3c',
          light: '#6fcf73'
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', 'sans-serif']
      },
      boxShadow: {
        'card': '0 18px 38px -24px rgba(15, 23, 42, 0.24)',
        'card-hover': '0 28px 60px -28px rgba(15, 23, 42, 0.34)',
        'modal': '0 32px 70px -28px rgba(2, 6, 23, 0.45)'
      },
      borderRadius: {
        'xl': '12px'
      },
      spacing: {
        'header': '56px'
      }
    },
  },
  plugins: [],
}

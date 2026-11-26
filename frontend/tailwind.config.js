/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        'blue-primary': '#3B82F6',
        'blue-light': '#DBEAFE',
        'green-light': '#DCFCE7',
        'green-success': '#16A34A',
        'orange-soft': '#FFEDD5',
        'orange-accent': '#F97316',
        'yellow-light': '#FEF3C7',
        'border-ui': '#E2E8F0',
        'red-error': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

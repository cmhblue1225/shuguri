import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7f7',
          100: '#b3e6e6',
          200: '#80d5d5',
          300: '#4dc4c4',
          400: '#26b8b8',
          500: '#0a9999',
          600: '#087a7a',
          700: '#065c5c',
          800: '#043d3d',
          900: '#021f1f',
        },
        sidebar: {
          DEFAULT: '#0a5c5c',
          hover: '#087a7a',
          active: '#043d3d',
        },
        surface: {
          DEFAULT: '#f5f7fa',
          card: '#ffffff',
          border: '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

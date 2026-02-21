/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './layouts/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-soft': 'var(--color-surface-soft)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'primary-text': 'var(--color-primary-text)',
        'footer-background': 'var(--color-footer-background)',
        'footer-text': 'var(--color-footer-text)',
        'footer-text-secondary': 'var(--color-footer-text-secondary)',
        'luxury-gold': '#D4AF37',
        'luxury-black': '#0a0a0a'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        serif: ['Playfair Display', 'serif']
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0, 0, 0, 0.08)',
        glow: '0 0 15px rgba(15, 185, 177, 0.3)',
        luxury: '0 20px 40px -10px rgba(0, 0, 0, 0.3)'
      },
      borderRadius: {
        '2xl': '1rem',
        '4xl': '2rem'
      },
      animation: {
        'slow-spin': 'spin 10s linear infinite',
        marquee: 'marquee 25s linear infinite'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      }
    }
  }
};

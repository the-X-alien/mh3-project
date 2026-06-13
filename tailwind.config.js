/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        pure: '#ffffff',
        graphite: '#4d4d4d',
        steel: '#808080',
        fog: '#999999',
        ash: '#c6c6c6',
        violet: '#343755',
        amber: '#e6a817',
        green: '#2ecc71',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        caption: ['10px', { lineHeight: '1.2' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.88' }],
        '4xl': ['2.25rem', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        xs: '5px',
        panel: '12px',
        pill: '500px',
      },
      spacing: {
        '1': '4px',
        '1.5': '6px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '4.5': '18px',
        '7': '28px',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'subtle-float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '0.2' },
          '50%': { opacity: '0.6' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.7s ease-out',
        'subtle-float': 'subtle-float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

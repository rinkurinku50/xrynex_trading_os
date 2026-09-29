/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:    '#0a0e13',
        panel:  '#111820',
        panel2: '#161f29',
        line:   '#1f2b37',
        muted:  '#7b8b9c',
        text:   '#d8e2ec',
        win:    '#22c55e',
        loss:   '#ef4444',
        be:     '#94a3b8',
        gold:   '#eab308',
        info:   '#3b82f6'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Caveat', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};

/** Aethra brand: black and gold. Sora for headings, Mukta for text (Mukta also covers Devanagari for Hindi). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        surface: '#0f0e0c',
        raised: '#1a170f',
        line: '#2b261c',
        gold: '#c9a24d',
        'gold-bright': '#e8c97a',
        paper: '#efe9da',
        muted: '#a39b86',
        bad: '#e0705f',
        good: '#93c48e',
      },
      fontFamily: {
        display: ['Sora', 'Mukta', 'system-ui', 'sans-serif'],
        body: ['Mukta', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        floaty: { '0%': { transform: 'translateY(0) rotateZ(0deg)' }, '100%': { transform: 'translateY(-14px) rotateZ(1.2deg)' } },
        bob: { '0%': { transform: 'translateZ(150px) translateY(0)' }, '100%': { transform: 'translateZ(150px) translateY(-12px)' } },
        grow: { '0%': { transform: 'scaleY(0)' }, '100%': { transform: 'scaleY(1)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite alternate',
        bob: 'bob 5s ease-in-out infinite alternate',
        grow: 'grow 1.1s cubic-bezier(.2,.8,.2,1) both',
        rise: 'rise .8s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}

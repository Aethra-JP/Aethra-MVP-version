/** Aethra brand: black and gold. Fraunces for headings, Mukta for text (it also covers Devanagari for Hindi). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        surface: '#0f0e0c',
        raised: '#17150f',
        line: '#2b261c',
        gold: '#c9a24d',
        'gold-bright': '#e8c97a',
        paper: '#efe9da',
        muted: '#a39b86',
        bad: '#e0705f',
        good: '#93c48e',
      },
      fontFamily: {
        display: ['Fraunces', 'Mukta', 'Georgia', 'serif'],
        body: ['Mukta', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

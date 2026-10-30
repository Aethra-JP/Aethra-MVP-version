import { Link } from 'react-router-dom'

const P = (pts) => pts.map((p) => p.join(',')).join(' ')

// One isometric block. cx/base = where its base diamond sits, s = half width, h = height, c = colour set (a = gold, h = bright gold).
function Prism({ cx, base, s, h, c }) {
  const l = [cx - s, base], b = [cx, base + s / 2], r = [cx + s, base]
  const lt = [cx - s, base - h], bt = [cx, base + s / 2 - h], rt = [cx + s, base - h], kt = [cx, base - s / 2 - h]
  return (
    <g>
      <polygon points={P([lt, bt, b, l])} fill={`url(#iso-${c}L)`} />
      <polygon points={P([bt, rt, r, b])} fill={`url(#iso-${c}R)`} />
      <polygon points={P([kt, rt, bt, lt])} fill={`url(#iso-${c}T)`} />
    </g>
  )
}

const Shadow = ({ x, y, rx }) => <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.25} fill="#000" opacity="0.65" filter="url(#iso-blur)" />

function Upload3D() {
  return (
    <svg viewBox="0 0 200 170" className="w-full h-auto" role="img" aria-label="Three stacked sheets with an arrow pointing up">
      <Shadow x={100} y={146} rx={62} />
      <Prism cx={100} base={122} s={46} h={7} c="a" />
      <Prism cx={100} base={109} s={46} h={7} c="a" />
      <Prism cx={100} base={96} s={46} h={7} c="h" />
      <path d="M100 58 V20 M85 35 L100 18 L115 35" fill="none" stroke="#fff1bf" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chart3D() {
  const h = [28, 46, 36, 72]
  return (
    <svg viewBox="0 0 200 170" className="w-full h-auto" role="img" aria-label="Four three-dimensional bars of different heights">
      <Shadow x={100} y={150} rx={80} />
      {h.map((v, i) => <Prism key={i} cx={48 + i * 34} base={96 + i * 12} s={15} h={v} c={i === 3 ? 'h' : 'a'} />)}
    </svg>
  )
}

function Steps3D() {
  const h = [16, 32, 48, 64]
  const top = { x: 44 + 3 * 32, y: 104 + 3 * 14 - 64 }
  return (
    <svg viewBox="0 0 200 170" className="w-full h-auto" role="img" aria-label="Four rising steps with a flag on top">
      <Shadow x={110} y={160} rx={78} />
      {h.map((v, i) => <Prism key={i} cx={44 + i * 32} base={104 + i * 14} s={17} h={v} c={i === 3 ? 'h' : 'a'} />)}
      <path d={`M${top.x} ${top.y} V${top.y - 36}`} stroke="#fff1bf" strokeWidth="2.6" strokeLinecap="round" />
      <polygon points={P([[top.x, top.y - 36], [top.x + 24, top.y - 28], [top.x, top.y - 20]])} fill="#e8c97a" />
    </svg>
  )
}

const GRADS = {
  a: [['#fff1bf', '#e8c97a'], ['#e8c97a', '#a8832f'], ['#a8832f', '#4a3810']],
  h: [['#ffffff', '#fff1bf'], ['#fff1bf', '#e8c97a'], ['#e8c97a', '#8a6a22']],
}

const STEPS = [
  { art: <Upload3D />, title: 'Upload your file', text: 'Add a sales, expense or stock file from Excel, CSV, Tally or GST. Aethra cleans it and shows you what it changed.' },
  { art: <Chart3D />, title: 'Choose what to see', text: 'Pick What happened, Why it happened, What to do, or a Forecast. You can also ask questions in Chat in English, Hindi or Hinglish.' },
  { art: <Steps3D />, title: 'Try ideas, then compare', text: "Try the suggested actions, upload next month's file, and check your Action plan to see what moved." },
]

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="space-y-6">
      {/* shared colours for the 3D blocks */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="iso-blur"><feGaussianBlur stdDeviation="6" /></filter>
          {Object.entries(GRADS).flatMap(([k, g]) => ['T', 'L', 'R'].map((f, i) => (
            <linearGradient key={k + f} id={`iso-${k}${f}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={g[i][0]} /><stop offset="1" stopColor={g[i][1]} />
            </linearGradient>
          )))}
        </defs>
      </svg>

      <div>
        <h2 id="how-title" className="text-2xl">How to use Aethra</h2>
        <p className="muted mt-1 !text-base">Three simple steps, and you can repeat them every month.</p>
      </div>

      <ol className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card tilt !p-5">
            <div className="rounded-xl overflow-hidden px-3 pt-2" style={{ background: 'radial-gradient(260px 160px at 50% 70%, rgba(201,162,77,.22), transparent 70%)' }}>{s.art}</div>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid place-items-center w-8 h-8 rounded-full font-display font-bold text-ink" style={{ background: 'linear-gradient(180deg,#f3dc9a,#b88f35)' }}>{i + 1}</span>
              <h3 className="text-lg font-bold">{s.title}</h3>
            </div>
            <p className="muted mt-2 !text-[15px] leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="card">
        <h3 className="text-lg font-bold">For better results</h3>
        <ul className="mt-3 grid gap-2 text-[15px] text-paper/90 list-disc pl-5">
          <li>Use clear column names such as Date, Item and Amount, and keep one file for each month.</li>
          <li>The more months you upload, the better the comparisons. Forecasts for yearly patterns need about two years of data.</li>
          <li>Use "How was this calculated?" on any number to see where it came from.</li>
        </ul>
      </div>

      <div className="card" style={{ borderColor: 'rgba(232,201,122,.45)' }}>
        <h3 className="text-lg font-bold text-gold-bright">Please keep in mind</h3>
        <div className="mt-3 grid gap-3 text-[15px] leading-relaxed text-paper/90">
          <p>Aethra is a business support tool. It works only from the data you upload and suggests ideas for how you could improve your business. It does not make decisions for you, and nothing it says is definite.</p>
          <p>Reports, forecasts and suggestions are estimates, and the AI can make mistakes. For example, it may misread a column or miss something that is not in your file. Check important numbers, compare them with what you know about your business, and use your own judgement.</p>
          <p>Aethra does not give financial, tax or legal advice.</p>
        </div>
        <Link to="/contact#disclaimers" className="mt-4 inline-block text-gold underline">Read the full disclaimers</Link>
      </div>
    </section>
  )
}

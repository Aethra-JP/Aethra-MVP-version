import { useRef } from 'react'
import { LOGO_MARK } from '../content/brand'

const BARS = [38, 46, 41, 55, 50, 62, 58, 71, 66, 92, 100, 78] // sample shape only: a festive bump in the middle
const HOT = [9, 10]

export default function Hero3D() {
  const ref = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const move = (e) => {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', `${-22 + x * 16}deg`)
    ref.current.style.setProperty('--rx', `${16 - y * 12}deg`)
  }
  const leave = () => { ref.current?.style.removeProperty('--ry'); ref.current?.style.removeProperty('--rx') }
  return (
    <div className="hero3d" onMouseMove={move} onMouseLeave={leave} aria-hidden="true">
      <div className="stage" ref={ref}>
        <div className="floaty animate-floaty">
          <div className="plate plate-back" />
          <div className="plate plate-chart">
            <div className="flex items-center justify-between text-xs text-muted mb-3"><span>Sales by month</span><span className="pill">Sample</span></div>
            <div className="flex items-end gap-1.5 h-[170px]">
              {BARS.map((h, i) => (
                <div key={i} className="bar flex-1 animate-grow" style={{ height: `${h}%`, animationDelay: `${0.25 + i * 0.06}s`,
                  background: HOT.includes(i) ? 'linear-gradient(180deg,#fff1bf,#c9a24d)' : 'linear-gradient(180deg,#5a4a22,#2a2312)' }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-2"><span>Jan</span><span>Festive peak</span><span>Dec</span></div>
          </div>
          <div className="plate plate-kpi">
            <div className="text-xs text-muted">Total sales (sample)</div>
            <div className="font-display text-3xl font-bold gold-text mt-1">₹28.40 lakh</div>
            <div className="text-xs text-good mt-1">+15.8% vs previous month</div>
          </div>
          <div className="plate plate-chip">
            <div className="text-xs text-muted">Suggested action (sample)</div>
            <div className="font-bold mt-1 leading-snug">Stock up before the festive season</div>
            <div className="text-xs text-gold-bright mt-1">Estimated gain about ₹44,000</div>
          </div>
          <img className="coin animate-bob" src={LOGO_MARK} alt="" />
        </div>
      </div>
    </div>
  )
}

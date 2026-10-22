import { Link } from 'react-router-dom'
import { LOGO_MARK } from '../content/brand'

// Mark image + a wide-tracked AETHRA wordmark in the same style as the logo (live text stays sharp at any size).
export default function Logo({ size = 36, text = true, to = '/', className = '' }) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={LOGO_MARK} alt="" width={size} height={size}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.7)) drop-shadow(0 0 14px rgba(201,162,77,.35))' }} />
      {text && (
        <span className="leading-none">
          <span className="font-display font-medium text-[1.05rem] tracking-[0.34em] text-gold-bright">AETHRA</span>
          <span className="ml-2 text-[0.65rem] tracking-[0.2em] text-muted align-top">AI</span>
        </span>
      )}
    </span>
  )
  return to ? <Link to={to} aria-label="Aethra AI home">{inner}</Link> : inner
}

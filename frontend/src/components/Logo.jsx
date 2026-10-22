import { Link } from 'react-router-dom'
import { LOGO_SRC } from '../content/brand'

// The logo file is set in src/content/brand.js (frontend/public/logo.png).
export default function Logo({ size = 36, text = true, to = '/', className = '' }) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={LOGO_SRC} alt="" width={size} height={size} style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(201,162,77,.25))' }} />
      {text && (
        <span className="font-display font-bold text-xl tracking-tight text-paper leading-none">
          Aethra <span className="gold-text">AI</span>
        </span>
      )}
    </span>
  )
  return to ? <Link to={to} aria-label="Aethra AI home">{inner}</Link> : inner
}

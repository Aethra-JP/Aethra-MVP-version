import { Link } from 'react-router-dom'
import Logo from './Logo'
import { LOGO_SRC } from '../content/brand'

export default function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-x-clip">
      <aside className="hidden lg:flex flex-col justify-between p-12 border-r border-line/70" style={{ background: 'radial-gradient(700px 420px at 30% 20%, rgba(201,162,77,.18), transparent 65%)' }}>
        <Logo size={44} />
        <div className="max-w-md">
          <img src={LOGO_SRC} alt="" width="150" height="150" className="mb-8" style={{ transform: 'perspective(700px) rotateY(-18deg) rotateX(8deg)', filter: 'drop-shadow(0 30px 24px rgba(0,0,0,.8)) drop-shadow(0 0 30px rgba(201,162,77,.3))' }} />
          <h2 className="text-3xl font-extrabold leading-tight">Your monthly business report, in <span className="gold-text">plain language</span>.</h2>
          <ul className="mt-6 grid gap-3 text-muted">
            <li>Upload a sales file, get clear answers</li>
            <li>Forecasts tested on your own data</li>
            <li>Every number shows how it was calculated</li>
          </ul>
        </div>
        <Link to="/contact" className="text-sm text-muted hover:text-gold-bright">Need help? Contact us</Link>
      </aside>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6"><Logo /></div>
          <div className="card !p-7">
            <h1 className="text-2xl mb-5">{title}</h1>
            {children}
          </div>
          {footer && <div className="mt-4 muted">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

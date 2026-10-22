import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function PublicShell({ children, anchors = false }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <header className="glass sticky top-0 z-40 border-b border-line/70">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-6">
          <Logo />
          {anchors && (
            <nav className="hidden md:flex items-center gap-6 ml-6 text-sm text-muted" aria-label="Sections">
              <a className="hover:text-gold-bright" href="#features">Features</a>
              <a className="hover:text-gold-bright" href="#how">How it works</a>
              <a className="hover:text-gold-bright" href="#faq">FAQ</a>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link to="/contact" className="hidden sm:inline text-sm text-muted hover:text-gold-bright">Contact us</Link>
            <Link to="/login" className="btn-ghost !py-2">Log in</Link>
            <Link to="/signup" className="btn !py-2 hidden sm:inline-flex">Get started</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line/70 mt-16">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center gap-4 text-sm text-muted">
          <Logo size={28} />
          <span>Business analysis for Indian small businesses.</span>
          <nav className="ml-auto flex gap-5" aria-label="Footer">
            <Link className="hover:text-gold-bright" to="/contact">Contact us</Link>
            <Link className="hover:text-gold-bright" to="/login">Log in</Link>
            <Link className="hover:text-gold-bright" to="/signup">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

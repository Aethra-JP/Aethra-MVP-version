import { useEffect, useState } from 'react'
import { LEGAL_EMAIL, legalDocs } from '../Content/legal'

// Turns the support email inside a paragraph into a mailto link.
function withEmailLink(text) {
  const parts = text.split(LEGAL_EMAIL)
  return parts.flatMap((part, i) => (i < parts.length - 1
    ? [part, <a key={i} className="text-gold underline break-all" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>]
    : [part]))
}

const hashId = () => (typeof window === 'undefined' ? '' : window.location.hash.replace('#', ''))

// The five legal documents as expandable panels. A link such as /#terms opens that panel and scrolls to it.
export default function LegalSection({ className = '' }) {
  const [open, setOpen] = useState(() => (legalDocs.some((d) => d.id === hashId()) ? { [hashId()]: true } : {}))

  useEffect(() => {
    const go = () => {
      const id = hashId()
      if (id === 'legal') return document.getElementById('legal')?.scrollIntoView?.({ behavior: 'smooth' })
      if (!legalDocs.some((d) => d.id === id)) return
      setOpen((o) => ({ ...o, [id]: true }))
      setTimeout(() => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 80)
    }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [])

  return (
    <section id="legal" className={`scroll-mt-24 ${className}`} aria-labelledby="legal-title">
      <h2 id="legal-title" className="text-3xl font-bold">Legal</h2>
      <p className="muted mt-2 !text-base max-w-2xl">Please read how Aethra works with your data and what you can expect from us.</p>
      <div className="mt-6 grid gap-3">
        {legalDocs.map((d) => (
          <details key={d.id} id={d.id} open={!!open[d.id]} onToggle={(e) => { const isOpen = e.currentTarget.open; setOpen((o) => (o[d.id] === isOpen ? o : { ...o, [d.id]: isOpen })) }}
            className="card !py-4 group scroll-mt-24">
            <summary className="cursor-pointer font-bold list-none flex items-center justify-between gap-4">
              {d.title}
              <span className="text-gold-bright text-xl group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
            </summary>
            {d.meta.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{d.meta.map((m) => <span key={m} className="pill">{m}</span>)}</div>}
            <div className="mt-4 grid gap-3 max-w-3xl">
              {d.blocks.map((b, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-paper/90">
                  {b.h && <b className="text-gold-bright">{b.h}: </b>}{withEmailLink(b.p)}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

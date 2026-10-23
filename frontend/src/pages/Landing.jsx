import { Link } from 'react-router-dom'
import Hero3D from '../components/Hero3D'
import LegalSection from '../components/LegalSection'
import PublicShell from '../components/PublicShell'
import { landing as L } from '../content/landing'

const ICONS = {
  file: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 13h6 M9 17h6',
  chart: 'M4 19V5 M4 19h16 M8 15l3-4 3 3 5-7',
  chat: 'M4 5h16v11H9l-5 4z',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 8a4 4 0 100 8 4 4 0 000-8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  rupee: 'M7 5h10 M7 9h10 M7 5c5 0 7 2 7 4s-2 4-7 4l7 7',
}
const Icon = ({ name }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8c97a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
)

export default function Landing() {
  const [before, after] = L.hero.title.split(L.hero.accent)
  return (
    <PublicShell anchors>
      <section className="max-w-6xl mx-auto px-5 pt-14 pb-10 grid lg:grid-cols-2 gap-10 items-center">
        <div className="reveal">
          <span className="pill mb-5">Business analysis in English, Hindi and Hinglish</span>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold">
            {before}<span className="gold-text">{L.hero.accent}</span>{after}
          </h1>
          <p className="mt-5 text-lg text-muted max-w-xl">{L.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/signup" className="btn text-lg !px-7 !py-3">{L.hero.primary}</Link>
            <Link to="/login" className="btn-ghost text-lg !px-7 !py-3">{L.hero.secondary}</Link>
          </div>
          <p className="mt-4 text-sm text-muted">{L.hero.note}</p>
        </div>
        <Hero3D />
      </section>

      <section className="max-w-6xl mx-auto px-5 py-6 grid sm:grid-cols-3 gap-4">
        {L.trust.map(([t, d]) => (
          <div key={t} className="card !py-4"><div className="font-bold text-gold-bright">{t}</div><div className="muted">{d}</div></div>
        ))}
      </section>

      <section id="features" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <h2 className="text-3xl font-bold max-w-2xl">Everything a small business needs to understand its numbers</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {L.features.map((f) => (
            <article key={f.title} className="card tilt !p-6">
              <div className="icon-tile"><Icon name={f.icon} /></div>
              <h3 className="text-lg font-bold mt-5">{f.title}</h3>
              <p className="muted mt-2 !text-[15px] leading-relaxed">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-20">
        <div className="card !p-8 md:!p-10 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold">{L.india.title}</h2>
            <p className="muted mt-3 !text-base">Aethra understands the formats, currency, calendar and seasons you already work with.</p>
          </div>
          <ul className="grid gap-3">
            {L.india.points.map((p) => (
              <li key={p} className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-sm rotate-45 bg-gold-bright shadow-[0_0_12px_rgba(232,201,122,.7)]" />{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <h2 className="text-3xl font-bold">How it works</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-5">
          {L.steps.map((s, i) => (
            <li key={s.title} className="card tilt !p-6">
              <div className="font-display text-5xl font-extrabold gold-text leading-none">{i + 1}</div>
              <h3 className="text-lg font-bold mt-4">{s.title}</h3>
              <p className="muted mt-2 !text-[15px]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-20">
        <h2 className="text-3xl font-bold">Built for businesses like yours</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {L.audiences.map((a) => <span key={a} className="pill !text-sm !px-4 !py-1.5 !text-paper">{a}</span>)}
        </div>
      </section>

      <section id="faq" className="max-w-3xl mx-auto px-5 pt-20 scroll-mt-20">
        <h2 className="text-3xl font-bold">Questions people ask</h2>
        <div className="mt-8 grid gap-3">
          {L.faqs.map(([q, a]) => (
            <details key={q} className="card !py-4 group">
              <summary className="cursor-pointer font-bold list-none flex items-center justify-between gap-4">
                {q}<span className="text-gold-bright text-xl group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="muted mt-3 !text-base">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-20">
        <div className="card !p-10 text-center" style={{ background: 'radial-gradient(600px 220px at 50% 0%, rgba(201,162,77,.22), transparent 70%), linear-gradient(155deg, rgba(36,31,20,.86), rgba(12,11,8,.94))' }}>
          <h2 className="text-3xl font-bold">{L.cta.title}</h2>
          <p className="muted mt-2 !text-base">{L.cta.sub}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="btn text-lg !px-8 !py-3">{L.hero.primary}</Link>
            <Link to="/login" className="btn-ghost text-lg !px-8 !py-3">{L.hero.secondary}</Link>
          </div>
        </div>
      </section>

      <LegalSection className="max-w-4xl mx-auto px-5 pt-20" />
    </PublicShell>
  )
}

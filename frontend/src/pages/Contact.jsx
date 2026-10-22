import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { contact } from '../content/contact'

const KINDS = [['suggestion', 'Suggestion'], ['bug', 'Report a bug'], ['other', 'Something else']]

export default function Contact() {
  const { session } = useApp()
  const loc = useLocation()
  const [f, setF] = useState({ kind: 'suggestion', name: '', email: session?.user?.email || '', message: '', page: '', website: '' })
  const [state, setState] = useState({ busy: false, done: false, err: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const rows = [['Email', contact.email, contact.email && `mailto:${contact.email}`], ['Phone', contact.phone, contact.phone && `tel:${contact.phone}`],
    ['WhatsApp', contact.whatsapp, contact.whatsapp && `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`], ['Address', contact.address], ['Hours', contact.hours]].filter((r) => r[1])
  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, done: false, err: '' })
    try {
      await api.post('/contact', { ...f, page: f.page || loc.state?.from || '' })
      setState({ busy: false, done: true, err: '' })
      setF({ ...f, message: '', page: '' })
    } catch (x) { setState({ busy: false, done: false, err: x.message }) }
  }
  return (
    <div className="max-w-5xl mx-auto px-5 py-10 md:py-14">
      <h1 className="text-4xl font-extrabold">Contact <span className="gold-text">us</span></h1>
      <p className="muted mt-3 !text-base max-w-xl">{contact.intro}</p>
      <div className="mt-10 grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2 space-y-4">
          {rows.map(([k, v, href]) => (
            <div key={k} className="card !p-4">
              <div className="muted">{k}</div>
              {href ? <a className="font-bold text-gold-bright break-all hover:underline" href={href}>{v}</a> : <div className="font-bold">{v}</div>}
            </div>
          ))}
          {contact.replyNote && <p className="muted">{contact.replyNote}</p>}
        </div>
        <form onSubmit={submit} className="md:col-span-3 card !p-6 space-y-5">
          {state.done && <div className="okbox" role="status">Thank you. Your message has been sent.</div>}
          {state.err && <div className="err" role="alert">{state.err}</div>}
          <fieldset>
            <legend className="label">What is this about?</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map(([v, l]) => (
                <label key={v} className={`cursor-pointer rounded-lg px-4 py-2 border transition-colors ${f.kind === v ? 'border-gold text-gold-bright bg-raised' : 'border-line text-muted hover:border-gold/60'}`}>
                  <input type="radio" name="kind" value={v} checked={f.kind === v} onChange={set('kind')} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="cn">Your name</label><input id="cn" required maxLength={100} className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>
            <div><label className="label" htmlFor="ce">Your email</label><input id="ce" type="email" required maxLength={200} className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
          </div>
          {f.kind === 'bug' && (
            <div><label className="label" htmlFor="cp">Which page had the problem? (optional)</label><input id="cp" maxLength={300} className="input" value={f.page} onChange={set('page')} placeholder="For example: Forecast page" /></div>
          )}
          <div>
            <label className="label" htmlFor="cm">{f.kind === 'bug' ? 'What went wrong? What did you expect to happen?' : 'Your message'}</label>
            <textarea id="cm" required minLength={10} maxLength={3000} rows={6} className="input" value={f.message} onChange={set('message')} />
            <div className="muted text-right mt-1">{f.message.length}/3000</div>
          </div>
          {/* hidden trap for spam bots: people never see or fill this */}
          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
          </div>
          <button className="btn" disabled={state.busy}>{state.busy ? 'Sending...' : 'Send message'}</button>
        </form>
      </div>
    </div>
  )
}

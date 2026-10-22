import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '../components/Charts'
import CalcModal from '../components/CalcModal'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'

export default function Chat() {
  const { ws, dataset } = useApp()
  const { t, lang } = useI18n()
  const [sessions, setSessions] = useState([])
  const [sid, setSid] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [calcs, setCalcs] = useState(null)
  const end = useRef(null)
  const loadSessions = () => ws && api.get(`/chat/sessions?workspace_id=${ws.id}`).then(setSessions).catch(() => {})
  useEffect(() => { loadSessions() }, [ws?.id]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])
  if (!dataset) return <div className="muted">Upload a file first. <Link className="text-gold underline" to="/upload">{t('upload')}</Link></div>
  const open = async (id) => {
    setSid(id || null); setErr('')
    if (!id) return setMsgs([])
    try { setMsgs((await api.get(`/chat/sessions/${id}/messages`)).map((m) => ({ role: m.role, content: m.content, meta: m.meta }))) } catch (x) { setErr(x.message) }
  }
  const send = async (e) => {
    e.preventDefault()
    const q = text.trim()
    if (!q || busy) return
    setText(''); setErr(''); setBusy(true); setMsgs((m) => [...m, { role: 'user', content: q }])
    try {
      const r = await api.post('/chat', { workspace_id: ws.id, dataset_id: dataset.id, message: q, session_id: sid, language: lang })
      setSid(r.session_id)
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, meta: { charts: r.charts, calculations: r.calculations } }])
      loadSessions()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const starters = ['What are my total sales?', 'Which product sells the most?', 'How did last month compare with the month before?', 'Show sales by month as a chart']
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">{t('chat')}</h1>
        <select aria-label="Earlier conversations" className="input w-auto" value={sid || ''} onChange={(e) => open(e.target.value)}>
          <option value="">New conversation</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <div className="muted">Answers use the file "{dataset.name}". Numbers are calculated by code, then explained.</div>
      <div className="space-y-4 min-h-[40vh]">
        {msgs.length === 0 && <div className="flex flex-wrap gap-2">{starters.map((s) => <button key={s} className="pill hover:border-gold" onClick={() => setText(s)}>{s}</button>)}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`rounded-lg px-4 py-3 max-w-[92%] ${m.role === 'user' ? 'bg-raised border border-line' : 'card'}`}>
              <div className="whitespace-pre-line">{m.content}</div>
              {m.meta?.charts?.map((c, j) => <ChartCard key={j} spec={c} />)}
              {m.meta?.calculations?.length > 0 && <button className="text-gold underline text-sm mt-2" onClick={() => setCalcs(m.meta.calculations)}>{t('calcHow')}</button>}
            </div>
          </div>
        ))}
        {busy && <div className="muted">Thinking...</div>}
        <div ref={end} />
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <form onSubmit={send} className="flex gap-2 sticky bottom-0 bg-ink py-3">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('typeQuestion')} aria-label="Your question" maxLength={2000} />
        <button className="btn" disabled={busy || !text.trim()}>{t('send')}</button>
      </form>
      {calcs && <CalcModal calcs={calcs} onClose={() => setCalcs(null)} />}
    </div>
  )
}

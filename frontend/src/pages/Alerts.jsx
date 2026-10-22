import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'

export default function Alerts() {
  const { ws } = useApp()
  const { t } = useI18n()
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const load = () => ws && api.get(`/alerts?workspace_id=${ws.id}`).then(setList).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [ws?.id]) // eslint-disable-line
  const read = async (id) => { try { await api.patch(`/alerts/${id}`, {}); load() } catch (x) { setErr(x.message) } }
  return (
    <div className="max-w-2xl space-y-4">
      <h1>{t('alerts')}</h1>
      {err && <div className="err" role="alert">{err}</div>}
      {list.length === 0 && <div className="muted">Nothing to report. Alerts appear when your numbers move a lot between uploads, or when it is time to upload new data.</div>}
      {list.map((a) => (
        <div key={a.id} className={`card ${a.read ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2"><b className={a.severity === 'warning' ? 'text-bad' : 'text-gold-bright'}>{a.title}</b><span className="muted ml-auto">{shortDate(a.created_at)}</span></div>
          <p className="muted mt-1">{a.detail}</p>
          {!a.read && <button className="text-gold underline text-sm mt-2" onClick={() => read(a.id)}>Mark as read</button>}
        </div>
      ))}
    </div>
  )
}

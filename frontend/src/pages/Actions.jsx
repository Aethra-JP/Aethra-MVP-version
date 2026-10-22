import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { inr, pct, shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'

const STATUS = [['suggested', 'Suggested'], ['in_progress', 'In progress'], ['done', 'Done'], ['ignored', 'Not now']]

export default function Actions() {
  const { ws } = useApp()
  const { t } = useI18n()
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const load = () => ws && api.get(`/actions?workspace_id=${ws.id}`).then(setList).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [ws?.id]) // eslint-disable-line
  const patch = async (id, status) => { setErr(''); try { await api.patch(`/actions/${id}`, { status }); load() } catch (x) { setErr(x.message) } }
  const check = async (id) => { setErr(''); try { await api.post(`/actions/${id}/check`); load() } catch (x) { setErr(x.message) } }
  return (
    <div className="max-w-3xl space-y-5">
      <div><h1>{t('actions')}</h1><p className="muted">Actions come from the "What to do" report. After you upload newer data, check whether your totals moved.</p></div>
      {err && <div className="err" role="alert">{err}</div>}
      {list.length === 0 && <div className="muted">No actions yet. Run the "What to do" report on the Analysis page.</div>}
      {list.map((a) => (
        <div key={a.id} className="card space-y-2">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg mr-auto">{a.title}</h2><span className="pill">{a.priority} priority</span>
            {a.due_date && <span className="pill">by {shortDate(a.due_date)}</span>}</div>
          <p>{a.detail}</p>
          {a.est_impact_inr != null && <p className="text-gold-bright">{a.impact_type === 'risk' ? 'Revenue at risk' : 'Estimated gain'}: {inr(a.est_impact_inr)} <span className="muted">({a.assumption})</span></p>}
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor={`s${a.id}`}>Status</label>
            <select id={`s${a.id}`} className="input w-auto" value={a.status} onChange={(e) => patch(a.id, e.target.value)}>{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <button className="btn-ghost" onClick={() => check(a.id)}>Check progress</button>
          </div>
          {a.outcome && <div className="muted">Totals changed {pct(a.outcome.change_pct)} between the upload that created this action and "{a.outcome.latest_period}". {a.outcome.note}</div>}
        </div>
      ))}
    </div>
  )
}

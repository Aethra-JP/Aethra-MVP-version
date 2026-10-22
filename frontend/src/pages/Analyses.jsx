import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AnalysisView from '../components/AnalysisView'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'

export default function Analyses() {
  const { dataset } = useApp()
  const { t, lang } = useI18n()
  const [past, setPast] = useState([])
  const [view, setView] = useState(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const load = () => dataset && api.get(`/analyses?dataset_id=${dataset.id}`).then(setPast).catch(() => {})
  useEffect(() => { setView(null); setErr(''); load() }, [dataset?.id]) // eslint-disable-line
  if (!dataset) return <div className="muted">Upload a file first. <Link className="text-gold underline" to="/upload">{t('upload')}</Link></div>
  const run = async (kind) => {
    setErr(''); setBusy(kind); setView(null)
    try { setView(await api.post('/analyses', { dataset_id: dataset.id, kind, language: lang })); load() }
    catch (x) { setErr(x.message) } finally { setBusy('') }
  }
  const open = async (id) => { setErr(''); try { setView(await api.get(`/analyses/${id}`)) } catch (x) { setErr(x.message) } }
  const kinds = [['descriptive', 'Summary of your numbers'], ['diagnostic', 'Reasons behind the changes'], ['prescriptive', 'Specific actions to take']]
  return (
    <div className="space-y-6">
      <div><h1>{t('analyses')}</h1><p className="muted">Pick what you want to see. Each report runs only when you ask for it.</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        {kinds.map(([k, d]) => (
          <div key={k} className="card flex flex-col">
            <h2 className="text-lg">{t(k)}</h2><p className="muted my-2 flex-1">{d}</p>
            <button className="btn" disabled={!!busy} onClick={() => run(k)}>{busy === k ? t('loading') : t('run')}</button>
          </div>
        ))}
        <div className="card flex flex-col">
          <h2 className="text-lg">{t('predictive')}</h2><p className="muted my-2 flex-1">Forecast with the model you choose</p>
          <Link to="/forecast" className="btn-ghost">{t('forecast')}</Link>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {past.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center"><span className="muted">Earlier reports:</span>
          {past.slice(0, 8).map((p) => <button key={p.id} className="pill hover:border-gold" onClick={() => open(p.id)}>{t(p.kind)} on {shortDate(p.created_at)}</button>)}</div>
      )}
      {busy && <div className="muted">Working on your {t(busy).toLowerCase()} report...</div>}
      {view && <AnalysisView analysis={view.analysis} calculations={view.calculations} />}
    </div>
  )
}

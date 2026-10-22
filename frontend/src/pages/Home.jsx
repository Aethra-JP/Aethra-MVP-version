import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineSeries } from '../components/Charts'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { inr, num, shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'

const TYPES = ['Retail shop', 'Wholesale or distribution', 'Manufacturing', 'Food and sweets', 'Services', 'Online seller', 'Other']

function CreateWorkspace() {
  const { refreshWorkspaces } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api.post('/workspaces', { name, business_type: type }); await refreshWorkspaces() }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="max-w-lg">
      <h1>Set up your business</h1>
      <p className="muted mt-2 mb-6">Everything you upload stays inside this business. You can add more later.</p>
      <form onSubmit={submit} className="card space-y-4">
        {err && <div className="err" role="alert">{err}</div>}
        <div><label className="label" htmlFor="bn">{t('businessName')}</label><input id="bn" required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shree Ganesh Traders" /></div>
        <div><label className="label" htmlFor="bt">{t('businessType')}</label>
          <select id="bt" className="input" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>
        <button className="btn" disabled={busy}>{t('createWorkspace')}</button>
      </form>
    </div>
  )
}

export default function Home() {
  const { workspaces, ws, dataset, datasets } = useApp()
  const { t } = useI18n()
  const [info, setInfo] = useState(null)
  const [periods, setPeriods] = useState([])
  const [err, setErr] = useState('')
  useEffect(() => {
    setInfo(null); setErr('')
    if (dataset) api.get(`/datasets/${dataset.id}`).then(setInfo).catch((e) => setErr(e.message))
  }, [dataset?.id])
  useEffect(() => { if (ws) api.get(`/workspaces/${ws.id}/periods`).then(setPeriods).catch(() => {}) }, [ws?.id, datasets.length])
  if (!workspaces.length) return <CreateWorkspace />
  const ov = info?.profile?.overview
  return (
    <div className="space-y-6">
      <div><h1>{ws?.name}</h1><p className="muted">{ws?.business_type}</p></div>
      {err && <div className="err">{err}</div>}
      {!dataset && (
        <div className="card max-w-xl">
          <h2>Upload your first file</h2>
          <p className="muted my-2">Use a sales, expense or stock file in CSV or Excel. Tally and GST exports work too.</p>
          <Link to="/upload" className="btn">{t('upload')}</Link>
        </div>
      )}
      {ov && (<>
        <div className="card">
          <div className="muted">Total {ov.measure} in {dataset.name}</div>
          <div className="font-display text-5xl font-bold text-gold-bright mt-1">{inr(ov.total)}</div>
          <div className="muted mt-2">
            {num(ov.rows)} records{ov.date_from ? `, from ${shortDate(ov.date_from)} to ${shortDate(ov.date_to)}` : ''}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/analyses" className="btn">{t('analyses')}</Link>
            <Link to="/forecast" className="btn-ghost">{t('forecast')}</Link>
            <Link to="/chat" className="btn-ghost">{t('chat')}</Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {['product', 'category', 'customer'].filter((d) => ov[`top_${d}`]).map((d) => (
            <div key={d} className="card"><div className="muted">Top {d}</div>
              <div className="font-bold mt-1">{ov[`top_${d}`].name}</div><div className="text-gold-bright">{inr(ov[`top_${d}`].value)}</div></div>
          ))}
        </div>
        {info.profile.cleaning_log?.length > 0 && (
          <details className="card"><summary className="cursor-pointer font-bold">What we cleaned in your file ({info.profile.cleaning_log.length})</summary>
            <ul className="list-disc pl-5 mt-3 space-y-1 muted">{info.profile.cleaning_log.map((l) => <li key={l}>{l}</li>)}</ul></details>
        )}
      </>)}
      {periods.length > 1 && (
        <div className="card"><h2 className="mb-3">Your history across uploads</h2>
          <LineSeries data={periods.map((p) => ({ x: p.label, value: p.metrics?.total }))} /></div>
      )}
    </div>
  )
}

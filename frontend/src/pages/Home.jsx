import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineSeries } from '../components/Charts'
import ConfirmDialog from '../components/ConfirmDialog'
import HowItWorks from '../components/HowItWorks'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { inr, num, shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'

const TYPES = ['Retail shop', 'Wholesale or distribution', 'Manufacturing', 'Food and sweets', 'Services', 'Online seller', 'Other']
const DANGER = '!border-bad/50 !text-bad hover:!border-bad hover:!text-bad'

function CreateBusinessForm({ heading, intro, onCreated, onCancel }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const created = await api.post('/workspaces', { name, business_type: type }); await onCreated(created) }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="max-w-lg">
      <h1>{heading}</h1>
      <p className="muted mt-2 mb-6">{intro}</p>
      <form onSubmit={submit} className="card space-y-4">
        {err && <div className="err" role="alert">{err}</div>}
        <div><label className="label" htmlFor="bn">{t('businessName')}</label><input id="bn" required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shree Ganesh Traders" /></div>
        <div><label className="label" htmlFor="bt">{t('businessType')}</label>
          <select id="bt" className="input" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="flex gap-3">
          <button className="btn" disabled={busy}>{t('createWorkspace')}</button>
          {onCancel && <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>}
        </div>
      </form>
    </div>
  )
}

export default function Home() {
  const { workspaces, ws, setWsId, refreshWorkspaces, dataset, datasets, setDsId, refreshDatasets } = useApp()
  const { t } = useI18n()
  const [info, setInfo] = useState(null)
  const [periods, setPeriods] = useState([])
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind: 'file' | 'business', item }
  const [busy, setBusy] = useState(false)
  const [dlgErr, setDlgErr] = useState('')

  useEffect(() => {
    setInfo(null); setErr('')
    if (dataset) api.get(`/datasets/${dataset.id}`).then(setInfo).catch((e) => setErr(e.message))
  }, [dataset?.id])
  useEffect(() => { if (ws) api.get(`/workspaces/${ws.id}/periods`).then(setPeriods).catch(() => setPeriods([])) }, [ws?.id, datasets.length])

  if (!workspaces.length) {
    return <CreateBusinessForm heading="Set up your business" intro="Everything you upload stays inside this business. You can add more later." onCreated={async () => { await refreshWorkspaces() }} />
  }

  const ask = (kind, item) => { setDlgErr(''); setConfirm({ kind, item }) }
  const remove = async () => {
    setBusy(true); setDlgErr('')
    try {
      if (confirm.kind === 'file') { await api.del(`/datasets/${confirm.item.id}`); await refreshDatasets(ws?.id) }
      else { await api.del(`/workspaces/${confirm.item.id}`); await refreshWorkspaces() }
      setConfirm(null)
    } catch (x) { setDlgErr(x.message) } finally { setBusy(false) }
  }

  const ov = info?.profile?.overview
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="mr-auto"><h1>{ws?.name}</h1><p className="muted">{ws?.business_type}</p></div>
        <button className="btn-ghost" onClick={() => setAdding(true)}>Add a new business</button>
        <button className={`btn-ghost ${DANGER}`} onClick={() => ask('business', ws)}>Remove this business</button>
      </div>

      {adding && (
        <CreateBusinessForm heading="Add a new business" intro="It gets its own files, reports and history. Switch between your businesses from the box on the left."
          onCreated={async (created) => { await refreshWorkspaces(); setWsId(created.id); setAdding(false) }} onCancel={() => setAdding(false)} />
      )}
      {err && <div className="err">{err}</div>}

      <section className="card" aria-labelledby="files-title">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="files-title" className="mr-auto">Your files</h2>
          <Link to="/upload" className="btn">{t('upload')}</Link>
        </div>
        {datasets.length === 0 ? (
          <p className="muted mt-3 !text-base">No files yet. Upload a sales, expense or stock file in CSV or Excel. Tally and GST exports work too.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {datasets.map((d) => (
              <li key={d.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{d.name}</div>
                  <div className="muted">{num(d.row_count)} rows{d.period_label ? `, ${d.period_label}` : ''}, added {shortDate(d.created_at)}</div>
                </div>
                {dataset?.id === d.id
                  ? <span className="pill !text-gold-bright">In use</span>
                  : <button className="btn-ghost !py-1.5" onClick={() => setDsId(d.id)}>Use this file</button>}
                <button className={`btn-ghost !py-1.5 ${DANGER}`} onClick={() => ask('file', d)}>Remove file</button>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <HowItWorks />

      {confirm?.kind === 'file' && (
        <ConfirmDialog title="Remove this file?" confirmLabel="Remove file" busy={busy} error={dlgErr} onConfirm={remove} onCancel={() => setConfirm(null)}>
          <p><b className="text-gold-bright">{confirm.item.name}</b> will be deleted, together with the reports, forecasts and history made from it.</p>
          <p className="muted !text-sm">This cannot be undone. Your other files are not affected.</p>
        </ConfirmDialog>
      )}
      {confirm?.kind === 'business' && (
        <ConfirmDialog title="Remove this business?" confirmLabel="Remove business" requireText={confirm.item.name} busy={busy} error={dlgErr} onConfirm={remove} onCancel={() => setConfirm(null)}>
          <p><b className="text-gold-bright">{confirm.item.name}</b> will be deleted for good, with all its files, reports, forecasts, chats, documents and actions.</p>
          <p className="muted !text-sm">This cannot be undone. Your other businesses are not affected.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

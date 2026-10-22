import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { inr, num } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const SOURCES = [['auto', 'Detect automatically'], ['generic', 'Normal sales or expense file'], ['tally', 'Tally export'], ['gst', 'GST sales file']]

export default function Upload() {
  const { ws, refreshDatasets, setDsId } = useApp()
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [source, setSource] = useState('auto')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)
  if (!ws) return <div className="muted">Create your business on the Home page first.</div>
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setRes(null)
    if (!file) return setErr('Please choose a file.')
    if (file.size > 10 * 1024 * 1024) return setErr('This file is larger than 10 MB. Please upload a smaller file.')
    if (!/\.(csv|xlsx|xlsm)$/i.test(file.name)) return setErr('Please upload a .csv or .xlsx file. For old .xls files, save as .xlsx first.')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${ws.id}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from('datasets').upload(path, file)
      if (up.error) throw new Error('Upload failed: ' + up.error.message)
      const out = await api.post('/datasets/register', { workspace_id: ws.id, name: name || file.name, storage_path: path, source_type: source, period_label: label || null })
      await refreshDatasets(ws.id)
      setDsId(out.dataset.id)
      setRes(out)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="max-w-2xl space-y-6">
      <h1>{t('upload')}</h1>
      <form onSubmit={submit} className="card space-y-4">
        {err && <div className="err" role="alert">{err}</div>}
        <div><label className="label" htmlFor="f">{t('chooseFile')}</label>
          <input id="f" type="file" accept=".csv,.xlsx,.xlsm" className="input" onChange={(e) => { setFile(e.target.files[0]); if (!name && e.target.files[0]) setName(e.target.files[0].name.replace(/\.[^.]+$/, '')) }} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label" htmlFor="n">Name for this upload</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label" htmlFor="l">Period (optional)</label><input id="l" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="October 2026" /></div>
        </div>
        <div><label className="label" htmlFor="s">What kind of file is it?</label>
          <select id="s" className="input" value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <button className="btn" disabled={busy}>{busy ? t('loading') : t('uploadBtn')}</button>
      </form>
      {res && (
        <div className="card space-y-3">
          <div className="okbox">Your file is ready.</div>
          <div>{num(res.overview.rows)} rows read. Total {res.overview.measure}: <b className="text-gold-bright">{inr(res.overview.total)}</b></div>
          {res.cleaning_log.length > 0 && <ul className="list-disc pl-5 muted space-y-1">{res.cleaning_log.map((l) => <li key={l}>{l}</li>)}</ul>}
          <div className="muted">Columns we recognised: {Object.entries(res.roles).map(([k, v]) => `${k} = ${v}`).join(', ')}</div>
          <Link to="/analyses" className="btn">{t('analyses')}</Link>
        </div>
      )}
    </div>
  )
}

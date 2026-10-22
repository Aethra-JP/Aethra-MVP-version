import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export default function Documents() {
  const { ws } = useApp()
  const { t } = useI18n()
  const [docs, setDocs] = useState([])
  const [enabled, setEnabled] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = () => ws && api.get(`/documents?workspace_id=${ws.id}`).then(setDocs).catch((e) => setErr(e.message))
  useEffect(() => { load(); api.get('/knowledge/status').then((s) => setEnabled(s.embeddings_enabled)).catch(() => {}) }, [ws?.id]) // eslint-disable-line
  if (!ws) return <div className="muted">Create your business on the Home page first.</div>
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!file) return setErr('Please choose a file.')
    if (!/\.(pdf|txt|md|csv)$/i.test(file.name)) return setErr('Supported documents: PDF, TXT, MD or CSV.')
    setBusy(true)
    try {
      const path = `${ws.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
      const up = await supabase.storage.from('documents').upload(path, file)
      if (up.error) throw new Error('Upload failed: ' + up.error.message)
      const doc = await api.post('/documents/register', { workspace_id: ws.id, name: file.name, storage_path: path })
      await load()
      await api.post(`/documents/${doc.id}/ingest`)
      setFile(null)
    } catch (x) { setErr(x.message) } finally { setBusy(false); load() }
  }
  const retry = async (id) => { setErr(''); try { await api.post(`/documents/${id}/ingest`) } catch (x) { setErr(x.message) } finally { load() } }
  return (
    <div className="max-w-3xl space-y-6">
      <div><h1>{t('documents')}</h1><p className="muted">Add supplier terms, invoices as PDF, or notes. In chat you can then ask questions about them.</p></div>
      {enabled === false && <div className="err">Document search is switched off on this server. Ask the administrator to enable embeddings.</div>}
      {err && <div className="err" role="alert">{err}</div>}
      <form onSubmit={submit} className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]"><label className="label" htmlFor="df">Choose a PDF, TXT, MD or CSV file</label>
          <input id="df" type="file" accept=".pdf,.txt,.md,.csv" className="input" onChange={(e) => setFile(e.target.files[0])} /></div>
        <button className="btn" disabled={busy || enabled === false}>{busy ? t('loading') : 'Add document'}</button>
      </form>
      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0"><div className="font-bold truncate">{d.name}</div>
              <div className="muted">{d.status === 'ready' ? `Ready, ${d.chunk_count} searchable parts` : d.status === 'failed' ? d.error : 'Waiting to be processed'}</div></div>
            {d.status !== 'ready' && <button className="btn-ghost" onClick={() => retry(d.id)}>Process again</button>}
          </div>
        ))}
        {docs.length === 0 && <div className="muted">No documents yet.</div>}
      </div>
    </div>
  )
}

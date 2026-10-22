import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineSeries } from '../components/Charts'
import { api } from '../lib/api'
import { useApp } from '../lib/AppContext'
import { inr, num } from '../lib/format'
import { useI18n } from '../lib/i18n'

export default function Forecast() {
  const { dataset } = useApp()
  const { t } = useI18n()
  const [freq, setFreq] = useState('monthly')
  const [info, setInfo] = useState(null)
  const [model, setModel] = useState('holt_winters')
  const [horizon, setHorizon] = useState(6)
  const [out, setOut] = useState(null)
  const [cmp, setCmp] = useState(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    setInfo(null); setOut(null); setCmp(null); setErr('')
    if (dataset) api.get(`/predict/models?dataset_id=${dataset.id}&frequency=${freq}`).then(setInfo).catch((e) => setErr(e.message))
  }, [dataset?.id, freq])
  if (!dataset) return <div className="muted">Upload a file first. <Link className="text-gold underline" to="/upload">{t('upload')}</Link></div>
  const run = async (m = model) => {
    setErr(''); setBusy('run'); setCmp(null)
    try { setOut(await api.post('/predict/run', { dataset_id: dataset.id, model: m, horizon: Number(horizon), frequency: freq })) }
    catch (x) { setErr(x.message) } finally { setBusy('') }
  }
  const compare = async () => {
    setErr(''); setBusy('cmp')
    try { setCmp(await api.post('/predict/compare', { model_run_id: out.run.id })) }
    catch (x) { setErr(x.message) } finally { setBusy('') }
  }
  const chart = out ? [...out.history.map((h) => ({ x: h.period, actual: h.value })), ...out.forecast.map((f) => ({ x: f.period, forecast: f.value }))] : []
  const label = (n) => info?.models.find((m) => m.name === n)?.label || n
  return (
    <div className="space-y-6">
      <div><h1>{t('forecast')}</h1><p className="muted">Choose a model, see the forecast, then check which model fits your data best.</p></div>
      {err && <div className="err" role="alert">{err}</div>}
      {info && (
        <div className="card space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="fr">Forecast by</label>
              <select id="fr" className="input" value={freq} onChange={(e) => setFreq(e.target.value)}><option value="monthly">Month</option><option value="weekly">Week</option><option value="daily">Day</option></select></div>
            <div><label className="label" htmlFor="hz">How many periods ahead</label>
              <select id="hz" className="input" value={horizon} onChange={(e) => setHorizon(e.target.value)}>{[3, 6, 9, 12].map((n) => <option key={n}>{n}</option>)}</select></div>
          </div>
          <div className="muted">Your file gives {info.periods} {freq} periods of {info.target}.</div>
          <fieldset><legend className="label">Model</legend>
            <div className="grid gap-2">
              {info.models.map((m) => (
                <label key={m.name} className={`flex gap-3 rounded-md border p-3 ${m.available ? 'border-line cursor-pointer hover:border-gold' : 'border-line opacity-50'} ${model === m.name && m.available ? 'border-gold bg-raised' : ''}`}>
                  <input type="radio" name="model" disabled={!m.available} checked={model === m.name} onChange={() => setModel(m.name)} />
                  <span><b>{m.label}</b><br /><span className="muted">{m.available ? m.about : m.reason}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn" disabled={!!busy} onClick={() => run()}>{busy === 'run' ? t('loading') : t('runModel')}</button>
        </div>
      )}
      {out && (<>
        <div className="card">
          <h2 className="mb-1">{out.label}</h2>
          <p className="muted mb-3">The dashed line is the forecast.</p>
          <LineSeries data={chart} series={['actual', 'forecast']} />
          {(out.warnings || []).map((w) => <div key={w} className="err mt-3">{w}</div>)}
          {out.backtest ? (
            <p className="muted mt-3">Tested on your own past data: typical miss of {inr(out.backtest.mae)} per period (average error), about {num(out.backtest.smape_pct)}% off.</p>
          ) : <p className="muted mt-3">Not enough history to test this model on your data.</p>}
          <button className="btn mt-4" disabled={!!busy} onClick={compare}>{busy === 'cmp' ? t('loading') : t('compareModels')}</button>
        </div>
      </>)}
      {cmp && (
        <div className="card space-y-3">
          <h2>Which model fits your data best</h2>
          <div className="okbox">{cmp.verdict}</div>
          {cmp.warnings.map((w) => <div key={w} className="err">{w}</div>)}
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-2 pr-3">Rank</th><th className="pr-3">Model</th><th className="pr-3">Average error</th><th className="pr-3">Error % (lower is better)</th></tr></thead>
            <tbody>{cmp.ranking.map((r) => (
              <tr key={r.model} className={`border-t border-line ${r.model === cmp.recommended ? 'text-gold-bright' : ''}`}>
                <td className="py-2 pr-3">{r.rank || '-'}</td><td className="pr-3">{r.label}{r.model === out.run.model_name ? ' (your choice)' : ''}</td>
                <td className="pr-3">{r.mae != null ? inr(r.mae) : <span className="muted">{r.skipped}</span>}</td><td className="pr-3">{r.smape_pct != null ? num(r.smape_pct) + '%' : ''}</td>
              </tr>))}</tbody></table></div>
          <p className="muted">Error % shows how far each model's forecast was from what really happened when tested on your own past months. 0% would be perfect, and the higher the number, the more it missed. The ranking weighs big misses more heavily, so the order can differ slightly from the Error % column.</p>
          {cmp.recommended && cmp.recommended !== out.run.model_name && (
            <button className="btn" disabled={!!busy} onClick={() => { setModel(cmp.recommended); run(cmp.recommended) }}>Run {label(cmp.recommended)}</button>
          )}
        </div>
      )}
    </div>
  )
}

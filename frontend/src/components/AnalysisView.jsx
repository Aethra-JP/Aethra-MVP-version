import { useState } from 'react'
import { BarSeries, LineSeries } from './Charts'
import CalcModal from './CalcModal'
import { fmtUnit, inr, num, pct } from '../lib/format'

function Section({ title, children }) {
  return <section className="card"><h2 className="mb-3">{title}</h2>{children}</section>
}

export default function AnalysisView({ analysis, calculations = [] }) {
  const [calcId, setCalcId] = useState(null)
  const [all, setAll] = useState(false)
  const r = analysis.result || {}
  const how = (id) => <button className="text-gold underline text-sm" onClick={() => setCalcId(id)}>How was this calculated?</button>
  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="pill">{analysis.narrative_source === 'ai' ? 'AI explanation, numbers checked' : 'Plain summary'}</span>
          <button className="text-gold underline text-sm ml-auto" onClick={() => setAll(true)}>See every calculation</button>
        </div>
        <p className="max-w-prose whitespace-pre-line">{analysis.narrative}</p>
      </div>

      {analysis.kind === 'descriptive' && (<>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(r.kpis || []).map((k) => (
            <div key={k.calc} className="card">
              <div className="muted">{k.label}</div>
              <div className="font-display text-3xl font-bold mt-1">{fmtUnit(k.value, k.unit)}</div>
              <div className="mt-2">{how(k.calc)}</div>
            </div>
          ))}
        </div>
        {r.trend?.length > 1 && <Section title="Month by month"><LineSeries data={r.trend} xKey="period" /></Section>}
        {Object.entries(r.breakdowns || {}).map(([dim, items]) => (
          <Section key={dim} title={`Top ${dim}s`}>
            <BarSeries data={items.map((i) => ({ x: i.name, value: i.value }))} />
            {r.concentration?.[dim] != null && <p className="muted mt-2">The top 3 {dim}s bring {num(r.concentration[dim])}% of your total.</p>}
          </Section>
        ))}
        {(r.notes || []).map((n) => <div key={n} className="muted">{n}</div>)}
      </>)}

      {analysis.kind === 'diagnostic' && (<>
        {r.drivers && (
          <Section title={`What changed between ${r.drivers.from} and ${r.drivers.to}`}>
            <p className="mb-3">Overall change: <b className="text-gold-bright">{inr(r.drivers.delta)}</b></p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><div className="font-bold text-good mb-1">Grew</div>{r.drivers.up.length ? r.drivers.up.map((d) => <div key={d.name}>{d.name}: {inr(d.delta)}</div>) : <div className="muted">Nothing grew.</div>}</div>
              <div><div className="font-bold text-bad mb-1">Fell</div>{r.drivers.down.length ? r.drivers.down.map((d) => <div key={d.name}>{d.name}: {inr(d.delta)}</div>) : <div className="muted">Nothing fell.</div>}</div>
            </div>
          </Section>
        )}
        {r.weekday && <Section title="Best and weakest days"><BarSeries data={r.weekday.values.map((w) => ({ x: w.day, value: w.average }))} /></Section>}
        {r.anomalies?.length > 0 && (
          <Section title="Unusual days">
            {r.anomalies.map((a) => <div key={a.date}>{a.date}: {inr(a.value)} <span className="muted">({a.direction === 'high' ? 'unusually high' : 'unusually low'})</span></div>)}
          </Section>
        )}
        {r.correlations?.length > 0 && (
          <Section title="Columns that move together">
            {r.correlations.map((c) => <div key={c.a + c.b}>{c.a} and {c.b}: {c.r}</div>)}
          </Section>
        )}
        {r.margin && (
          <Section title="Margin">
            <p>Overall margin: <b className="text-gold-bright">{pct(r.margin.overall_pct).replace('+', '')}</b></p>
            {r.margin.negative_items.map((i) => <div key={i.name} className="text-bad">{i.name} is losing {inr(Math.abs(i.profit))}</div>)}
          </Section>
        )}
        {!r.drivers && !r.weekday && <div className="muted">This file has too little dated data to explain changes. Upload more months.</div>}
      </>)}

      {analysis.kind === 'prescriptive' && (
        <div className="space-y-4">
          {(r.actions || []).map((a) => (
            <div key={a.title} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg">{a.title}</h2>
                <span className="pill">{a.priority} priority</span>
                <span className="pill">within {a.due_in_days} days</span>
              </div>
              <p className="mt-2">{a.detail}</p>
              {a.est_impact_inr != null && (
                <p className="mt-2 text-gold-bright">{a.impact_type === 'risk' ? 'Revenue at risk' : 'Estimated gain'}: {inr(a.est_impact_inr)}</p>
              )}
              <p className="muted mt-1">{a.assumption}</p>
              {a.calc_ids?.[0] && <div className="mt-2">{how(a.calc_ids[0])}</div>}
            </div>
          ))}
          {(r.actions || []).length === 0 && <div className="muted">No clear actions stood out. Upload more months for sharper advice.</div>}
          <div className="muted">These actions are saved in your Action plan.</div>
        </div>
      )}
      {(calcId || all) && <CalcModal calcs={calculations} only={all ? null : calcId} onClose={() => { setCalcId(null); setAll(false) }} />}
    </div>
  )
}

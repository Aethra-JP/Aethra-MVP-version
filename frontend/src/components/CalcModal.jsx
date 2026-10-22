export default function CalcModal({ calcs, only, onClose }) {
  const list = only ? calcs.filter((c) => (c.calc_id || c.id) === only) : calcs
  const show = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="How this was calculated" onClick={onClose}>
      <div className="card max-w-2xl w-full mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2>How this was calculated</h2>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
        <p className="muted mb-4">Every number comes from your file, computed by code. The AI only explains these results.</p>
        <div className="space-y-4">
          {list.length === 0 && <div className="muted">No calculation details were saved for this item.</div>}
          {list.map((c, i) => (
            <div key={(c.calc_id || c.id) + i} className="border-t border-line pt-3">
              <div className="font-bold">{c.label}</div>
              <div className="text-gold-bright break-words text-sm mt-1">{show(c.value)}</div>
              <div className="muted mt-1">Formula: {c.formula}</div>
              {c.source_columns?.length > 0 && <div className="muted">Columns used: {c.source_columns.join(', ')}</div>}
              {c.filters && Object.keys(c.filters).length > 0 && <div className="muted">Filters: {JSON.stringify(c.filters)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

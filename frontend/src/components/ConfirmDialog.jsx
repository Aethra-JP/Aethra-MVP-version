import { useEffect, useState } from 'react'

// A small "are you sure?" box. If requireText is given, the person must type it before the button works.
export default function ConfirmDialog({ title, children, confirmLabel = 'Remove', requireText, busy, error, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const ok = !requireText || typed.trim() === requireText.trim()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cd-title" onClick={() => !busy && onCancel()}>
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 id="cd-title">{title}</h2>
        <div className="mt-3 space-y-3 text-[15px] text-paper/90">{children}</div>
        {requireText && (
          <div className="mt-4">
            <label className="label" htmlFor="cd-type">Type <b className="text-gold-bright">{requireText}</b> to confirm</label>
            <input id="cd-type" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </div>
        )}
        {error && <div className="err mt-4" role="alert">{error}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button onClick={onConfirm} disabled={!ok || busy}
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-bold text-ink bg-bad hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? 'Removing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

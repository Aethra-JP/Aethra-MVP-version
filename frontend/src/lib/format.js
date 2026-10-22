export function inr(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return 'n/a'
  const n = Number(x), a = Math.abs(n), sign = n < 0 ? '-' : ''
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} crore`
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} lakh`
  return `${sign}₹${a.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
export const num = (x) => (x === null || x === undefined ? 'n/a' : Number(x).toLocaleString('en-IN', { maximumFractionDigits: 2 }))
export const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Number(x) > 0 ? '+' : ''}${Number(x).toFixed(1)}%`)
export const shortDate = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
export function fmtUnit(v, unit) {
  if (unit === 'inr') return inr(v)
  if (unit === 'pct') return pct(v)
  return num(v)
}

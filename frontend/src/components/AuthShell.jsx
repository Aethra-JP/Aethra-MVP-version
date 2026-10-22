export default function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="font-display text-4xl font-bold text-gold-bright mb-1">Aethra</div>
        <p className="muted mb-6">Your monthly business report, in plain language.</p>
        <div className="card">
          <h1 className="text-2xl mb-4">{title}</h1>
          {children}
        </div>
        {footer && <div className="mt-4 muted">{footer}</div>}
      </div>
    </div>
  )
}

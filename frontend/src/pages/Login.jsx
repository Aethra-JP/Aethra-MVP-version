import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import GoogleButton from '../components/GoogleButton'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export const friendly = (m = '') =>
  /invalid login/i.test(m) ? 'That email and password do not match.'
    : /not confirmed/i.test(m) ? 'Please confirm your email first. We sent you a link when you signed up.'
    : /rate limit|too many/i.test(m) ? 'Too many attempts. Please wait a minute and try again.'
    : m || 'Something went wrong. Please try again.'

export default function Login() {
  const { t } = useI18n()
  const { session } = useApp()
  const nav = useNavigate()
  const notice = useLocation().state?.notice
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setNeedsConfirm(false); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) { setErr(friendly(error.message)); setNeedsConfirm(/not confirmed/i.test(error.message)) } else nav('/')
  }
  const resend = async () => {
    setErr(''); setInfo('')
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/email-confirmed` } })
    if (error) setErr(/rate|too many|seconds/i.test(error.message) ? 'Please wait a minute before asking for another email.' : friendly(error.message))
    else setInfo('Confirmation email sent. Check your inbox and spam folder.')
  }
  return (
    <AuthShell title={t('logIn')} footer={<>{t('noAccount')} <Link className="text-gold underline" to="/signup">{t('signUp')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {notice && !err && <div className="okbox" role="status">{notice}</div>}
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="okbox" role="status">{info}</div>}
        {needsConfirm && <button type="button" className="btn-ghost w-full" onClick={resend}>Resend confirmation email</button>}
        <div><label className="label" htmlFor="email">{t('email')}</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label" htmlFor="pw">{t('password')}</label>
          <input id="pw" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        <button className="btn w-full" disabled={busy}>{busy ? t('loading') : t('logIn')}</button>
        <div className="text-right"><Link className="text-gold underline text-sm" to="/forgot-password">{t('forgotPassword')}</Link></div>
      </form>
      <div className="my-5 flex items-center gap-3 muted"><span className="flex-1 border-t border-line" />or<span className="flex-1 border-t border-line" /></div>
      <GoogleButton />
      <div className="mt-5 text-center"><Link className="muted hover:text-gold-bright" to="/">Back to home</Link></div>
    </AuthShell>
  )
}

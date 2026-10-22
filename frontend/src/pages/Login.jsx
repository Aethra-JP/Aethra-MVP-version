import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export const friendly = (m = '') =>
  /invalid login/i.test(m) ? 'That email and password do not match.'
    : /not confirmed/i.test(m) ? 'Please confirm your email first. Check your inbox.'
    : /rate limit|too many/i.test(m) ? 'Too many attempts. Please wait a minute and try again.'
    : m || 'Something went wrong. Please try again.'

export default function Login() {
  const { t } = useI18n()
  const { session } = useApp()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setErr(friendly(error.message)); else nav('/')
  }
  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  return (
    <AuthShell title={t('logIn')} footer={<>{t('noAccount')} <Link className="text-gold underline" to="/signup">{t('signUp')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="err" role="alert">{err}</div>}
        <div><label className="label" htmlFor="email">{t('email')}</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label" htmlFor="pw">{t('password')}</label>
          <input id="pw" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        <button className="btn w-full" disabled={busy}>{busy ? t('loading') : t('logIn')}</button>
        <div className="text-right"><Link className="text-gold underline text-sm" to="/forgot-password">{t('forgotPassword')}</Link></div>
      </form>
      <div className="my-4 border-t border-line" />
      <button type="button" className="btn-ghost w-full" onClick={google}>{t('continueGoogle')}</button>
    </AuthShell>
  )
}

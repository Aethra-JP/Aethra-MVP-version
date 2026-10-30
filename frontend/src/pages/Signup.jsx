import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import GoogleButton from '../components/GoogleButton'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { LEGAL_VERSION } from '../content/legal'
import { friendly } from './Login'

export default function Signup() {
  const { t } = useI18n()
  const { session } = useApp()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [stage, setStage] = useState('form') // form | verify | exists
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)
  useEffect(() => { if (wait > 0) { const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id) } }, [wait])
  if (session) return <Navigate to="/" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!agree) return setErr('Please accept the Terms and Conditions to create your account.')
    if (f.password.length < 8) return setErr('Use at least 8 characters for your password.')
    if (f.password !== f.confirm) return setErr('Passwords do not match. Please type the same password in both fields.')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.name, terms_accepted_at: new Date().toISOString(), terms_version: LEGAL_VERSION }, emailRedirectTo: `${window.location.origin}/email-confirmed` },
    })
    setBusy(false)
    if (error) return setErr(friendly(error.message))
    // Supabase hides whether an email is already registered, but returns a user with no identities in that case
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return setStage('exists')
    if (!data.session) { setStage('verify'); setWait(45) }
  }
  const resend = async () => {
    setErr(''); setInfo('')
    const { error } = await supabase.auth.resend({ type: 'signup', email: f.email, options: { emailRedirectTo: `${window.location.origin}/email-confirmed` } })
    if (error) setErr(/rate|too many|seconds/i.test(error.message) ? 'Please wait a minute before asking for another email.' : friendly(error.message))
    else { setInfo('Sent again. Check your inbox and spam folder.'); setWait(45) }
  }
  const footer = <>{t('haveAccount')} <Link className="text-gold underline" to="/login">{t('logIn')}</Link></>

  if (stage === 'verify') return (
    <AuthShell title="Check your email" footer={footer}>
      <div className="space-y-4">
        <p>We sent a confirmation link to <b className="text-gold-bright break-all">{f.email}</b>. Open it to activate your account, then log in.</p>
        <p className="muted">It can take a minute. Look in the spam folder too.</p>
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="okbox" role="status">{info}</div>}
        <button className="btn-ghost w-full" onClick={resend} disabled={wait > 0}>{wait > 0 ? `Send again in ${wait}s` : 'Send the email again'}</button>
        <button className="muted underline" onClick={() => { setStage('form'); setInfo(''); setErr('') }}>Use a different email</button>
      </div>
    </AuthShell>
  )
  if (stage === 'exists') return (
    <AuthShell title="You already have an account" footer={footer}>
      <div className="space-y-4">
        <p><b className="text-gold-bright break-all">{f.email}</b> is already registered. If you never confirmed it, use "Resend confirmation email" on the log in page.</p>
        <Link to="/login" className="btn w-full">{t('logIn')}</Link>
        <Link to="/forgot-password" className="btn-ghost w-full">{t('forgotPassword')}</Link>
      </div>
    </AuthShell>
  )
  return (
    <AuthShell title={t('signUp')} footer={footer}>
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="err" role="alert">{err}</div>}
        <div><label className="label" htmlFor="n">{t('fullName')}</label><input id="n" className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div><label className="label" htmlFor="e">{t('email')}</label><input id="e" type="email" required className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div><label className="label" htmlFor="p">{t('password')}</label><input id="p" type="password" required className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="p2">{t('confirmPassword')}</label><input id="p2" type="password" required className="input" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#c9a24d]" />
          <span className="text-sm">I agree to the{' '}
            <a className="text-gold underline" href="/#terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a></span>
        </label>
        <button className="btn w-full" disabled={busy || !agree}>{busy ? t('loading') : t('signUp')}</button>
      </form>
      <div className="my-5 flex items-center gap-3 muted"><span className="flex-1 border-t border-line" />or<span className="flex-1 border-t border-line" /></div>
      <GoogleButton />
      <div className="mt-5 text-center"><Link className="muted hover:text-gold-bright" to="/">Back to home</Link></div>
    </AuthShell>
  )
}

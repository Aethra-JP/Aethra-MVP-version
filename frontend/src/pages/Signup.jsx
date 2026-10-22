import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { friendly } from './Login'

export default function Signup() {
  const { t } = useI18n()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (f.password.length < 8) return setErr('Use at least 8 characters for your password.')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.name }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return setErr(friendly(error.message))
    if (!data.session) setDone(true)
  }
  return (
    <AuthShell title={t('signUp')} footer={<>{t('haveAccount')} <Link className="text-gold underline" to="/login">{t('logIn')}</Link></>}>
      {done ? <div className="okbox" role="status">{t('checkEmail')}</div> : (
        <form onSubmit={submit} className="space-y-4">
          {err && <div className="err" role="alert">{err}</div>}
          <div><label className="label" htmlFor="n">{t('fullName')}</label><input id="n" className="input" value={f.name} onChange={set('name')} autoComplete="name" /></div>
          <div><label className="label" htmlFor="e">{t('email')}</label><input id="e" type="email" required className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
          <div><label className="label" htmlFor="p">{t('password')}</label><input id="p" type="password" required className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
          <button className="btn w-full" disabled={busy}>{busy ? t('loading') : t('signUp')}</button>
        </form>
      )}
    </AuthShell>
  )
}

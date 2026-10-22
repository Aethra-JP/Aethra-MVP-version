import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

// Supabase signs the user in from the email link automatically (recovery session); here they choose a new password.
export default function ResetPassword() {
  const { t } = useI18n()
  const { session, booting } = useApp()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) return setErr('Use at least 8 characters for your password.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setErr(error.message); else nav('/')
  }
  return (
    <AuthShell title={t('newPassword')} footer={<Link className="text-gold underline" to="/login">{t('logIn')}</Link>}>
      {booting ? <div className="muted">{t('loading')}</div> : !session ? (
        <div className="err">This reset link is invalid or has expired. Request a new one from the Forgot password page.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {err && <div className="err" role="alert">{err}</div>}
          <div><label className="label" htmlFor="np">{t('newPassword')}</label><input id="np" type="password" required className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
          <button className="btn w-full" disabled={busy}>{t('saveNewPassword')}</button>
        </form>
      )}
    </AuthShell>
  )
}

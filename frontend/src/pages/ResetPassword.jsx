import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

// Supabase opens a short recovery session from the email link; here the user chooses a new password,
// is then signed out, and must log in again with it.
export default function ResetPassword() {
  const { t } = useI18n()
  const { session, booting } = useApp()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) return setErr('Use at least 8 characters for your password.')
    if (pw !== pw2) return setErr('Passwords do not match. Please type the same password in both fields.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      setBusy(false)
      return setErr(/different from the old/i.test(error.message) ? 'Your new password must be different from your old password.' : error.message)
    }
    await supabase.auth.signOut()
    setBusy(false)
    nav('/login', { replace: true, state: { notice: 'Password changed. Please log in with your new password.' } })
  }
  return (
    <AuthShell title={t('newPassword')} footer={<Link className="text-gold underline" to="/login">{t('logIn')}</Link>}>
      {booting ? <div className="muted">{t('loading')}</div> : !session ? (
        <div className="err">This reset link is invalid or has expired. Request a new one from the Forgot password page.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {err && <div className="err" role="alert">{err}</div>}
          <div><label className="label" htmlFor="np">{t('newPassword')}</label>
            <input id="np" type="password" required className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
          <div><label className="label" htmlFor="np2">{t('confirmNewPassword')}</label>
            <input id="np2" type="password" required className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
          <button className="btn w-full" disabled={busy}>{busy ? t('loading') : t('saveNewPassword')}</button>
        </form>
      )}
    </AuthShell>
  )
}

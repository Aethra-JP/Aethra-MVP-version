import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error && /rate|too many/i.test(error.message)) return setErr('Too many requests. Please wait a few minutes and try again.')
    setSent(true) // same message whether or not the email exists
  }
  return (
    <AuthShell title={t('forgotPassword')} footer={<Link className="text-gold underline" to="/login">{t('logIn')}</Link>}>
      {sent ? <div className="okbox" role="status">{t('resetSent')}</div> : (
        <form onSubmit={submit} className="space-y-4">
          {err && <div className="err" role="alert">{err}</div>}
          <div><label className="label" htmlFor="fe">{t('email')}</label><input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn w-full">{t('sendReset')}</button>
        </form>
      )}
    </AuthShell>
  )
}

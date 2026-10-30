import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

// The confirmation email in Supabase signs the person in automatically. This page catches that,
// signs them out again and sends them to the Login page, so they log in themselves.
function readProblem() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const q = new URLSearchParams(window.location.search)
  const text = h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error')
  const code = h.get('error_code') || q.get('error_code') || ''
  return text ? { text: text.replace(/\+/g, ' '), expired: /expired|invalid/i.test(text + code) } : null
}

export default function EmailConfirmed() {
  const { t } = useI18n()
  const { session, booting } = useApp()
  const nav = useNavigate()
  const [problem] = useState(readProblem)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    if (booting || problem) return
    let alive = true
    ;(async () => {
      if (session) {
        await supabase.auth.signOut()
        if (alive) nav('/login', { replace: true, state: { notice: 'Email confirmed. Please log in to continue.' } })
      } else if (alive) setEmpty(true)
    })()
    return () => { alive = false }
  }, [booting]) // eslint-disable-line

  const footer = <Link className="text-gold underline" to="/login">{t('logIn')}</Link>
  if (problem) return (
    <AuthShell title="This link did not work" footer={footer}>
      <div className="space-y-4">
        <div className="err" role="alert">{problem.expired ? 'This confirmation link has expired or was already used.' : problem.text}</div>
        <p className="muted !text-base">If you already confirmed your email, just log in. If not, log in with your email and password and choose "Resend confirmation email".</p>
        <Link to="/login" className="btn w-full">{t('logIn')}</Link>
      </div>
    </AuthShell>
  )
  if (empty) return (
    <AuthShell title="Confirm your email" footer={footer}>
      <div className="space-y-4">
        <p className="muted !text-base">Open the link in the confirmation email we sent you. If you have already done that, you can log in now.</p>
        <Link to="/login" className="btn w-full">{t('logIn')}</Link>
      </div>
    </AuthShell>
  )
  return <AuthShell title="Confirming your email..."><div className="muted">{t('loading')}</div></AuthShell>
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'

export default function GoogleButton() {
  const { t } = useI18n()
  const [err, setErr] = useState('')
  const go = async () => {
    setErr('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setErr(/not enabled|unsupported/i.test(error.message) ? 'Google sign-in is not switched on yet. It must be enabled in Supabase first.' : error.message)
  }
  return (
    <div>
      <button type="button" className="btn-ghost w-full" onClick={go}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.55 21.3 7.5 24 12 24z" />
          <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.5 0 3.55 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
        </svg>
        {t('continueGoogle')}
      </button>
      {err && <div className="err mt-2" role="alert">{err}</div>}
    </div>
  )
}

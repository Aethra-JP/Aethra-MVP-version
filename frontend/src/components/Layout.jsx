import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

const NAV = [['/', 'home'], ['/upload', 'upload'], ['/analyses', 'analyses'], ['/forecast', 'forecast'],
  ['/chat', 'chat'], ['/documents', 'documents'], ['/actions', 'actions'], ['/alerts', 'alerts'], ['/contact', 'contact']]

export default function Layout({ children }) {
  const { workspaces, ws, setWsId, datasets, dataset, setDsId } = useApp()
  const { t, lang, setLang } = useI18n()
  const nav = useNavigate()
  const signOut = async () => { await supabase.auth.signOut(); nav('/') }
  return (
    <div className="min-h-screen md:flex">
      <aside className="glass md:w-72 md:min-h-screen md:sticky md:top-0 md:self-start border-b md:border-b-0 md:border-r border-line/70 p-4 md:p-5 flex flex-col gap-4 z-30">
        <Logo size={40} />
        {workspaces.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div>
              <label className="label" htmlFor="ws">{t('workspace')}</label>
              <select id="ws" className="input" value={ws?.id || ''} onChange={(e) => setWsId(e.target.value)}>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ds">{t('dataset')}</label>
              <select id="ds" className="input" value={dataset?.id || ''} onChange={(e) => setDsId(e.target.value)}>
                {datasets.length === 0 && <option value="">No files yet</option>}
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 md:pb-0" aria-label="Main">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `whitespace-nowrap rounded-lg px-3.5 py-2 transition-all ${isActive
                ? 'text-gold-bright border border-gold/40 shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_8px_16px_-8px_rgba(201,162,77,.45)] bg-gradient-to-b from-raised to-surface'
                : 'text-muted border border-transparent hover:text-paper hover:bg-white/[.04]'}`}>
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="md:mt-auto flex items-end gap-3 md:flex-col md:items-stretch">
          <div className="flex-1">
            <label className="label" htmlFor="lang">{t('language')}</label>
            <select id="lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option>
            </select>
          </div>
          <button className="btn-ghost" onClick={signOut}>{t('signOut')}</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-5 md:p-10 max-w-6xl">{children ?? <Outlet />}</main>
    </div>
  )
}

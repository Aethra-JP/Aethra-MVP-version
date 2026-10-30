import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './lib/AppContext'
import { configured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Analyses from './pages/Analyses'
import Forecast from './pages/Forecast'
import Chat from './pages/Chat'
import Documents from './pages/Documents'
import Actions from './pages/Actions'
import Alerts from './pages/Alerts'
import Landing from './pages/Landing'
import EmailConfirmed from './pages/EmailConfirmed'
import Contact from './pages/Contact'
import PublicShell from './components/PublicShell'

function Protected({ children }) {
  const { session, booting } = useApp()
  if (booting) return <div className="p-10 muted">Loading...</div>
  return session ? children : <Navigate to="/login" replace />
}

function Splash() {
  return <div className="min-h-screen grid place-items-center muted">Loading...</div>
}

// Visitors see the landing page at "/"; signed-in users see their home screen there.
function Root() {
  const { session, booting } = useApp()
  if (booting) return <Splash />
  return session ? <Layout><Home /></Layout> : <Landing />
}

function ContactRoute() {
  const { session, booting } = useApp()
  if (booting) return <Splash />
  return session ? <Layout><Contact /></Layout> : <PublicShell><Contact /></PublicShell>
}

export default function App() {
  if (!configured) {
    return (
      <div className="max-w-xl mx-auto p-10">
        <h1>Almost there</h1>
        <p className="mt-3 muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env (or in Netlify's environment variables), then rebuild.</p>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/contact" element={<ContactRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/email-confirmed" element={<EmailConfirmed />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/upload" element={<Upload />} />
        <Route path="/analyses" element={<Analyses />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/alerts" element={<Alerts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

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

function Protected({ children }) {
  const { session, booting } = useApp()
  if (booting) return <div className="p-10 muted">Loading...</div>
  return session ? children : <Navigate to="/login" replace />
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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
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

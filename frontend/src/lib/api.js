import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.')
  }
  let json = null
  try { json = await res.json() } catch { /* empty body */ }
  if (!res.ok) {
    const msg = typeof json?.detail === 'string' ? json.detail : 'Something went wrong. Please try again.'
    throw new Error(msg)
  }
  return json
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
}

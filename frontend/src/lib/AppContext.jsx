import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { api } from './api'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)
  const [workspaces, setWorkspaces] = useState([])
  const [wsId, setWsId] = useState(localStorage.getItem('aethra_ws') || '')
  const [datasets, setDatasets] = useState([])
  const [dsId, setDsId] = useState(localStorage.getItem('aethra_ds') || '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshWorkspaces = useCallback(async () => {
    const list = await api.get('/workspaces')
    setWorkspaces(list)
    setWsId((cur) => (list.find((w) => w.id === cur) ? cur : list[0]?.id || ''))
    return list
  }, [])

  const refreshDatasets = useCallback(async (id = wsId) => {
    if (!id) { setDatasets([]); return [] }
    const list = await api.get(`/datasets?workspace_id=${id}`)
    setDatasets(list)
    setDsId((cur) => (list.find((d) => d.id === cur) ? cur : list[0]?.id || ''))
    return list
  }, [wsId])

  useEffect(() => { if (session) refreshWorkspaces().catch(() => {}) }, [session, refreshWorkspaces])
  useEffect(() => { if (session && wsId) { localStorage.setItem('aethra_ws', wsId); refreshDatasets(wsId).catch(() => {}) } }, [session, wsId]) // eslint-disable-line
  useEffect(() => { if (dsId) localStorage.setItem('aethra_ds', dsId) }, [dsId])

  const value = {
    session, booting, workspaces, ws: workspaces.find((w) => w.id === wsId) || null, setWsId, refreshWorkspaces,
    datasets, dataset: datasets.find((d) => d.id === dsId) || null, setDsId, refreshDatasets,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp = () => useContext(Ctx)

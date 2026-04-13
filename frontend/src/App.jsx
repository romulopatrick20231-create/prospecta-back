import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import Header from './components/Header'
import KanbanBoard from './components/KanbanBoard'
import ConversationPanel from './components/ConversationPanel'

const API_URL = import.meta.env.VITE_API_URL || ''
const STAGES = ['novo', 'enviado', 'respondeu', 'negociando', 'vendido', 'perdido']

export default function App() {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [conversations, setConversations] = useState([])
  const [dispatcherActive, setDispatcherActive] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('criado_em', { ascending: false })
    setLeads(data || [])
  }, [])

  const fetchDispatcherStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/dispatcher/status`)
      const data = await res.json()
      setDispatcherActive(data.active)
    } catch {
      // backend offline, mantém estado atual
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    fetchDispatcherStatus()

    const channel = supabase
      .channel('realtime-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        payload => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev =>
              prev.map(l => (l.id === payload.new.id ? payload.new : l))
            )
            setSelectedLead(prev =>
              prev?.id === payload.new.id ? payload.new : prev
            )
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchLeads, fetchDispatcherStatus])

  useEffect(() => {
    if (!selectedLead) return

    const channel = supabase
      .channel(`realtime-conversas-${selectedLead.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversas',
          filter: `lead_id=eq.${selectedLead.id}`
        },
        payload => {
          setConversations(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedLead?.id])

  async function handleSelectLead(lead) {
    setSelectedLead(lead)
    const { data } = await supabase
      .from('conversas')
      .select('*')
      .eq('lead_id', lead.id)
      .order('criado_em', { ascending: true })
    setConversations(data || [])
  }

  async function handleUploadCSV(file) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/leads/import`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.error) alert('Erro: ' + data.error)
      else alert(`${data.imported} leads importados com sucesso!`)
    } catch {
      alert('Erro ao conectar com o backend.')
    } finally {
      setUploading(false)
    }
  }

  async function toggleDispatcher() {
    const action = dispatcherActive ? 'pause' : 'resume'
    try {
      await fetch(`${API_URL}/dispatcher/${action}`, { method: 'POST' })
      setDispatcherActive(!dispatcherActive)
    } catch {
      alert('Erro ao comunicar com o backend.')
    }
  }

  const counts = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.stage === stage).length
    return acc
  }, {})

  return (
    <div className="app">
      <Header
        counts={counts}
        dispatcherActive={dispatcherActive}
        onToggleDispatcher={toggleDispatcher}
        onUploadCSV={handleUploadCSV}
        uploading={uploading}
      />
      <KanbanBoard
        leads={leads}
        onSelectLead={handleSelectLead}
        selectedLeadId={selectedLead?.id}
      />
      {selectedLead && (
        <ConversationPanel
          lead={selectedLead}
          conversations={conversations}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}

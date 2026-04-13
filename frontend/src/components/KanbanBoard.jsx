import LeadCard from './LeadCard'

const STAGES = [
  { key: 'novo', label: 'Novo', color: '#6366f1' },
  { key: 'enviado', label: 'Enviado', color: '#3b82f6' },
  { key: 'respondeu', label: 'Respondeu', color: '#f59e0b' },
  { key: 'negociando', label: 'Negociando', color: '#8b5cf6' },
  { key: 'vendido', label: 'Vendido', color: '#10b981' },
  { key: 'perdido', label: 'Perdido', color: '#ef4444' }
]

export default function KanbanBoard({ leads, onSelectLead, selectedLeadId }) {
  return (
    <div className="kanban-wrapper">
      <div className="kanban-board">
        {STAGES.map(({ key, label, color }) => {
          const stageLeads = leads.filter(l => l.stage === key)
          return (
            <div key={key} className="kanban-column">
              <div className="column-header" style={{ background: color }}>
                <span>{label}</span>
                <span className="column-count">{stageLeads.length}</span>
              </div>
              <div className="column-body">
                {stageLeads.length === 0 && (
                  <p className="column-empty">Vazio</p>
                )}
                {stageLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isSelected={lead.id === selectedLeadId}
                    onClick={() => onSelectLead(lead)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

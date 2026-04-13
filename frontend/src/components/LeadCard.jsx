export default function LeadCard({ lead, onClick, isSelected }) {
  const lastMsg = lead.ultima_mensagem_em
    ? new Date(lead.ultima_mensagem_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div
      className={`lead-card${isSelected ? ' selected' : ''}${lead.quente ? ' quente' : ''}`}
      onClick={onClick}
    >
      {lead.quente && <span className="quente-tag">QUENTE</span>}
      <div className="card-name">{lead.nome}</div>
      <div className="card-meta">
        {[lead.categoria, lead.cidade].filter(Boolean).join(' · ')}
      </div>
      {lastMsg && <div className="card-last-msg">{lastMsg}</div>}
    </div>
  )
}

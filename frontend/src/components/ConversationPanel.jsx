const STAGE_LABELS = {
  novo: 'Novo',
  enviado: 'Enviado',
  respondeu: 'Respondeu',
  negociando: 'Negociando',
  vendido: 'Vendido',
  perdido: 'Perdido'
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ConversationPanel({ lead, conversations, onClose }) {
  return (
    <>
      <div className="conv-overlay" onClick={onClose} />
      <div className="conv-panel">
        <div className="conv-panel-header">
          <div className="conv-panel-info">
            <h3>{lead.nome}</h3>
            <p>
              {[lead.categoria, lead.cidade].filter(Boolean).join(' · ')}
              {' · '}
              {STAGE_LABELS[lead.stage] || lead.stage}
              {lead.quente ? ' · QUENTE' : ''}
            </p>
            <p>{lead.telefone}</p>
          </div>
          <button className="conv-close" onClick={onClose}>×</button>
        </div>

        <div className="conv-messages">
          {conversations.length === 0 && (
            <p className="conv-empty">Nenhuma mensagem ainda.</p>
          )}
          {conversations.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.papel}`}>
              <div className={`message ${msg.papel}`}>{msg.conteudo}</div>
              <span className="message-time">{formatTime(msg.criado_em)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

import { useRef } from 'react'

const STAGE_LABELS = {
  novo: 'Novo',
  enviado: 'Enviado',
  respondeu: 'Respondeu',
  negociando: 'Negociando',
  vendido: 'Vendido',
  perdido: 'Perdido'
}

const STAGE_COLORS = {
  novo: '#6366f1',
  enviado: '#3b82f6',
  respondeu: '#f59e0b',
  negociando: '#8b5cf6',
  vendido: '#10b981',
  perdido: '#ef4444'
}

export default function Header({ counts, dispatcherActive, onToggleDispatcher, onUploadCSV, uploading }) {
  const inputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      onUploadCSV(file)
      e.target.value = ''
    }
  }

  return (
    <header className="header">
      <h1>Agente de Prospecção</h1>

      <div className="counters">
        {Object.entries(STAGE_LABELS).map(([stage, label]) => (
          <div
            key={stage}
            className="counter-badge"
            style={{ background: STAGE_COLORS[stage] + '33', color: STAGE_COLORS[stage] }}
          >
            <span className="count">{counts[stage] || 0}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="header-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn btn-primary"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? 'Importando...' : 'Importar CSV'}
        </button>
        <button
          className={`btn ${dispatcherActive ? 'btn-danger' : 'btn-success'}`}
          onClick={onToggleDispatcher}
        >
          {dispatcherActive ? 'Pausar Disparos' : 'Retomar Disparos'}
        </button>
      </div>
    </header>
  )
}

-- Tabela de leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  telefone TEXT NOT NULL,
  cidade TEXT,
  stage TEXT NOT NULL DEFAULT 'novo',
  quente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_mensagem_em TIMESTAMPTZ,
  total_followups INTEGER NOT NULL DEFAULT 0
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('agente', 'lojista')),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_ultima_mensagem ON leads(ultima_mensagem_em);
CREATE INDEX IF NOT EXISTS idx_conversas_lead_id ON conversas(lead_id);

-- Habilitar real-time nas duas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE conversas;

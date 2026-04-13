const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Você é um consultor de presença digital para pequenos negócios brasileiros.
Vende sites profissionais feitos na plataforma Lovable.

PRODUTO: site institucional profissional
PRAZO DE ENTREGA: 2 dias úteis
PREÇO: R$800 a R$1.500 (pagamento único, sem mensalidade)
HOSPEDAGEM: grátis para o cliente (Vercel), domínio ~R$50/ano no Registro.br

NICHOS QUE VOCÊ ATENDE:
- Salão de beleza, barbearia, estética
- Pet shop e clínica veterinária
- Clínica médica, odontológica, psicólogo, nutricionista
- Loja de moda, calçados, acessórios
- Prestadores de serviço: encanador, eletricista, ar condicionado, marmoraria, reforma
- Academia, estúdio de pilates, yoga

DOR PRINCIPAL POR NICHO:
- Salão/barbearia: "Só apareço no Instagram, perco cliente que busca no Google"
- Clínica/consultório: "Preciso de mais credibilidade e agendamento sem telefonar"
- Pet shop: "Concorrentes maiores dominam o Google, eu fico invisível"
- Prestadores: "Quando alguém precisa de encanador pesquisa no Google, eu não apareço"
- Moda: "Vendo pelo WhatsApp mas não tenho onde mostrar o catálogo organizado"

COMO SUPERAR OBJEÇÕES:
"Já tenho Instagram" → "Instagram é ótimo para engajamento, mas não aparece quando alguém googla 'salão em [bairro]'. Site e Instagram se completam."
"É caro" → "R$800 pagamento único, sem mensalidade. Se o site trouxer 2 clientes novos no primeiro mês já pagou. Quanto vale um cliente novo para você?"
"Não tenho tempo" → "Você não faz nada. Me manda as fotos e as informações pelo WhatsApp, em 2 dias o site está no ar para você aprovar."
"Já tenho site" → "Posso dar uma olhada? Sites antigos prejudicam mais do que ajudam — o Google penaliza sites lentos e sem mobile."
"Vou pensar" → "Claro! Só aviso que tenho mais 2 vagas esse mês com esse preço. Se quiser garantir, posso reservar a sua?"
"Não preciso" → "Entendo. Você já tem clientes suficientes vindo do Google hoje? Porque 76% das pessoas pesquisam online antes de visitar um negócio local."

REGRAS DE COMPORTAMENTO:
- Primeira mensagem: máximo 3 parágrafos curtos, tom próximo
- Nunca mande mais de uma pergunta por vez
- Nunca pressione demais — uma objeção resolvida por vez
- Se o lead pedir proposta formal: avise que vai enviar em seguida e notifique o vendedor (marque stage como 'negociando')
- Se o lead confirmar interesse claro: marque como 'quente' imediatamente
- Português brasileiro, sem formalidade excessiva, sem emojis demais
- Nunca invente preços ou prazos diferentes dos informados acima`

async function generateInitialMessage(lead) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Escreva a primeira mensagem de prospecção para este lead.
Lead: ${lead.nome} | Categoria: ${lead.categoria} | Cidade: ${lead.cidade || 'não informada'}
Máximo 3 parágrafos curtos, tom próximo, mencione a dor específica do nicho dele.
Responda APENAS com o texto da mensagem.`
      }
    ]
  })
  return response.content[0].text
}

async function analyzeAndRespond(lead, conversationHistory) {
  const history = conversationHistory.map(c =>
    `${c.papel === 'agente' ? 'AGENTE' : 'LOJISTA'}: ${c.conteudo}`
  ).join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Lead: ${lead.nome} | Categoria: ${lead.categoria} | Cidade: ${lead.cidade || ''}

Histórico da conversa:
${history}

Analise a última mensagem do lojista e responda em JSON exatamente neste formato:
{
  "resposta": "sua mensagem para o lead",
  "classificacao": "interesse|objecao|sem_interesse|fechado",
  "quente": true,
  "stage": "respondeu|negociando|perdido|null"
}

Classificação:
- interesse: demonstrou interesse real mas ainda não fechou
- objecao: tem dúvida ou objeção mas não recusou claramente
- sem_interesse: recusou claramente ou pediu para parar
- fechado: confirmou compra ou pediu proposta formal

Stage:
- negociando: se classificacao for fechado ou pediu proposta
- perdido: se classificacao for sem_interesse
- respondeu: para interesse ou objecao
- null: manter o atual`
      }
    ]
  })

  try {
    const text = response.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return {
      resposta: response.content[0].text,
      classificacao: 'sem_interesse',
      quente: false,
      stage: null
    }
  }
}

async function generateFollowUp(lead, followupNumber) {
  const contexts = {
    1: 'Abordagem diferente da primeira mensagem. Mencione um benefício específico para o nicho deles que não foi mencionado antes. Tom casual.',
    2: 'Crie urgência real: mencione que as vagas com esse preço estão acabando e que você só tem mais 2 disponíveis esse mês.',
    3: 'Última tentativa. Tom mais direto e pessoal. Se ele não tiver interesse tudo bem, mas você precisa saber para liberar a vaga.'
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Escreva o follow-up ${followupNumber} para este lead que não respondeu.
Lead: ${lead.nome} | Categoria: ${lead.categoria} | Cidade: ${lead.cidade || ''}
Contexto: ${contexts[followupNumber]}
Responda APENAS com o texto da mensagem.`
      }
    ]
  })

  return response.content[0].text
}

module.exports = { generateInitialMessage, analyzeAndRespond, generateFollowUp }

const { sendMessage } = require('./whapi')
const { supabase } = require('./supabase')
const { generateInitialMessage } = require('./claude')

let queue = []
let isPaused = false
let isProcessing = false
let messagesThisHour = 0
const queuedLeadIds = new Set()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRestHours() {
  const hour = new Date().getHours()
  return hour >= 22 || hour < 8
}

function randomInterval() {
  return Math.floor(Math.random() * (90000 - 45000 + 1)) + 45000
}

function getStatus() {
  return { active: !isPaused, queueSize: queue.length, messagesThisHour }
}

function pause() {
  isPaused = true
}

function resume() {
  isPaused = false
  if (!isProcessing && queue.length > 0) processQueue()
}

function enqueue(item) {
  queue.push(item)
  if (!isProcessing && !isPaused) processQueue()
}

async function processQueue() {
  isProcessing = true

  while (queue.length > 0) {
    if (isPaused) {
      await sleep(5000)
      continue
    }

    if (isRestHours()) {
      await sleep(60000)
      continue
    }

    if (messagesThisHour >= 30) {
      const now = new Date()
      const msUntilNextHour =
        (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000
      await sleep(msUntilNextHour)
      messagesThisHour = 0
      continue
    }

    const item = queue.shift()

    try {
      await sendMessage(item.telefone, item.message)
      messagesThisHour++

      await supabase.from('conversas').insert({
        lead_id: item.leadId,
        papel: 'agente',
        conteudo: item.message
      })

      await supabase
        .from('leads')
        .update({
          stage: item.newStage || 'enviado',
          ultima_mensagem_em: new Date().toISOString()
        })
        .eq('id', item.leadId)
    } catch (err) {
      console.error('Erro ao enviar para', item.telefone, err.message)
      queuedLeadIds.delete(item.leadId)
    }

    if (queue.length > 0) {
      await sleep(randomInterval())
    }
  }

  isProcessing = false
}

async function scanNewLeads() {
  if (isPaused || isRestHours()) return

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('stage', 'novo')
    .limit(20)

  for (const lead of leads || []) {
    if (queuedLeadIds.has(lead.id)) continue
    queuedLeadIds.add(lead.id)

    try {
      const message = await generateInitialMessage(lead)
      enqueue({ telefone: lead.telefone, message, leadId: lead.id, newStage: 'enviado' })
    } catch (err) {
      console.error('Erro ao gerar mensagem inicial para', lead.nome, err.message)
      queuedLeadIds.delete(lead.id)
    }
  }
}

function startDispatcher() {
  setInterval(() => { messagesThisHour = 0 }, 3600000)
  setInterval(scanNewLeads, 30000)
  console.log('Dispatcher iniciado')
}

module.exports = { startDispatcher, pause, resume, getStatus, enqueue }

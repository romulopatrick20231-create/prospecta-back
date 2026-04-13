const express = require('express')
const { supabase } = require('../services/supabase')
const { analyzeAndRespond } = require('../services/claude')
const { enqueue } = require('../services/dispatcher')

const router = express.Router()

function cleanPhone(from) {
  return from.replace('@s.whatsapp.net', '').replace(/\D/g, '')
}

router.post('/whapi', async (req, res) => {
  try {
    res.sendStatus(200)

    const messages = req.body.messages || []

    for (const msg of messages) {
      if (msg.fromMe) continue
      if (msg.type !== 'text') continue

      const body = msg.text?.body || msg.body || ''
      if (!body.trim()) continue

      const phone = cleanPhone(msg.from || '')
      if (!phone) continue

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', phone)
        .limit(1)

      const lead = leads?.[0]
      if (!lead) continue

      await supabase.from('conversas').insert({
        lead_id: lead.id,
        papel: 'lojista',
        conteudo: body
      })

      const { data: history } = await supabase
        .from('conversas')
        .select('*')
        .eq('lead_id', lead.id)
        .order('criado_em', { ascending: true })

      const result = await analyzeAndRespond(lead, history || [])

      const updatePayload = {
        ultima_mensagem_em: new Date().toISOString()
      }

      if (result.stage && result.stage !== 'null') {
        updatePayload.stage = result.stage
      } else {
        updatePayload.stage = 'respondeu'
      }

      if (result.quente) {
        updatePayload.quente = true
      }

      await supabase.from('leads').update(updatePayload).eq('id', lead.id)

      enqueue({
        telefone: lead.telefone,
        message: result.resposta,
        leadId: lead.id,
        newStage: updatePayload.stage
      })
    }
  } catch (err) {
    console.error('Erro no webhook:', err.message)
  }
})

module.exports = router

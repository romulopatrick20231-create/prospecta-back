const express = require('express')
const { supabase } = require('../services/supabase')
const { analyzeAndRespond } = require('../services/claude')
const { enqueue } = require('../services/dispatcher')
const OpenAI = require('openai')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function cleanPhone(from) {
  return from.replace('@s.whatsapp.net', '').replace(/\D/g, '')
}

function normalizePhone(phone) {
  return phone
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^55?/, '55')
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

      const rawPhone = cleanPhone(msg.from || '')
      if (!rawPhone) continue

      const phone = normalizePhone(rawPhone)

      // 🔍 BUSCAR LEAD
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', phone)
        .limit(1)

      let lead = leads?.[0]

      // 🧠 CRIAR LEAD SE NÃO EXISTIR (COM RECHECK)
      if (!lead) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('telefone', phone)
          .single()

        if (existingLead) {
          lead = existingLead
        } else {
          const { data: newLead, error: insertError } = await supabase
            .from('leads')
            .insert([{
              nome: 'Lead WhatsApp',
              telefone: phone,
              categoria: null,
              cidade: null,
              stage: 'novo',
              quente: false,
              ultima_mensagem_em: new Date().toISOString()
            }])
            .select()
            .single()

          if (insertError) {
            console.error('Erro ao criar lead:', insertError.message)
            continue
          }

          lead = newLead
        }
      }

      // 💾 SALVAR MENSAGEM
      await supabase.from('conversas').insert({
        lead_id: lead.id,
        papel: 'cliente',
        conteudo: body
      })

      // 🧠 EXTRAIR DADOS COM IA (NOME / EMPRESA / ENDEREÇO)
      try {
        const extract = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'Extraia nome, empresa e endereço da mensagem. Responda em JSON com: nome, empresa, endereco. Se não houver, retorne {}.'
            },
            {
              role: 'user',
              content: body
            }
          ]
        })

        let parsed = {}

        try {
          parsed = JSON.parse(extract.choices[0].message.content)
        } catch (e) {}

        if (parsed.nome || parsed.empresa || parsed.endereco) {
          await supabase
            .from('leads')
            .update({
              nome: parsed.nome || lead.nome,
              categoria: parsed.empresa || lead.categoria,
              cidade: parsed.endereco || lead.cidade,
              quente: true
            })
            .eq('id', lead.id)
        }
      } catch (err) {
        console.error('Erro ao extrair dados:', err.message)
      }

      // 📜 HISTÓRICO
      const { data: history } = await supabase
        .from('conversas')
        .select('*')
        .eq('lead_id', lead.id)
        .order('criado_em', { ascending: true })

      // 🤖 RESPOSTA DO MAX
      const result = await analyzeAndRespond(lead, history || [])

      // 📊 ATUALIZA STATUS
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

      await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id)

      // 📤 ENVIO
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
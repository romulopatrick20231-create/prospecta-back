const cron = require('node-cron')
const { supabase } = require('../services/supabase')
const { generateFollowUp } = require('../services/claude')
const { enqueue } = require('../services/dispatcher')

async function runFollowUpJob() {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('stage', 'enviado')
    .lt('ultima_mensagem_em', cutoff24h)
    .lt('total_followups', 3)

  if (error) {
    console.error('Erro no job de follow-up:', error.message)
    return
  }

  for (const lead of leads || []) {
    const nextFollowup = lead.total_followups + 1

    try {
      const message = await generateFollowUp(lead, nextFollowup)

      enqueue({
        telefone: lead.telefone,
        message,
        leadId: lead.id,
        newStage: 'enviado'
      })

      await supabase
        .from('leads')
        .update({ total_followups: nextFollowup })
        .eq('id', lead.id)
    } catch (err) {
      console.error('Erro ao gerar follow-up para', lead.nome, err.message)
    }
  }

  const { data: coldLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('stage', 'enviado')
    .lt('ultima_mensagem_em', cutoff24h)
    .gte('total_followups', 3)

  if (coldLeads && coldLeads.length > 0) {
    const ids = coldLeads.map(l => l.id)
    await supabase
      .from('leads')
      .update({ stage: 'perdido' })
      .in('id', ids)
  }
}

function startFollowUpJob() {
  cron.schedule('0 9 * * *', runFollowUpJob)
  console.log('Job de follow-up agendado para 09:00 diariamente')
}

module.exports = { startFollowUpJob }

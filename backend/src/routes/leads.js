const express = require('express')
const multer = require('multer')
const { parse } = require('csv-parse/sync')
const { supabase } = require('../services/supabase')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return '55' + digits
}

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })

    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    const leads = records
      .filter(r => r.Telefone && String(r.Telefone).trim())
      .map(r => ({
        nome: r.Nome || 'Sem nome',
        categoria: r.Categoria || null,
        telefone: formatPhone(r.Telefone),
        cidade: r.Cidade || null,
        stage: 'novo'
      }))

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead válido encontrado' })
    }

    const { data, error } = await supabase.from('leads').insert(leads).select()

    if (error) throw error

    res.json({ imported: data.length, total: records.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/conversas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversas')
      .select('*')
      .eq('lead_id', req.params.id)
      .order('criado_em', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const leadsRouter = require('./routes/leads')
const webhookRouter = require('./routes/webhook')
const dispatcherRouter = require('./routes/dispatcher')
const { startDispatcher } = require('./services/dispatcher')
const { startFollowUpJob } = require('./jobs/followup')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const allowed = [
      /\.vercel\.app$/,
      /localhost/
    ]
    if (allowed.some(r => r.test(origin))) return callback(null, true)
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, '')) return callback(null, true)
    callback(new Error('CORS: origem não permitida'))
  },
  credentials: true
}))
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Prospecta API rodando', version: '1.0.0' })
})

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend online!', timestamp: new Date().toISOString() })
})

app.use('/leads', leadsRouter)
app.use('/webhook', webhookRouter)
app.use('/dispatcher', dispatcherRouter)

startDispatcher()
startFollowUpJob()

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

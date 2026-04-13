const express = require('express')
const { pause, resume, getStatus } = require('../services/dispatcher')

const router = express.Router()

router.get('/status', (req, res) => {
  res.json(getStatus())
})

router.post('/pause', (req, res) => {
  pause()
  res.json({ active: false })
})

router.post('/resume', (req, res) => {
  resume()
  res.json({ active: true })
})

module.exports = router

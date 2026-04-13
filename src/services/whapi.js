const axios = require('axios')

async function sendMessage(phone, message) {
  const response = await axios.post(
    'https://gate.whapi.cloud/messages/text',
    { to: phone, body: message },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return response.data
}

module.exports = { sendMessage }

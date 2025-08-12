const express = require('express')
const app = express()
app.get('/', (req, res) => res.send('Hello from Node.js on EKS!'))
app.get('/health', (req, res) => res.status(200).send('OK'))
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on ${port}`))

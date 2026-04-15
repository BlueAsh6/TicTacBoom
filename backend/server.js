const express    = require('express')
const http       = require('http')
const cors       = require('cors')
const path       = require('path')
const { Server } = require('socket.io')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..')))
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')))

require('./socket/gamesocket')(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`))
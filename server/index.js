const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const multer = require('multer')
const path = require('path')
const cors = require('cors')

const app = express()
const server = http.createServer(app)

const isDev = process.env.NODE_ENV !== 'production'
const PORT = process.env.PORT || 3001
const FRONTEND_URL = isDev ? 'http://localhost:3000' : process.env.RENDER_EXTERNAL_URL

const io = new Server(server, {
  cors: {
    origin: isDev ? FRONTEND_URL : [FRONTEND_URL, /\.render\.com$/],
    methods: ['GET', 'POST']
  }
})

app.use(cors())

// setup multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Not a video file'))
    }
  }
})

// make sure we have somewhere to put the videos
const fs = require('fs')
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

app.use('/uploads', express.static('uploads'))

// serve the next.js app in prod
if (!isDev) {
  app.use(express.static(path.join(__dirname, '../.next')))
  app.use(express.static(path.join(__dirname, '../public')))
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../.next/server/pages/index.html'))
  })
}

// where we keep all the room data
const rooms = new Map()

// check if room has someone in charge
const roomHasHost = (room) => {
  return room && room.users.some(user => user.isHost)
}

// cleanup empty rooms or rooms without host
const cleanupRoom = (roomId) => {
  const room = rooms.get(roomId)
  if (!room) return

  if (room.users.length === 0 || !roomHasHost(room)) {
    io.to(roomId).emit('room-closed', { message: 'Room was closed because the host left' })
    io.in(roomId).disconnectSockets() // kick everyone out
    rooms.delete(roomId)
    return
  }
}

io.on('connection', (socket) => {
  let currentRoom = null
  let currentUser = null

  // make sure room exists and has a host
  socket.on('check-room', ({ roomId }, callback) => {
    const room = rooms.get(roomId)
    callback({
      exists: room !== undefined,
      hasHost: roomHasHost(room)
    })
  })

  socket.on('join-room', ({ roomId, username, isHost }, callback) => {
    const room = rooms.get(roomId)
    
    // cant join if room doesnt exist and ur not the host
    if (!room && !isHost) {
      callback({ error: 'Room does not exist' })
      return
    }

    // need a host to join as participant
    if (room && !roomHasHost(room) && !isHost) {
      callback({ error: 'Cannot join room without a host' })
      return
    }

    // room can only have one host
    if (room && isHost && roomHasHost(room)) {
      callback({ error: 'Room already has a host' })
      return
    }

    // no duplicate usernames pls
    if (room && room.users.some(user => user.username === username)) {
      callback({ error: 'Username is already taken in this room' })
      return
    }

    currentRoom = roomId
    currentUser = { username, isHost }

    socket.join(roomId)

    // create room if it doesnt exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: [],
        videoUrl: null,
        isPlaying: false,
        currentTime: 0
      })
    }

    const roomData = rooms.get(roomId)
    roomData.users.push({ username, isHost })

    io.to(roomId).emit('user-joined', roomData.users)

    // catch new user up with current video
    if (roomData.videoUrl) {
      socket.emit('video-uploaded', roomData.videoUrl)
      socket.emit('video-state-change', {
        isPlaying: roomData.isPlaying,
        currentTime: roomData.currentTime
      })
    }

    callback({ success: true })
  })

  // cleanup when someone leaves
  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.users = room.users.filter(
          user => user.username !== currentUser.username
        )
        
        cleanupRoom(currentRoom)

        if (rooms.has(currentRoom)) {
          io.to(currentRoom).emit('user-left', rooms.get(currentRoom).users)
        }
      }
    }
  })

  // handle video stuff
  socket.on('video-uploaded', ({ roomId, url }) => {
    const room = rooms.get(roomId)
    if (room) {
      room.videoUrl = url
      room.isPlaying = false
      room.currentTime = 0
      io.to(roomId).emit('video-uploaded', url)
    }
  })

  socket.on('video-state-change', ({ roomId, isPlaying, currentTime }) => {
    const room = rooms.get(roomId)
    if (room) {
      room.isPlaying = isPlaying
      room.currentTime = currentTime
      socket.to(roomId).emit('video-state-change', { isPlaying, currentTime })
    }
  })
})

// handle video uploads
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' })
  }

  const url = `${isDev ? 'http://localhost:' + PORT : FRONTEND_URL}/uploads/${req.file.filename}`
  res.json({ url })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 
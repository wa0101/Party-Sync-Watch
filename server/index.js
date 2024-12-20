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

// setup CORS for express
app.use(cors({
  origin: isDev ? FRONTEND_URL : [FRONTEND_URL, /\.render\.com$/],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Socket-ID']
}))

// track upload progress for each socket
const uploadProgress = new Map()

// setup multer for video uploads with progress tracking
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
  // serve static files
  app.use('/_next', express.static(path.join(__dirname, '../.next')))
  app.use('/static', express.static(path.join(__dirname, '../public')))
  
  // serve the standalone next.js server
  const next = require('next')
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, '..'),
    conf: { output: 'standalone' }
  })
  const handle = nextApp.getRequestHandler()

  nextApp.prepare().then(() => {
    app.all('*', (req, res) => {
      return handle(req, res)
    })
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

  // store socket id for upload progress
  socket.on('start-upload', () => {
    uploadProgress.set(socket.id, 0)
  })

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
    // cleanup upload progress
    uploadProgress.delete(socket.id)

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

// handle video uploads with progress
app.post('/upload', (req, res) => {
  // get socket id from headers
  const socketId = req.headers['x-socket-id']
  if (!socketId) {
    return res.status(400).json({ error: 'Socket ID is required' })
  }
  
  // setup progress tracking
  let uploaded = 0
  const total = parseInt(req.headers['content-length'])
  if (!total) {
    return res.status(400).json({ error: 'Content-Length header is required' })
  }
  
  req.on('data', (chunk) => {
    uploaded += chunk.length
    const progress = Math.round((uploaded / total) * 100)
    
    // only emit if we have a socket id and progress changed
    if (socketId && uploadProgress.get(socketId) !== progress) {
      uploadProgress.set(socketId, progress)
      io.to(socketId).emit('upload-progress', { 
        progress,
        uploaded,
        total
      })
    }
  })

  // handle the actual upload
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err)
      return res.status(400).json({ error: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' })
    }

    const url = `${isDev ? 'http://localhost:' + PORT : FRONTEND_URL}/uploads/${req.file.filename}`
    console.log('Upload successful:', url)
    res.json({ url })
  })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 
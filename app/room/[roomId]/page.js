'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import VideoPlayer from '../../../components/VideoPlayer'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/solid'

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
  : 'http://localhost:3001'

function Toast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur-lg text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3"
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export default function RoomPage({ params }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get('username')
  const isHost = searchParams.get('isHost') === 'true'
  const { roomId } = params
  
  const [users, setUsers] = useState([])
  const [videoUrl, setVideoUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedSize, setUploadedSize] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const lastProgressTime = useRef(Date.now())
  const lastUploadedSize = useRef(0)

  useEffect(() => {
    if (!username) {
      router.replace('/')
      return
    }

    socketRef.current = io(SOCKET_URL)
    
    // make sure room exists and has a host
    socketRef.current.emit('check-room', { roomId }, (response) => {
      if (!isHost && !response.exists) {
        setError('This room does not exist')
        socketRef.current.disconnect()
        setTimeout(() => router.replace('/'), 2000)
        return
      }
      
      if (!isHost && !response.hasHost) {
        setError('Cannot join a room without a host')
        socketRef.current.disconnect()
        setTimeout(() => router.replace('/'), 2000)
        return
      }

      // try to join if everything looks good
      socketRef.current.emit('join-room', {
        roomId,
        username,
        isHost
      }, (response) => {
        if (response.error) {
          setError(response.error)
          socketRef.current.disconnect()
          setTimeout(() => router.replace('/'), 2000)
          return
        }
      })
    })

    // setup socket event handlers
    socketRef.current.on('user-joined', (users) => {
      setUsers(users)
    })

    socketRef.current.on('user-left', (users) => {
      setUsers(users)
    })

    socketRef.current.on('video-uploaded', (url) => {
      setVideoUrl(url)
    })

    socketRef.current.on('video-state-change', ({ isPlaying, currentTime }) => {
      setIsPlaying(isPlaying)
      setCurrentTime(currentTime)
    })

    socketRef.current.on('room-closed', ({ message }) => {
      setError(message)
      setTimeout(() => router.replace('/'), 2000)
    })

    // cleanup on unmount
    return () => {
      socketRef.current.disconnect()
    }
  }, [roomId, username, isHost, router])

  // upload video if ur the host
  const handleVideoUpload = async (file) => {
    if (!isHost || !socketRef.current) return
    
    const formData = new FormData()
    formData.append('video', file)
    
    setIsUploading(true)
    setUploadProgress(0)
    setUploadedSize(0)
    setTotalSize(file.size)
    lastProgressTime.current = Date.now()
    lastUploadedSize.current = 0

    try {
      // setup progress tracking
      socketRef.current.emit('start-upload')

      // listen for progress updates
      socketRef.current.on('upload-progress', ({ progress, uploaded, total }) => {
        setUploadProgress(progress)
        setUploadedSize(uploaded)
        setTotalSize(total)
      })

      const response = await fetch(`${SOCKET_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Socket-ID': socketRef.current.id
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { url } = await response.json()
      setVideoUrl(url)
      socketRef.current.emit('video-uploaded', { roomId, url })

      // cleanup
      socketRef.current.off('upload-progress')
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadedSize(0)
        setTotalSize(0)
      }, 1000)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message)
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedSize(0)
      setTotalSize(0)
      socketRef.current.off('upload-progress')
    }
  }

  // sync video state with everyone
  const handleVideoStateChange = (isPlaying, currentTime) => {
    if (!isHost) return
    
    socketRef.current.emit('video-state-change', {
      roomId,
      isPlaying,
      currentTime
    })
  }

  // bye bye
  const handleLeaveRoom = () => {
    socketRef.current.disconnect()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-primary to-purple-900">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-screen"
      >
        <Sidebar 
          users={users}
          currentUser={username}
          isHost={isHost}
          onVideoUpload={handleVideoUpload}
          roomId={roomId}
          onLeave={handleLeaveRoom}
          uploadProgress={uploadProgress}
          uploadedSize={uploadedSize}
          totalSize={totalSize}
          isUploading={isUploading}
        />
        
        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <VideoPlayer
                url={videoUrl}
                isHost={isHost}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onStateChange={handleVideoStateChange}
              />
            </motion.div>
          </div>
        </main>
      </motion.div>

      {/* idk if this bg stuff is cool ;D */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/20 via-transparent to-transparent blur-3xl" />
      </div>

      {/* the toast ;d */}
      <AnimatePresence>
        {error && (
          <Toast message={error} onClose={() => setError('')} />
        )}
      </AnimatePresence>
    </div>
  )
} 
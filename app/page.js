'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoCameraIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { io } from 'socket.io-client'

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

export default function Home() {
  const [activeTab, setActiveTab] = useState('join')
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const createRoom = async () => {
    if (!username) {
      setError('Username is required')
      return
    }
    
    setLoading(true)
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/room/${newRoomCode}?username=${username}&isHost=true`)
  }

  const joinRoom = async () => {
    if (!username || !roomCode) {
      setError('Both username and room code are required')
      return
    }

    setLoading(true)
    const socket = io(SOCKET_URL)

    socket.emit('check-room', { roomId: roomCode }, (response) => {
      if (!response.exists) {
        setError('This room does not exist')
        setLoading(false)
        socket.disconnect()
        return
      }

      if (!response.hasHost) {
        setError('Cannot join a room without a host')
        setLoading(false)
        socket.disconnect()
        return
      }

      socket.emit('join-room', {
        roomId: roomCode,
        username,
        isHost: false
      }, (response) => {
        setLoading(false)
        
        if (response.error) {
          setError(response.error)
          socket.disconnect()
          return
        }

        socket.disconnect()
        router.push(`/room/${roomCode}?username=${username}&isHost=false`)
      })
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-indigo-900 via-primary to-purple-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Party Sync Watch
          </h1>
          <p className="text-gray-400">Watch videos together in perfect sync</p>
        </div>

        <div className="bg-secondary/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/10">
          <div className="flex rounded-lg bg-primary/50 p-1 mb-6">
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'join'
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserGroupIcon className="w-4 h-4" />
              Join Room
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'create'
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <VideoCameraIcon className="w-4 h-4" />
              Create Room
            </button>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'join' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-primary/50 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/50 border border-white/10 placeholder-gray-500"
                />
              </div>

              {activeTab === 'join' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-primary/50 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/50 border border-white/10 placeholder-gray-500"
                  />
                </div>
              )}

              <button
                onClick={activeTab === 'join' ? joinRoom : createRoom}
                disabled={loading}
                className={`w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  activeTab === 'join' ? 'Join Room' : 'Create Room'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/20 via-transparent to-transparent blur-3xl" />
      </div>

      {/* toast */}
      <AnimatePresence>
        {error && (
          <Toast message={error} onClose={() => setError('')} />
        )}
      </AnimatePresence>
    </main>
  )
} 
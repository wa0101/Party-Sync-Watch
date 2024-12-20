'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  UsersIcon,
  FilmIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon,
  ArrowLeftOnRectangleIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline'

export default function Sidebar({ 
  users, 
  currentUser, 
  isHost, 
  onVideoUpload, 
  roomId, 
  onLeave,
  uploadProgress = 0,
  uploadedSize = 0,
  totalSize = 0,
  isUploading = false
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  // handle mobile stuff
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setIsOpen(window.innerWidth >= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // format speed to human readable
  const formatSpeed = (bytesPerSecond) => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  // calculate upload speed
  const calculateSpeed = () => {
    if (!uploadedSize || !totalSize) return 0
    const progress = uploadProgress / 100
    const estimatedBytesPerSecond = (uploadedSize / progress) / (uploadProgress ? uploadProgress : 1)
    return estimatedBytesPerSecond
  }

  // copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  // handle file upload
  const handleUpload = async (file) => {
    if (!isHost || !file || !file.type.startsWith('video/')) return
    await onVideoUpload(file)
  }

  // drag n drop magic
  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    
    if (!isHost) return
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('video/')) {
      handleUpload(file)
    }
  }

  return (
    <>
      {/* show/hide button on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 ${isOpen ? 'left-[280px]' : 'left-4'} z-50 md:hidden bg-secondary/50 backdrop-blur-lg p-2 rounded-lg border border-white/10 transition-all duration-300`}
      >
        {isOpen ? (
          <ChevronLeftIcon className="w-6 h-6 text-white" />
        ) : (
          <ChevronRightIcon className="w-6 h-6 text-white" />
        )}
      </button>

      {/* the actual sidebar */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", bounce: 0.15 }}
            className={`fixed md:relative z-40 h-full w-[280px] bg-secondary/50 backdrop-blur-lg border-r border-white/10 flex flex-col`}
          >
            {/* room info */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
                Party Sync Watch
              </h2>

              {/* room code with copy button */}
              <div className="bg-primary/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between gap-2 text-gray-400 text-sm mb-2">
                  <span>Room Code</span>
                  <AnimatePresence>
                    {showCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-accent"
                      >
                        Copied!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-black/20 hover:bg-black/30 rounded-md transition-colors"
                >
                  <span className="text-white font-mono">{roomId}</span>
                  <ClipboardIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* host or participant */}
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                <InformationCircleIcon className="w-4 h-4" />
                <span>{isHost ? 'You are the host' : 'Participant mode'}</span>
              </div>

              {/* get outta here */}
              <button
                onClick={onLeave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                <span>Leave Room</span>
              </button>
            </div>

            {/* whos here */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-4">
                  <UsersIcon className="w-5 h-5" />
                  <h3 className="font-medium">Users ({users.length})</h3>
                </div>
                <div className="space-y-2">
                  {users.map((user, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        user.username === currentUser
                          ? 'bg-accent/20'
                          : 'hover:bg-primary/50'
                      } transition-colors`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                          user.isHost 
                            ? 'from-accent to-purple-500'
                            : 'from-indigo-500 to-purple-500'
                        } flex items-center justify-center text-white font-medium shadow-lg`}>
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-white">
                            {user.username}
                          </span>
                          {user.isHost && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
                              <FilmIcon className="w-3 h-3" />
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-green-400">Online</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* upload zone for host */}
            {isHost && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`p-4 border-t border-white/10 transition-colors ${
                  dragActive ? 'bg-accent/20' : ''
                }`}
              >
                <label className="block">
                  <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-accent/50 transition-colors cursor-pointer">
                    {isUploading ? (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>Uploading video...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{formatBytes(uploadedSize)} / {formatBytes(totalSize)}</span>
                          <span>{formatSpeed(calculateSpeed())}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 rounded-full bg-accent/20">
                          <ArrowUpTrayIcon className="w-6 h-6 text-accent" />
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-gray-400">Drop video or</span>
                          <span className="text-accent"> browse</span>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* darken bg on mobile when sidebar open */}
      {isOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
        />
      )}
    </>
  )
} 
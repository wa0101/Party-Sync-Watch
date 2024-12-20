'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon
} from '@heroicons/react/24/solid'
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline'

export default function VideoPlayer({
  url,
  isHost,
  isPlaying,
  currentTime,
  onStateChange
}) {
  const videoRef = useRef(null)
  const isSeekingRef = useRef(false)
  const syncTimeoutRef = useRef(null)
  const lastUpdateRef = useRef(0)
  const [showControls, setShowControls] = useState(false)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const [previewPosition, setPreviewPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const progressRef = useRef(null)

  // sync magic happens here
  const syncWithHost = () => {
    if (!videoRef.current || isHost) return

    // gotta pause fast
    if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause()
    }

    // dont spam the sync pls
    const now = Date.now()
    if (now - lastUpdateRef.current < 200) return
    lastUpdateRef.current = now

    const timeDiff = Math.abs(videoRef.current.currentTime - currentTime)
    
    // only sync if we're way off
    if (timeDiff > 0.5) {
      videoRef.current.currentTime = currentTime
    }

    // try to play if we should be playing
    if (isPlaying && videoRef.current.paused) {
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {}) // browsers are weird sometimes
      }
    }
  }

  useEffect(() => {
    if (!videoRef.current || isHost) return
    syncWithHost()
  }, [isPlaying, currentTime, isHost])

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handlePlay = () => {
    if (isHost) {
      onStateChange(true, videoRef.current.currentTime)
    }
  }

  const handlePause = () => {
    if (isHost) {
      onStateChange(false, videoRef.current.currentTime)
    }
  }

  const handleTimeUpdate = () => {
    if (isHost && !isSeekingRef.current) {
      onStateChange(
        !videoRef.current.paused,
        videoRef.current.currentTime
      )
    }
  }

  const handleSeeking = () => {
    isSeekingRef.current = true
  }

  const handleSeeked = () => {
    isSeekingRef.current = false
    if (isHost) {
      onStateChange(
        !videoRef.current.paused,
        videoRef.current.currentTime
      )
    }
  }

  const handleLoadStart = () => {
    setLoading(true)
  }

  const handleCanPlay = () => {
    setLoading(false)
    if (!isHost) {
      syncWithHost()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        } else if (containerRef.current.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // time formatting helper (math is hard)
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e) => {
    if (!isHost || !videoRef.current) return

    const bounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - bounds.left
    const percent = x / bounds.width
    const newTime = percent * videoRef.current.duration
    
    videoRef.current.currentTime = newTime
    onStateChange(!videoRef.current.paused, newTime)
  }

  const handleProgressHover = (e) => {
    if (!isHost || !videoRef.current) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - bounds.left
    const percent = (x / bounds.width) * 100
    setPreviewPosition(percent)
  }

  const handleProgressLeave = () => {
    setPreviewPosition(null)
  }

  const handleProgressDrag = (e) => {
    if (!isHost || !videoRef.current || !isDragging || !progressRef.current) return
    
    const bounds = progressRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - bounds.left), bounds.width)
    const percent = (x / bounds.width) * 100
    setPreviewPosition(percent)
    
    const newTime = (percent / 100) * videoRef.current.duration
    videoRef.current.currentTime = newTime
    onStateChange(!videoRef.current.paused, newTime)
  }

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleProgressDrag)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleProgressDrag)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!url) {
    return (
      <div className="aspect-video bg-secondary/50 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/10">
        <p className="text-gray-400 text-lg">
          {isHost
            ? "Upload a video to get started"
            : "Waiting for host to upload a video"}
        </p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative group ${isFullscreen ? 'fixed inset-0 bg-black z-50' : ''}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'} bg-black rounded-2xl overflow-hidden`}
      >
        {/* the actual video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={url}
          controls={false}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
        />

        {/* spinny loading thing */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* fancy controls for host */}
        {isHost ? (
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* progress bar with preview */}
              <div className="flex items-center gap-2 text-white text-sm">
                <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                <div 
                  ref={progressRef}
                  className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer group"
                  onClick={handleProgressClick}
                  onMouseMove={handleProgressHover}
                  onMouseLeave={() => {
                    if (!isDragging) {
                      handleProgressLeave()
                    }
                  }}
                  onMouseDown={(e) => {
                    setIsDragging(true)
                    handleProgressDrag(e)
                  }}
                >
                  {/* that cool hover preview thing */}
                  {previewPosition !== null && (
                    <div 
                      className="absolute top-0 h-full bg-white/30 transition-all duration-100"
                      style={{ 
                        left: 0,
                        width: `${previewPosition}%`
                      }} 
                    />
                  )}
                  <div 
                    className="absolute inset-0 h-full w-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <div 
                    className="h-full bg-accent rounded-full relative transition-all duration-150 ease-out"
                    style={{ 
                      width: `${(videoRef.current?.currentTime / videoRef.current?.duration) * 100 || 0}%` 
                    }}
                  >
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-lg" />
                  </div>
                  {/* time preview tooltip */}
                  {previewPosition !== null && (
                    <div 
                      className="absolute -top-8 bg-black/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md shadow-lg pointer-events-none"
                      style={{ 
                        left: `${previewPosition}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {formatTime((previewPosition / 100) * videoRef.current.duration)}
                    </div>
                  )}
                </div>
                <span>{formatTime(videoRef.current?.duration || 0)}</span>
              </div>

              {/* all the buttons n stuff */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {/* go back 10s */}
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime -= 10
                        onStateChange(!videoRef.current.paused, videoRef.current.currentTime)
                      }
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <BackwardIcon className="w-5 h-5 text-white" />
                  </button>

                  {/* play/pause button */}
                  <button
                    onClick={() => {
                      if (!videoRef.current) return
                      if (videoRef.current.paused) {
                        videoRef.current.play()
                        onStateChange(true, videoRef.current.currentTime)
                      } else {
                        videoRef.current.pause()
                        onStateChange(false, videoRef.current.currentTime)
                      }
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    {!videoRef.current?.paused ? (
                      <PauseIcon className="w-6 h-6 text-white" />
                    ) : (
                      <PlayIcon className="w-6 h-6 text-white" />
                    )}
                  </button>

                  {/* skip 10s */}
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime += 10
                        onStateChange(!videoRef.current.paused, videoRef.current.currentTime)
                      }
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ForwardIcon className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="flex-1" />

                {/* volume slider */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                    ) : (
                      <SpeakerWaveIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-accent"
                  />
                </div>

                {/* make it big */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // simple controls for participants
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* just show the time */}
              <div className="flex items-center gap-2 text-white text-sm">
                <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent/50 rounded-full"
                    style={{ 
                      width: `${(videoRef.current?.currentTime / videoRef.current?.duration) * 100 || 0}%` 
                    }}
                  />
                </div>
                <span>{formatTime(videoRef.current?.duration || 0)}</span>
              </div>

              {/* basic controls */}
              <div className="flex items-center gap-4">
                <span className="text-white text-sm hidden sm:inline">
                  {isPlaying ? 'Playing' : 'Paused'} (Host controls)
                </span>

                {/* at least they can control volume */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                    ) : (
                      <SpeakerWaveIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 sm:w-24 accent-accent"
                  />
                </div>

                <div className="flex-1" />

                {/* fullscreen still works */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* just to show the state */}
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5 text-white opacity-50" />
                ) : (
                  <PlayIcon className="w-5 h-5 text-white opacity-50" />
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
} 
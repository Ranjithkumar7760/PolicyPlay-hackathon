'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function Timer({ startTime, onTimeUpdate }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - startTime) / 1000)
      setElapsed(elapsedSeconds)
      if (onTimeUpdate) {
        onTimeUpdate(elapsedSeconds)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, onTimeUpdate])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl shadow-lg"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-2xl"
        >
          ⏱️
        </motion.div>
        <div>
          <div className="text-xs opacity-90">Time Elapsed</div>
          <div className="text-2xl font-bold">{formatTime(elapsed)}</div>
        </div>
      </div>
    </motion.div>
  )
}


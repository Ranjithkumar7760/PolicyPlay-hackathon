'use client'

import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'

export default function ConfettiAnimation({ trigger, onComplete }) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }, [])

  useEffect(() => {
    if (trigger) {
      setShowConfetti(true)
      const timer = setTimeout(() => {
        setShowConfetti(false)
        onComplete?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [trigger, onComplete])

  if (!showConfetti) return null

  return (
    <Confetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.3}
    />
  )
}


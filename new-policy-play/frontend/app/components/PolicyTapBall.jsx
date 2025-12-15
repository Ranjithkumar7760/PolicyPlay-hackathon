'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

export default function PolicyTapBall({ 
  option, 
  isCorrect, 
  onTap, 
  speed = 1,
  xPosition = 0,
  hasReachedBottom = false,
  onReachBottom,
  gameAreaHeight = null,
  zIndex = 20
}) {
  const [isExploded, setIsExploded] = useState(false)
  const [isTapped, setIsTapped] = useState(false)
  const [fallDistance, setFallDistance] = useState(() => {
    // Initialize with gameAreaHeight if available, otherwise use default
    return gameAreaHeight ? gameAreaHeight + 100 : 700
  })
  const ballRef = useRef(null)

  useEffect(() => {
    if (hasReachedBottom && !isTapped) {
      // Notify parent that this ball reached bottom
      onReachBottom?.(isCorrect)
    }
  }, [hasReachedBottom, isTapped, isCorrect, onReachBottom])

  // Calculate fall distance based on game area height - ensure it's set immediately
  useEffect(() => {
    const calculateDistance = () => {
      if (ballRef.current && !isTapped && !isExploded) {
        const parent = ballRef.current.parentElement
        if (parent) {
          const parentHeight = parent.offsetHeight || gameAreaHeight || 600
          const calculatedDistance = parentHeight + 100
          setFallDistance(calculatedDistance)
        } else if (gameAreaHeight) {
          setFallDistance(gameAreaHeight + 100)
        }
      }
    }
    
    // Calculate immediately
    calculateDistance()
    
    // Also calculate after a small delay to ensure DOM is ready
    const timer = setTimeout(calculateDistance, 50)
    return () => clearTimeout(timer)
  }, [gameAreaHeight, isTapped, isExploded])

  const handleTap = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isExploded || isTapped) return
    console.log('Ball tapped:', option, isCorrect)
    setIsTapped(true)
    onTap(option, isCorrect)
    // Mark as exploded after a short delay to show animation
    setTimeout(() => setIsExploded(true), 500)
  }

  // All balls have the same color - purple gradient
  const ballColor = 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/50'

  // Create variants dynamically based on fall distance
  const getBallVariants = () => ({
    falling: {
      y: [0, fallDistance],
      transition: {
        y: {
          duration: 10 / speed, // Smooth fall duration
          ease: "linear",
          repeat: 0 // Don't repeat
        }
      }
    },
    exploded: {
      scale: [1, 1.5, 0],
      opacity: [1, 1, 0],
      transition: {
        duration: 0.5
      }
    },
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: {
        duration: 0.5
      }
    }
  })

  const ballVariants = getBallVariants()

  if (isExploded) {
    return null
  }

  return (
    <motion.div
      ref={ballRef}
      className={`absolute cursor-pointer ${ballColor} rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-sm px-4 py-2.5 min-w-[120px] max-w-[150px] border-2 border-white/30`}
      style={{
        left: `calc(${xPosition}% - 60px)`, // Adjusted for smaller ball width (120px / 2 = 60px)
        top: '-60px',
        zIndex: zIndex,
        pointerEvents: isTapped ? 'none' : 'auto'
      }}
      data-ball-option={option}
      data-is-correct={isCorrect}
      initial={{ y: 0 }}
      animate={isTapped ? (isCorrect ? "exploded" : "shake") : {
        y: fallDistance,
        transition: {
          duration: 10 / speed,
          ease: "linear",
          repeat: 0
        }
      }}
      onAnimationComplete={(definition) => {
        if (isTapped) {
          // Delay explosion removal to show animation
          setTimeout(() => setIsExploded(true), 600)
        } else if (!isTapped && !isExploded) {
          // Ball reached bottom without being tapped - only notify once
          // Use a small delay to ensure state is stable
          setTimeout(() => {
            if (!isTapped && !isExploded) {
              onReachBottom?.(isCorrect)
            }
          }, 100)
        }
      }}
      onClick={handleTap}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        handleTap(e)
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
    >
      <span className="text-center px-2 line-clamp-2 break-words">{option}</span>
    </motion.div>
  )
}


'use client'

import { motion } from 'framer-motion'

export default function BallExplosion({ isCorrect, position }) {
  const particles = Array.from({ length: 30 }, (_, i) => i)

  const particleVariants = {
    initial: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1
    },
    animate: {
      x: () => [
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 400
      ],
      y: () => [
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 400
      ],
      scale: [1, 1.5, 0],
      opacity: [1, 1, 0],
      transition: {
        duration: 1.0,
        ease: "easeOut"
      }
    }
  }

  return (
    <motion.div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Central burst effect */}
      <motion.div
        className={`absolute w-24 h-24 rounded-full ${
          isCorrect 
            ? 'bg-yellow-400' 
            : 'bg-red-500'
        } opacity-90`}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 30px ${isCorrect ? '#fbbf24' : '#ef4444'}`
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 2.5, 0], opacity: [1, 0.9, 0] }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Particle explosion */}
      {particles.map((particle) => (
        <motion.div
          key={particle}
          className={`absolute w-4 h-4 rounded-full ${
            isCorrect 
              ? 'bg-yellow-400' 
              : 'bg-red-500'
          }`}
          style={{
            left: '50%',
            top: '50%',
            boxShadow: `0 0 15px ${isCorrect ? '#fbbf24' : '#ef4444'}`
          }}
          variants={particleVariants}
          initial="initial"
          animate="animate"
        />
      ))}
    </motion.div>
  )
}


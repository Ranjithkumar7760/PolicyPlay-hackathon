'use client'

import { motion } from 'framer-motion'

export default function ScoreTracker({ score, showAnimation = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">🏆</div>
        <div>
          <div className="text-xs opacity-90">Score</div>
          <motion.div
            key={score}
            initial={showAnimation ? { scale: 1.5, color: '#fbbf24' } : {}}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold"
          >
            {score}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}


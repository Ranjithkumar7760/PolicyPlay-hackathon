'use client'

import { motion } from 'framer-motion'

export default function GameHUD({ score, currentQuestion, totalQuestions, timeRemaining, level }) {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Score Card - Reduced size */}
          <motion.div
            className="flex items-center gap-2 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg px-3 py-2 shadow-sm border border-yellow-200 min-w-[90px]"
            animate={{ scale: score > 0 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-xl">🏆</span>
            <div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Score</div>
              <div className="text-lg font-bold text-green-600">{score}</div>
            </div>
          </motion.div>

          {/* Progress Section - Reduced size */}
          <div className="flex-1 mx-3 max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Progress
              </span>
              <span className="text-[10px] font-semibold text-purple-600">
                {currentQuestion + 1} / {totalQuestions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
              <motion.div
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 h-2 rounded-full shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500 text-center capitalize">
              Level: <span className="font-semibold text-purple-600">{level}</span>
            </div>
          </div>

          {/* Timer Card - Reduced size */}
          {timeRemaining !== null && (
            <motion.div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm border min-w-[90px] ${
                timeRemaining < 5 
                  ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 text-red-600' 
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-blue-600'
              }`}
              animate={timeRemaining < 5 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <span className="text-lg">{timeRemaining < 5 ? '⏰' : '⏱️'}</span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide">Time</div>
                <div className="text-lg font-bold">{timeRemaining}s</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}


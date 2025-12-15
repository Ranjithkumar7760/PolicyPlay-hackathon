'use client'

import { motion } from 'framer-motion'

export default function QuestionCard({ question }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-xl shadow-lg border-2 border-purple-100 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
          Question
        </h3>
      </div>
      <div className="p-4 sm:p-5">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center leading-relaxed">
          {question}
        </h2>
      </div>
    </motion.div>
  )
}


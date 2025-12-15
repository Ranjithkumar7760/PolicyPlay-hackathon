'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

export default function EscapeRoomResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    if (attemptId) {
      fetchResults()
    }
  }, [attemptId])

  const fetchResults = async () => {
    // Results would come from the finish endpoint response
    // For now, we'll simulate or fetch from attempt
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl mb-4"
          >
            🎉
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Escape Room Completed!</h1>
          <p className="text-xl text-gray-600 mb-8">Great job completing all 5 rooms!</p>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-50 p-6 rounded-xl">
              <div className="text-3xl font-bold text-purple-600">Score</div>
              <div className="text-2xl font-semibold text-gray-800">Check Leaderboard</div>
            </div>
            <div className="bg-indigo-50 p-6 rounded-xl">
              <div className="text-3xl font-bold text-indigo-600">Time</div>
              <div className="text-2xl font-semibold text-gray-800">Completed</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/escape-room/leaderboard"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 font-semibold"
            >
              🏆 View Leaderboard
            </Link>
            <Link
              href="/escape-room"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold"
            >
              Play Again
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


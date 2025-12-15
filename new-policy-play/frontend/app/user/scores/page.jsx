'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

export default function UserScoresPage() {
  const router = useRouter()
  const [scores, setScores] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchScores()
  }, [])

  const fetchScores = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/user/scores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setScores(response.data)
    } catch (err) {
      console.error('Failed to fetch scores:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <p className="text-xl text-gray-700">Failed to load scores</p>
      </div>
    )
  }

  const stats = scores.statistics

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              My Scores & Performance
            </h1>
            <p className="text-xl text-gray-700">Track your learning progress</p>
          </div>
          <Link
            href="/games"
            className="px-4 py-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-lg hover:bg-white shadow-md transition-all"
          >
            ← Back to Games
          </Link>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <div className="text-4xl mb-2">🎮</div>
            <h3 className="text-gray-600 mb-2">Total Games</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.total_games}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-gray-600 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completed_games}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-gray-600 mb-2">Average Score</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.average_score}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-gray-600 mb-2">Highest Score</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.highest_score}</p>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Accuracy</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.accuracy}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className={`h-4 rounded-full ${
                      stats.accuracy >= 80 ? 'bg-green-500' : stats.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
              <span className={`text-2xl font-bold ${
                stats.accuracy >= 80 ? 'text-green-600' : stats.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.accuracy}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.correct_answers} correct out of {stats.completed_games} completed games
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Total Score</h3>
            <p className="text-4xl font-bold text-indigo-600">{stats.total_score}</p>
            <p className="text-sm text-gray-600 mt-2">Sum of all game scores</p>
          </motion.div>
        </div>

        {/* Recent Games */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Recent Games</h2>
          {scores.recent_games.length > 0 ? (
            <div className="space-y-3">
              {scores.recent_games.map((game, idx) => (
                <motion.div
                  key={game.session_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className={`p-4 rounded-xl border-2 ${
                    game.correct
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{game.policy_title}</p>
                      <p className="text-sm text-gray-600">
                        {game.game_type === 'scenario' ? '📝 Scenario' : '🔍 Violation'} • {new Date(game.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        game.correct ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {game.score}
                      </p>
                      <p className="text-xs text-gray-500">/ 100</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No games completed yet. Start playing to see your scores!</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}


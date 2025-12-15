'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../services/auth'
import { API_URL } from '../config/api'

export default function LeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setLeaderboard(response.data)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '🥇', color: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300' }
    if (rank === 2) return { emoji: '🥈', color: 'from-gray-300 to-gray-500', bg: 'bg-gray-50', border: 'border-gray-300' }
    if (rank === 3) return { emoji: '🥉', color: 'from-orange-400 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-300' }
    return { emoji: null, color: '', bg: 'bg-white', border: 'border-gray-200' }
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

  if (!leaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <p className="text-xl text-gray-700">Failed to load leaderboard</p>
      </div>
    )
  }

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
              🏆 Leaderboard
            </h1>
            <p className="text-xl text-gray-700">Compete with other players and climb the ranks!</p>
          </div>
          <div className="flex gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/user/scores" className="px-4 py-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-lg hover:bg-white shadow-md transition-all">
                My Scores
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/games" className="px-4 py-2 bg-white/80 backdrop-blur-sm text-purple-600 rounded-lg hover:bg-white shadow-md transition-all">
                Play Games
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Current User Rank Banner */}
        {leaderboard.current_user_rank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Your Current Rank</p>
                <p className="text-4xl font-bold">#{leaderboard.current_user_rank}</p>
                <p className="text-sm opacity-90 mt-1">out of {leaderboard.total_participants} players</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl"
              >
                🎯
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Top 3 Podium */}
        {leaderboard.leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className={`bg-gradient-to-br from-gray-300 to-gray-500 p-6 rounded-2xl shadow-lg ${leaderboard.leaderboard[1].is_current_user ? 'ring-4 ring-purple-500' : ''}`}>
                <div className="text-5xl mb-2">🥈</div>
                <div className="text-3xl font-bold text-white mb-1">#2</div>
                <div className="text-lg font-semibold text-white truncate">{leaderboard.leaderboard[1].user_name}</div>
                <div className="text-sm text-gray-200 mt-2">Avg: {leaderboard.leaderboard[1].average_score}</div>
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: -20 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className={`bg-gradient-to-br from-yellow-400 to-yellow-600 p-6 rounded-2xl shadow-2xl ${leaderboard.leaderboard[0].is_current_user ? 'ring-4 ring-purple-500' : ''}`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-2"
                >
                  👑
                </motion.div>
                <div className="text-3xl font-bold text-white mb-1">#1</div>
                <div className="text-xl font-bold text-white truncate">{leaderboard.leaderboard[0].user_name}</div>
                <div className="text-sm text-yellow-100 mt-2">Avg: {leaderboard.leaderboard[0].average_score}</div>
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className={`bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-2xl shadow-lg ${leaderboard.leaderboard[2].is_current_user ? 'ring-4 ring-purple-500' : ''}`}>
                <div className="text-5xl mb-2">🥉</div>
                <div className="text-3xl font-bold text-white mb-1">#3</div>
                <div className="text-lg font-semibold text-white truncate">{leaderboard.leaderboard[2].user_name}</div>
                <div className="text-sm text-orange-100 mt-2">Avg: {leaderboard.leaderboard[2].average_score}</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Full Rankings</h2>
            <p className="text-gray-600 text-sm mt-1">Top {leaderboard.leaderboard.length} players</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Games</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Average</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Highest</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.leaderboard.map((entry, index) => {
                  const badge = getRankBadge(entry.rank)
                  return (
                    <motion.tr
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.02 }}
                      className={`hover:bg-gray-50 transition-colors ${
                        entry.is_current_user ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {badge.emoji && <span className="text-2xl">{badge.emoji}</span>}
                          <span className={`text-lg font-bold ${
                            entry.rank === 1 ? 'text-yellow-600' :
                            entry.rank === 2 ? 'text-gray-600' :
                            entry.rank === 3 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            entry.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            entry.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-blue-400 to-blue-600'
                          }`}>
                            {entry.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${
                              entry.is_current_user ? 'text-purple-700' : 'text-gray-900'
                            }`}>
                              {entry.user_name}
                              {entry.is_current_user && <span className="ml-2 text-purple-600">(You)</span>}
                            </div>
                            <div className="text-xs text-gray-500">{entry.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.completed_games}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">{entry.average_score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">{entry.highest_score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          entry.accuracy >= 80 ? 'text-green-600' :
                          entry.accuracy >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {entry.accuracy}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-indigo-600">{entry.total_score}</span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {leaderboard.leaderboard.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-xl mb-2">No players yet!</p>
              <p className="text-sm">Be the first to complete a game and appear on the leaderboard.</p>
            </div>
          )}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <Link
            href="/games"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            🎮 Play More Games to Climb the Leaderboard!
          </Link>
        </motion.div>
      </div>
    </div>
  )
}


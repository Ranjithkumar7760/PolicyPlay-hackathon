'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

export default function EscapeRoomLeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState(null)
  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchLeaderboard()
  }, [level])

  const fetchLeaderboard = async () => {
    try {
      const token = authService.getAuthToken()
      const url = level 
        ? `${API_URL}/escape/leaderboard?level=${level}`
        : `${API_URL}/escape/leaderboard`
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setLeaderboard(response.data)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
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
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            🏆 Escape Room Leaderboard
          </h1>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setLevel(null)}
              className={`px-4 py-2 rounded-lg ${!level ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}
            >
              All Levels
            </button>
            <button
              onClick={() => setLevel('beginner')}
              className={`px-4 py-2 rounded-lg ${level === 'beginner' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Beginner
            </button>
            <button
              onClick={() => setLevel('intermediate')}
              className={`px-4 py-2 rounded-lg ${level === 'intermediate' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Intermediate
            </button>
            <button
              onClick={() => setLevel('expert')}
              className={`px-4 py-2 rounded-lg ${level === 'expert' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Expert
            </button>
          </div>
        </motion.div>

        {leaderboard && leaderboard.leaderboard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rooms</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.leaderboard.map((entry, idx) => (
                  <motion.tr
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${
                        idx === 0 ? 'text-yellow-600' :
                        idx === 1 ? 'text-gray-600' :
                        idx === 2 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.user_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        entry.level === 'beginner' ? 'bg-green-100 text-green-700' :
                        entry.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-purple-600">
                      {entry.score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {Math.floor(entry.time_taken / 60)}:{(entry.time_taken % 60).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.rooms_completed}/5
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/escape-room"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold"
          >
            ← Back to Escape Room
          </Link>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import Link from 'next/link'

import { API_URL } from '../../config/api'

export default function PolicyTapLeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedPolicy, setSelectedPolicy] = useState('all')
  const [policies, setPolicies] = useState([])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPolicies()
    fetchLeaderboard()
  }, [selectedLevel, selectedPolicy])

  const fetchPolicies = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicies(response.data)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const token = authService.getAuthToken()
      const params = {}
      if (selectedLevel !== 'all') {
        params.level = selectedLevel
      }
      if (selectedPolicy !== 'all') {
        params.policy_id = selectedPolicy
      }
      
      const response = await axios.get(`${API_URL}/policy-tap/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params
      })
      setLeaderboard(response.data.leaderboard || [])
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            🏆 Policy Tap Leaderboard
          </h1>
          
          <div className="flex gap-4 justify-center mb-6">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
            
            <select
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Policies</option>
              {policies.map((policy) => (
                <option key={policy.policyId} value={policy.policyId}>
                  {policy.title}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {leaderboard.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry) => (
                  <motion.tr
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getRankBadge(entry.rank)} {entry.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.username}</div>
                      <div className="text-sm text-gray-500">{entry.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {entry.score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {entry.level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.correct_answers}/{entry.correct_answers + entry.wrong_answers + entry.missed_answers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.time_taken}s
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-2xl shadow-xl"
          >
            <p className="text-gray-600 text-lg">No leaderboard entries yet. Be the first to play!</p>
            <Link
              href="/policy-tap"
              className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
            >
              Start Playing
            </Link>
          </motion.div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/policy-tap"
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    </div>
  )
}


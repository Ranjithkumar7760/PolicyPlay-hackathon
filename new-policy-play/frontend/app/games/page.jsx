'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from '../services/auth'

import { API_URL } from '../config/api'

export default function GamesPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPolicy, setExpandedPolicy] = useState(null)
  const [policyGames, setPolicyGames] = useState({})
  const [generatingGames, setGeneratingGames] = useState({})

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicies(response.data)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
      if (err.response?.status === 401) {
        authService.logout()
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPolicyGames = async (policyId) => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/game/policy/${policyId}/games`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicyGames(prev => ({ ...prev, [policyId]: response.data }))
    } catch (err) {
      console.error('Failed to load games:', err)
    }
  }

  const generateGamesForPolicy = async (policyId) => {
    setGeneratingGames(prev => ({ ...prev, [policyId]: true }))
    try {
      const token = authService.getAuthToken()
      const response = await axios.post(
        `${API_URL}/game/generate-batch/${policyId}?num_games=5`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      await loadPolicyGames(policyId)
      setExpandedPolicy(policyId)
    } catch (err) {
      alert('Failed to generate games: ' + (err.response?.data?.detail || err.message))
    } finally {
      setGeneratingGames(prev => ({ ...prev, [policyId]: false }))
    }
  }

  const togglePolicyExpansion = async (policyId) => {
    if (expandedPolicy === policyId) {
      setExpandedPolicy(null)
    } else {
      setExpandedPolicy(policyId)
      if (!policyGames[policyId]) {
        await loadPolicyGames(policyId)
      }
    }
  }

  const startGame = async (sessionId) => {
    router.push(`/games/${sessionId}/play`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link 
                href="/" 
                className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                PolicyPlay
              </Link>
              <div className="hidden md:flex items-center gap-3">
                <Link 
                  href="/policy-tap" 
                  className="px-3 py-1.5 text-sm font-semibold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  🎯 Policy Tap
                </Link>
                <Link 
                  href="/leaderboard" 
                  className="px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  🏆 Leaderboard
                </Link>
                <Link 
                  href="/user/scores" 
                  className="px-3 py-1.5 text-sm font-semibold text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  📊 My Scores
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/login"
                className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md"
              >
                👨‍💼 Login as Admin
              </Link>
              <motion.button
                onClick={() => {
                  authService.logout()
                  router.push('/')
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Interactive Policy Learning Hub
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto">
              Explore policies and play scenario-based games to strengthen your compliance awareness.
            </p>
          </motion.div>

          {/* Policy Cards Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
          {policies.map((policy, index) => (
            <motion.div
              key={policy.policyId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-white flex-1 pr-2 line-clamp-2">{policy.title || 'Untitled Policy'}</h3>
                  <span className="text-2xl flex-shrink-0">📚</span>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-semibold text-gray-700">
                    {policy.rules_count} rules available
                  </span>
                </div>
                <div className="space-y-3">
                  <motion.button
                    onClick={() => generateGamesForPolicy(policy.policyId)}
                    disabled={generatingGames[policy.policyId]}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingGames[policy.policyId] ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        ✨ Generate Games (5+)
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => togglePolicyExpansion(policy.policyId)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                  >
                    {expandedPolicy === policy.policyId ? '👁️ Hide Games' : '🎮 View Games'}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {expandedPolicy === policy.policyId && policyGames[policy.policyId] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-6"
                  >
                    <h4 className="font-bold mb-4 text-gray-800 flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      Available Games ({policyGames[policy.policyId].length})
                    </h4>
                    {policyGames[policy.policyId].length === 0 ? (
                      <p className="text-sm text-gray-500 mb-3 text-center py-4">No games yet. Click "Generate Games" to create games.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {policyGames[policy.policyId].map((game, idx) => (
                          <motion.div
                            key={game.session_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ x: 5 }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              game.completed
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md'
                            }`}
                            onClick={() => !game.completed && startGame(game.session_id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mb-2 ${
                                  game.game_type === 'scenario'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {game.game_type === 'scenario' ? '📝 Scenario' : '🔍 Violation'}
                                </span>
                                <p className="text-sm text-gray-800 font-medium mt-2 line-clamp-2">{game.title}</p>
                                {game.completed && (
                                  <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                    <span>✅</span> Score: {game.score}/100
                                  </p>
                                )}
                              </div>
                              {game.completed ? (
                                <span className="text-xs text-gray-500 font-semibold">✓ Done</span>
                              ) : (
                                <motion.span
                                  animate={{ x: [0, 5, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="text-xs text-blue-600 font-bold"
                                >
                                  ▶ Play
                                </motion.span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

          {policies.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                📚
              </motion.div>
              <p className="text-xl font-semibold text-gray-800 mb-2">No policies available</p>
              <p className="text-gray-600">Ask an admin to upload policies to get started!</p>
            </motion.div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  )
}

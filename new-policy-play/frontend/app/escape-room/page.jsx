'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../services/auth'
import { API_URL } from '../config/api'

export default function EscapeRoomPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 py-8 px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.h1
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4"
          >
            🚪 Policy Escape Room
          </motion.h1>
          <p className="text-2xl text-gray-700 mb-2">Test your policy knowledge!</p>
          <p className="text-gray-600">Navigate through 5 challenging rooms and escape!</p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: '🏛️', title: '5 Rooms', desc: 'Definitions, Exceptions, Rules, Violations & Master' },
            { icon: '📊', title: '3 Levels', desc: 'Beginner, Intermediate, Expert' },
            { icon: '⏱️', title: 'Timed', desc: 'Beat the clock for bonus points' },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg"
            >
              <div className="text-5xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Policy Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Select a Policy</h2>
          {policies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy, idx) => (
                <motion.div
                  key={policy.policyId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer"
                  onClick={() => router.push(`/escape-room/${policy.policyId}/level-select`)}
                >
                  <div className="text-4xl mb-3">📜</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{policy.title || 'Untitled Policy'}</h3>
                  <p className="text-gray-600 text-sm">{policy.rules_count} rules</p>
                  <div className="mt-4 text-purple-600 font-semibold">Select →</div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">No policies available. Ask an admin to upload policies.</p>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/games"
            className="px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white shadow-md transition-all"
          >
            ← Back to Games
          </Link>
          <Link
            href="/escape-room/leaderboard"
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 shadow-md transition-all font-semibold"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </div>
    </div>
  )
}


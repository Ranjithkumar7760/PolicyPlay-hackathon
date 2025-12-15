'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../services/auth'
import Link from 'next/link'

import { API_URL } from '../config/api'

export default function PolicyTapPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link 
                href="/games" 
                className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                PolicyPlay
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/games"
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
              >
                ← Back to Home
              </Link>
              <Link
                href="/admin/login"
                className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md"
              >
                👨‍💼 Login as Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              🎯 Policy Tap
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              Tap the correct option balls to answer policy questions!
            </p>
            <Link
              href="/policy-tap/leaderboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
            >
              View Leaderboard
            </Link>
          </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => (
            <motion.div
              key={policy.policyId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer"
              onClick={() => router.push(`/policy-tap/${policy.policyId}/level-select`)}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{policy.title}</h3>
              <p className="text-gray-600 mb-4">{policy.filename}</p>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>📋 {policy.rules_count} Rules</span>
                <span>📝 {policy.clauses_count} Clauses</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <span className="text-purple-600 font-semibold">Select Policy →</span>
              </div>
            </motion.div>
          ))}
        </div>

          {policies.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No policies available. Ask an admin to upload policies.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}


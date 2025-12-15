'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../../services/auth'
import Link from 'next/link'

import { API_URL } from '../../../config/api'

const levelCards = [
  { 
    level: 'beginner', 
    title: 'Beginner', 
    description: 'Slow option balls, 3 options, no penalties for missed balls', 
    icon: '🌱',
    speed: 0.8
  },
  { 
    level: 'intermediate', 
    title: 'Intermediate', 
    description: 'Faster option balls, 4 options, missed correct = -10 points', 
    icon: '🌳',
    speed: 1.2
  },
  { 
    level: 'expert', 
    title: 'Expert', 
    description: 'Very fast option balls, 5 options, timer enforced, curved paths', 
    icon: '🌲',
    speed: 1.8
  },
]

export default function LevelSelectPage() {
  const router = useRouter()
  const params = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPolicyDetails()
  }, [])

  const fetchPolicyDetails = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const found = response.data.find(p => p.policyId === params.policyId)
      if (!found) {
        setError('Policy not found.')
      }
      setPolicy(found)
    } catch (err) {
      console.error('Failed to fetch policy:', err)
      setError(err.response?.data?.detail || 'Failed to fetch policy details.')
    } finally {
      setLoading(false)
    }
  }

  const handleLevelSelect = async (level) => {
    setGenerating(prev => ({ ...prev, [level]: true }))
    setError('')
    try {
      const token = authService.getAuthToken()
      
      // Generate game set
      const generateResponse = await axios.post(
        `${API_URL}/policy-tap/generate/${params.policyId}?level=${level}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      // Start attempt
      const startResponse = await axios.post(
        `${API_URL}/policy-tap/start`,
        { game_set_id: generateResponse.data.game_set_id },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      )
      
      router.push(`/policy-tap/play?attempt_id=${startResponse.data.attempt_id}&game_set_id=${generateResponse.data.game_set_id}`)
    } catch (err) {
      console.error('Failed to start game:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to start game.')
    } finally {
      setGenerating(prev => ({ ...prev, [level]: false }))
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-700">Loading...</div>
  }

  if (error && !policy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 py-12 px-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="max-w-4xl mx-auto"
      >
        <motion.h1 className="text-5xl font-extrabold text-center text-gray-900 mb-4">
          Select Difficulty
        </motion.h1>
        <motion.p className="text-xl text-center text-gray-600 mb-8">
          Policy: <span className="font-semibold text-blue-700">{policy?.title}</span>
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {levelCards.map((card) => (
            <motion.div
              key={card.level}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 flex flex-col items-center text-center cursor-pointer"
              onClick={() => handleLevelSelect(card.level)}
            >
              <div className="text-6xl mb-4">{card.icon}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{card.title}</h2>
              <p className="text-gray-600 mb-4">{card.description}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold disabled:bg-gray-400"
                disabled={generating[card.level]}
              >
                {generating[card.level] ? 'Generating...' : 'Start Game'}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-10 text-center">
          <Link href="/policy-tap" className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold">
            ← Back to Policies
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}


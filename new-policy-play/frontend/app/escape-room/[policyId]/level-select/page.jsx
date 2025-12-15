'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../../services/auth'
import { API_URL } from '../../../config/api'

const levels = [
  { id: 'beginner', name: 'Beginner', icon: '🌱', color: 'from-green-500 to-emerald-600', desc: 'Simple puzzles, perfect for learning' },
  { id: 'intermediate', name: 'Intermediate', icon: '⚡', color: 'from-yellow-500 to-orange-600', desc: 'Moderate challenge, scenario-based' },
  { id: 'expert', name: 'Expert', icon: '🔥', color: 'from-red-500 to-pink-600', desc: 'Complex puzzles, multi-step reasoning' },
]

export default function LevelSelectPage() {
  const router = useRouter()
  const params = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState({})

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPolicy()
  }, [])

  const fetchPolicy = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const found = response.data.find(p => p.policyId === params.policyId)
      setPolicy(found)
    } catch (err) {
      console.error('Failed to fetch policy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLevelSelect = async (level) => {
    setGenerating(prev => ({ ...prev, [level]: true }))
    try {
      const token = authService.getAuthToken()
      console.log(`Generating escape room for policy ${params.policyId}, level ${level}`)
      
      // Generate or get escape room
      const generateResponse = await axios.post(
        `${API_URL}/escape/generate/${params.policyId}?level=${level}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      console.log('Escape room generated:', generateResponse.data)
      
      if (!generateResponse.data.escape_room_id) {
        throw new Error('No escape_room_id returned from generation')
      }
      
      // Start attempt
      console.log('Starting attempt for escape_room_id:', generateResponse.data.escape_room_id)
      const startResponse = await axios.post(
        `${API_URL}/escape/start`,
        { escape_room_id: generateResponse.data.escape_room_id },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      )
      
      console.log('Attempt started:', startResponse.data)
      
      if (!startResponse.data.attempt_id) {
        throw new Error('No attempt_id returned from start')
      }
      
      router.push(`/escape-room/play?attempt_id=${startResponse.data.attempt_id}&room=1`)
    } catch (err) {
      console.error('Failed to start escape room:', err)
      console.error('Error response:', err.response?.data)
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Unknown error'
      alert(`Failed to start escape room: ${errorMessage}\n\nCheck console for more details.`)
    } finally {
      setGenerating(prev => ({ ...prev, [level]: false }))
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
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Select Difficulty Level
          </h1>
          {policy && (
            <p className="text-xl text-gray-700">Policy: {policy.title || 'Untitled'}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {levels.map((level, idx) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className={`bg-gradient-to-br ${level.color} text-white p-8 rounded-2xl shadow-xl cursor-pointer relative overflow-hidden`}
              onClick={() => !generating[level.id] && handleLevelSelect(level.id)}
            >
              {generating[level.id] && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
                  />
                </div>
              )}
              <div className="text-6xl mb-4">{level.icon}</div>
              <h2 className="text-3xl font-bold mb-2">{level.name}</h2>
              <p className="text-white/90 mb-6">{level.desc}</p>
              <div className="text-xl font-semibold">
                {generating[level.id] ? 'Generating...' : 'Start →'}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/escape-room"
            className="px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white shadow-md transition-all"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  )
}


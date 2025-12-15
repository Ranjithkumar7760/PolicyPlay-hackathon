'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from '../../../services/auth'
import { API_URL, BACKEND_URL } from '../../../config/api'

export default function PlayGamePage() {
  const router = useRouter()
  const params = useParams()
  const [session, setSession] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [selectedRange, setSelectedRange] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchSession()
  }, [])

  const fetchSession = async () => {
    try {
      const token = authService.getAuthToken()
      
      if (!token) {
        router.push('/login')
        return
      }
      
      const response = await axios.get(`${API_URL}/game/start/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      })
      setSession(response.data)
    } catch (err) {
      console.error('Failed to fetch session:', err)
      
      let errorMessage = 'Failed to load game session.'
      
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('Cannot connect')) {
        errorMessage = `Cannot connect to backend server. Please make sure the backend is running on ${BACKEND_URL}`
      } else if (err.response) {
        errorMessage = err.response.data?.detail || `Server error: ${err.response.status}`
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the backend is running.'
      }
      
      alert(errorMessage)
      router.push('/games')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = authService.getAuthToken()
      
      if (!token) {
        alert('You are not authenticated. Please log in again.')
        router.push('/login')
        return
      }
      
      const answerData = {
        session_id: params.id,
        answer: session.game_type === 'scenario' ? selectedAnswer : null,
        violation_range: session.game_type === 'violation' ? selectedRange : null
      }

      console.log('Submitting answer:', answerData)
      console.log('API URL:', `${API_URL}/game/submit`)
      console.log('Token present:', !!token)
      
      // First, test if backend is reachable with a simple POST
      try {
        const healthCheck = await axios.post(`${BACKEND_URL}/health`, {}, {
          timeout: 5000
        })
        console.log('Backend health check (POST):', healthCheck.data)
      } catch (healthErr) {
        console.error('Backend health check failed:', healthErr)
        alert(`Cannot reach backend server. Please ensure it is running on ${BACKEND_URL}`)
        return
      }
      
      const response = await axios.post(`${API_URL}/game/submit`, answerData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10 second timeout
        validateStatus: function (status) {
          return status < 500; // Don't throw error for 4xx status codes
        }
      })
      
      console.log('Submit response:', response.status, response.data)
      
      if (response.status >= 400) {
        throw new Error(response.data?.detail || `Server returned status ${response.status}`)
      }
      
      setResult(response.data)
      setSubmitted(true)
    } catch (err) {
      console.error('Submit error:', err)
      
      let errorMessage = 'Failed to submit answer.'
      
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('Cannot connect')) {
        errorMessage = `Cannot connect to backend server. Please make sure the backend is running on ${BACKEND_URL}`
      } else if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.detail || err.response.data?.message || `Server error: ${err.response.status}`
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check if the backend is running.'
      } else {
        errorMessage = err.message || 'Unknown error occurred'
      }
      
      alert(`Failed to submit: ${errorMessage}`)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const text = session.violation_scenario.scenario_text
      const start = text.indexOf(range.toString())
      const end = start + range.toString().length
      
      if (start >= 0) {
        setSelectedRange({ start, end })
      }
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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-xl text-gray-700">Game session not found</p>
        </motion.div>
      </div>
    )
  }

  const handleBack = () => {
    // Confirm before leaving if game is in progress
    if (session && !submitted) {
      if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
        router.push('/games')
      }
    } else {
      router.push('/games')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 relative overflow-hidden">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <motion.button
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-white/90 backdrop-blur-md text-gray-700 rounded-lg shadow-lg hover:bg-white transition-colors font-semibold flex items-center gap-2 border border-gray-200"
        >
          <span>←</span>
          <span>Back</span>
        </motion.button>
      </div>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2"
            animate={{ backgroundPosition: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          >
            {session.game_type === 'scenario' ? '📝 Scenario Simulation' : '🔍 Spot the Violation'}
          </motion.h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {session.game_type === 'scenario' && session.scenario && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl mb-6"
                >
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <span className="text-3xl">💼</span>
                    Scenario
                  </h2>
                  <p className="text-gray-700 mb-8 text-lg leading-relaxed bg-gray-50 p-6 rounded-xl border-l-4 border-blue-500">
                    {session.scenario.scenario_text}
                  </p>

                  <div className="space-y-4 mb-8">
                    {session.scenario.options.map((option, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => setSelectedAnswer(idx)}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-300 ${
                          selectedAnswer === idx
                            ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              selectedAnswer === idx
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                            animate={selectedAnswer === idx ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            {String.fromCharCode(65 + idx)}
                          </motion.div>
                          <span className="text-gray-800 font-medium">{option}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <motion.button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null || submitted}
                    whileHover={{ scale: selectedAnswer !== null ? 1.02 : 1 }}
                    whileTap={{ scale: selectedAnswer !== null ? 0.98 : 1 }}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </motion.button>
                </motion.div>
              )}

              {session.game_type === 'violation' && session.violation_scenario && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl mb-6"
                >
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <span className="text-3xl">🔎</span>
                    Find the Policy Violation
                  </h2>
                  <p className="text-gray-700 mb-6 text-lg">Click and drag to highlight the violation:</p>
                  
                  <motion.div
                    className="p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 mb-6 text-gray-800 leading-relaxed text-lg select-text"
                    onMouseUp={handleTextSelection}
                    whileHover={{ borderColor: '#3b82f6' }}
                    transition={{ duration: 0.3 }}
                  >
                    {session.violation_scenario.scenario_text}
                  </motion.div>

                  {selectedRange && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl"
                    >
                      <p className="text-sm font-semibold text-green-800">
                        ✓ Selected: Characters {selectedRange.start} to {selectedRange.end}
                      </p>
                    </motion.div>
                  )}

                  <motion.button
                    onClick={handleSubmit}
                    disabled={!selectedRange || submitted}
                    whileHover={{ scale: selectedRange ? 1.02 : 1 }}
                    whileTap={{ scale: selectedRange ? 0.98 : 1 }}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className={`bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border-4 ${
                result.correct ? 'border-green-500' : 'border-red-500'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-center mb-6"
              >
                <div className={`text-6xl mb-4 ${result.correct ? 'animate-bounce' : ''}`}>
                  {result.correct ? '✅' : '❌'}
                </div>
                <h2 className={`text-4xl font-bold mb-2 ${
                  result.correct ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.correct ? 'Correct!' : 'Incorrect'}
                </h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-semibold text-gray-700"
                >
                  Score: {result.score}/100
                </motion.p>
              </motion.div>
              
              {!result.correct && result.correct_answer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 p-6 bg-green-50 border-2 border-green-300 rounded-xl"
                >
                  <p className="text-sm font-bold text-green-800 mb-2">✓ Correct Answer:</p>
                  <p className="text-gray-800 font-semibold text-lg">{result.correct_answer}</p>
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 mb-6"
              >
                <div className="p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                  <p className="text-gray-800 text-lg leading-relaxed">{result.explanation}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Policy Rule:</p>
                  <p className="text-gray-800">{result.policy_rule}</p>
                </div>
              </motion.div>
              
              <motion.button
                onClick={() => router.push('/games')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                🎮 Play Another Game
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import Link from 'next/link'

import { API_URL } from '../../config/api'

export default function PolicyTapResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    if (attemptId) {
      fetchResults()
    }
  }, [attemptId])

  const fetchResults = async () => {
    try {
      console.log('Fetching results for attempt_id:', attemptId)
      
      // First, try to get results from sessionStorage (from finish endpoint)
      const storedResults = sessionStorage.getItem('policyTapResults')
      if (storedResults) {
        try {
          const parsedResults = JSON.parse(storedResults)
          console.log('Found results in sessionStorage:', parsedResults)
          setResults(parsedResults)
          setLoading(false)
          // Clear sessionStorage after using
          sessionStorage.removeItem('policyTapResults')
          return
        } catch (e) {
          console.error('Failed to parse stored results:', e)
        }
      }
      
      // Fallback: Fetch from API if sessionStorage doesn't have it
      const token = authService.getAuthToken()
      console.log('Fetching results from API...')
      
      const response = await axios.post(
        `${API_URL}/policy-tap/finish`,
        {
          attempt_id: attemptId,
          final_time_taken: 0  // We don't have the time, but endpoint will return current attempt data
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      console.log('API response:', response.data)
      
      if (response.data) {
        const resultsData = {
          final_score: response.data.final_score ?? 0,
          correct_answers: response.data.correct_answers ?? 0,
          wrong_answers: response.data.wrong_answers ?? 0,
          missed_answers: response.data.missed_answers ?? 0,
          time_taken: response.data.time_taken ?? 0
        }
        console.log('Setting results:', resultsData)
        setResults(resultsData)
      } else {
        // Default values if API doesn't return data
        console.warn('API response missing data, using defaults')
        setResults({
          final_score: 0,
          correct_answers: 0,
          wrong_answers: 0,
          missed_answers: 0,
          time_taken: 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch results:', err)
      console.error('Error details:', err.response?.data || err.message)
      // Set default values on error
      setResults({
        final_score: 0,
        correct_answers: 0,
        wrong_answers: 0,
        missed_answers: 0,
        time_taken: 0
      })
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Game Complete!</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results?.final_score || 0}</div>
              <div className="text-sm text-gray-600">Final Score</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results?.correct_answers || 0}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results?.wrong_answers || 0}</div>
              <div className="text-sm text-gray-600">Wrong</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{results?.missed_answers || 0}</div>
              <div className="text-sm text-gray-600">Missed</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/policy-tap"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
            >
              Play Again
            </Link>
            <Link
              href="/policy-tap/leaderboard"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              View Leaderboard
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


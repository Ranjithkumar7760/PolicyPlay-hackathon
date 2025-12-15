'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import Timer from '../../components/Timer'
import ScoreTracker from '../../components/ScoreTracker'
import { API_URL } from '../../config/api'

export default function EscapeRoomPlayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')
  const roomNum = parseInt(searchParams.get('room') || '1')
  
  const [attempt, setAttempt] = useState(null)
  const [rooms, setRooms] = useState(null)
  const [currentRoom, setCurrentRoom] = useState(roomNum)
  const [answer, setAnswer] = useState({})
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [timeTaken, setTimeTaken] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    if (attemptId) {
      fetchAttempt()
      setStartTime(Date.now())
    }
  }, [attemptId])

  const fetchAttempt = async () => {
    try {
      const token = authService.getAuthToken()
      // Get escape room data
      const response = await axios.get(`${API_URL}/escape/rooms/${attemptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setRooms(response.data.rooms)
      setScore(response.data.score || 0)
      setAttempt(response.data)
    } catch (err) {
      console.error('Failed to fetch attempt:', err)
      alert('Failed to load escape room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    // Check if answer has the required field for the current room
    const hasAnswer = (currentRoom === 1 && answer.selected_definition) ||
                     (currentRoom === 2 && answer.selected_exception) ||
                     (currentRoom === 3 && answer.selected_rule) ||
                     (currentRoom === 4 && answer.fix) ||
                     (currentRoom === 5 && answer.definition_answer && answer.rule_answer && answer.exception_answer && answer.violation_fix)
    
    if (!hasAnswer) {
      alert('Please select an answer before submitting')
      return
    }

    setSubmitted(true)
    try {
      const token = authService.getAuthToken()
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000)
      
      const response = await axios.post(
        `${API_URL}/escape/submit/${attemptId}`,
        {
          attempt_id: attemptId,
          room_number: currentRoom,
          answer: { ...answer, time_taken: timeElapsed }
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      setResult(response.data)
      setScore(response.data.new_score)
      setTimeTaken(timeElapsed)
    } catch (err) {
      alert('Failed to submit: ' + (err.response?.data?.detail || err.message))
      setSubmitted(false)
    }
  }

  const handleNextRoom = () => {
    if (currentRoom < 5) {
      setCurrentRoom(currentRoom + 1)
      setAnswer({})
      setResult(null)
      setSubmitted(false)
      setStartTime(Date.now())
      router.push(`/escape-room/play?attempt_id=${attemptId}&room=${currentRoom + 1}`)
    } else {
      finishEscapeRoom()
    }
  }

  const finishEscapeRoom = async () => {
    try {
      const token = authService.getAuthToken()
      const totalTime = Math.floor((Date.now() - startTime) / 1000)
      
      await axios.post(
        `${API_URL}/escape/finish/${attemptId}`,
        { time_taken: totalTime },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      router.push(`/escape-room/results?attempt_id=${attemptId}`)
    } catch (err) {
      console.error('Failed to finish:', err)
    }
  }

  const renderRoom = () => {
    if (!rooms) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading puzzle data...</p>
        </div>
      )
    }

    const roomKey = `room${currentRoom}`
    const roomData = rooms[roomKey] || []

    if (currentRoom === 1) {
      // Definitions Chamber
      const puzzle = Array.isArray(roomData) && roomData.length > 0 ? roomData[0] : null
      
      // Check if puzzle data exists
      if (!puzzle || !puzzle.term || !puzzle.definition) {
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">🏛️ Room 1: Definitions Chamber</h2>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 font-semibold mb-2">Puzzle data not available</p>
              <p className="text-sm text-red-600">
                The escape room puzzle could not be loaded. Please try starting a new escape room.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Debug: roomData length = {Array.isArray(roomData) ? roomData.length : 'not an array'}
              </p>
            </div>
          </div>
        )
      }
      
      const allOptions = [puzzle.definition, ...(puzzle.wrong_options || [])]
      
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🏛️ Room 1: Definitions Chamber</h2>
          <p className="text-lg text-gray-700 mb-6">Match the term to its correct definition</p>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <h3 className="text-2xl font-bold text-purple-600 mb-4">{puzzle.term}</h3>
            <div className="space-y-3">
              {allOptions.length > 0 ? (
                allOptions.map((def, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswer({ selected_definition: def })}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answer.selected_definition === def
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {def}
                  </button>
                ))
              ) : (
                <p className="text-gray-500">No options available</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (currentRoom === 2) {
      // Exception Maze
      const puzzle = roomData[0] || {}
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🌀 Room 2: Exception Maze</h2>
          <p className="text-lg text-gray-700 mb-6">{puzzle.scenario}</p>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <p className="text-gray-700 mb-4">Rule: {puzzle.rule}</p>
            <p className="font-semibold mb-4">Which exception applies?</p>
            <div className="space-y-3">
              {[puzzle.correct_exception, ...(puzzle.wrong_exceptions || [])].map((exc, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer({ selected_exception: exc })}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answer.selected_exception === exc
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {exc}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (currentRoom === 3) {
      // Rule Vault
      const puzzle = roomData[0] || {}
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🔐 Room 3: Rule Vault</h2>
          <p className="text-lg text-gray-700 mb-6">{puzzle.scenario}</p>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <p className="font-semibold mb-4">Select the correct rule:</p>
            <div className="space-y-3">
              {[puzzle.correct_rule, ...(puzzle.wrong_rules || [])].map((rule, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer({ selected_rule: rule })}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answer.selected_rule === rule
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {rule}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (currentRoom === 4) {
      // Violation Repair
      const puzzle = roomData[0] || {}
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🔧 Room 4: Violation Repair Workshop</h2>
          <p className="text-lg text-gray-700 mb-6">{puzzle.scenario}</p>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="font-semibold text-red-800 mb-2">Violation:</p>
              <p className="text-red-700">{puzzle.violation}</p>
            </div>
            <p className="font-semibold mb-2">Fix this violation:</p>
            <textarea
              value={answer.fix || ''}
              onChange={(e) => setAnswer({ fix: e.target.value })}
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              placeholder="Enter the corrected statement..."
            />
          </div>
        </div>
      )
    }

    if (currentRoom === 5) {
      // Master Lock
      const puzzle = roomData || {}
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🔓 Room 5: Final Compliance Master Lock</h2>
          <p className="text-lg text-gray-700 mb-6">{puzzle.scenario}</p>
          
          {/* Definition Question */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
            <h3 className="font-bold mb-3">1. Definition Match</h3>
            <p className="mb-3">Term: {puzzle.definition_question?.term}</p>
            <div className="space-y-2">
              {[puzzle.definition_question?.definition, ...(puzzle.definition_question?.wrong_options || [])].map((def, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer({ ...answer, definition_answer: def })}
                  className={`w-full p-3 text-left rounded-lg border-2 ${
                    answer.definition_answer === def ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  {def}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Question */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
            <h3 className="font-bold mb-3">2. Rule Selection</h3>
            <p className="mb-3">{puzzle.rule_question?.scenario}</p>
            <div className="space-y-2">
              {[puzzle.rule_question?.correct_rule, ...(puzzle.rule_question?.wrong_rules || [])].map((rule, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer({ ...answer, rule_answer: rule })}
                  className={`w-full p-3 text-left rounded-lg border-2 ${
                    answer.rule_answer === rule ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  {rule}
                </button>
              ))}
            </div>
          </div>

          {/* Exception Question */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
            <h3 className="font-bold mb-3">3. Exception Identification</h3>
            <p className="mb-3">{puzzle.exception_question?.scenario}</p>
            <p className="text-sm text-gray-600 mb-3">Rule: {puzzle.exception_question?.rule}</p>
            <div className="space-y-2">
              {[puzzle.exception_question?.correct_exception, ...(puzzle.exception_question?.wrong_exceptions || [])].map((exc, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer({ ...answer, exception_answer: exc })}
                  className={`w-full p-3 text-left rounded-lg border-2 ${
                    answer.exception_answer === exc ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  {exc}
                </button>
              ))}
            </div>
          </div>

          {/* Violation Question */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
            <h3 className="font-bold mb-3">4. Violation Fix</h3>
            <p className="mb-3">{puzzle.violation_question?.scenario}</p>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-3">
              <p className="text-red-700">{puzzle.violation_question?.violation}</p>
            </div>
            <textarea
              value={answer.violation_fix || ''}
              onChange={(e) => setAnswer({ ...answer, violation_fix: e.target.value })}
              className="w-full p-4 border-2 border-gray-200 rounded-lg"
              rows={3}
              placeholder="Enter the fix..."
            />
          </div>
        </div>
      )
    }

    return null
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Timer startTime={startTime} onTimeUpdate={setTimeTaken} />
          <ScoreTracker score={score} showAnimation={result?.correct} />
        </div>

        {/* Room Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((num) => (
            <div
              key={num}
              className={`flex-1 h-2 rounded-full ${
                num < currentRoom ? 'bg-green-500' :
                num === currentRoom ? 'bg-purple-500' :
                'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Room Content */}
        <motion.div
          key={currentRoom}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl"
        >
          {renderRoom()}

          {!submitted && (
            <motion.button
              onClick={handleSubmit}
              disabled={!answer || Object.keys(answer).length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-lg shadow-lg disabled:opacity-50"
            >
              Submit Answer
            </motion.button>
          )}

          {result && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-6 p-6 rounded-xl border-4 ${
                  result.correct ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="text-4xl mb-2">{result.correct ? '✅' : '❌'}</div>
                <h3 className={`text-2xl font-bold mb-2 ${result.correct ? 'text-green-700' : 'text-red-700'}`}>
                  {result.correct ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className="text-gray-700 mb-4">Points: {result.points_earned > 0 ? '+' : ''}{result.points_earned}</p>
                {result.explanation && (
                  <p className="text-gray-600">{result.explanation}</p>
                )}
                <button
                  onClick={currentRoom < 5 ? handleNextRoom : finishEscapeRoom}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold"
                >
                  {currentRoom < 5 ? 'Next Room →' : 'Finish Escape Room'}
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { authService } from '../../services/auth'
import PolicyTapBall from '../../components/PolicyTapBall'
import BallExplosion from '../../components/BallExplosion'
import ConfettiAnimation from '../../components/ConfettiAnimation'
import GameHUD from '../../components/GameHUD'
import QuestionCard from '../../components/QuestionCard'
import { API_URL, BACKEND_URL } from '../../config/api'

const BALL_SPEEDS = {
  beginner: 0.5,  // Slow speed
  intermediate: 1.0,  // Medium speed - faster than beginner
  expert: 1.5  // Fast speed
}

const NUM_OPTIONS = {
  beginner: 3,
  intermediate: 4,
  expert: 5
}

export default function PolicyTapPlayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')
  const gameSetId = searchParams.get('game_set_id')
  
  const [gameData, setGameData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState('beginner')
  const [balls, setBalls] = useState([])
  const [explosions, setExplosions] = useState([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [ballsReachedBottom, setBallsReachedBottom] = useState(new Set())
  const [questionAnswered, setQuestionAnswered] = useState(false)
  const [ballsThatReachedBottom, setBallsThatReachedBottom] = useState(new Set())
  
  const gameAreaRef = useRef(null)
  const ballSpawnIntervalRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const ballsRef = useRef([])
  const missedQuestionTimeoutRef = useRef(null)
  const submittingQuestionRef = useRef(new Set()) // Track which questions are being submitted
  const timerExpiredRef = useRef(false) // Track if timer has already expired for current question

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    if (attemptId) {
      fetchGameData()
    }
  }, [attemptId])

  useEffect(() => {
    if (gameStarted && !gameEnded && currentQuestionIndex < (gameData?.questions?.length || 0)) {
      startQuestion()
    }
  }, [gameStarted, currentQuestionIndex, gameData])

  useEffect(() => {
    return () => {
      if (ballSpawnIntervalRef.current) {
        clearInterval(ballSpawnIntervalRef.current)
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  const fetchGameData = async () => {
    try {
      const token = authService.getAuthToken()
      
      if (!gameSetId) {
        alert('Game set ID missing. Please start the game again.')
        router.push('/policy-tap')
        return
      }

      // Get game set data without creating a new attempt
      // The attempt was already created in the level-select page
      const gameSetResponse = await axios.get(
        `${API_URL}/policy-tap/game-set/${gameSetId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!gameSetResponse.data.questions || gameSetResponse.data.questions.length === 0) {
        throw new Error('No questions found in game data')
      }
      
      // Set game data with attempt_id from URL
      setGameData({
        ...gameSetResponse.data,
        attempt_id: attemptId
      })
      setLevel(gameSetResponse.data.level)
      setGameStarted(true)
      setStartTime(Date.now())
    } catch (err) {
      console.error('Failed to fetch game data:', err)
      console.error('Error details:', err.response?.data)
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error'
      alert(`Failed to load game: ${errorMsg}. Please try again.`)
      router.push('/policy-tap')
    }
  }

  const startQuestion = () => {
    if (!gameData || !gameData.questions || currentQuestionIndex >= gameData.questions.length) {
      finishGame()
      return
    }

    const question = gameData.questions[currentQuestionIndex]
    if (!question || !question.question || !question.correct) {
      console.error('Question not found or invalid at index:', currentQuestionIndex)
      finishGame()
      return
    }
    const allOptions = [question.correct, ...(question.wrong_options || [])]
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)
    
    setBalls([])
    ballsRef.current = []
    setExplosions([])
    setShowConfetti(false)
    setBallsReachedBottom(new Set())
    setBallsThatReachedBottom(new Set())
    setQuestionAnswered(false)
    
    // Clear any pending missed question timeout
    if (missedQuestionTimeoutRef.current) {
      clearTimeout(missedQuestionTimeoutRef.current)
      missedQuestionTimeoutRef.current = null
    }
    
    // Clear submitting flag for previous question when starting new question
    // (Keep current question's flag if it exists to prevent race conditions)
    
    // Clear any existing timer first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    
    // Set timer for expert level only - start after balls begin spawning
    if (level === 'expert') {
      // Calculate when all balls will be spawned (last ball spawn time)
      const numBalls = Math.min(NUM_OPTIONS[level] || 5, shuffledOptions.length)
      const spawnDelay = 200
      const lastBallSpawnTime = (numBalls - 1) * spawnDelay
      
      // Start timer after all balls have spawned, giving user time to see and click
      setTimeout(() => {
        // Double-check that question hasn't been answered and balls have spawned
        if (!questionAnswered && !gameEnded && ballsRef.current.length > 0) {
          setTimeRemaining(5)
          let currentTime = 5
          
          timerIntervalRef.current = setInterval(() => {
            // Early exit checks - prevent timer from running if question already answered
            if (questionAnswered || gameEnded || submittingQuestionRef.current.has(currentQuestionIndex) || timerExpiredRef.current) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current)
                timerIntervalRef.current = null
              }
              return
            }
            
            currentTime -= 1
            setTimeRemaining(currentTime)
            
            // Timer expired - handle missed question
            if (currentTime <= 0) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current)
                timerIntervalRef.current = null
              }
              
              // Only handle missed if question still hasn't been answered and timer hasn't already expired
              if (!questionAnswered && !gameEnded && !submittingQuestionRef.current.has(currentQuestionIndex) && !timerExpiredRef.current) {
                timerExpiredRef.current = true // Mark timer as expired to prevent multiple triggers
                console.log('Expert timer expired - handling missed question for question', currentQuestionIndex)
                // Use setTimeout to ensure this only runs once
                setTimeout(() => {
                  if (!questionAnswered && !gameEnded && !submittingQuestionRef.current.has(currentQuestionIndex)) {
                    handleMissedCorrect()
                  }
                }, 100)
              }
            }
          }, 1000)
        } else {
          // If balls haven't spawned or question already answered, don't start timer
          console.log('Expert timer not started - questionAnswered:', questionAnswered, 'balls:', ballsRef.current.length)
        }
      }, lastBallSpawnTime + 500) // Wait for balls to spawn + 500ms buffer
    } else {
      // Clear timer for non-expert levels
      setTimeRemaining(null)
    }

    // Spawn balls with better spacing to prevent overlapping
    const speed = BALL_SPEEDS[level] || 1.0
    const numOptions = NUM_OPTIONS[level] || 3
    
    // Ensure we have enough options for the level
    if (shuffledOptions.length < numOptions) {
      console.warn(`Not enough options for ${level} level. Need ${numOptions}, have ${shuffledOptions.length}`)
    }
    
    const optionsToShow = shuffledOptions.slice(0, Math.min(numOptions, shuffledOptions.length))
    
    // Calculate spacing to prevent overlap
    // Each ball is ~130px wide (min-w-[130px]), distribute evenly with proper gaps
    const numBalls = optionsToShow.length
    const marginPercent = 10 // 10% margin on each side for better spacing
    const availableWidth = 100 - (marginPercent * 2)
    // Use wider spacing - divide by (numBalls + 1) to create gaps between balls
    // For expert level with 5 balls, this ensures proper spacing
    const spacing = availableWidth / (numBalls + 1)
    
    // Spawn delay based on level - expert spawns faster but with more delay between balls
    const spawnDelay = level === 'beginner' ? 500 : level === 'intermediate' ? 350 : level === 'expert' ? 300 : 250
    
    optionsToShow.forEach((option, index) => {
      setTimeout(() => {
        const isCorrect = option === question.correct
        // Calculate x position: start from margin, then distribute with spacing gaps
        // Use (index + 1) to create gaps between balls, not overlapping
        const xPosition = marginPercent + (spacing * (index + 1))
        
        const newBall = {
          id: `ball-${Date.now()}-${index}-${Math.random()}`,
          option,
          isCorrect,
          speed,
          xPosition,
          spawnTime: Date.now(),
          spawnIndex: index // Track spawn order for z-index
        }
        setBalls(prev => {
          const updated = [...prev, newBall]
          ballsRef.current = updated
          return updated
        })
      }, index * spawnDelay)
    })
  }

  const handleBallTap = async (option, isCorrect) => {
    // Prevent multiple taps
    if (gameEnded || questionAnswered) {
      console.log('Game ended or question already answered')
      return
    }
    
    // Safety check
    if (!gameData?.questions?.[currentQuestionIndex]) {
      console.error('Question not available')
      return
    }
    
    console.log('handleBallTap called:', option, isCorrect)
    setQuestionAnswered(true)
    
    // Clear timer when user answers (especially important for expert level)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setTimeRemaining(null)
    }

    const question = gameData.questions[currentQuestionIndex]
    const timeTaken = (Date.now() - (startTime || Date.now())) / 1000

    // Get the clicked ball's position from the event or find it
    let explosionPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    
    // Try to find the ball element - use more specific selector
    const ballElements = document.querySelectorAll(`[data-ball-option="${option}"]`)
    if (ballElements.length > 0) {
      // Get the first visible ball (in case of duplicates)
      const ballElement = Array.from(ballElements).find(el => {
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight
      }) || ballElements[0]
      
      if (ballElement) {
        const rect = ballElement.getBoundingClientRect()
        explosionPosition = { 
          x: rect.left + rect.width / 2, 
          y: rect.top + rect.height / 2 
        }
      }
    }

    // Show explosion immediately
    setExplosions(prev => [...prev, {
      id: `explosion-${Date.now()}-${Math.random()}`,
      isCorrect,
      position: explosionPosition
    }])

    if (isCorrect) {
      setShowConfetti(true)
    }

      // Remove all balls after a delay to show explosion animation
      setTimeout(() => {
        setBalls([])
        ballsRef.current = []
      }, 300)
      
      // Clear any pending missed question timeout since user answered
      if (missedQuestionTimeoutRef.current) {
        clearTimeout(missedQuestionTimeoutRef.current)
        missedQuestionTimeoutRef.current = null
      }

    // Submit answer
    try {
      const token = authService.getAuthToken()
      const response = await axios.post(
        `${API_URL}/policy-tap/submit`,
        {
          attempt_id: attemptId,
          question_index: currentQuestionIndex,
          selected_option: option,
          time_taken: timeTaken,
          was_missed: false
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      setScore(response.data.new_score)

      // Clear explosions after animation completes
      setTimeout(() => {
        setExplosions([])
        setShowConfetti(false)
      }, 2000)

      // Smooth transition to next question
      setTimeout(() => {
        if (gameEnded) return // Don't advance if game already ended
        
        // Clear all balls and explosions before moving to next question
        setBalls([])
        ballsRef.current = []
        setExplosions([])
        
        // Small delay for smooth transition
        setTimeout(() => {
          if (gameEnded) return
          
          // Clear submitting flag when moving to next question
          submittingQuestionRef.current.delete(currentQuestionIndex)
          
          if (currentQuestionIndex + 1 < gameData.questions.length) {
            setCurrentQuestionIndex(prev => prev + 1)
          } else {
            finishGame()
          }
        }, 300)
      }, 2000)
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const handleBallReachedBottom = (isCorrect, ballId) => {
    if (questionAnswered || gameEnded) return
    
    // Clear any existing timeout
    if (missedQuestionTimeoutRef.current) {
      clearTimeout(missedQuestionTimeoutRef.current)
      missedQuestionTimeoutRef.current = null
    }
    
    // Track which specific ball reached bottom
    setBallsThatReachedBottom(prev => {
      const newSet = new Set(prev)
      newSet.add(ballId || 'ball-' + Date.now())
      
      // Use ref to get current balls count (avoids closure issue)
      const currentBallsCount = ballsRef.current.length
      const reachedCount = newSet.size
      
      // If all balls have reached bottom and user hasn't answered, restart the balls
      if (reachedCount >= currentBallsCount && currentBallsCount > 0 && !questionAnswered) {
        // Wait a moment, then restart balls falling for the same question
        missedQuestionTimeoutRef.current = setTimeout(() => {
          if (questionAnswered || gameEnded) return
          
          // Clear the reached bottom tracking
          setBallsThatReachedBottom(new Set())
          
          // Restart balls for the current question (don't advance to next question)
          console.log('All balls reached bottom, restarting for same question...')
          startQuestion()
        }, 1000) // Wait 1 second before restarting
      }
      
      return newSet
    })
  }

  const handleMissedQuestion = async () => {
    if (questionAnswered || gameEnded) {
      console.log('handleMissedQuestion skipped - already answered or game ended')
      return
    }
    
    // Prevent duplicate submissions for the same question
    if (submittingQuestionRef.current.has(currentQuestionIndex)) {
      console.log(`Question ${currentQuestionIndex} already being submitted, skipping`)
      return
    }
    
    // Safety check
    if (!gameData?.questions?.[currentQuestionIndex]) {
      console.error('Question not available')
      return
    }
    
    // Mark this question as being submitted
    submittingQuestionRef.current.add(currentQuestionIndex)
    setQuestionAnswered(true)
    
    const question = gameData.questions[currentQuestionIndex]
    const timeTaken = (Date.now() - (startTime || Date.now())) / 1000

    try {
      const token = authService.getAuthToken()
      console.log(`Submitting missed answer for question ${currentQuestionIndex}`)
      
      const response = await axios.post(
        `${API_URL}/policy-tap/submit`,
        {
          attempt_id: attemptId,
          question_index: currentQuestionIndex,
          selected_option: '',
          time_taken: timeTaken,
          was_missed: true
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      console.log(`Question ${currentQuestionIndex} submitted successfully, new score:`, response.data.new_score)
      setScore(response.data.new_score)

      // Smooth transition to next question
      setTimeout(() => {
        if (gameEnded) return // Don't advance if game already ended
        
        // Clear all balls before moving to next question
        setBalls([])
        ballsRef.current = []
        setExplosions([])
        
        // Clear submitting flag when moving to next question
        submittingQuestionRef.current.delete(currentQuestionIndex)
        
        // Small delay for smooth transition
        setTimeout(() => {
          if (gameEnded) return
          
          if (currentQuestionIndex + 1 < gameData.questions.length) {
            setCurrentQuestionIndex(prev => prev + 1)
          } else {
            finishGame()
          }
        }, 300)
      }, 2000)
    } catch (err) {
      console.error('Failed to submit missed answer:', err)
    }
  }

  const handleMissedCorrect = async () => {
    // Only handle missed if question hasn't been answered and game hasn't ended
    if (questionAnswered || gameEnded) {
      console.log('handleMissedCorrect skipped - questionAnswered:', questionAnswered, 'gameEnded:', gameEnded)
      return
    }
    
    // Prevent duplicate calls - check if already submitting
    if (submittingQuestionRef.current.has(currentQuestionIndex)) {
      console.log('handleMissedCorrect skipped - already submitting question', currentQuestionIndex)
      return
    }
    
    // Prevent if timer already expired (double check)
    if (timerExpiredRef.current) {
      console.log('handleMissedCorrect skipped - timer already expired for question', currentQuestionIndex)
      return
    }
    
    console.log('handleMissedCorrect called - submitting missed answer for question', currentQuestionIndex)
    handleMissedQuestion()
  }

  const finishGame = async () => {
    if (gameEnded) return // Prevent multiple calls
    
    console.log('finishGame called')
    setGameEnded(true)
    setQuestionAnswered(true) // Prevent any further interactions
    
    // Clear all intervals and timeouts
    if (ballSpawnIntervalRef.current) {
      clearInterval(ballSpawnIntervalRef.current)
      ballSpawnIntervalRef.current = null
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (missedQuestionTimeoutRef.current) {
      clearTimeout(missedQuestionTimeoutRef.current)
      missedQuestionTimeoutRef.current = null
    }

    const totalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000)
    
    try {
      const token = authService.getAuthToken()
      console.log('Finishing game with attempt_id:', attemptId, 'totalTime:', totalTime, 'currentScore:', score)
      
      const response = await axios.post(
        `${API_URL}/policy-tap/finish`,
        {
          attempt_id: attemptId,
          final_time_taken: totalTime
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      console.log('Game finished successfully, response:', response.data)
      
      // Store results data in sessionStorage to pass to results page
      if (response.data) {
        const resultsData = {
          final_score: response.data.final_score || score,
          correct_answers: response.data.correct_answers || 0,
          wrong_answers: response.data.wrong_answers || 0,
          missed_answers: response.data.missed_answers || 0,
          time_taken: response.data.time_taken || totalTime
        }
        console.log('Storing results in sessionStorage:', resultsData)
        sessionStorage.setItem('policyTapResults', JSON.stringify(resultsData))
      } else {
        // Fallback: use current score if API doesn't return data
        console.warn('API response missing data, using current score:', score)
        sessionStorage.setItem('policyTapResults', JSON.stringify({
          final_score: score,
          correct_answers: 0,
          wrong_answers: 0,
          missed_answers: 0,
          time_taken: totalTime
        }))
      }
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.push(`/policy-tap/results?attempt_id=${attemptId}`)
      }, 500)
    } catch (err) {
      console.error('Failed to finish game:', err)
      // Store current score as fallback
      sessionStorage.setItem('fallingBallsResults', JSON.stringify({
        final_score: score,
        correct_answers: 0,
        wrong_answers: 0,
        missed_answers: 0,
        time_taken: Math.floor((Date.now() - (startTime || Date.now())) / 1000)
      }))
      // Still redirect even if API call fails
      setTimeout(() => {
        router.push(`/policy-tap/results?attempt_id=${attemptId}`)
      }, 500)
    }
  }

  if (!gameData || !gameStarted) {
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

  // Safety check for current question
  if (!gameData || !gameData.questions || currentQuestionIndex >= gameData.questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-xl text-gray-700 mb-4">Loading question...</p>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"
          />
        </motion.div>
      </div>
    )
  }

  const currentQuestion = gameData.questions[currentQuestionIndex]
  
  if (!currentQuestion || !currentQuestion.question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-xl text-gray-700 mb-4">Question not found. Redirecting...</p>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"
          />
        </motion.div>
      </div>
    )
  }

  const handleBack = () => {
    // Confirm before leaving if game is in progress
    if (gameStarted && !gameEnded) {
      if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
        router.push('/policy-tap')
      }
    } else {
      router.push('/policy-tap')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
      {/* Top Navigation Bar with Back Button and Admin Login */}
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={handleBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Back</span>
              </motion.button>
              <Link 
                href="/games" 
                className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                PolicyPlay
              </Link>
            </div>
            <div className="flex items-center gap-4">
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

      {/* Game HUD */}
      <div className="pt-16">
        <GameHUD
          score={score}
          currentQuestion={currentQuestionIndex}
          totalQuestions={gameData.questions?.length || 0}
          timeRemaining={timeRemaining}
          level={level}
        />
      </div>

      {/* Main Game Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6">
        {/* Question Card */}
        <div className="mb-4">
          <QuestionCard question={currentQuestion && currentQuestion.question ? currentQuestion.question : 'Loading question...'} />
        </div>

        {/* Game Area */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-200/50">
          <div
            ref={gameAreaRef}
            className="relative bg-gradient-to-b from-purple-50/50 to-pink-50/50 overflow-hidden"
            style={{ height: 'calc(100vh - 280px)', minHeight: '500px', maxHeight: '700px' }}
          >
            {/* Game Instructions Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md border border-purple-200">
                <p className="text-sm text-gray-700 text-center font-medium">
                  🎯 Tap the correct option ball to select your answer
                </p>
              </div>
            </div>

            <AnimatePresence>
              {balls.map((ball, index) => (
                <PolicyTapBall
                  key={ball.id}
                  option={ball.option}
                  isCorrect={ball.isCorrect}
                  onTap={handleBallTap}
                  speed={ball.speed}
                  xPosition={ball.xPosition}
                  hasReachedBottom={false}
                  onReachBottom={(isCorrect) => {
                    handleBallReachedBottom(isCorrect, ball.id)
                  }}
                  gameAreaHeight={gameAreaRef.current?.offsetHeight || null}
                  zIndex={20 + (ball.spawnIndex !== undefined ? ball.spawnIndex : index)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Explosions rendered outside game area for better visibility */}
        <AnimatePresence mode="popLayout">
          {explosions.map((explosion) => (
            <BallExplosion
              key={explosion.id}
              isCorrect={explosion.isCorrect}
              position={explosion.position}
            />
          ))}
        </AnimatePresence>

        <ConfettiAnimation trigger={showConfetti} />
      </div>
    </div>
  )
}


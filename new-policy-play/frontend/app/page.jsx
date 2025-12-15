'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  }

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10,
      },
    },
    tap: { scale: 0.95 },
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 relative overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                PolicyPlay
              </span>
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-16 pb-12 px-4">
        <motion.div
          className="text-center space-y-6 relative z-10 max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4"
            >
              PolicyPlay
            </motion.h1>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-xl sm:text-2xl md:text-3xl text-gray-800 font-semibold"
          >
            AI-Powered Policy Document Analyzer & Learning Platform
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg"
          >
            Learn policies through interactive games. Upload, analyze, and master policy documents with AI-powered insights.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-12"
          >
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform"
              >
                🎮 User Login
              </Link>
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform"
              >
                ✨ Sign Up
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto"
          >
            {[
              { icon: '📚', title: 'Learn', desc: 'Interactive policy games' },
              { icon: '🤖', title: 'AI-Powered', desc: 'Smart document analysis' },
              { icon: '📊', title: 'Track Progress', desc: 'Monitor your learning' },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}

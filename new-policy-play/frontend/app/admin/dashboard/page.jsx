'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

const ADMIN_API_URL = `${API_URL}/admin`

export default function AdminDashboard() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState(null)
  const [userScores, setUserScores] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUserScores, setShowUserScores] = useState(false)

  useEffect(() => {
    if (!authService.isAdmin()) {
      router.push('/admin/login')
      return
    }

    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${ADMIN_API_URL}/analytics/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setAnalytics(response.data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserScores = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${ADMIN_API_URL}/users/scores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setUserScores(response.data)
      setShowUserScores(true)
    } catch (err) {
      console.error('Failed to fetch user scores:', err)
      alert('Failed to load user scores')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="space-x-4">
            <Link href="/admin/upload" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Upload Policy
            </Link>
            <button
              onClick={() => {
                authService.logout()
                router.push('/')
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{analytics?.total_users || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 mb-2">Total Policies</h3>
            <p className="text-3xl font-bold text-gray-900">{analytics?.total_policies || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 mb-2">Game Plays</h3>
            <p className="text-3xl font-bold text-gray-900">{analytics?.total_game_plays || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold text-gray-900">{analytics?.completion_rate || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Average Score</h2>
            <p className="text-4xl font-bold text-purple-600">{analytics?.average_score || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Most Violated Rules</h2>
            <ul className="space-y-2">
              {analytics?.most_violated_rules?.length > 0 ? (
                analytics.most_violated_rules.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-gray-700 text-sm">{item.rule}</span>
                    <span className="font-semibold text-red-600">{item.violations}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No data available</li>
              )}
            </ul>
          </div>
        </div>

        {/* Most Confusing Policy Section */}
        {analytics?.most_confusing_policy && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4 text-orange-600">Most Confusing Policy for Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{analytics.most_confusing_policy.title}</p>
                <p className="text-sm text-gray-600">Policy ID: {analytics.most_confusing_policy.policy_id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Confusion Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.most_confusing_policy.confusion_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.most_confusing_policy.average_score)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Scores</p>
                  <p className="text-xl font-semibold text-red-600">{analytics.most_confusing_policy.low_scores}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Attempts</p>
                  <p className="text-xl font-semibold text-gray-900">{analytics.most_confusing_policy.total_attempts}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Most Confusing Sections */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Most Confusing Policy Sections</h2>
          <ul className="space-y-2">
            {analytics?.most_confusing_sections?.length > 0 ? (
              analytics.most_confusing_sections.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-gray-700 text-sm flex-1">{item.section}</span>
                  <span className="font-semibold text-orange-600 ml-4">{item.low_scores} low scores</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No confusing sections identified yet</li>
            )}
          </ul>
        </div>

        {/* User Scores Section */}
        <div className="mt-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">User Scores & Performance</h2>
            <button
              onClick={fetchUserScores}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {showUserScores ? 'Refresh Scores' : 'View User Scores'}
            </button>
          </div>

          {showUserScores && userScores && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Highest Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userScores.users.map((user, index) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.user_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.completed_games} / {user.total_games}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {user.average_score.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {user.highest_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            user.accuracy >= 80 ? 'text-green-600' : user.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {user.accuracy.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userScores.users.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No user scores available yet
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex space-x-4">
          <Link href="/admin/policies" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            View All Policies
          </Link>
          <Link href="/admin/analytics" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Detailed Analytics
          </Link>
        </div>
      </div>
    </div>
  )
}


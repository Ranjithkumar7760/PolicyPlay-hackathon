'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

const ADMIN_API_URL = `${API_URL}/admin`

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState(null)
  const [policies, setPolicies] = useState([])
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [policyAnalytics, setPolicyAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAdmin()) {
      router.push('/admin/login')
      return
    }
    fetchAnalytics()
    fetchPolicies()
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

  const fetchPolicies = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${ADMIN_API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicies(response.data)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
    }
  }

  const fetchPolicyAnalytics = async (policyId) => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${ADMIN_API_URL}/analytics/policy/${policyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicyAnalytics(response.data)
      setSelectedPolicy(policyId)
    } catch (err) {
      console.error('Failed to fetch policy analytics:', err)
      alert('Failed to load policy analytics')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
          <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-800">
            ← Dashboard
          </Link>
        </div>

        {/* Overall Analytics */}
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

        {/* Most Confusing Policy */}
        {analytics?.most_confusing_policy && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">⚠️ Most Confusing Policy for Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Policy Title</p>
                <p className="text-lg font-semibold text-gray-900">{analytics.most_confusing_policy.title}</p>
                <p className="text-xs text-gray-500 mt-1">ID: {analytics.most_confusing_policy.policy_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Confusion Rate</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.most_confusing_policy.confusion_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.most_confusing_policy.low_scores} out of {analytics.most_confusing_policy.total_attempts} attempts scored below 50</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(analytics.most_confusing_policy.average_score)}</p>
                <p className="text-xs text-gray-500 mt-1">Based on {analytics.most_confusing_policy.total_attempts} completed games</p>
              </div>
            </div>
            <button
              onClick={() => fetchPolicyAnalytics(analytics.most_confusing_policy.policy_id)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              View Detailed Analytics
            </button>
          </div>
        )}

        {/* Most Violated Rules */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Most Violated Rules</h2>
          <div className="space-y-3">
            {analytics?.most_violated_rules?.length > 0 ? (
              analytics.most_violated_rules.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-gray-700 flex-1">{item.rule}</span>
                  <span className="font-semibold text-red-600 ml-4">{item.violations} violations</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No violation data available</p>
            )}
          </div>
        </div>

        {/* Most Confusing Sections */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Most Confusing Policy Sections</h2>
          <div className="space-y-3">
            {analytics?.most_confusing_sections?.length > 0 ? (
              analytics.most_confusing_sections.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-gray-700 flex-1 text-sm">{item.section}</span>
                  <span className="font-semibold text-orange-600 ml-4">{item.low_scores} low scores</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No confusing sections identified yet</p>
            )}
          </div>
        </div>

        {/* Policy Selection for Detailed Analytics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">View Policy-Specific Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {policies.map((policy) => (
              <button
                key={policy.policyId}
                onClick={() => fetchPolicyAnalytics(policy.policyId)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedPolicy === policy.policyId
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{policy.title || 'Untitled'}</p>
                <p className="text-sm text-gray-600">{policy.rules_count} rules</p>
              </button>
            ))}
          </div>

          {policyAnalytics && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Analytics for: {policyAnalytics.policy_title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Total Plays</p>
                  <p className="text-2xl font-bold">{policyAnalytics.total_plays}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Plays</p>
                  <p className="text-2xl font-bold">{policyAnalytics.completed_plays}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold">{policyAnalytics.average_score}</p>
                </div>
              </div>
              {policyAnalytics.most_confusing_sections?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Most Confusing Sections:</p>
                  <ul className="space-y-1">
                    {policyAnalytics.most_confusing_sections.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        • {item.section} ({item.low_scores} low scores)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


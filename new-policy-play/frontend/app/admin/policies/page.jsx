'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

const ADMIN_API_URL = `${API_URL}/admin`

export default function AdminPoliciesPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingPolicy, setDeletingPolicy] = useState(null)

  useEffect(() => {
    if (!authService.isAdmin()) {
      router.push('/admin/login')
      return
    }
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const token = authService.getAuthToken()
      const response = await axios.get(`${ADMIN_API_URL}/policies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPolicies(response.data)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePolicy = async (policyId, policyTitle) => {
    if (!confirm(`Are you sure you want to delete "${policyTitle}"?\n\nThis will also delete all related game sessions. This action cannot be undone.`)) {
      return
    }

    setDeletingPolicy(policyId)
    try {
      const token = authService.getAuthToken()
      await axios.delete(`${ADMIN_API_URL}/policies/${policyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      // Remove the policy from the list
      setPolicies(policies.filter(p => p.policyId !== policyId))
      alert('Policy deleted successfully!')
    } catch (err) {
      console.error('Failed to delete policy:', err)
      alert('Failed to delete policy: ' + (err.response?.data?.detail || err.message))
    } finally {
      setDeletingPolicy(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">All Policies</h1>
          <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-800">
            ← Dashboard
          </Link>
        </div>

        {policies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No policies uploaded yet.</p>
            <Link href="/admin/upload" className="mt-4 inline-block text-purple-600 hover:text-purple-800">
              Upload your first policy →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rules</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy.policyId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.title || 'Untitled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.uploaded_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.rules_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(policy.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDeletePolicy(policy.policyId, policy.title || 'Untitled')}
                      disabled={deletingPolicy === policy.policyId}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {deletingPolicy === policy.policyId ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}


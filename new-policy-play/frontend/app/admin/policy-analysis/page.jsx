'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { authService } from '../../services/auth'
import { API_URL } from '../../config/api'

const ANALYZE_API_URL = `${API_URL.replace('/api', '')}/api/policy/analyze`

export default function PolicyAnalysisPage() {
  const router = useRouter()
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (typeof window !== 'undefined' && !authService.isAdmin()) {
    router.push('/admin/login')
    return null
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!draftText.trim()) {
      setError('Please enter policy draft text')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const token = authService.getAuthToken()
      const response = await axios.post(
        ANALYZE_API_URL,
        {
          draft_text: draftText,
          draft_title: draftTitle || 'Draft Policy'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">Policy Analysis</h1>
          <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-800">
            ← Dashboard
          </Link>
        </div>

        <form onSubmit={handleAnalyze} className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Policy Title (Optional)
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter policy title"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Policy Draft Text
            </label>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={15}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Paste your policy draft text here..."
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? 'Analyzing...' : 'Analyze Policy'}
          </button>
        </form>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold">Analysis Results</h2>

            {result.contradictions && result.contradictions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-2">Contradictions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.contradictions.map((item, idx) => (
                    <li key={idx} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.missing_sections && result.missing_sections.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">Missing Sections</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.missing_sections.map((item, idx) => (
                    <li key={idx} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.overlapping_content && result.overlapping_content.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Overlapping Content</h3>
                <ul className="space-y-2">
                  {result.overlapping_content.map((item, idx) => (
                    <li key={idx} className="text-gray-700">
                      <strong>{item.existing_policy}:</strong> {item.overlap_description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.ambiguous_phrases && result.ambiguous_phrases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-orange-600 mb-2">Ambiguous Phrases</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.ambiguous_phrases.map((item, idx) => (
                    <li key={idx} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">Recommendations</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.recommendations.map((item, idx) => (
                    <li key={idx} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


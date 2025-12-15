'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { authService } from '../../services/auth'
import Link from 'next/link'
import { API_URL, BACKEND_URL } from '../../config/api'

const UPLOAD_API_URL = `${API_URL}/policy/upload`

export default function AdminUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Check admin auth
  if (typeof window !== 'undefined' && !authService.isAdmin()) {
    router.push('/admin/login')
    return null
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check authentication
      const token = authService.getAuthToken()
      if (!token) {
        setError('Not authenticated. Please login as admin.')
        router.push('/admin/login')
        return
      }

      // Check if user is admin
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        setError('Admin access required. Please login as admin.')
        router.push('/admin/login')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file:', file.name)
      console.log('Token present:', !!token)

      const response = await axios.post(UPLOAD_API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000
      })

      console.log('Upload successful:', response.data)
      setResult(response.data)
      setFile(null)
    } catch (err) {
      console.error('Upload error:', err)
      console.error('Error response:', err.response)
      
      if (err.response) {
        // Server responded with error
        if (err.response.status === 401) {
          setError('Authentication failed. Please login again.')
          authService.logout()
          router.push('/admin/login')
        } else if (err.response.status === 403) {
          setError('Admin access required. Please login as admin.')
          router.push('/admin/login')
        } else {
          setError(err.response.data?.detail || `Upload failed: ${err.response.status} ${err.response.statusText}`)
        }
      } else if (err.request) {
        // Request made but no response
        setError(`Cannot connect to backend. Make sure backend is running on ${BACKEND_URL}`)
      } else {
        // Error setting up request
        setError(`Upload failed: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return null
    }
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{label}</h3>
        {Array.isArray(value) ? (
          <ul className="list-disc list-inside space-y-1">
            {value.map((item, index) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-700">{value}</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Policy Upload</h1>
            <p className="text-gray-600">Upload and extract policy documents</p>
          </div>
          <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-800">
            ← Dashboard
          </Link>
        </div>

        {!result && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                disabled={loading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <p className="text-gray-600 mb-2">
                  <span className="text-purple-600 font-semibold">Click to upload</span> PDF or DOCX
                </p>
                {file && <p className="text-sm text-gray-500">{file.name}</p>}
              </label>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`mt-6 w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                !file || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {loading ? 'Processing...' : 'Upload and Extract'}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Extracted Policy Data</h2>
              <button
                onClick={() => {
                  setResult(null)
                  setFile(null)
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Upload Another
              </button>
            </div>

            <div className="space-y-6">
              {formatField('Title', result.title)}
              {formatField('Summary', result.summary)}
              {formatField('Rules', result.rules)}
              {formatField('Roles', result.roles)}
              {formatField('Clauses', result.clauses)}
              {formatField('Definitions', result.definitions)}
              {formatField('Exceptions', result.exceptions)}
              {formatField('Risks', result.risks)}
              {formatField('Policy Sections', result.policy_sections)}
              
              {result.raw_text && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Raw Text</h3>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {result.raw_text}
                    </pre>
                  </div>
                </div>
              )}

              <details className="mt-6">
                <summary className="cursor-pointer text-lg font-semibold text-gray-800 mb-2">
                  View Raw JSON
                </summary>
                <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto mt-2">
                  <pre className="text-sm text-green-400">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


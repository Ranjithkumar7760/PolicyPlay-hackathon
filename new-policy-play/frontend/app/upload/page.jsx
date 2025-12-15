'use client'

import { useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { API_URL } from '../config/api'

const UPLOAD_API_URL = `${API_URL}/policy/upload`

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    const allowedExtensions = ['pdf', 'docx', 'doc']
    
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase()
    
    if (!allowedExtensions.includes(fileExtension)) {
      setError('Only PDF and DOCX files are allowed')
      return
    }
    
    setFile(selectedFile)
    setError(null)
    setResult(null)
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(UPLOAD_API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for large files
      })

      setResult(response.data)
      setFile(null)
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'Failed to upload file')
      } else if (err.request) {
        setError('Network error. Please check if the backend server is running.')
      } else {
        setError(err.message || 'An unexpected error occurred')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Policy Document</h1>
          <p className="text-gray-600">Upload a PDF or DOCX file to extract structured policy information</p>
        </div>

        {/* Upload Section */}
        {!result && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                disabled={loading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-600 mb-2">
                  <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500">PDF or DOCX (MAX. 10MB)</p>
              </label>
            </div>

            {file && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className="w-8 h-8 text-blue-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-600 hover:text-red-800"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

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
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Upload and Process'
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Structured Policy Data</h2>
              <button
                onClick={() => {
                  setResult(null)
                  setFile(null)
                  setError(null)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

              {/* JSON View */}
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

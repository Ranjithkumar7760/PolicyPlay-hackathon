import './globals.css'

export const metadata = {
  title: 'PolicyPlay - Policy Document Analyzer',
  description: 'Upload and analyze policy documents with AI-powered structuring',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


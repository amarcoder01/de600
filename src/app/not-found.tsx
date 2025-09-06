'use client'

import React from 'react'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Page not found</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>The page you are looking for does not exist.</p>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Go back home</a>
      </div>
    </div>
  )
}

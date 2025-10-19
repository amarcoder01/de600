'use client'

import React from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: 680, width: '100%' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>An unexpected error occurred while rendering this page.</p>
        {error?.message && (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#111827', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error.message}</pre>
        )}
        {error?.digest && (
          <p style={{ fontSize: 12, opacity: 0.7 }}>Error digest: {error.digest}</p>
        )}
        <button onClick={() => reset()} style={{ marginTop: 16, background: '#2563eb', border: 0, color: 'white', padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  )
}

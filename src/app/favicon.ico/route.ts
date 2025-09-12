import { NextResponse } from 'next/server'

// Serve an empty favicon to prevent Next.js build errors when /favicon.ico is requested
// This avoids the "Invalid revalidate value" error by making the route static and non-revalidated.
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  // Return 404 for favicon to avoid 204 status code issues
  return new NextResponse(null, {
    status: 404,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400'
    }
  })
}

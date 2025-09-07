import { NextResponse } from 'next/server'

// Serve an empty favicon to prevent Next.js build errors when /favicon.ico is requested
// This avoids the "Invalid revalidate value" error by making the route static and non-revalidated.
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  // 204 No Content is acceptable for favicon if you don't want to ship an icon yet
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400'
    }
  })
}

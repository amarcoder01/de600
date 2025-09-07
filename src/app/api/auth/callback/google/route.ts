import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // This route is handled by middleware
  // The middleware will set JWT tokens and redirect to dashboard
  console.log('🔐 Google OAuth callback route - handled by middleware')
  return NextResponse.next()
}

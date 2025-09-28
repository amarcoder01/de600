import { NextRequest } from 'next/server'

/**
 * Resolve the canonical base URL for generating absolute links.
 * Priority:
 * 1) Explicit env: NEXT_PUBLIC_BASE_URL, SITE_URL, APP_URL
 * 2) Platform envs: VERCEL_URL, NEXT_PUBLIC_VERCEL_URL, RENDER_EXTERNAL_URL, RENDER_EXTERNAL_HOSTNAME
 * 3) Request headers: x-forwarded-proto + x-forwarded-host/host
 * 4) Fallback: http://localhost:3000
 */
export function resolveBaseUrl(request?: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL || process.env.APP_URL
  if (explicit) return stripTrailingSlash(explicit)

  const vercel = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercel) return `https://${stripTrailingSlash(vercel)}`

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL
  if (renderExternalUrl) return stripTrailingSlash(renderExternalUrl)

  const renderHostname = process.env.RENDER_EXTERNAL_HOSTNAME
  if (renderHostname) return `https://${stripTrailingSlash(renderHostname)}`

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = request.headers.get('host')
    const proto = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const finalHost = forwardedHost || host
    if (finalHost) {
      return `${proto}://${stripTrailingSlash(finalHost)}`
    }
    try {
      // nextUrl.origin is reliable on Next.js runtimes
      const origin = request.nextUrl?.origin
      if (origin) return stripTrailingSlash(origin)
    } catch (_) {}
  }

  return 'http://localhost:3000'
}

function stripTrailingSlash(input: string): string {
  return input.endsWith('/') ? input.slice(0, -1) : input
}



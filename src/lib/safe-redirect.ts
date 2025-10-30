// Safe redirect utilities to prevent DOM-based open redirect vulnerabilities
// Validates redirect targets against same-origin or a trusted host whitelist.

const getTrustedHosts = (): Set<string> => {
  try {
    const env = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TRUSTED_REDIRECT_HOSTS : undefined) || ''
    const hosts = env
      .split(',')
      .map(h => h.trim())
      .filter(Boolean)
    return new Set(hosts)
  } catch {
    return new Set()
  }
}

const isHttpScheme = (url: URL) => url.protocol === 'http:' || url.protocol === 'https:'

export function getSafeRedirectUrl(input: string | null | undefined, fallback: string = '/'): string | null {
  if (!input) return null

  let candidate = input

  try {
    // Reject obvious dangerous schemes
    if (/^\s*javascript:/i.test(candidate) || /^\s*data:/i.test(candidate)) return null

    // Normalize double slashes that produce scheme-relative URLs
    if (candidate.startsWith('//')) return null

    // If relative path
    if (candidate.startsWith('/')) {
      // Prevent backslashes or null bytes
      if (candidate.includes('\\') || candidate.includes('\u0000')) return null
      // Keep query/hash intact
      return candidate
    }

    // For absolute or other forms, resolve against current origin
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = new URL(candidate, currentOrigin || 'http://localhost')

    // Only allow http/https
    if (!isHttpScheme(url)) return null

    // Same-origin is allowed
    if (currentOrigin && url.origin === currentOrigin) {
      return url.pathname + url.search + url.hash
    }

    // Allow if host is in trusted hosts whitelist
    const trusted = getTrustedHosts()
    if (trusted.has(url.hostname)) {
      return url.toString()
    }

    return null
  } catch {
    return null
  }
}

export function navigateSafely(target: string | null | undefined, options?: { fallback?: string }): void {
  const safe = getSafeRedirectUrl(target, options?.fallback || '/')
  if (safe) {
    if (typeof window !== 'undefined') {
      // Use assign to keep history consistent with prior usage
      window.location.assign(safe)
    }
  } else if (options?.fallback) {
    if (typeof window !== 'undefined') {
      try {
        // Minimal runtime signal for blocked redirects (no external deps)
        console.warn('[safe-redirect] Blocked unsafe redirect', { target })
        window.dispatchEvent(new CustomEvent('safe-redirect-blocked', { detail: { target } }))
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.location.assign(options.fallback)
    }
  }
}

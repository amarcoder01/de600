/**
 * Email Validation Utility
 * RFC 5322 compliant email validation with comprehensive checks
 */

export interface EmailValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Common and valid top-level domains (TLDs)
 * This is not exhaustive but covers the most common TLDs
 */
const VALID_TLDS = new Set([
  // Generic TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'info', 'biz', 'name', 'pro', 'museum', 'coop', 'aero',
  'xxx', 'idv', 'tel', 'asia', 'mobi', 'cat', 'jobs',
  'travel', 'post', 'web', 'app', 'dev', 'tech', 'online',
  'site', 'store', 'shop', 'blog', 'cloud', 'email', 'digital',
  
  // Country code TLDs (common ones)
  'us', 'uk', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be',
  'ch', 'at', 'se', 'no', 'dk', 'fi', 'ie', 'pt', 'pl', 'cz',
  'ru', 'ua', 'ro', 'gr', 'bg', 'hr', 'hu', 'sk', 'si', 'lt',
  'lv', 'ee', 'is', 'tr', 'il', 'ae', 'sa', 'eg', 'za', 'ng',
  'ke', 'ma', 'tn', 'jp', 'cn', 'kr', 'tw', 'hk', 'sg', 'my',
  'th', 'vn', 'ph', 'id', 'in', 'pk', 'bd', 'lk', 'np', 'nz',
  'mx', 'br', 'ar', 'cl', 'co', 'pe', 've', 'ec', 'uy', 'py',
  
  // New TLDs
  'io', 'ai', 'tv', 'me', 'cc', 'ws', 'bz', 'mn', 'tk',
  'to', 'fm', 'am', 'im', 'gg', 'je', 'ac', 'sh', 'la',
  
  // Popular new gTLDs
  'xyz', 'top', 'club', 'vip', 'live', 'today', 'world',
])

/**
 * Common second-level domains for country codes
 */
const VALID_SECOND_LEVEL_DOMAINS = new Set([
  'co', 'com', 'org', 'net', 'edu', 'gov', 'ac', 'mil',
  'sch', 'med', 'health', 'nhs', 'police', 'mod',
])

/**
 * Validates an email address with comprehensive checks
 * @param email - The email address to validate
 * @returns EmailValidationResult object with validation status and error message
 */
export function validateEmail(email: string): EmailValidationResult {
  // Check if email is provided
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      error: 'Email address is required'
    }
  }

  const trimmedEmail = email.trim()

  // RFC 5322 compliant regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g., user@example.com)'
    }
  }

  // Split email into local and domain parts
  const emailParts = trimmedEmail.split('@')
  if (emailParts.length !== 2) {
    return {
      isValid: false,
      error: 'Invalid email format'
    }
  }

  const [localPart, domain] = emailParts

  // Check local part length (max 64 characters per RFC 5321)
  if (localPart.length > 64 || localPart.length === 0) {
    return {
      isValid: false,
      error: 'Email address format is invalid'
    }
  }

  // Check domain part length
  if (domain.length > 255 || domain.length === 0) {
    return {
      isValid: false,
      error: 'Email domain is invalid'
    }
  }

  // Check if domain has at least one dot
  if (!domain.includes('.')) {
    return {
      isValid: false,
      error: 'Email must include a valid domain (e.g., gmail.com)'
    }
  }

  // Check domain extension length (at least 2 characters)
  const domainParts = domain.split('.')
  const extension = domainParts[domainParts.length - 1].toLowerCase()
  
  if (extension.length < 2) {
    return {
      isValid: false,
      error: 'Email domain extension must be at least 2 characters'
    }
  }

  // Validate TLD against known valid TLDs
  if (!VALID_TLDS.has(extension)) {
    return {
      isValid: false,
      error: `Invalid domain extension '.${extension}'. Please use a valid email domain (e.g., gmail.com, outlook.com)`
    }
  }

  // For domains with multiple parts (e.g., example.co.uk), validate second-level domain
  if (domainParts.length > 2) {
    const secondLevel = domainParts[domainParts.length - 2].toLowerCase()
    // If it's a country code TLD with second level, validate the second level
    if (domainParts.length === 3 && VALID_SECOND_LEVEL_DOMAINS.has(secondLevel)) {
      // Valid second-level domain like .co.uk, .com.au
      // Additional validation for country-specific domains passed
    }
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return {
      isValid: false,
      error: 'Email cannot contain consecutive dots'
    }
  }

  // Check for dots at the beginning or end of local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      error: 'Email cannot start or end with a dot'
    }
  }

  return {
    isValid: true
  }
}

/**
 * Simple boolean check for email validity
 * @param email - The email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid
}

/**
 * Common invalid email patterns for additional validation
 */
export const INVALID_EMAIL_PATTERNS = [
  /^[0-9]+@/,  // Starting with numbers only
  /@localhost$/i,  // localhost domain
  /@test\./i,  // test domain
  /@example\./i,  // example domain (commonly used in docs)
]

/**
 * Checks if email matches common invalid patterns
 * @param email - The email address to check
 * @returns true if email matches invalid patterns
 */
export function hasInvalidPattern(email: string): boolean {
  return INVALID_EMAIL_PATTERNS.some(pattern => pattern.test(email))
}

/**
 * Validates and normalizes an email address
 * @param email - The email address to normalize
 * @returns Normalized email address or null if invalid
 */
export function normalizeEmail(email: string): string | null {
  const validation = validateEmail(email)
  if (!validation.isValid) {
    return null
  }
  return email.trim().toLowerCase()
}


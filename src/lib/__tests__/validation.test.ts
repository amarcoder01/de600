/**
 * Email Validation Tests
 * Test suite for comprehensive email validation
 */

import { validateEmail, isValidEmail, normalizeEmail, hasInvalidPattern } from '../validation'

describe('Email Validation', () => {
  describe('validateEmail', () => {
    // Valid email addresses
    const validEmails = [
      'user@example.com',
      'john.doe@company.com',
      'test+tag@gmail.com',
      'admin@subdomain.example.com',
      'user123@test-domain.co.uk',
      'first.last@example.org',
      'user_name@example.com',
      'a@b.co',
      'test@domain-with-hyphen.com',
      '1234567890@example.com',
      'email@example-one.com',
      '_______@example.com',
      'email@example.name',
      'email@example.museum',
      'email@example.co.jp',
      'firstname-lastname@example.com',
    ]

    validEmails.forEach(email => {
      it(`should validate "${email}" as valid`, () => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    // Invalid email addresses
    const invalidEmails = [
      { email: '', error: 'Email address is required' },
      { email: '   ', error: 'Email address is required' },
      { email: 'test.gmail', error: 'Email must include a valid domain (e.g., gmail.com)' },
      { email: 'test@gmail', error: 'Email must include a valid domain (e.g., gmail.com)' },
      { email: 'test', error: 'Please enter a valid email address (e.g., user@example.com)' },
      { email: '@example.com', error: 'Email address format is invalid' },
      { email: 'test@', error: 'Email domain is invalid' },
      { email: 'test@@example.com', error: 'Invalid email format' },
      { email: 'test@example', error: 'Email must include a valid domain (e.g., gmail.com)' },
      { email: 'test@.com', error: 'Please enter a valid email address (e.g., user@example.com)' },
      { email: '.test@example.com', error: 'Email cannot start or end with a dot' },
      { email: 'test.@example.com', error: 'Email cannot start or end with a dot' },
      { email: 'test..user@example.com', error: 'Email cannot contain consecutive dots' },
      { email: 'test@example.c', error: 'Email domain extension must be at least 2 characters' },
      { email: 'test @example.com', error: 'Please enter a valid email address (e.g., user@example.com)' },
      { email: 'test@exam ple.com', error: 'Please enter a valid email address (e.g., user@example.com)' },
      { email: 'amar01pawar80@gmail.cp', error: "Invalid domain extension '.cp'" },
      { email: 'user@domain.xyz123', error: "Invalid domain extension '.xyz123'" },
      { email: 'test@example.fake', error: "Invalid domain extension '.fake'" },
      { email: 'user@test.invalid', error: "Invalid domain extension '.invalid'" },
    ]

    invalidEmails.forEach(({ email, error }) => {
      it(`should validate "${email}" as invalid with error: ${error}`, () => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    // Edge cases
    it('should reject email with local part longer than 64 characters', () => {
      const longLocalPart = 'a'.repeat(65) + '@example.com'
      const result = validateEmail(longLocalPart)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Email address format is invalid')
    })

    it('should reject email with domain longer than 255 characters', () => {
      const longDomain = 'test@' + 'a'.repeat(256) + '.com'
      const result = validateEmail(longDomain)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Email domain is invalid')
    })

    it('should handle trimming whitespace', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result.isValid).toBe(true)
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
    })

    it('should return false for invalid email', () => {
      expect(isValidEmail('test.gmail')).toBe(false)
    })
  })

  describe('normalizeEmail', () => {
    it('should normalize valid email to lowercase and trim', () => {
      expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
    })

    it('should return null for invalid email', () => {
      expect(normalizeEmail('test.gmail')).toBeNull()
    })
  })

  describe('hasInvalidPattern', () => {
    it('should detect localhost domain', () => {
      expect(hasInvalidPattern('test@localhost')).toBe(true)
    })

    it('should detect test domain', () => {
      expect(hasInvalidPattern('test@test.com')).toBe(true)
    })

    it('should not flag valid domains', () => {
      expect(hasInvalidPattern('test@gmail.com')).toBe(false)
    })
  })
})

describe('Real-world Email Validation Scenarios', () => {
  it('should reject "test.gmail" (missing domain)', () => {
    const result = validateEmail('test.gmail')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Email must include a valid domain')
  })

  it('should reject "user@domain" (missing TLD)', () => {
    const result = validateEmail('user@domain')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Email must include a valid domain')
  })

  it('should reject "amar01pawar80@gmail.cp" (invalid TLD)', () => {
    const result = validateEmail('amar01pawar80@gmail.cp')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain("Invalid domain extension '.cp'")
  })

  it('should reject emails with invalid TLDs like .xyz123, .fake, .invalid', () => {
    expect(validateEmail('user@domain.xyz123').isValid).toBe(false)
    expect(validateEmail('test@example.fake').isValid).toBe(false)
    expect(validateEmail('user@test.invalid').isValid).toBe(false)
  })

  it('should accept "user@gmail.com"', () => {
    const result = validateEmail('user@gmail.com')
    expect(result.isValid).toBe(true)
  })

  it('should accept "user.name+tag@example.co.uk"', () => {
    const result = validateEmail('user.name+tag@example.co.uk')
    expect(result.isValid).toBe(true)
  })

  it('should accept valid TLDs like .com, .org, .net, .io, .ai', () => {
    expect(validateEmail('user@example.com').isValid).toBe(true)
    expect(validateEmail('user@nonprofit.org').isValid).toBe(true)
    expect(validateEmail('admin@company.net').isValid).toBe(true)
    expect(validateEmail('dev@startup.io').isValid).toBe(true)
    expect(validateEmail('bot@service.ai').isValid).toBe(true)
  })
})


/**
 * Domain Generation Utilities
 * Generate domain names dari FID dan username
 */

/**
 * Generate domain name dari FID
 * Contoh: FID 123 -> "fid123" atau "user123"
 */
export function generateDomainFromFid(fid: number): string {
  // Format: "fid" + FID number
  return `fid${fid}`
}

/**
 * Generate domain name dari username dan FID
 * Preferensi: gunakan username jika available, fallback ke FID
 */
export function generateDomainFromUsernameAndFid(username: string | null, fid: number): string {
  if (username && username.trim().length > 0) {
    // Sanitize username untuk domain compliance
    const sanitized = sanitizeDomainName(username)
    if (sanitized.length >= 3 && sanitized.length <= 63) {
      return sanitized
    }
  }
  
  // Fallback ke FID-based domain
  return generateDomainFromFid(fid)
}

/**
 * Sanitize domain name sesuai dengan DNS/blockchain standards
 * - Lowercase
 * - Hanya alfanumerik dan hyphen
 * - Tidak boleh dimulai atau diakhiri dengan hyphen
 * - Min 3, max 63 characters
 */
export function sanitizeDomainName(name: string): string {
  // Lowercase
  let sanitized = name.toLowerCase()
  
  // Replace spaces dan underscores dengan hyphen
  sanitized = sanitized.replace(/[\s_]/g, '-')
  
  // Remove semua non-alphanumeric dan non-hyphen characters
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '')
  
  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '')
  
  // Remove multiple consecutive hyphens
  sanitized = sanitized.replace(/-{2,}/g, '-')
  
  // Truncate ke 63 characters jika perlu
  if (sanitized.length > 63) {
    sanitized = sanitized.substring(0, 63).replace(/-+$/, '')
  }
  
  return sanitized
}

/**
 * Validate domain name format
 */
export function validateDomainNameFormat(domain: string): {
  isValid: boolean
  error?: string
} {
  if (!domain) {
    return { isValid: false, error: 'Domain name is required' }
  }

  if (domain.length < 3) {
    return { isValid: false, error: 'Domain must be at least 3 characters' }
  }

  if (domain.length > 63) {
    return { isValid: false, error: 'Domain must be at most 63 characters' }
  }

  if (!/^[a-z0-9-]+$/.test(domain)) {
    return {
      isValid: false,
      error: 'Domain can only contain lowercase letters, numbers, and hyphens',
    }
  }

  if (domain.startsWith('-') || domain.endsWith('-')) {
    return { isValid: false, error: 'Domain cannot start or end with a hyphen' }
  }

  if (domain.includes('--')) {
    return { isValid: false, error: 'Domain cannot contain consecutive hyphens' }
  }

  return { isValid: true }
}

/**
 * Generate multiple domain suggestions dari username
 */
export function generateDomainSuggestions(username: string, fid: number, limit = 5): string[] {
  const suggestions: string[] = []
  const base = sanitizeDomainName(username)

  // Add base username if valid
  if (validateDomainNameFormat(base).isValid && !suggestions.includes(base)) {
    suggestions.push(base)
  }

  // Add username + numeric variants
  if (suggestions.length < limit) {
    const variant = `${base}-${fid}`
    if (validateDomainNameFormat(variant).isValid) {
      suggestions.push(variant)
    }
  }

  // Add FID-based domain
  if (suggestions.length < limit) {
    const fidDomain = generateDomainFromFid(fid)
    if (!suggestions.includes(fidDomain)) {
      suggestions.push(fidDomain)
    }
  }

  // Add shortened variants
  if (suggestions.length < limit && base.length > 10) {
    const shortened = base.substring(0, 10)
    const variant = `${shortened}-${fid.toString().slice(-2)}`
    if (validateDomainNameFormat(variant).isValid && !suggestions.includes(variant)) {
      suggestions.push(variant)
    }
  }

  return suggestions.slice(0, limit)
}

/**
 * Generate full domain name dengan TLD
 */
export function getFullDomainName(domain: string, tld = 'farcaster.celo'): string {
  return `${domain}.${tld}`
}

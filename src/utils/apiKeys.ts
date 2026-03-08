import { randomBytes, createHash } from 'crypto'

/**
 * Generate a cryptographically secure API key (48 chars, hex-encoded).
 * Returns the raw key — must be returned to the user once and never stored.
 */
export const generateApiKey = (): string => {
  return randomBytes(32).toString('hex').slice(0, 48)
}

/**
 * Hash an API key with SHA-256 for secure storage.
 * Only the hash is persisted in the database.
 */
export const hashApiKey = (rawKey: string): string => {
  return createHash('sha256').update(rawKey).digest('hex')
}

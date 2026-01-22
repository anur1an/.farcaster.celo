/**
 * Neynar API Service
 * https://docs.neynar.com/docs/getting-started-with-neynar
 * Comprehensive service untuk fetch user data dan membaca FID dari Neynar
 */

import type { FarcasterUser, NeynarUser } from './types'

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY || ''
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2'

export interface NeynarAuthenticatedUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  profile: {
    bio: {
      text: string
    }
  }
  follower_count: number
  following_count: number
  verified_addresses?: {
    eth_addresses?: string[]
  }
}

/**
 * Get authenticated user info dari Neynar
 * Digunakan untuk fetch user data saat wallet tersambung
 */
export async function getAuthenticatedUserInfo(fid: number): Promise<NeynarAuthenticatedUser | null> {
  try {
    if (!NEYNAR_API_KEY) {
      console.warn('[Neynar] API key not configured')
      return null
    }

    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/by_fid?fid=${fid}`, {
      headers: {
        'x-api-key': NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[Neynar] Error fetching user:', response.status, response.statusText)
      return null
    }

    const data = (await response.json()) as { user: NeynarAuthenticatedUser }
    console.log('[Neynar] Fetched user:', data.user.username)
    return data.user
  } catch (error) {
    console.error('[Neynar] Error fetching authenticated user:', error)
    return null
  }
}

/**
 * Resolve FID dari username
 */
export async function resolveUsernameToFid(username: string): Promise<number | null> {
  try {
    if (!NEYNAR_API_KEY) {
      console.warn('[Neynar] API key not configured')
      return null
    }

    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/user/by_username?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.warn('[Neynar] Username not found:', username)
      return null
    }

    const data = (await response.json()) as { user: { fid: number } }
    console.log('[Neynar] Resolved username to FID:', data.user.fid)
    return data.user.fid
  } catch (error) {
    console.error('[Neynar] Error resolving username:', error)
    return null
  }
}

/**
 * Search users by query
 */
export async function searchUsers(query: string, limit = 10): Promise<NeynarAuthenticatedUser[]> {
  try {
    if (!NEYNAR_API_KEY) {
      console.warn('[Neynar] API key not configured')
      return []
    }

    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('[Neynar] Search error:', response.statusText)
      return []
    }

    const data = (await response.json()) as { result: { users: NeynarAuthenticatedUser[] } }
    return data.result.users
  } catch (error) {
    console.error('[Neynar] Error searching users:', error)
    return []
  }
}

/**
 * Get user followers
 */
export async function getFollowers(fid: number, limit = 100): Promise<NeynarAuthenticatedUser[]> {
  try {
    if (!NEYNAR_API_KEY) {
      console.warn('[Neynar] API key not configured')
      return []
    }

    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/followers?fid=${fid}&limit=${limit}`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('[Neynar] Error fetching followers:', response.statusText)
      return []
    }

    const data = (await response.json()) as { result: { users: NeynarAuthenticatedUser[] } }
    return data.result.users
  } catch (error) {
    console.error('[Neynar] Error fetching followers:', error)
    return []
  }
}

/**
 * Convert NeynarAuthenticatedUser to FarcasterUser format
 */
export function convertNeynarUserToFarcasterUser(user: NeynarAuthenticatedUser): FarcasterUser {
  return {
    fid: user.fid,
    username: user.username,
    displayName: user.display_name,
    pfp: user.pfp_url,
    profile: {
      bio: {
        text: user.profile.bio.text,
      },
    },
    followerCount: user.follower_count,
    followingCount: user.following_count,
  }
}

/**
 * Validate Neynar API connectivity
 */
export async function validateNeynarConnection(): Promise<boolean> {
  try {
    if (!NEYNAR_API_KEY) {
      console.warn('[Neynar] No API key configured')
      return false
    }

    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/by_fid?fid=1`, {
      headers: {
        'x-api-key': NEYNAR_API_KEY,
      },
    })

    const isValid = response.ok
    if (isValid) {
      console.log('[Neynar] Connection validated')
    } else {
      console.error('[Neynar] Connection failed:', response.status)
    }
    return isValid
  } catch (error) {
    console.error('[Neynar] Error validating connection:', error)
    return false
  }
}

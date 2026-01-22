export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  profile?: {
    bio?: {
      text: string
    }
  }
  followerCount: number
  followingCount: number
}

export interface DomainInfo {
  owner: string
  tokenId: number
  expiresAt: number
  bio: string
  socialLinks: string
  domain: string
}

export interface NFTMetadata {
  name: string
  description: string
  image: string
  external_url: string
  attributes: {
    trait_type: string
    value: string
  }[]
  domain_owner: string
  farcaster_username?: string
  expires_at: number
}

export interface RegistrationRequest {
  domain: string
  bio: string
  socialLinks: string
  farcasterUsername: string
  fid: number
}

export interface TransactionResult {
  hash: string
  blockNumber: number
  status: 'success' | 'failed' | 'pending'
  gasUsed: string
  gasPrice: string
}

export interface GasEstimate {
  estimatedGas: string
  gasPrice: string
  totalCostWei: string
  totalCostCELO: string
  totalCost: string
  totalCostUSD: string
}

export interface FrameMessage {
  isValid: boolean
  button?: number
  inputText?: string
  fid?: number
  castId?: {
    fid: number
    hash: string
  }
  messageHash: string
  timestamp: number
}

export interface NeynarUser {
  object: string
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
  active_status: string
}

export interface NFTCard {
  id: string
  name: string
  description: string
  image: string
  owner: string
  expiresAt: number
  opensea_url: string
  traits: {
    farcaster_username?: string
    bio?: string
    social_links?: string
  }
}

/**
 * Mini App specific types
 */

export interface MiniAppContext {
  fid: number
  contextToken: string
  timestamp: number
  isInFrame: boolean
}

export interface ShareOptions {
  text: string
  imageUrl?: string
  title?: string
  targetUrl?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
  timestamp: string
}

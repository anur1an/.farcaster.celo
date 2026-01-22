'use client'

/**
 * Hook untuk auto-connect wallet dan membaca FID dari Neynar
 * Gunakan di component yang perlu auto-trigger minting
 */

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { getAuthenticatedUserInfo } from '@/lib/neynar-service'
import { connectFarcasterWallet, switchToCeloMainnet } from '@/lib/farcaster-wallet'

export interface UserFarcasterData {
  fid: number
  username: string
  displayName: string
  pfp: string
  bio: string
  followerCount: number
  followingCount: number
}

export function useFarcasterAutoMint() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  
  const [userFarcasterData, setUserFarcasterData] = useState<UserFarcasterData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoConnecting, setAutoConnecting] = useState(false)

  /**
   * Fetch Farcaster user data dari Neynar menggunakan FID
   * FID bisa didapat dari SDK context atau dari Neynar API
   */
  const fetchFarcasterUserData = useCallback(async (fid: number) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('[AutoMint] Fetching Farcaster data for FID:', fid)
      const userData = await getAuthenticatedUserInfo(fid)
      
      if (!userData) {
        throw new Error('Failed to fetch user data from Neynar')
      }

      const farcasterData: UserFarcasterData = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfp: userData.pfp_url,
        bio: userData.profile?.bio?.text || '',
        followerCount: userData.follower_count,
        followingCount: userData.following_count,
      }

      console.log('[AutoMint] User data fetched:', farcasterData)
      setUserFarcasterData(farcasterData)
      return farcasterData
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[AutoMint] Error fetching user data:', errorMsg)
      setError(errorMsg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Try to get FID dari Farcaster SDK context
   */
  const getFidFromContext = useCallback(() => {
    try {
      // Check if we have SDK context with FID
      if (typeof window !== 'undefined' && (window as any).farcaster?.context?.user?.fid) {
        const fid = (window as any).farcaster.context.user.fid
        console.log('[AutoMint] Found FID from context:', fid)
        return fid
      }
      return null
    } catch (e) {
      console.warn('[AutoMint] Error getting FID from context:', e)
      return null
    }
  }, [])

  /**
   * Auto-connect wallet dan fetch data
   */
  const autoConnectAndFetch = useCallback(async () => {
    try {
      setAutoConnecting(true)
      setError(null)

      // Try to get FID dari context terlebih dahulu
      let fid = getFidFromContext()

      if (!fid) {
        console.warn('[AutoMint] No FID in context, attempting wallet connection')
        throw new Error('FID not available - please ensure you are in Farcaster Mini App context')
      }

      console.log('[AutoMint] Starting auto-connection with FID:', fid)

      // Connect wallet jika belum connected
      if (!isConnected) {
        console.log('[AutoMint] Connecting wallet...')
        if (connectors.length > 0) {
          connect({ connector: connectors[0] })
        }
      }

      // Switch ke Celo Mainnet
      if (chainId !== parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '42220')) {
        console.log('[AutoMint] Switching to Celo Mainnet...')
        try {
          await switchToCeloMainnet()
        } catch (switchError) {
          console.warn('[AutoMint] Could not auto-switch network:', switchError)
        }
      }

      // Fetch Farcaster data
      await fetchFarcasterUserData(fid)

      setAutoConnecting(false)
      return fid
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[AutoMint] Auto-connection failed:', errorMsg)
      setError(errorMsg)
      setAutoConnecting(false)
      return null
    }
  }, [isConnected, chainId, connect, connectors, getFidFromContext, fetchFarcasterUserData])

  return {
    userFarcasterData,
    loading: loading || autoConnecting,
    error,
    isConnected,
    walletAddress: address,
    fetchFarcasterUserData,
    autoConnectAndFetch,
    getFidFromContext,
  }
}

'use client'

import { useEffect } from 'react'
import { initializeFarcasterSDK, isInMiniApp } from '@/lib/farcaster-sdk'

export function FarcasterSDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Farcaster SDK as early as possible
    console.log('[SDK] Initializing Farcaster SDK...')
    
    // Handle async initialization
    initializeFarcasterSDK().then(() => {
      const inMiniApp = isInMiniApp()
      console.log('[SDK] Running in Farcaster Mini App:', inMiniApp)
    }).catch((error) => {
      console.error('[SDK] Failed to initialize:', error)
    })
  }, [])

  return <>{children}</>
}

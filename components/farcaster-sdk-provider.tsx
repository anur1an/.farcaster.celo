'use client'

import { useEffect } from 'react'
import { initializeFarcasterSDK, isInMiniApp } from '@/lib/farcaster-sdk'

export function FarcasterSDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Farcaster SDK as early as possible
    console.log('Initializing Farcaster SDK...')
    initializeFarcasterSDK()

    // Also check mini app status
    const inMiniApp = isInMiniApp()
    console.log('Running in Farcaster Mini App:', inMiniApp)
  }, [])

  return <>{children}</>
}

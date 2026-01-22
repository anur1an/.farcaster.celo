/**
 * Hook untuk menggunakan Farcaster Mini App features
 */

import { useEffect, useState } from 'react'
import { isInMiniApp, isCapabilitySupported, getSupportedCapabilities } from '@/lib/farcaster-sdk'

/**
 * Hook untuk check mini app context dan capabilities
 */
export function useFarcasterMiniApp() {
  const [inMiniApp, setInMiniApp] = useState(false)
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkMiniApp = () => {
      try {
        const isMiniApp = isInMiniApp()
        setInMiniApp(isMiniApp)

        if (isMiniApp) {
          const caps = getSupportedCapabilities()
          setCapabilities(caps)
          console.log('Supported capabilities:', caps)
        }
      } catch (error) {
        console.error('Error checking mini app:', error)
      } finally {
        setLoading(false)
      }
    }

    // Check on mount and after a small delay to ensure SDK is ready
    const timeoutId = setTimeout(checkMiniApp, 100)

    return () => clearTimeout(timeoutId)
  }, [])

  const hasCapability = (capability: string) => {
    return isCapabilitySupported(capability)
  }

  return {
    inMiniApp,
    capabilities,
    loading,
    hasCapability,
    canSignManifest: isCapabilitySupported('sign_manifest'),
    canComposeCast: isCapabilitySupported('compose_cast'),
    canAddMiniApp: isCapabilitySupported('add_mini_app'),
  }
}

/**
 * Hook untuk track wallet connection di mini app
 */
export function useMiniAppWallet() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      if (!isInMiniApp()) return

      try {
        const { getFarcasterWalletProvider } = await import('@/lib/farcaster-wallet')
        const provider = await getFarcasterWalletProvider()

        const accounts = await provider?.request?.({ method: 'eth_accounts' })
        const chainIdHex = await provider?.request?.({ method: 'eth_chainId' })

        if (accounts && accounts.length > 0) {
          setConnected(true)
          setAddress(accounts[0])
          setChainId(parseInt(chainIdHex, 16))
        }
      } catch (error) {
        console.warn('Wallet not connected:', error)
      }
    }

    checkConnection()
  }, [])

  return { connected, address, chainId }
}

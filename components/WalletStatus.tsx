'use client'

import { useState, useEffect } from 'react'
import { Wallet, AlertCircle, Zap, Activity, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { formatAddress } from '@/lib/blockchain'
import { isInMiniApp } from '@/lib/farcaster-sdk'
import { getAuthenticatedUserInfo } from '@/lib/neynar-service'

interface WalletStatusProps {
  address?: string
  onConnect?: () => Promise<void>
  gasPrice?: string
  onAccountChange?: (account: { address: string; chainId: number; isConnected: boolean; farcasterData?: any } | null) => void
  autoFetchFarcasterData?: boolean
}

export function WalletStatus({ 
  address: initialAddress, 
  onConnect, 
  gasPrice, 
  onAccountChange: onAccountChangeProp,
  autoFetchFarcasterData = true
}: WalletStatusProps) {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balanceData } = useBalance({
    address: address as `0x${string}`,
  })

  const [error, setError] = useState<string | null>(null)
  const [inMiniApp, setInMiniApp] = useState(false)
  const [walletAvailable, setWalletAvailable] = useState(false)
  const [farcasterData, setFarcasterData] = useState<any>(null)
  const [fetchingFarcasterData, setFetchingFarcasterData] = useState(false)

  // Initialize mini app status
  useEffect(() => {
    const miniAppStatus = isInMiniApp()
    setInMiniApp(miniAppStatus)
    console.log('[WalletStatus] Mini app status:', miniAppStatus)
    if (miniAppStatus) {
      setWalletAvailable(!!window.ethereum)
    }
  }, [])

  // Auto-fetch Farcaster data saat wallet terkoneksi
  useEffect(() => {
    if (isConnected && autoFetchFarcasterData && !farcasterData) {
      const fetchData = async () => {
        try {
          setFetchingFarcasterData(true)
          
          // Try to get FID dari SDK context
          let fid = null
          if ((window as any).farcaster?.context?.user?.fid) {
            fid = (window as any).farcaster.context.user.fid
          }

          if (fid) {
            console.log('[WalletStatus] Fetching Farcaster data for FID:', fid)
            const userData = await getAuthenticatedUserInfo(fid)
            if (userData) {
              setFarcasterData(userData)
              console.log('[WalletStatus] Farcaster data fetched:', userData)
            }
          }
        } catch (err) {
          console.warn('[WalletStatus] Error fetching Farcaster data:', err)
        } finally {
          setFetchingFarcasterData(false)
        }
      }

      fetchData()
    }
  }, [isConnected, autoFetchFarcasterData, farcasterData])

  // Notify parent of account changes
  useEffect(() => {
    if (isConnected && address && chainId) {
      const account = {
        address,
        chainId,
        isConnected: true,
        farcasterData,
      }
      onAccountChangeProp?.(account)
    } else {
      onAccountChangeProp?.(null)
    }
  }, [address, isConnected, chainId, farcasterData, onAccountChangeProp])

  const handleConnect = async () => {
    try {
      setError(null)
      if (connectors.length > 0) {
        console.log('[WalletStatus] Connecting with connector:', connectors[0].name)
        connect({ connector: connectors[0] })
        if (onConnect) {
          await onConnect()
        }
      } else {
        setError('No wallet connectors available')
      }
    } catch (err) {
      console.error('[WalletStatus] Failed to connect wallet:', err)
      setError('Failed to connect wallet. Please try again.')
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnect()
      setFarcasterData(null)
    } catch (err) {
      console.error('Failed to disconnect wallet:', err)
      setError('Failed to disconnect wallet')
    }
  }


  if (isConnected && address) {
    const balance = balanceData ? parseFloat((Number(balanceData.value) / Math.pow(10, balanceData.decimals)).toString()).toFixed(4) : '0.00'

    return (
      <Card className="p-5 dashboard-card border-primary/40 animate-fade-in-down space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Wallet Connected</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{formatAddress(address)}</p>
            </div>
            <Badge className="text-xs bg-primary/20 text-primary hover:bg-primary/30">
              Ready
            </Badge>
          </div>

          <div className="text-right space-y-1">
            <p className="text-sm font-semibold">{balance} {balanceData?.symbol || 'ETH'}</p>
            {gasPrice && (
              <div className="flex items-center justify-end gap-1 text-xs text-accent font-medium">
                <Zap className="w-3 h-3" />
                {gasPrice}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            Disconnect
          </Button>
        </div>

        {fetchingFarcasterData && (
          <div className="px-4 py-2 rounded-lg bg-secondary/10 text-center">
            <p className="text-xs text-secondary font-medium">Fetching your Farcaster data...</p>
          </div>
        )}

        {farcasterData && (
          <div className="px-4 py-3 rounded-lg bg-success/10 border border-success/30 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <p className="text-sm font-semibold text-success">Farcaster Data Loaded</p>
            </div>
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Username:</span> <span className="font-mono">@{farcasterData.username}</span></p>
              <p><span className="text-muted-foreground">FID:</span> <span className="font-mono">{farcasterData.fid}</span></p>
            </div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/10 animate-fade-in-down">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Connection Error</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {inMiniApp && (
        <Card className="p-4 border-green-500/30 bg-green-500/10">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Farcaster Mini App Detected</p>
              <p className="text-xs text-green-800/80 mt-1">
                {walletAvailable
                  ? 'Wallet is available in mini app context'
                  : 'Wallet not yet available - please wait'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <Card className="p-6 dashboard-card border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              {inMiniApp ? 'Connect Your Wallet' : 'Ready to claim your identity?'}
            </p>
            <Button
              onClick={handleConnect}
              disabled={isPending}
              className="w-full h-12 gap-2 font-semibold text-base"
              size="lg"
            >
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {inMiniApp
                ? 'Pilih wallet (MetaMask, Coinbase, Trust) untuk melanjutkan. Wallet akan terdeteksi secara otomatis di Farcaster Mini App.'
                : 'Your Farcaster frame wallet gives you direct access to Celo mainnet. Sign in to claim your permanent identity.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

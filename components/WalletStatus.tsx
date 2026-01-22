'use client'

import { useState, useEffect } from 'react'
import { Wallet, AlertCircle, Zap, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatAddress } from '@/lib/blockchain'
import {
  connectFarcasterWallet,
  disconnectFarcasterWallet,
  getFarcasterWalletBalance,
  initFarcasterWallet,
  onAccountChange,
  isWalletAvailable,
  type WalletAccount,
} from '@/lib/farcaster-wallet'
import { isInMiniApp } from '@/lib/farcaster-sdk'
import { ethers } from 'ethers'

interface WalletStatusProps {
  address?: string
  onConnect?: () => Promise<void>
  gasPrice?: string
  onAccountChange?: (account: WalletAccount | null) => void
}

export function WalletStatus({ address: initialAddress, onConnect, gasPrice, onAccountChange: onAccountChangeProp }: WalletStatusProps) {
  const [account, setAccount] = useState<WalletAccount | null>(
    initialAddress ? { address: initialAddress, chainId: 42220, isConnected: true } : null
  )
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<string>('0.00')
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [inMiniApp, setInMiniApp] = useState(false)
  const [walletAvailable, setWalletAvailable] = useState(false)

  // Initialize Farcaster wallet on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if in mini app
        const miniAppStatus = isInMiniApp()
        setInMiniApp(miniAppStatus)
        console.log('Mini app status:', miniAppStatus)

        // Check wallet availability
        const walletStatus = isWalletAvailable()
        setWalletAvailable(walletStatus)
        console.log('Wallet available:', walletStatus)

        const initialized = await initFarcasterWallet()
        setIsInitialized(initialized)
        
        if (initialized) {
          // Check if already connected
          try {
            const provider = await import('@/lib/farcaster-wallet').then(m => m.getFarcasterWalletProvider())
            const accounts = await provider?.request?.({ method: 'eth_accounts' })
            
            if (accounts && accounts.length > 0) {
              const chainIdHex = await provider?.request?.({ method: 'eth_chainId' })
              setAccount({
                address: accounts[0],
                chainId: parseInt(chainIdHex, 16),
                isConnected: true,
              })
              console.log('Pre-connected account found:', formatAddress(accounts[0]))
            }
          } catch (err) {
            console.log('No pre-connected account')
          }
        }
      } catch (error) {
        console.error('Failed to initialize Farcaster wallet:', error)
      }
    }

    initialize()
  }, [])

  // Setup account change listener
  useEffect(() => {
    if (!isInitialized) return

    const unsubscribe = onAccountChange?.((newAccount) => {
      setAccount(newAccount)
      onAccountChangeProp?.(newAccount)
    })

    return () => {
      unsubscribe?.()
    }
  }, [isInitialized, onAccountChangeProp])

  // Fetch balance when account changes
  useEffect(() => {
    if (!account?.address) {
      setBalance('0.00')
      return
    }

    const fetchBalance = async () => {
      try {
        const balanceWei = await getFarcasterWalletBalance(account.address)
        const balanceCELO = ethers.formatEther(balanceWei)
        setBalance(parseFloat(balanceCELO).toFixed(4))
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance('0.00')
      }
    }

    fetchBalance()
  }, [account?.address])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const connectedAccount = await connectFarcasterWallet()
      setAccount(connectedAccount)

      if (onConnect) {
        await onConnect()
      }

      onAccountChangeProp?.(connectedAccount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      console.error('Wallet connection error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await disconnectFarcasterWallet()
      setAccount(null)
      setBalance('0.00')
      onAccountChangeProp?.(null)
    } catch (error) {
      console.error('Disconnect error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (account?.isConnected && account?.address) {
    return (
      <Card className="p-5 dashboard-card border-primary/40 animate-fade-in-down">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Wallet Connected</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{formatAddress(account.address)}</p>
            </div>
            <Badge className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/30">
              Ready
            </Badge>
          </div>

          <div className="text-right space-y-1">
            <p className="text-sm font-semibold">{balance} CELO</p>
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
            disabled={loading}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </div>
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
              {inMiniApp ? 'Connect Your Farcaster Wallet' : 'Ready to claim your identity?'}
            </p>
            <Button
              onClick={handleConnect}
              disabled={loading || !isInitialized || (inMiniApp && !walletAvailable)}
              className="w-full h-12 gap-2 font-semibold text-base"
              size="lg"
            >
              {loading ? (
                'Connecting...'
              ) : !isInitialized ? (
                'Initializing Wallet...'
              ) : inMiniApp && !walletAvailable ? (
                'Wallet Initializing...'
              ) : (
                'Connect Farcaster Wallet'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {inMiniApp
                ? 'Your Farcaster mini app wallet gives you direct access to Celo mainnet. Sign in to claim your permanent identity.'
                : 'Your Farcaster frame wallet gives you direct access to Celo mainnet. Sign in to claim your permanent identity.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

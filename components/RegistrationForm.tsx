'use client'

import { useState, useEffect } from "react"
import React from "react"
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ShareMint } from './ShareMint'

// Use new Farcaster context hook
import { 
  useFarcasterUserReadyForMint, 
  generateFarcasterDomain,
} from '@/hooks/use-farcaster-user'

// Minting service dengan approval flow
import { 
  completeMinutingFlow,
  estimateMintingGas,
  checkUserBalance,
} from '@/lib/minting-service'

// Wallet utilities
import { switchToCeloMainnet, getFarcasterWalletProvider } from '@/lib/farcaster-wallet'

// Wagmi untuk wallet connection
import { useAccount, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'

import type { GasEstimate } from '@/lib/types'

interface RegistrationFormProps {
  onSubmit?: (data: any) => Promise<void>
  gasEstimate?: GasEstimate | null
}

export interface RegistrationData {
  label: string
  fid: number
  owner: string
}

/**
 * RegistrationForm yang production-ready
 * 
 * Flow:
 * 1. Read username dari Farcaster context
 * 2. Connect wallet (Celo)
 * 3. Check balance & gas estimate
 * 4. Request ERC20 approval (jika ada)
 * 5. Mint domain dengan FID
 */
export function RegistrationForm({
  onSubmit,
  gasEstimate: externalGasEstimate,
}: RegistrationFormProps) {
  // Read user dari Farcaster context
  const { 
    user, 
    loading: userLoading, 
    error: userError, 
    isReady: userReady,
    domainLabel,
    fullDomain,
  } = useFarcasterUserReadyForMint()

  // Wallet connection (Celo)
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  // Form state
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [gasEstimate, setGasEstimate] = useState<any>(null)
  const [balanceCheckLoading, setBalanceCheckLoading] = useState(false)
  const [balanceSufficient, setBalanceSufficient] = useState(false)
  const [currentStep, setCurrentStep] = useState<'prepare' | 'approval' | 'mint' | 'success'>('prepare')

  // Step 1: Check user & context ready
  useEffect(() => {
    if (userError) {
      setError(`Cannot load Farcaster context: ${userError.message}`)
    }
  }, [userError])

  // Step 2: Estimate gas cost
  useEffect(() => {
    const estimate = async () => {
      try {
        const result = await estimateMintingGas()
        setGasEstimate(result)
      } catch (err) {
        console.warn('Gas estimation failed:', err)
      }
    }
    if (userReady) {
      estimate()
    }
  }, [userReady])

  // Step 3: Check wallet & balance
  useEffect(() => {
    const checkBalance = async () => {
      if (!walletAddress || !walletConnected) return

      try {
        setBalanceCheckLoading(true)
        const result = await checkUserBalance(walletAddress)
        setBalanceSufficient(result.sufficient)
        
        if (!result.sufficient) {
          setError(`Insufficient balance. You need at least ${result.balanceDecimal} tokens`)
        }
      } catch (err) {
        console.warn('Balance check failed:', err)
        // Assume sufficient untuk native payment
        setBalanceSufficient(true)
      } finally {
        setBalanceCheckLoading(false)
      }
    }

    checkBalance()
  }, [walletAddress, walletConnected])

  // Main mint handler dengan approval flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validasi context
    if (!userReady || !user) {
      setError('Farcaster context not available. Please make sure you opened this in Farcaster Mini App.')
      return
    }

    // Validasi wallet
    if (!walletConnected || !walletAddress) {
      setError('Wallet not connected. Please connect your Celo wallet.')
      return
    }

    // Validasi signer
    if (!walletClient) {
      setError('Wallet client not available')
      return
    }

    // Validasi bio
    if (!bio.trim()) {
      setError('Bio is required for NFT metadata')
      return
    }

    // Validasi balance
    if (!balanceSufficient) {
      setError('Insufficient balance for minting')
      return
    }

    setLoading(true)
    try {
      // Prepare minting params
      const mintParams = {
        label: user.username, // dari Farcaster context
        fid: user.fid, // dari Farcaster context
        owner: walletAddress,
      }

      console.log('[RegistrationForm] Starting mint flow...')
      console.log('[RegistrationForm] Label:', mintParams.label)
      console.log('[RegistrationForm] FID:', mintParams.fid)
      console.log('[RegistrationForm] Owner:', mintParams.owner)

      // Step 0: CRITICAL - Ensure wallet is on Celo Mainnet before mint
      console.log('[RegistrationForm] Step 0: Ensuring wallet is on Celo Mainnet...')
      setCurrentStep('approval') // Show "approval" step while switching
      try {
        await switchToCeloMainnet()
        console.log('[RegistrationForm] Successfully on Celo Mainnet')
      } catch (chainError) {
        console.error('[RegistrationForm] Failed to switch to Celo Mainnet:', chainError)
        setError('Failed to switch to Celo Mainnet. Please manually switch your wallet to Celo chain.')
        setCurrentStep('prepare')
        return
      }

      // Wait a moment for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 1: Approval (jika diperlukan)
      console.log('[RegistrationForm] Step 1: Requesting approval...')
      // Note: completeMinutingFlow sudah handle approval internally

      // Step 2: Mint
      setCurrentStep('mint')
      console.log('[RegistrationForm] Step 2: Minting domain...')

      // Get ethers signer from Farcaster wallet provider (not from wagmi walletClient)
      // This ensures we have a proper ethers.Signer with all required methods
      const provider = await getFarcasterWalletProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      console.log('[RegistrationForm] Signer obtained, calling mint flow...')

      // Call complete minting flow (approval + mint)
      const result = await completeMinutingFlow(signer, mintParams, {
        useNativePayment: true,
      })

      if (!result.success) {
        setError(`Minting failed: ${result.error}`)
        return
      }

      // Success!
      setTxHash(result.mintHash || '')
      setSuccess(true)
      setCurrentStep('success')

      console.log('[RegistrationForm] Mint successful!')
      console.log('[RegistrationForm] Domain:', result.fullDomain)
      console.log('[RegistrationForm] TX:', result.mintHash)

      // Reset form
      setBio('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Mint transaction failed'
      console.error('[RegistrationForm] Error:', errorMsg)
      setError(errorMsg)
      setCurrentStep('prepare')
    } finally {
      setLoading(false)
    }
  }

  if (success && fullDomain) {
    return (
      <ShareMint 
        domain={fullDomain} 
        txHash={txHash || undefined}
        openSeaUrl={`https://opensea.io/search?q=farcaster.celo`}
      />
    )
  }

  // Render form dengan Farcaster context info
  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">
      {/* Loading state */}
      {userLoading && (
        <Card className="p-4 bg-secondary/10 border-secondary/30 animate-fade-in-down space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-secondary" />
            <p className="text-sm font-medium text-secondary">Loading your Farcaster identity...</p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {userError && (
        <Card className="p-4 bg-destructive/10 border-destructive/30 animate-fade-in-down space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{userError.message}</p>
          </div>
        </Card>
      )}

      {/* Success state: user loaded */}
      {userReady && user && (
        <Card className="p-4 bg-primary/10 border-primary/30 animate-fade-in-down space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-primary">
              ✓ Farcaster: @{user.username} (FID: {user.fid})
            </p>
          </div>
        </Card>
      )}

      {/* Display domain yang akan di-mint */}
      {fullDomain && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Domain Name</Label>
          <div className="px-4 py-3 rounded-lg bg-muted border border-border">
            <p className="font-semibold text-lg">{fullDomain}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated dari username Anda
            </p>
          </div>
        </div>
      )}

      {/* Wallet connection status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Wallet (Celo)</Label>
        <div className="px-4 py-3 rounded-lg bg-muted border border-border">
          {walletConnected && walletAddress ? (
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm truncate">{walletAddress}</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Connect wallet to proceed</p>
          )}
        </div>
      </div>

      {/* Gas estimate */}
      {gasEstimate && (
        <Card className="p-4 bg-card border-border space-y-2 animate-fade-in-down">
          <p className="text-sm font-medium">Estimated Cost</p>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Gas fee:</span>
            <span className="font-semibold">
              {gasEstimate.estimatedCostCELO} CELO (~${gasEstimate.estimatedCostUSD})
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Celo mainnet • .farcaster.celo
          </p>
        </Card>
      )}

      {/* Bio input untuk metadata NFT */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium">
          Bio (for NFT metadata)
        </Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading || !userReady || !walletConnected}
          rows={3}
          className="resize-none text-base"
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/500 characters
        </p>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-3 border-destructive/50 bg-destructive/10 animate-fade-in-down">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {/* Current step indicator */}
      {loading && (
        <Card className="p-3 bg-accent/20 border-accent/40">
          <p className="text-sm font-medium">
            {currentStep === 'approval' && 'Waiting for wallet approval...'}
            {currentStep === 'mint' && 'Minting your domain...'}
          </p>
        </Card>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={
          loading || 
          !userReady || 
          !walletConnected || 
          !bio.trim() || 
          balanceCheckLoading ||
          !balanceSufficient
        }
        className="w-full gap-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {currentStep === 'approval' ? 'Approving...' : 'Minting...'}
          </>
        ) : !userReady ? (
          'Loading Farcaster Data...'
        ) : !walletConnected ? (
          'Connect Wallet to Mint'
        ) : balanceCheckLoading ? (
          'Checking Balance...'
        ) : !balanceSufficient ? (
          'Insufficient Balance'
        ) : (
          'Mint Domain + NFT'
        )}
      </Button>

      {/* Info message */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Domain name akan otomatis menggunakan username Farcaster Anda
      </p>
    </form>
  )
}

'use client'

/**
 * Mint Transaction Handler Component
 * Menangani real blockchain transaction untuk minting NFT
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { completeMinutingFlow, estimateMintingGas } from '@/lib/minting-service'
import { getFarcasterWalletProvider, switchToCeloMainnet } from '@/lib/farcaster-wallet'

export interface MintTransactionHandlerProps {
  label: string  // username
  fid: number
  walletAddress: string
  onSuccess?: (txHash: string) => void
  onError?: (error: string) => void
}

export function MintTransactionHandler({
  label,
  fid,
  walletAddress,
  onSuccess,
  onError,
}: MintTransactionHandlerProps) {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [gasEstimate, setGasEstimate] = useState<any>(null)

  /**
   * Handle minting transaction dengan wallet popup
   */
  const handleMintTransaction = async () => {
    try {
      setError(null)
      setLoading(true)
      setTxStatus('pending')

      console.log('[MintTxHandler] Starting minting transaction...')
      console.log('[MintTxHandler] Label:', label)
      console.log('[MintTxHandler] FID:', fid)
      console.log('[MintTxHandler] Owner:', walletAddress)

      // IMPORTANT: Switch to Celo Mainnet FIRST before creating signer
      console.log('[MintTxHandler] Step 0: Ensuring wallet is on Celo Mainnet...')
      try {
        await switchToCeloMainnet()
        console.log('[MintTxHandler] Successfully on Celo Mainnet')
      } catch (chainError) {
        console.error('[MintTxHandler] Failed to switch to Celo Mainnet:', chainError)
        throw new Error('Failed to switch to Celo Mainnet. Please manually switch your wallet to Celo chain.')
      }

      // Wait a moment for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Estimate gas
      console.log('[MintTxHandler] Estimating gas...')
      const gasData = await estimateMintingGas()
      setGasEstimate(gasData)

      // Get ethers signer dari wallet provider - AFTER chain switch
      const provider = await getFarcasterWalletProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      console.log('[MintTxHandler] Signer obtained, starting mint flow...')

      // Complete minting flow (approval + mint)
      const result = await completeMinutingFlow(
        signer,
        {
          label,
          fid,
          owner: walletAddress,
        },
        {
          useNativePayment: true,
        }
      )

      if (result.success && result.mintHash) {
        setTxHash(result.mintHash)
        setTxStatus('success')
        console.log('[MintTxHandler] Transaction successful!', result.mintHash)
        onSuccess?.(result.mintHash)
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[MintTxHandler] Minting error:', errorMsg)
      setError(errorMsg)
      setTxStatus('failed')
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (txStatus === 'success' && txHash) {
    return (
      <Card className="p-6 space-y-4 border-primary/50 bg-primary/10 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-primary">Minting Successful!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your NFT domain has been minted on Celo mainnet
            </p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-xs font-mono text-muted-foreground break-all">{txHash}</p>
        </div>

        <Button
          asChild
          className="w-full"
        >
          <a
            href={`https://explorer.celo.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Celo Explorer
          </a>
        </Button>
      </Card>
    )
  }

  if (txStatus === 'failed' || error) {
    return (
      <Card className="p-6 space-y-4 border-destructive/50 bg-destructive/10 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Minting Failed</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>

        <Button
          onClick={handleMintTransaction}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Retrying...
            </>
          ) : (
            'Retry Minting'
          )}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {gasEstimate && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Gas Estimate</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Cost:</span>
              <span className="font-mono font-semibold">{gasEstimate.estimatedCost} CELO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">USD Value:</span>
              <span className="font-mono font-semibold">~${gasEstimate.estimatedCostUSD}</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-4 border-primary/30 bg-primary/5">
        <div className="space-y-2">
          <h3 className="font-semibold">Ready to Mint</h3>
          <p className="text-sm text-muted-foreground">
            Clicking below will open your wallet popup to confirm and sign the transaction
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted space-y-2 text-sm">
          <div><span className="text-muted-foreground">Label:</span> <span className="font-mono font-semibold">{label}</span></div>
          <div><span className="text-muted-foreground">FID:</span> <span className="font-mono font-semibold">{fid}</span></div>
          <div><span className="text-muted-foreground">Owner:</span> <span className="font-mono font-semibold text-xs break-all">{walletAddress}</span></div>
        </div>

        <Button
          onClick={handleMintTransaction}
          disabled={loading || !isConnected}
          size="lg"
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Transaction...
            </>
          ) : (
            <>
              💼 Sign & Mint NFT
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-xs text-destructive text-center">
            Wallet is not connected. Please connect your wallet first.
          </p>
        )}
      </Card>
    </div>
  )
}

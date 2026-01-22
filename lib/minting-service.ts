/**
 * Domain Minting Service
 * Handle real blockchain transactions untuk minting domain NFT
 * Menggunakan ethers.js dan wallet connection untuk real on-chain transactions
 */

import { ethers } from 'ethers'
import type { TransactionResult, RegistrationRequest } from '@/lib/types'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS || ''
const CELO_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '42220')
const CELO_RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'

export interface MintingParams {
  domain: string
  bio: string
  socialLinks?: string
  farcasterUsername: string
  fid: number
  walletAddress: string
  metadataURI: string
}

/**
 * Get contract ABI dari file publik
 */
export async function getContractABI() {
  try {
    const response = await fetch('/NameRegistry.json')
    if (!response.ok) {
      throw new Error('Failed to load contract ABI')
    }
    const data = await response.json()
    return data.abi
  } catch (error) {
    console.error('[Minting] Error loading contract ABI:', error)
    // Return minimal ABI jika file tidak ada
    return [
      'function register(string name, address owner, string bio, uint256 fid, string metadataURI) public payable',
      'function transferFrom(address from, address to, uint256 tokenId) public',
    ]
  }
}

/**
 * Estimate gas untuk minting transaction
 */
export async function estimateMintingGas(params: MintingParams): Promise<{
  estimatedGas: string
  gasPrice: string
  estimatedCost: string
  estimatedCostUSD: string
}> {
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC_URL, {
      chainId: CELO_CHAIN_ID,
      name: 'celo-mainnet',
    })

    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei')
    
    // Estimasi: 150,000 gas untuk register + metadata
    const estimatedGasUnits = BigInt(150000)
    const estimatedGasWei = gasPrice * estimatedGasUnits

    const estimatedCostCELO = ethers.formatEther(estimatedGasWei)
    const estimatedCostUSD = (parseFloat(estimatedCostCELO) * 2.0).toFixed(4) // ~2 USD per CELO

    return {
      estimatedGas: estimatedGasUnits.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCost: estimatedCostCELO,
      estimatedCostUSD,
    }
  } catch (error) {
    console.error('[Minting] Error estimating gas:', error)
    // Return default estimate
    return {
      estimatedGas: '150000',
      gasPrice: ethers.parseUnits('1', 'gwei').toString(),
      estimatedCost: '0.00015',
      estimatedCostUSD: '0.30',
    }
  }
}

/**
 * Register domain dengan real transaction
 * Membutuhkan ethers.js signer dari wallet yang terkoneksi
 */
export async function registerDomainWithTransaction(
  params: MintingParams,
  signer: ethers.Signer
): Promise<{
  success: boolean
  transactionHash?: string
  error?: string
  receipt?: any
}> {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    console.log('[Minting] Starting domain registration transaction...')
    console.log('[Minting] Domain:', params.domain)
    console.log('[Minting] FID:', params.fid)
    console.log('[Minting] Wallet:', params.walletAddress)

    // Get contract instance
    const abi = await getContractABI()
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

    // Prepare transaction data
    const fullDomain = `${params.domain}.farcaster.celo`
    const txData = {
      domain: fullDomain,
      owner: params.walletAddress,
      bio: params.bio,
      fid: params.fid,
      metadataURI: params.metadataURI,
    }

    console.log('[Minting] Transaction data:', txData)

    // Call register function
    // Nota: Ini asumsi contract punya function register
    // Sesuaikan dengan ABI contract yang sebenarnya
    const tx = await contract.register(
      fullDomain,
      params.walletAddress,
      params.bio,
      params.fid,
      params.metadataURI,
      {
        value: ethers.parseEther('0'), // Bayar sesuai registration fee
      }
    )

    console.log('[Minting] Transaction sent:', tx.hash)

    // Wait for transaction to be mined
    const receipt = await tx.wait()

    if (receipt && receipt.status === 1) {
      console.log('[Minting] Transaction successful!')
      console.log('[Minting] Block number:', receipt.blockNumber)
      console.log('[Minting] Gas used:', receipt.gasUsed.toString())

      return {
        success: true,
        transactionHash: tx.hash,
        receipt: {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: 'success',
        },
      }
    } else {
      throw new Error('Transaction failed or was reverted')
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Minting] Transaction error:', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Prepare metadata untuk NFT
 */
export function prepareMintMetadata(params: MintingParams): Record<string, any> {
  return {
    name: `${params.domain}.farcaster.celo`,
    description: `Farcaster domain owned by @${params.farcasterUsername} (FID: ${params.fid})`,
    attributes: [
      {
        trait_type: 'Domain',
        value: `${params.domain}.farcaster.celo`,
      },
      {
        trait_type: 'Farcaster Username',
        value: params.farcasterUsername,
      },
      {
        trait_type: 'Farcaster ID',
        value: params.fid.toString(),
      },
      {
        trait_type: 'Owner',
        value: params.walletAddress,
      },
      {
        trait_type: 'Bio',
        value: params.bio,
      },
    ],
    registered_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Generate metadata URI untuk upload ke IPFS atau storage
 * Dalam production, ini harus diupload ke IPFS dan return hash
 */
export function generateMetadataURI(params: MintingParams, baseURI = '/api/metadata'): string {
  return `${baseURI}/${params.domain}`
}

/**
 * Validate minting parameters
 */
export function validateMintingParams(params: MintingParams): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!params.domain || params.domain.length < 3) {
    errors.push('Domain must be at least 3 characters')
  }

  if (!params.fid || params.fid <= 0) {
    errors.push('Valid FID is required')
  }

  if (!params.farcasterUsername) {
    errors.push('Farcaster username is required')
  }

  if (!params.walletAddress || !ethers.isAddress(params.walletAddress)) {
    errors.push('Valid wallet address is required')
  }

  if (!params.bio || params.bio.length < 1) {
    errors.push('Bio is required')
  }

  if (!params.metadataURI) {
    errors.push('Metadata URI is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import type { RegistrationRequest, TransactionResult } from '@/lib/types'

interface RegisterRequest extends RegistrationRequest {
  walletAddress: string
  metadataURI?: string
}

/**
 * Prepare domain registration untuk blockchain
 * Endpoint ini mempersiapkan data dan memvalidasi sebelum transaksi
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest

    const { domain, bio, socialLinks, farcasterUsername, fid, walletAddress, metadataURI } = body

    // Validate required fields
    if (!domain || !farcasterUsername || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    // Validate FID
    if (!fid || fid <= 0) {
      return NextResponse.json(
        { error: 'Invalid Farcaster ID' },
        { status: 400 }
      )
    }

    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS || ''
    
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: 'Contract not configured' },
        { status: 500 }
      )
    }

    // Prepare domain registration data
    const fullDomain = `${domain}.farcaster.celo`
    const metadataURI_final = metadataURI || `/api/metadata/${domain}`

    // Prepare transaction data structure
    // Ini akan di-sign oleh client dengan wallet mereka
    const registrationData = {
      domain: fullDomain,
      owner: walletAddress,
      farcasterUsername,
      fid,
      bio,
      socialLinks: socialLinks || '',
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      metadataURI: metadataURI_final,
      nftMetadata: {
        name: fullDomain,
        description: `Farcaster domain ${fullDomain} owned by @${farcasterUsername} (FID: ${fid}) on Celo mainnet`,
        external_url: `https://opensea.io/collection/farcaster-celo-domains`,
        image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://farcaster-names.example.com'}/api/frame-image?domain=${domain}&fid=${fid}`,
        attributes: [
          {
            trait_type: 'Domain',
            value: fullDomain,
          },
          {
            trait_type: 'Farcaster Username',
            value: farcasterUsername,
          },
          {
            trait_type: 'Farcaster ID',
            value: fid.toString(),
          },
          {
            trait_type: 'Owner',
            value: walletAddress,
          },
          {
            trait_type: 'Bio',
            value: bio,
          },
        ],
      },
    }

    // Return transaction data untuk di-sign client
    return NextResponse.json({
      success: true,
      registration: registrationData,
      contractAddress: CONTRACT_ADDRESS,
      chainId: parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '42220'),
      rpcUrl: process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org',
      timestamp: new Date().toISOString(),
      message: 'Prepare to sign transaction with your wallet',
    })
  } catch (error) {
    console.error('Error preparing domain registration:', error)
    return NextResponse.json(
      { error: 'Registration preparation failed' },
      { status: 500 }
    )
  }
}


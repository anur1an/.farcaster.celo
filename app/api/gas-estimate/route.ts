import { NextRequest, NextResponse } from 'next/server'
import { estimateRegistrationCost } from '@/lib/blockchain'

export async function GET(request: NextRequest) {
  try {
    const gasEstimate = await estimateRegistrationCost()

    return NextResponse.json({
      ...gasEstimate,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error estimating gas:', error)

    // More realistic Celo mainnet fallback: 120,000 gas × 1 gwei
    const fallbackGasWei = '120000000000000' // 120,000 gas in wei at 1 gwei
    return NextResponse.json(
      {
        gasEstimate: '120000000000000000', // 120,000 gas units
        gasPrice: '1000000000', // 1 gwei
        totalCostWei: fallbackGasWei,
        totalCostCELO: '0.00012',
        totalCostUSD: '0.24',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }
}

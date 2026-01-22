import { ethers } from 'ethers'

const CELO_RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'
const CELO_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '42220')
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS || ''
const REGISTRATION_FEE_USD = parseFloat(process.env.NEXT_PUBLIC_REGISTRATION_FEE_USD || '0.25')
// Real Celo mainnet gas price is typically 0.5-1 gwei (much lower than Ethereum)
const DEFAULT_GAS_PRICE_GWEI = parseFloat(process.env.NEXT_PUBLIC_GAS_PRICE_GWEI || '1')

export function getCeloProvider() {
  return new ethers.JsonRpcProvider(CELO_RPC_URL, {
    chainId: CELO_CHAIN_ID,
    name: 'celo-mainnet',
  })
}

export async function getGasPrice() {
  const provider = getCeloProvider()
  try {
    const feeData = await provider.getFeeData()
    // Celo mainnet gas price is usually in wei, return it directly
    if (feeData.gasPrice && feeData.gasPrice > BigInt(0)) {
      return feeData.gasPrice
    }
    // Fallback to reasonable Celo gas price (1 gwei = 1000000000 wei)
    return ethers.parseUnits(DEFAULT_GAS_PRICE_GWEI.toString(), 'gwei')
  } catch (error) {
    console.warn('Error getting fee data from Celo, using default:', error)
    return ethers.parseUnits(DEFAULT_GAS_PRICE_GWEI.toString(), 'gwei')
  }
}

/**
 * Get real wallet balance from Celo mainnet
 */
export async function getWalletBalance(address: string): Promise<string> {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid wallet address')
    }

    const provider = getCeloProvider()
    const balanceWei = await provider.getBalance(address)
    const balanceCELO = ethers.formatEther(balanceWei)
    return balanceCELO
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    return '0'
  }
}

/**
 * Get real ENS-like domain registry data
 * This queries the smart contract for registered domains
 */
export async function getRegisteredDomainsByOwner(ownerAddress: string): Promise<string[]> {
  try {
    if (!ethers.isAddress(ownerAddress)) {
      throw new Error('Invalid owner address')
    }

    if (!CONTRACT_ADDRESS) {
      console.warn('CONTRACT_ADDRESS not configured, returning empty domains')
      return []
    }

    const provider = getCeloProvider()
    
    // Basic contract ABI for domain registry (minimal interface)
    const ABI = [
      'function getDomainsByOwner(address owner) view returns (string[])',
      'function getDomain(string name) view returns (tuple(string name, address owner, uint256 expiresAt, bool active))',
      'function isAvailable(string name) view returns (bool)',
    ]

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
      const domains = await contract.getDomainsByOwner(ownerAddress)
      return domains || []
    } catch (error) {
      console.warn('Error querying contract for domains:', error)
      return []
    }
  } catch (error) {
    console.error('Error getting registered domains:', error)
    return []
  }
}

/**
 * Check if a domain is available on the blockchain
 */
export async function checkDomainAvailability(domain: string): Promise<boolean> {
  try {
    if (!domain || domain.length < 3) {
      throw new Error('Invalid domain name')
    }

    if (!CONTRACT_ADDRESS) {
      console.warn('CONTRACT_ADDRESS not configured, cannot check availability')
      return false
    }

    const provider = getCeloProvider()
    
    const ABI = [
      'function isAvailable(string name) view returns (bool)',
    ]

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
      const available = await contract.isAvailable(domain)
      return available
    } catch (error) {
      console.warn('Error checking domain availability:', error)
      // If contract call fails, assume not available
      return false
    }
  } catch (error) {
    console.error('Error checking domain:', error)
    return false
  }
}

/**
 * Get domain info from blockchain
 */
export async function getDomainInfo(domain: string): Promise<{
  name: string
  owner: string
  expiresAt: number
  active: boolean
} | null> {
  try {
    if (!domain || domain.length < 3) {
      throw new Error('Invalid domain name')
    }

    if (!CONTRACT_ADDRESS) {
      console.warn('CONTRACT_ADDRESS not configured')
      return null
    }

    const provider = getCeloProvider()
    
    const ABI = [
      'function getDomain(string name) view returns (tuple(string name, address owner, uint256 expiresAt, bool active))',
    ]

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
      const domainInfo = await contract.getDomain(domain)
      return {
        name: domainInfo.name,
        owner: domainInfo.owner,
        expiresAt: Number(domainInfo.expiresAt),
        active: domainInfo.active,
      }
    } catch (error) {
      console.warn('Error getting domain info:', error)
      return null
    }
  } catch (error) {
    console.error('Error getting domain info:', error)
    return null
  }
}

export async function estimateRegistrationCost(): Promise<{
  gasEstimate: string
  gasPrice: string
  totalCostWei: string
  totalCostCELO: string
  totalCostUSD: string
}> {
  try {
    const gasPrice = await getGasPrice()
    // Realistic gas estimate for domain registration: 100,000 - 150,000 gas
    // Using 120,000 as average
    const estimatedGasUnits = BigInt(120000)
    const estimatedGasWei = gasPrice * estimatedGasUnits

    const totalCostCELO = ethers.formatEther(estimatedGasWei)
    // REGISTRATION_FEE_USD is the domain fee, not tied to gas cost
    // Calculate realistic USD amount based on actual CELO/USD rate (~1.5-2.5 USD per CELO on Celo)
    const celoToUSD = 2.0 // Conservative estimate
    const totalCostUSD = (parseFloat(totalCostCELO) * celoToUSD + REGISTRATION_FEE_USD).toFixed(4)

    return {
      gasEstimate: estimatedGasWei.toString(),
      gasPrice: gasPrice.toString(),
      totalCostWei: estimatedGasWei.toString(),
      totalCostCELO: parseFloat(totalCostCELO).toFixed(6),
      totalCostUSD,
    }
  } catch (error) {
    console.error('Error estimating gas:', error)
    // Fallback: reasonable Celo estimate (120,000 gas × 1 gwei)
    const fallbackGas = ethers.parseUnits('0.00012', 'ether')
    const fallbackCELO = ethers.formatEther(fallbackGas)
    return {
      gasEstimate: fallbackGas.toString(),
      gasPrice: ethers.parseUnits(DEFAULT_GAS_PRICE_GWEI.toString(), 'gwei').toString(),
      totalCostWei: fallbackGas.toString(),
      totalCostCELO: fallbackCELO,
      totalCostUSD: (parseFloat(fallbackCELO) * 2.0 + REGISTRATION_FEE_USD).toFixed(4),
    }
  }
}

export function validateDomainName(domain: string): {
  isValid: boolean
  error?: string
} {
  if (!domain) {
    return { isValid: false, error: 'Domain name is required' }
  }

  if (domain.length < 3) {
    return { isValid: false, error: 'Domain must be at least 3 characters' }
  }

  if (domain.length > 63) {
    return { isValid: false, error: 'Domain must be at most 63 characters' }
  }

  if (!/^[a-z0-9-]+$/.test(domain)) {
    return {
      isValid: false,
      error: 'Domain can only contain lowercase letters, numbers, and hyphens',
    }
  }

  if (domain.startsWith('-') || domain.endsWith('-')) {
    return { isValid: false, error: 'Domain cannot start or end with a hyphen' }
  }

  return { isValid: true }
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatCELOAmount(amount: string, decimals: number = 4): string {
  try {
    const num = parseFloat(amount)
    return num.toFixed(decimals)
  } catch {
    return '0'
  }
}

export async function getContractABI() {
  try {
    const response = await fetch('/NameRegistry.json')
    const data = await response.json()
    return data.abi
  } catch (error) {
    console.error('Error fetching contract ABI:', error)
    return []
  }
}

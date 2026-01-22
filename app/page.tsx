'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/Logo'
import { DomainSearch } from '@/components/DomainSearch'
import { RegistrationForm, type RegistrationData } from '@/components/RegistrationForm'
import { MintTransactionHandler } from '@/components/MintTransactionHandler'
import { NFTGallery } from '@/components/NFTGallery'
import { WalletStatus } from '@/components/WalletStatus'
import { Code, FileText, Network, Zap } from 'lucide-react'
import type { GasEstimate } from '@/lib/types'

export default function Home() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [farcasterData, setFarcasterData] = useState<any>(null)
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [activeTab, setActiveTab] = useState('register')
  const [showMintTransaction, setShowMintTransaction] = useState(false)
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null)

  useEffect(() => {
    const fetchGasEstimate = async () => {
      try {
        const response = await fetch('/api/gas-estimate')
        if (response.ok) {
          const data = await response.json()
          setGasEstimate(data)
        }
      } catch (error) {
        console.error('Error fetching gas estimate:', error)
      }
    }

    fetchGasEstimate()
    const interval = setInterval(fetchGasEstimate, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleWalletConnect = async () => {
    setWalletConnected(true)
  }

  const handleAccountChange = (account: any) => {
    if (account?.isConnected) {
      setWalletConnected(true)
      setWalletAddress(account.address)
      if (account.farcasterData) {
        setFarcasterData(account.farcasterData)
      }
    } else {
      setWalletConnected(false)
      setWalletAddress(null)
      setFarcasterData(null)
    }
  }

  const handleRegistration = async (data: RegistrationData) => {
    console.log('[Home] Registration data:', data)
    setRegistrationData(data)
    setShowMintTransaction(true)
  }

  const handleMintSuccess = (txHash: string) => {
    console.log('[Home] Mint successful:', txHash)
    setShowMintTransaction(false)
    setSelectedDomain(null)
    setRegistrationData(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 animate-shimmer"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Logo />

        <div className="mt-8 space-y-6">
          <Card className="p-6 dashboard-card animate-fade-in-down">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold gradient-text">Farcaster Names</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Own your Farcaster identity with a verifiable NFT domain on Celo mainnet. Permanently yours, transparent pricing, zero restrictions.
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <WalletStatus
              onConnect={handleWalletConnect}
              onAccountChange={handleAccountChange}
              gasPrice={gasEstimate?.totalCostUSD}
              autoFetchFarcasterData={true}
            />
          </div>

          {walletConnected && walletAddress && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 animate-fade-in-up">
                <TabsTrigger value="register" className="gap-2">
                  <Code className="w-4 h-4" />
                  Register
                </TabsTrigger>
                <TabsTrigger value="mint" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Mint
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-2">
                  <FileText className="w-4 h-4" />
                  My NFTs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="register" className="space-y-6 animate-fade-in-up">
                <Card className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Find Your Perfect Domain</h3>
                    <DomainSearch onDomainSelect={setSelectedDomain} />
                  </div>

                  {selectedDomain && (
                    <div className="pt-6 border-t border-border">
                      <h3 className="font-semibold mb-4">Complete Registration</h3>
                      <RegistrationForm
                        domain={selectedDomain}
                        onSubmit={handleRegistration}
                        gasEstimate={gasEstimate}
                        autoMint={false}
                        walletAddress={walletAddress}
                      />
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="mint" className="space-y-6 animate-fade-in-up">
                <Card className="p-6 space-y-6">
                  {registrationData && showMintTransaction ? (
                    <div>
                      <h3 className="font-semibold mb-4">Mint Your NFT Domain</h3>
                      <MintTransactionHandler
                        domain={registrationData.domain}
                        fid={registrationData.farcasterFid}
                        username={registrationData.farcasterUsername}
                        bio={registrationData.bio}
                        socialLinks={registrationData.socialLinks}
                        walletAddress={walletAddress}
                        onSuccess={handleMintSuccess}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">
                        No pending registration. Register a domain first to mint.
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-6 animate-fade-in-up">
                <Card className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-4">Your Farcaster Name NFTs</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      View and manage your registered domains and NFTs on OpenSea
                    </p>
                  </div>
                  <NFTGallery owner={walletAddress} />
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <Card className="p-6 space-y-6 dashboard-card animate-slide-up">
            <h3 className="font-semibold text-lg">How It Works</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-all duration-300 animate-float">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary mb-3">
                  1
                </div>
                <p className="font-medium mb-1">Connect Wallet</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Auto-connects and reads your FID from Neynar API automatically
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5 hover:from-secondary/15 hover:to-secondary/10 transition-all duration-300 animate-float" style={{ animationDelay: '0.2s' }}>
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center text-sm font-bold text-secondary mb-3">
                  2
                </div>
                <p className="font-medium mb-1">Auto-Generate Domain</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Domain name auto-generated from your Farcaster username or FID
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 hover:from-accent/15 hover:to-accent/10 transition-all duration-300 animate-float" style={{ animationDelay: '0.4s' }}>
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-bold text-accent mb-3">
                  3
                </div>
                <p className="font-medium mb-1">Mint NFT with Popup</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Sign transaction in wallet popup for on-chain minting
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5 space-y-3 dashboard-card animate-slide-up group cursor-pointer hover:glow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-primary mb-1">Verified by Neynar</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your FID is automatically verified via Neynar API
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5 space-y-3 dashboard-card animate-slide-up group cursor-pointer hover:glow" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-accent mb-1">Real On-Chain Minting</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Domains are minted as real NFTs on Celo mainnet
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12 text-center text-xs text-muted-foreground border-t border-border pt-8 pb-8">
          <p>Farcaster Names © 2026 • Powered by Celo Mainnet • Verified by Neynar API</p>
        </div>
      </div>
    </div>
  )
}

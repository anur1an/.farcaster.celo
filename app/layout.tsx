import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { WalletProvider } from '@/components/wallet-provider'
import './globals.css'
import { FarcasterReady } from "@/components/FarcasterReady"
import { FarcasterSDKProvider } from "@/components/farcaster-sdk-provider"
import { ReactQueryProvider } from "@/components/react-query-provider"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://farcaster-celo.vercel.app'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#8A63D2',
}

export const metadata: Metadata = {
  title: 'Farcaster Names - .celo Domain Registry',
  description: 'Register and manage .farcaster.celo domain names with NFT functionality on Celo mainnet',
  generator: 'Farcaster Mini App',
  manifest: '/manifest.json',
  applicationName: 'Farcaster Names',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Farcaster Names',
    startupImage: '/hero-logo.png',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo-192-v2.png',
    apple: '/logo-512-v2.png',
    other: [
      {
        rel: 'icon',
        url: '/logo-192-v2.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        rel: 'mask-icon',
        url: '/hero-logo.png',
        color: '#8A63D2',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'Farcaster Names - Register .celo Domains',
    description: 'Own your Farcaster identity with a verifiable NFT domain on Celo mainnet',
    siteName: 'Farcaster Names',
    images: [
      {
        url: `${APP_URL}/hero-logo.png`,
        width: 1200,
        height: 400,
        alt: 'Farcaster Names',
        type: 'image/png',
      },
      {
        url: `${APP_URL}/logo-512-v2.png`,
        width: 512,
        height: 512,
        alt: 'Farcaster Names Logo',
        type: 'image/png',
      },
    ],
  },
  metadataBase: new URL(APP_URL),
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${APP_URL}/api/frame`,
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:post_url': `${APP_URL}/api/frame`,
    'fc:frame:button:1': 'Register Domain',
    'fc:frame:button:1:action': 'post',
    'fc:frame:button:2': 'My Domains',
    'fc:frame:button:2:action': 'post',
    'fc:frame:button:3': 'Visit App',
    'fc:frame:button:3:action': 'link',
    'fc:frame:button:3:target': APP_URL,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#8A63D2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Farcaster Names" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="color-scheme" content="dark light" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo-192-v2.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-512-v2.png" />
      </head>
      <body className={`font-sans antialiased`}>
        {/* FarcasterReady signals to Warpcast that the app has finished loading */}
        <FarcasterReady />
        <WalletProvider>
          <FarcasterSDKProvider>
            {children}
          </FarcasterSDKProvider>
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  )
}

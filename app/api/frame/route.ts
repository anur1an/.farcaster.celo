import { NextRequest, NextResponse } from 'next/server'
import {
  createFrameResponse,
  generateFrameImage,
  parseFrameState,
  encodeFrameState,
  type FrameState,
  type FrameRequest,
} from '@/lib/frame-utils'

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FARCASTER_FRAME_URL || 'http://localhost:3000'
  
  try {
    const body = (await request.json()) as FrameRequest

    const fid = body.untrustedData?.fid
    const buttonIndex = body.untrustedData?.buttonIndex
    const inputText = body.untrustedData?.inputText

    const currentState = parseFrameState(body.untrustedData?.state)

    let nextState: FrameState = {
      ...currentState,
      userFid: fid,
      walletConnected: true,
    }

    let image: string
    let buttons: Array<{ label: string; action: string; target?: string }> = []
    let postUrl: string

    switch (buttonIndex) {
      case 1:
        nextState.page = 'search'
        image = generateFrameImage(
          'Find Your Domain',
          'Search for available .farcaster.celo domains'
        )
        buttons = [
          { label: 'Back', action: 'post' },
          { label: 'Continue', action: 'post' },
        ]
        break

      case 2:
        if (inputText) {
          nextState.page = 'register'
          nextState.selectedDomain = inputText
          image = generateFrameImage(
            `Register ${inputText}.farcaster.celo`,
            'Complete your domain registration'
          )
          buttons = [
            { label: 'Back', action: 'post' },
            { label: 'Register Now', action: 'post' },
          ]
        } else {
          image = generateFrameImage(
            'Enter Domain Name',
            'Type your desired domain name'
          )
          buttons = [
            { label: 'Back', action: 'post' },
            { label: 'Check Availability', action: 'post' },
          ]
        }
        break

      case 3:
        nextState.page = 'gallery'
        image = generateFrameImage(
          'Your Domains',
          'View and manage your .farcaster.celo domains'
        )
        buttons = [
          { label: 'Back', action: 'post' },
          {
            label: 'View on OpenSea',
            action: 'link',
            target: 'https://opensea.io/collection/farcaster-names',
          },
        ]
        break

      default:
        nextState.page = 'home'
        image = generateFrameImage(
          'Farcaster Names',
          'Register .farcaster.celo domains with NFT functionality on Celo mainnet'
        )
        buttons = [
          { label: 'Register Domain', action: 'post' },
          { label: 'My Domains', action: 'post' },
          {
            label: 'Visit App',
            action: 'link',
            target: baseUrl,
          },
        ]
    }

    postUrl = `${baseUrl}/api/frame`
    const state = encodeFrameState(nextState)

    const response = createFrameResponse({
      image,
      buttons: buttons.map((btn) => ({
        label: btn.label,
        action: (btn.action as 'post' | 'link' | 'post_redirect' | 'mint') || 'post',
        target: btn.target,
      })),
      postUrl,
      state,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing frame request:', error)

    const fallbackResponse = createFrameResponse({
      image: generateFrameImage(
        'Farcaster Names',
        'Register .farcaster.celo domains on Celo mainnet'
      ),
      buttons: [
        { label: 'Try Again', action: 'post' },
        {
          label: 'Visit App',
          action: 'link',
          target: baseUrl,
        },
      ],
      postUrl: `${baseUrl}/api/frame`,
    })

    return NextResponse.json(fallbackResponse)
  }
}

export async function GET(request: NextRequest) {
  try {
    const frameUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FARCASTER_FRAME_URL || 'http://localhost:3000'
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Farcaster Names</title>
      
      <!-- Open Graph -->
      <meta property="og:title" content="Farcaster Names - Register .celo Domains" />
      <meta property="og:description" content="Own your Farcaster identity with a verifiable NFT domain on Celo mainnet" />
      <meta property="og:image" content="${frameUrl}/api/frame" />
      <meta property="og:url" content="${frameUrl}" />
      
      <!-- Farcaster Frame -->
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${frameUrl}/api/frame" />
      <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
      <meta property="fc:frame:post_url" content="${frameUrl}/api/frame" />
      <meta property="fc:frame:button:1" content="Register Domain" />
      <meta property="fc:frame:button:1:action" content="post" />
      <meta property="fc:frame:button:2" content="My Domains" />
      <meta property="fc:frame:button:2:action" content="post" />
      <meta property="fc:frame:button:3" content="Visit App" />
      <meta property="fc:frame:button:3:action" content="link" />
      <meta property="fc:frame:button:3:target" content="${frameUrl}" />
      
      <style>
        body { margin: 0; padding: 20px; font-family: system-ui; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #8A63D2; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Farcaster Names</h1>
        <p>Register .farcaster.celo domain names with NFT functionality on Celo mainnet</p>
        <p>Open this link in Warpcast to interact with the frame!</p>
      </div>
    </body>
    </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'max-age=0, no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error in frame GET handler:', error)
    return new NextResponse('Error loading frame', { status: 500 })
  }
}

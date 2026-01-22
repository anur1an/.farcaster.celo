import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'linear-gradient(135deg, #8A63D2 0%, #35C759 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                margin: 0,
              }}
            >
              Farcaster Names
            </div>
            <div
              style={{
                fontSize: '40px',
                color: 'rgba(255,255,255,0.9)',
                margin: '0 40px',
                fontWeight: '600',
              }}
            >
              Register .celo domains
            </div>
            <div
              style={{
                fontSize: '24px',
                color: 'rgba(255,255,255,0.7)',
                margin: '10px 0 0 0',
              }}
            >
              On Celo Mainnet • Mint as NFT • Powered by Farcaster
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Frame image error:', error)
    return new Response('Error generating frame image', { status: 500 })
  }
}

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backgroundImage: 
              'radial-gradient(circle at 25px 25px, rgba(30, 41, 59, 0.2) 2%, transparent 0%), ' +
              'radial-gradient(circle at 75px 75px, rgba(30, 41, 59, 0.2) 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(30, 41, 59, 0.5)',
              borderRadius: '24px',
              padding: '40px 80px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Logo */}
            <img
              src="https://topledger.xyz/assets/images/logo/topledger-full.svg"
              alt="Top Ledger Logo"
              width="400"
              height="80"
              style={{ marginBottom: '20px' }}
            />
            
            {/* Title */}
            <div
              style={{
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: '-0.05em',
                background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 50%, #10B981 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: '10px'
              }}
            >
              Top Ledger Research
            </div>
            
            {/* Description */}
            <div
              style={{
                fontSize: 28,
                color: 'rgba(156, 163, 175, 1)',
                marginTop: '10px',
                textAlign: 'center',
              }}
            >
              Real-time analytics and insights for the Solana ecosystem
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error: any) {
    console.log(`${error.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 
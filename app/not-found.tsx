"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; type: string }>>([]);

  // Track mouse position for subtle interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const createRipple = (e: React.MouseEvent) => {
    // Get click position relative to the viewport
    const x = e.clientX;
    const y = e.clientY;
    const id = Date.now();
    
    // Random analytics-themed ripple types
    const rippleTypes = ['chart', 'data', 'metric', 'pulse'];
    const type = rippleTypes[Math.floor(Math.random() * rippleTypes.length)];
    
    setRipples(prev => [...prev, { id, x, y, type }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 2500);
  };

  const getRippleStyle = (type: string) => {
    switch (type) {
      case 'chart':
        return {
          border: '3px solid rgba(70, 130, 180, 0.6)',
          background: 'radial-gradient(circle, rgba(70, 130, 180, 0.1) 0%, transparent 70%)',
        };
      case 'data':
        return {
          border: '2px solid rgba(34, 197, 94, 0.5)',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)',
        };
      case 'metric':
        return {
          border: '3px solid rgba(168, 85, 247, 0.5)',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        };
      case 'pulse':
        return {
          border: '2px solid rgba(59, 130, 246, 0.6)',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
        };
      default:
        return {
          border: '2px solid rgba(70, 130, 180, 0.4)',
          background: 'transparent',
        };
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black relative overflow-hidden flex items-center justify-center cursor-pointer"
      onClick={createRipple}
    >
      {/* Enhanced Analytics-themed Ripple effects */}
      {ripples.map((ripple) => (
        <div key={ripple.id} className="fixed pointer-events-none z-30">
          {/* Main ripple circle */}
          <div
            className="absolute rounded-full animate-ping"
            style={{
              left: ripple.x - 60,
              top: ripple.y - 60,
              width: '120px',
              height: '120px',
              animationDuration: '2.5s',
              ...getRippleStyle(ripple.type)
            }}
          />
          
          {/* Secondary ripple */}
          <div
            className="absolute rounded-full animate-ping"
            style={{
              left: ripple.x - 40,
              top: ripple.y - 40,
              width: '80px',
              height: '80px',
              animationDuration: '2s',
              animationDelay: '0.3s',
              border: `2px solid ${ripple.type === 'chart' ? 'rgba(70, 130, 180, 0.4)' : 
                                   ripple.type === 'data' ? 'rgba(34, 197, 94, 0.3)' :
                                   ripple.type === 'metric' ? 'rgba(168, 85, 247, 0.3)' :
                                   'rgba(59, 130, 246, 0.4)'}`,
            }}
          />

          {/* Data point center */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              left: ripple.x - 6,
              top: ripple.y - 6,
              width: '12px',
              height: '12px',
              background: ripple.type === 'chart' ? '#4682b4' : 
                         ripple.type === 'data' ? '#22c55e' :
                         ripple.type === 'metric' ? '#a855f7' :
                         '#3b82f6',
              animationDuration: '1s',
              boxShadow: `0 0 20px ${ripple.type === 'chart' ? 'rgba(70, 130, 180, 0.6)' : 
                                    ripple.type === 'data' ? 'rgba(34, 197, 94, 0.6)' :
                                    ripple.type === 'metric' ? 'rgba(168, 85, 247, 0.6)' :
                                    'rgba(59, 130, 246, 0.6)'}`
            }}
          />

          {/* Analytics-themed floating elements */}
          {ripple.type === 'chart' && (
            <>
              <div
                className="absolute animate-bounce"
                style={{
                  left: ripple.x - 25,
                  top: ripple.y - 35,
                  animationDuration: '2s',
                  animationDelay: '0.5s'
                }}
              >
                <div className="w-2 h-6 bg-blue-400/60 rounded-sm"></div>
              </div>
              <div
                className="absolute animate-bounce"
                style={{
                  left: ripple.x - 15,
                  top: ripple.y - 30,
                  animationDuration: '2s',
                  animationDelay: '0.7s'
                }}
              >
                <div className="w-2 h-4 bg-blue-400/60 rounded-sm"></div>
              </div>
              <div
                className="absolute animate-bounce"
                style={{
                  left: ripple.x - 5,
                  top: ripple.y - 40,
                  animationDuration: '2s',
                  animationDelay: '0.9s'
                }}
              >
                <div className="w-2 h-8 bg-blue-400/60 rounded-sm"></div>
              </div>
            </>
          )}

          {ripple.type === 'data' && (
            <>
              <div
                className="absolute text-green-400/70 text-xs font-mono animate-fade-in-out"
                style={{
                  left: ripple.x - 20,
                  top: ripple.y - 45,
                  animationDuration: '2s'
                }}
              >
                +24.5%
              </div>
              <div
                className="absolute text-green-400/50 text-xs font-mono animate-fade-in-out"
                style={{
                  left: ripple.x + 10,
                  top: ripple.y - 35,
                  animationDuration: '2s',
                  animationDelay: '0.5s'
                }}
              >
                1.2M
              </div>
            </>
          )}

          {ripple.type === 'metric' && (
            <div
              className="absolute animate-spin"
              style={{
                left: ripple.x - 15,
                top: ripple.y - 15,
                animationDuration: '3s'
              }}
            >
              <svg width="30" height="30" viewBox="0 0 30 30" className="text-purple-400/60">
                <circle cx="15" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" />
              </svg>
            </div>
          )}

          {ripple.type === 'pulse' && (
            <>
              <div
                className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
                style={{
                  left: ripple.x - 30,
                  top: ripple.y - 20,
                  animationDelay: '0.2s'
                }}
              />
              <div
                className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
                style={{
                  left: ripple.x + 25,
                  top: ripple.y - 15,
                  animationDelay: '0.4s'
                }}
              />
              <div
                className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
                style={{
                  left: ripple.x - 10,
                  top: ripple.y + 30,
                  animationDelay: '0.6s'
                }}
              />
            </>
          )}
        </div>
      ))}

      {/* Subtle background grid */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(70, 130, 180, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(70, 130, 180, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Subtle floating orbs */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-32 right-32 w-40 h-40 bg-purple-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-teal-500/4 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }} />

      {/* Subtle mouse follower */}
      <div
        className="fixed pointer-events-none z-10 w-6 h-6 border border-blue-400/20 rounded-full transition-all duration-500 ease-out"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transform: `scale(${isHovering ? 1.5 : 1})`,
          borderColor: isHovering ? 'rgba(70, 130, 180, 0.4)' : 'rgba(70, 130, 180, 0.2)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-20 text-center px-6 max-w-2xl mx-auto pointer-events-none">
        {/* Clean 404 Typography */}
        <div className="mb-8">
          <h1 className="text-7xl md:text-8xl font-light text-gray-300 leading-none tracking-wider mb-4">
            404
          </h1>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent mx-auto mb-6"></div>
          <h2 className="text-xl md:text-2xl font-light text-gray-400 mb-2">
          Not here. Not now.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          But don’t worry, we’ve got better pages to explore.
          </p>
        </div>

        {/* Interactive Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGoBack();
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-6 py-3 bg-gray-900/50 border border-gray-800 text-gray-300 font-medium rounded-lg overflow-hidden transition-all duration-300 hover:border-blue-400/50 hover:text-white hover:bg-gray-900/70 backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </div>
          </button>

          <Link
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={(e) => e.stopPropagation()}
            className="group relative px-6 py-3 border border-blue-400/30 text-blue-400 font-medium rounded-lg overflow-hidden transition-all duration-300 hover:border-blue-400/60 hover:text-white hover:bg-blue-500/10 backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </div>
          </Link>
        </div>

        {/* Interactive Hint */}
        
      </div>

      {/* Subtle corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-gray-800/30" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-gray-800/30" />

      <style jsx>{`
        @keyframes fade-in-out {
          0%, 100% { opacity: 0; transform: translateY(10px); }
          50% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out;
        }
      `}</style>
    </div>
  );
} 
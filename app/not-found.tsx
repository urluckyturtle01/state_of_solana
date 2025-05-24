"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function NotFound() {
  const router = useRouter();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(initialParticles);
  }, []);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: (particle.x + particle.vx + window.innerWidth) % window.innerWidth,
        y: (particle.y + particle.vy + window.innerHeight) % window.innerHeight,
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Track mouse position
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-blue-400"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              transform: `translate(-50%, -50%)`,
              boxShadow: `0 0 ${particle.size * 2}px rgba(59, 130, 246, 0.3)`,
            }}
          />
        ))}
      </div>

      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-16 h-16 border-2 border-purple-400/30 rotate-45 animate-pulse" />
        <div className="absolute top-40 right-32 w-12 h-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-bounce" />
        <div className="absolute bottom-32 left-40 w-8 h-8 border border-teal-400/40 transform rotate-12 animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-20 right-20 w-20 h-20 border-2 border-green-400/20 rounded-full animate-pulse" />
      </div>

      {/* Mouse Follower */}
      <div
        className="fixed pointer-events-none z-10 w-8 h-8 border-2 border-blue-400/50 rounded-full transition-all duration-300 ease-out"
        style={{
          left: mousePosition.x - 16,
          top: mousePosition.y - 16,
          transform: `scale(${isHovering ? 1.5 : 1})`,
          borderColor: isHovering ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.5)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[6rem] md:text-[6rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-teal-400 leading-none select-none">
            
          </h1>
          <div className="absolute inset-0 text-[12rem] md:text-[16rem] font-black text-blue-400/10 leading-none animate-pulse">
            404
          </div>
        </div>

        {/* Glitch Effect Text */}
        <div className="relative mb-8">
          <h2 className="text-4xl md:text-4xl font-medium text-white mb-4 relative">
            <span className="relative z-10">Page Not Found</span>
            <span className="absolute inset-0 text-red-500 animate-pulse opacity-30 transform translate-x-1">
              Page Not Found
            </span>
            <span className="absolute inset-0 text-blue-500 animate-pulse opacity-20 transform -translate-x-1">
              Page Not Found
            </span>
          </h2>
        </div>

        {/* Description */}
        <p className="text-xl md:text-xl text-gray-300 mb-12 leading-relaxed">
          Oops! Looks like you've ventured into the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-semibold">
            digital void
          </span>
          .<br />
          The page you're looking for doesn't exist in this dimension.
        </p>

        {/* Interactive Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={handleGoBack}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </div>
          </button>

          <Link
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-8 py-4 border-2 border-teal-400 text-teal-400 font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:text-black"
          >
            <div className="absolute inset-0 bg-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="relative flex items-center gap-2">
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </div>
          </Link>
        </div>

        {/* Fun Interactive Element */}
        <div className="mt-16">
          <p className="text-gray-400 text-sm mb-4">
            Try clicking around to create some magic ✨
          </p>
          <div 
            className="inline-block cursor-pointer"
            onClick={(e) => {
              // Create ripple effect
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              
              const ripple = document.createElement('div');
              ripple.className = 'absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-50 animate-ping pointer-events-none';
              ripple.style.left = x + 'px';
              ripple.style.top = y + 'px';
              ripple.style.width = '20px';
              ripple.style.height = '20px';
              ripple.style.transform = 'translate(-50%, -50%)';
              
              e.currentTarget.appendChild(ripple);
              setTimeout(() => ripple.remove(), 1000);
            }}
          >
            <div className="text-6xl animate-bounce hover:animate-spin transition-all duration-300 cursor-pointer select-none">
              🚀
            </div>
          </div>
        </div>
      </div>

      {/* Ambient Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
} 
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { LandingPageChart, sampleChartData } from '../components/LandingPageChart';
import { generateNextMetadata, generateStructuredData } from '../seo-metadata';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Sample chart data for tabs
const chartTabs = [
  { 
    id: 'fees', 
    label: 'Protocol Fees', 
    description: 'Revenue generated across top DeFi protocols',
    data: sampleChartData.fees
  },
  { 
    id: 'users', 
    label: 'Daily Active Users', 
    description: 'User engagement across major dApps',
    data: sampleChartData.users
  },
  { 
    id: 'volume', 
    label: 'Trading Volume', 
    description: 'DEX trading activity and liquidity flows',
    data: sampleChartData.volume
  },
  { 
    id: 'loans', 
    label: 'Active Loans', 
    description: 'Lending protocol utilization metrics',
    data: sampleChartData.loans
  },
  { 
    id: 'stablecoins', 
    label: 'Stablecoin Transfers', 
    description: 'Payment and settlement activity',
    data: sampleChartData.stablecoins
  }
];

// Client logos
const clientLogos = [
  { name: 'Solana Foundation', logo: '🔷' },
  { name: 'Helium', logo: '📡' },
  { name: 'Raydium', logo: '🌊' },
  { name: 'Orca', logo: '🐋' },
  { name: 'Marinade', logo: '🥩' },
  { name: 'Jupiter', logo: '🪐' },
  { name: 'Drift', logo: '🎯' },
  { name: 'Metaplex', logo: '🎨' },
];

// Features data
const features = [
  {
    title: 'Unified Metrics',
    description: 'All protocol data in one place. Real-time dashboards that make sense of complex on-chain activity.',
    icon: '📊'
  },
  {
    title: 'Research-Grade Tools',
    description: 'Built for analysts and researchers. Export data, customize views, and generate insights with confidence.',
    icon: '🔬'
  },
  {
    title: 'Always Real-Time',
    description: 'Live data streams from 100+ protocols. Never miss a trend or market movement again.',
    icon: '⚡'
  }
];

// Testimonials
const testimonials = [
  {
    quote: "Top Ledger transformed how we analyze Solana protocols. The real-time insights are invaluable for our research.",
    author: "Research Lead, Major DeFi Protocol",
    role: "Head of Analytics"
  },
  {
    quote: "Finally, a platform that understands what analysts actually need. Clean data, powerful tools, zero hassle.",
    author: "Investment Manager",
    role: "Crypto Fund"
  },
  {
    quote: "The depth of metrics and ease of use is unmatched. It's become essential for our daily protocol monitoring.",
    author: "Strategy Lead",
    role: "Blockchain Infrastructure"
  }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const logoStripRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Auto-switch tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % chartTabs.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Hero animations
      gsap.fromTo('.hero-content', 
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 }
      );

      // Parallax hero background
      gsap.to('.hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

      // Chart section animation
      ScrollTrigger.create({
        trigger: chartRef.current,
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.chart-container',
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
          );
        }
      });

      // Logo strip animation
      ScrollTrigger.create({
        trigger: logoStripRef.current,
        start: 'top 90%',
        onEnter: () => {
          gsap.fromTo('.logo-strip',
            { opacity: 0 },
            { opacity: 1, duration: 0.6 }
          );
        }
      });

      // Features staggered animation
      ScrollTrigger.create({
        trigger: featuresRef.current,
        start: 'top 70%',
        onEnter: () => {
          gsap.fromTo('.feature-card',
            { opacity: 0, y: 40 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.6, 
              ease: 'power2.out',
              stagger: 0.2 
            }
          );
        }
      });

      // Testimonials animation
      ScrollTrigger.create({
        trigger: testimonialsRef.current,
        start: 'top 70%',
        onEnter: () => {
          gsap.fromTo('.testimonial-card',
            { opacity: 0, y: 50 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.7, 
              ease: 'power2.out',
              stagger: 0.15 
            }
          );
        }
      });

      // CTA animation
      ScrollTrigger.create({
        trigger: ctaRef.current,
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.cta-content',
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }
          );
        }
      });

      // Footer animation
      ScrollTrigger.create({
        trigger: footerRef.current,
        start: 'top 90%',
        onEnter: () => {
          gsap.fromTo('.footer-content',
            { opacity: 0 },
            { opacity: 1, duration: 0.6 }
          );
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/home" className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Top Ledger
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin" className="text-gray-300 hover:text-white transition-colors">
              Admin
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="hero-bg absolute inset-0 bg-gradient-to-b from-gray-900/20 to-black"></div>
        <div className="hero-content relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-light mb-6 tracking-tight">
            On-Chain Intelligence,
            <br />
            <span className="font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Protocol metrics, market trends, and research tools in real-time.
          </p>
          <Link href="/dashboard" className="inline-flex items-center px-8 py-4 bg-white text-black rounded-full text-lg font-medium hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            Explore the Research App
            <span className="ml-2">→</span>
          </Link>
        </div>
      </section>

      {/* Tabbed Chart Section */}
      <section ref={chartRef} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="chart-container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-light mb-4">Real-Time Protocol Insights</h2>
              <p className="text-gray-400 text-lg">Live data from the Solana ecosystem</p>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-2 mb-8 bg-gray-900/30 p-2 rounded-2xl backdrop-blur-sm">
              {chartTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(index)}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === index
                      ? 'bg-white text-black shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chart Display */}
            <div className="relative bg-gray-900/20 rounded-3xl p-8 backdrop-blur-sm border border-gray-800">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-medium text-white mb-2">
                  {chartTabs[activeTab].label}
                </h3>
                <p className="text-gray-400">
                  {chartTabs[activeTab].description}
                </p>
              </div>
              
              {/* Interactive Chart */}
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl border border-gray-700/50 overflow-hidden">
                <LandingPageChart 
                  title={chartTabs[activeTab].label}
                  data={chartTabs[activeTab].data}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Logo Strip */}
      <section ref={logoStripRef} className="py-16 overflow-hidden">
        <div className="logo-strip">
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-wider">Trusted by Leading Protocols</p>
          </div>
          <div className="relative">
            <div className="flex animate-scroll space-x-16 items-center">
              {[...clientLogos, ...clientLogos].map((client, index) => (
                <div key={index} className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                  <span className="text-2xl">{client.logo}</span>
                  <span className="text-lg font-medium">{client.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Built for Research Excellence
            </div>
            <h2 className="text-4xl md:text-6xl font-light mb-6 tracking-tight">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
                understand on-chain activity
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Professional-grade tools designed for researchers, analysts, and decision makers in crypto
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="feature-card group">
                <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 p-10 rounded-3xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 backdrop-blur-sm">
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl">{feature.icon}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-semibold mb-4 text-white group-hover:text-blue-200 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-400 leading-relaxed mb-8 text-lg">
                      {feature.description}
                    </p>
                    
                    {/* Minimalistic CTA */}
                    <div className="flex items-center text-sm font-medium text-gray-500 group-hover:text-blue-400 transition-colors duration-300">
                      <span className="mr-2">Learn more</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Subtle glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-gray-500 mb-6">Ready to experience the difference?</p>
            <Link href="/dashboard" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:border-blue-400/50 transition-all duration-300 group">
              <span>Start exploring</span>
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="py-20 px-6 bg-gray-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">Loved by Researchers</h2>
            <p className="text-gray-400 text-lg">See what industry leaders are saying</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="bg-black/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-sm">
                  <div className="text-4xl text-gray-600 mb-4">"</div>
                  <p className="text-gray-300 mb-6 leading-relaxed italic">
                    {testimonial.quote}
                  </p>
                  <div>
                    <p className="font-medium text-white">{testimonial.author}</p>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bridge CTA */}
      <section ref={ctaRef} className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="cta-content">
            <h2 className="text-4xl md:text-5xl font-light mb-8">
              Ready to upgrade your
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
                on-chain research?
              </span>
            </h2>
            <Link href="/dashboard" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-lg font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25">
              Launch the Research App
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerRef} className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="footer-content text-center">
            <p className="text-gray-500 text-sm">
              © 2025 Top Ledger · 
              <a href="#" className="hover:text-white transition-colors ml-1">Twitter</a> · 
              <a href="#" className="hover:text-white transition-colors ml-1">GitHub</a> · 
              <a href="#" className="hover:text-white transition-colors ml-1">Blog</a> · 
              <a href="#" className="hover:text-white transition-colors ml-1">Contact</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        html {
          scroll-behavior: smooth;
        }

        /* Smooth scrolling for all browsers */
        * {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
} 
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from '@/app/contexts/AuthContext';
import UserProfile from './auth/UserProfile';

const menuItems = [
{ name: "Overview", path: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
{ name: "REV", path: "/rev", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
{ name: "MEV", path: "/mev", icon: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" },  
{ name: "Protocol Revenue", path: "/protocol-revenue", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
{ name: "Stablecoins", path: "/stablecoins", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
{ name: "DEX", path: "/dex", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
{ name: "Wrapped BTC", path: "/wrapped-btc", icon: "M16.56 11.57C17.15 10.88 17.5 9.98 17.5 9C17.5 7.14 16.23 5.57 14.5 5.13V3H12.5V5H10.5V3H8.5V5H5.5V7H7.5V17H5.5V19H8.5V21H10.5V19H12.5V21H14.5V19C16.71 19 18.5 17.21 18.5 15C18.5 13.55 17.72 12.27 16.56 11.57ZM9.5 7H13.5C14.6 7 15.5 7.9 15.5 9C15.5 10.1 14.6 11 13.5 11H9.5V7ZM14.5 17H9.5V13H14.5C15.6 13 16.5 13.9 16.5 15C16.5 16.1 15.6 17 14.5 17Z" },  
{ name: "Compute Units", path: "/compute-units", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" },
 
  { 
    name: "Projects", 
    path: "/projects", 
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    hasDropdown: true,
    subItems: [
      { 
        name: "Raydium", 
        path: "/projects/raydium",
        logo: "https://raydium.io/logo.png"
      },
      { 
        name: "Metaplex", 
        path: "/projects/metaplex",
        logo: "https://www.metaplex.com/images/favicon.png",
        status: "soon"
      },
      { 
        name: "Squads", 
        path: "/projects/squads",
        logo: "https://framerusercontent.com/images/pBwgF4du4byUGDzFtqxnLoQwZqU.png",
        status: "soon"
      },
      { 
        name: "Orca", 
        path: "/projects/orca",
        logo: "https://www.orca.so/favicon.ico",
        status: "soon"
      },
      { 
        name: "Jupiter", 
        path: "/projects/jupiter",
        logo: "https://jup.ag/favicon.ico",
        status: "soon"
      },
      { 
        name: "Pump Fun", 
        path: "/projects/pump-fun",
        logo: "https://pump.fun/logo.png",
        status: "soon"
      },
      { 
        name: "Helium", 
        path: "/projects/helium",
        logo: "https://framerusercontent.com/images/6TFcIJwmOq1tPat18K1XwdNNgdA.png",
        status: "soon"
      }
    ]
  },
  { name: "Explorer", path: "/explorer", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", requiresAuth: true, hidden: true },
{ name: "Dashboards", path: "/dashboards", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", requiresAuth: true, hidden: true },
 
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { isAuthenticated, openLoginModal } = useAuth();
  
  const toggleDropdown = (itemName: string) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
  };

  const handleNavigation = (item: any, e: React.MouseEvent) => {
    // Check if this item requires authentication
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      openLoginModal(item.path);
      return;
    }
    
    // For authenticated users on protected routes, force navigation
    if (item.requiresAuth && isAuthenticated) {
      e.preventDefault();
      router.push(item.path);
      return;
    }
    // For non-protected routes, normal navigation will proceed
  };

  return (
    <div className="h-screen w-48 bg-black text-gray-200 flex flex-col fixed border-r border-gray-900 shadow-xl">
      <div className="px-4 pt-4 pb-3">
        <div className="relative w-32 h-7 grayscale brightness-300 opacity-100">
          <Image
            src="https://topledger.xyz/assets/images/logo/topledger-full.svg?imwidth=384"
            alt="TopLedger Logo"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>
      </div>
      
      <div className="px-3 py-1">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
      </div>
      
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <ul className="space-y-2.5">
        {menuItems.filter(item => !item.hidden).map((item) => {
            // Check for exact paths first to avoid conflicts
            let isActive = false;
            let isSubItemActive = false;
            
            if (item && item.path === '/protocol-revenue' && pathname?.startsWith('/protocol-revenue')) {
              isActive = true;
            } else if (item && item.path === '/' && (
              pathname === '/' || 
              pathname?.startsWith('/market-dynamics') || 
              pathname?.startsWith('/network-usage') || 
              pathname?.startsWith('/dashboard')
            )) {
              isActive = true;
            } else if (item && item.path !== '/' && pathname?.startsWith(item.path) && item.path !== '/protocol-revenue') {
              isActive = true;
            }

            // Check if any sub-item is active
            if (item?.hasDropdown && item?.subItems) {
              isSubItemActive = item.subItems.some(subItem => pathname?.startsWith(subItem.path));
              if (isSubItemActive) {
                isActive = true;
              }
            }
              
            return (
              <li key={item?.name || 'unnamed'}>
                {item?.hasDropdown ? (
                  // Dropdown menu item
                  <div>
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-white bg-gray-900/70' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 min-w-5" 
                          fill={item?.name === "Wrapped BTC" ? "currentColor" : "none"}
                          viewBox="0 0 24 24" 
                          stroke={item?.name === "Wrapped BTC" ? "none" : "currentColor"}
                          strokeWidth={1.5}
                        >
                          <path 
                            strokeLinecap={item?.name === "Wrapped BTC" ? undefined : "round"} 
                            strokeLinejoin={item?.name === "Wrapped BTC" ? undefined : "round"} 
                            d={item?.icon || ''} 
                          />
                        </svg>
                        <span className="text-sm font-medium">{item?.name || 'Menu'}</span>
                      </div>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${
                          openDropdown === item.name ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown submenu */}
                    {openDropdown === item.name && item.subItems && (
                      <ul className="mt-2 ml-5 space-y-1.5 border-l border-gray-800 pl-3">
                        {item.subItems.map((subItem) => {
                          const isSubActive = pathname?.startsWith(subItem.path);
                          
                          return (
                            <li key={subItem.name}>
                              {subItem.status === "soon" ? (
                                <div className={`flex items-center gap-2 px-1 py-1.5 rounded-md text-sm transition-all duration-200 text-gray-500 cursor-not-allowed`}>
                                  {subItem.logo && (
                                    <div className="relative w-4 h-4 flex-shrink-0 opacity-50">
                                      <Image
                                        src={subItem.logo}
                                        alt={`${subItem.name} logo`}
                                        fill
                                        className="object-contain rounded-sm"
                                        sizes="16px"
                                      />
                                    </div>
                                  )}
                                  <span className="flex-1">{subItem.name}</span>
                                  <span className="text-[10px] text-[#00b781] opacity-60 font-medium"></span>
                                </div>
                              ) : (
                                <Link 
                                  href={subItem.path} 
                                  className={`flex items-center gap-2 px-1 py-1.5 rounded-md text-sm transition-all duration-200 ${
                                    isSubActive 
                                      ? 'text-white bg-gray-800/60' 
                                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                                  }`}
                                >
                                  {subItem.logo && (
                                    <div className="relative w-4 h-4 flex-shrink-0">
                                      <Image
                                        src={subItem.logo}
                                        alt={`${subItem.name} logo`}
                                        fill
                                        className="object-contain rounded-sm"
                                        sizes="16px"
                                      />
                                    </div>
                                  )}
                                  <span className="flex-1">{subItem.name}</span>
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  // Regular menu item
                  item?.requiresAuth ? (
                    <button 
                      onClick={(e) => handleNavigation(item, e)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-white bg-gray-900/70' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                      }`}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 min-w-5" 
                        fill={item?.name === "Wrapped BTC" ? "currentColor" : "none"}
                        viewBox="0 0 24 24" 
                        stroke={item?.name === "Wrapped BTC" ? "none" : "currentColor"}
                        strokeWidth={1.5}
                      >
                        <path 
                          strokeLinecap={item?.name === "Wrapped BTC" ? undefined : "round"} 
                          strokeLinejoin={item?.name === "Wrapped BTC" ? undefined : "round"} 
                          d={item?.icon || ''} 
                        />
                      </svg>
                      <span className="text-sm font-medium">{item?.name || 'Menu'}</span>
                    </button>
                  ) : (
                  <Link 
                    href={item?.path || '/'} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'text-white bg-gray-900/70' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                    }`}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 min-w-5" 
                      fill={item?.name === "Wrapped BTC" ? "currentColor" : "none"}
                      viewBox="0 0 24 24" 
                      stroke={item?.name === "Wrapped BTC" ? "none" : "currentColor"}
                      strokeWidth={1.5}
                    >
                      <path 
                        strokeLinecap={item?.name === "Wrapped BTC" ? undefined : "round"} 
                        strokeLinejoin={item?.name === "Wrapped BTC" ? undefined : "round"} 
                        d={item?.icon || ''} 
                      />
                    </svg>
                    <span className="text-sm font-medium">{item?.name || 'Menu'}</span>
                  </Link>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Profile Section */}
      <div className="px-2 pb-2">
        <UserProfile />
      </div>
      
      <div className="p-3 text-[10px] text-gray-500 flex items-center justify-center border-t border-gray-900/50">
        <div className="relative group">
          <span 
            className="cursor-pointer transition-all duration-200 hover:text-emerald-400" 
            onClick={() => window.open("https://topledger.xyz", "_blank")}
          >
            Top Ledger © {new Date().getFullYear()}
          </span>
          
          {/* Creative hover popup */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-0 translate-y-2">
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap relative">
              Visit Top Ledger
              {/* Arrow pointing down */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-500"></div>
              
              {/* Sparkle animations */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
"use client";

import Image from "next/image";
import Link from "next/link";
import UserProfile from './auth/UserProfile';
import ProjectSearchBar from './shared/ProjectSearchBar';
import { useNavigation } from '@/app/hooks/useNavigation';
import { menuItems } from '@/app/components/shared/NavigationData';

export default function Sidebar() {
  const {
    pathname,
    openDropdown,
    projectSearchTerm,
    setProjectSearchTerm,
    toggleDropdown,
    getFilteredProjects,
    handleNavigation,
    isMenuItemActive,
    getFilteredMenuItems
  } = useNavigation();

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
      
      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-hide">
        <ul className="space-y-2.5">
        {getFilteredMenuItems(menuItems).map((item) => {

            const { isActive } = isMenuItemActive(item);
              
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
                      <div className="mt-2">
                        {/* Search bar for Projects - positioned directly below Projects button */}
                        {item.name === "Projects" && (
                          <ProjectSearchBar
                            searchTerm={projectSearchTerm}
                            onSearchChange={setProjectSearchTerm}
                          />
                        )}
                        
                        {/* Projects list with left border starting from below search bar */}
                        <div className="ml-4 border-l border-gray-900 pl-3">
                          <ul className="space-y-1.5">
                          {(item.name === "Projects" ? getFilteredProjects(item.subItems) : item.subItems).map((subItem) => {
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
                        
                          {/* Show "No projects found" message when searching and no results */}
                          {item.name === "Projects" && projectSearchTerm && getFilteredProjects(item.subItems).length === 0 && (
                            <div className="px-1 py-2 text-xs text-gray-500 text-center">
                              No projects found
                            </div>
                          )}
                        </div>
                      </div>
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
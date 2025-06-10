"use client";

import { useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import UserProfile from './auth/UserProfile';
import ProjectSearchBar from './shared/ProjectSearchBar';
import { useNavigation } from '@/app/hooks/useNavigation';
import { menuItems } from '@/app/components/shared/NavigationData';

export default function MobileNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
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
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Reset dropdown and popup when closing menu
    if (isMenuOpen) {
      setShowPopup(false);
    }
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-black border-b border-gray-900 flex items-center justify-between px-4 z-30">
        <div className="relative w-32 h-7 grayscale brightness-300 opacity-100">
          <Image
            src="https://topledger.xyz/assets/images/logo/topledger-full.svg?imwidth=400"
            alt="TopLedger Logo"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>
        
        {/* Hamburger button */}
        <button 
          className="p-2 focus:outline-none" 
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-gray-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu Drawer - slides in from the right */}
      <div className={`fixed inset-0 z-40 transform ease-in-out duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => {
            toggleMenu();
            setShowPopup(false);
          }}
        ></div>
        
        {/* Menu Content */}
        <div className="absolute right-0 top-0 h-full w-64 bg-gray-950 shadow-lg transform transition-transform flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
            <h2 className="text-white text-sm font-medium">Menu</h2>
            <button 
              className="p-2 focus:outline-none" 
              onClick={toggleMenu}
              aria-label="Close navigation menu"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-gray-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Menu Items */}
          <nav className="px-2 py-3 overflow-y-auto flex-1">
            <ul className="space-y-2">
                          {getFilteredMenuItems(menuItems).map((item) => {
                const { isActive } = isMenuItemActive(item);
                  
                return (
                  <li key={item?.name || 'unnamed'}>
                    {item?.hasDropdown ? (
                      // Dropdown menu item
                      <div>
                        <button
                          onClick={(e) => {
                            toggleDropdown(item.name);
                            handleNavigation(item, e);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'text-white bg-gray-900/70' 
                              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor" 
                              strokeWidth={1.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d={item?.icon || ''} />
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
                                containerClassName="mb-3 mx-8"
                              />
                            )}
                            
                            {/* Projects list with left border starting from below search bar */}
                            <div className="ml-8 border-l border-gray-800 pl-3">
                              <ul className="space-y-1.5">
                                {(item.name === "Projects" ? getFilteredProjects(item.subItems) : item.subItems).map((subItem) => {
                              const isSubActive = pathname?.startsWith(subItem.path);
                              
                              return (
                                <li key={subItem.name}>
                                  {subItem.status === "soon" ? (
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 text-gray-500 cursor-not-allowed`}>
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
                                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                        isSubActive 
                                          ? 'text-white bg-gray-800/60' 
                                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                                      }`}
                                      onClick={(e) => {
                                        handleNavigation(item, e);
                                      }}
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
                                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                  No projects found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Regular menu item
                      <Link 
                        href={item?.path || '/'} 
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'text-white bg-gray-900/70' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                        }`}
                        onClick={(e) => {
                          handleNavigation(item, e);
                          toggleMenu();
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={item?.icon || ''} />
                        </svg>
                        <span className="text-sm font-medium">{item?.name || 'Menu'}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile Section */}
          <div className="px-2 pb-2 flex-shrink-0">
            <UserProfile />
          </div>
          
          {/* Footer */}
          <div className="p-3 pt-2 pb-6 text-[10px] text-gray-500 flex items-center justify-center border-t border-gray-900/50 flex-shrink-0">
            <div className="relative group">
              <span 
                className="cursor-pointer transition-all duration-200 hover:text-emerald-400" 
                onClick={() => setShowPopup(!showPopup)}
              >
                Top Ledger © {new Date().getFullYear()}
              </span>
              
              {/* Creative popup - shows on tap for mobile */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 transition-all duration-300 ${
                showPopup ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}>
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap relative cursor-pointer"
                  onClick={() => {
                    window.open("https://topledger.xyz", "_blank");
                    setShowPopup(false);
                  }}
                >
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
      </div>
    </>
  );
} 
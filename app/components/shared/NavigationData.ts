// Define types for menu items
export interface SubMenuItem {
  name: string;
  path: string;
  logo?: string;
  status?: string;
}

export interface MenuItem {
  name: string;
  path: string;
  icon: string;
  requiresAuth?: boolean;
  requiresInternalAuth?: boolean;
  hidden?: boolean;
  hasDropdown?: boolean;
  subItems?: SubMenuItem[];
}

// Shared menu items for both Sidebar and MobileNavbar
export const menuItems: MenuItem[] = [
  { name: "Overview", path: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { name: "REV", path: "/rev", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { name: "MEV", path: "/mev", icon: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" },  
  { name: "Protocol Revenue", path: "/protocol-revenue", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { name: "Stablecoins", path: "/stablecoins", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "DEX", path: "/dex", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { name: "Wrapped BTC", path: "/wrapped-btc", icon: "M16.56 11.57C17.15 10.88 17.5 9.98 17.5 9C17.5 7.14 16.23 5.57 14.5 5.13V3H12.5V5H10.5V3H8.5V5H5.5V7H7.5V17H5.5V19H8.5V21H10.5V19H12.5V21H14.5V19C16.71 19 18.5 17.21 18.5 15C18.5 13.55 17.72 12.27 16.56 11.57ZM9.5 7H13.5C14.6 7 15.5 7.9 15.5 9C15.5 10.1 14.6 11 13.5 11H9.5V7ZM14.5 17H9.5V13H14.5C15.6 13 16.5 13.9 16.5 15C16.5 16.1 15.6 17 14.5 17Z" },  
  { name: "Compute Units", path: "/compute-units", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" },
  { name: "Launchpads", path: "/launchpads", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
  { name: "xStocks", path: "/xstocks", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
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
        name: "Helium", 
        path: "/projects/helium",
        logo: "https://framerusercontent.com/images/6TFcIJwmOq1tPat18K1XwdNNgdA.png",
        //status: "soon"
      },
      { 
        name: "Metaplex", 
        path: "/projects/metaplex",
        logo: "https://www.metaplex.com/images/favicon.png",
        //status: "soon"
      },
      { 
        name: "Orca", 
        path: "/projects/orca",
        logo: "https://www.orca.so/favicon.ico",
        status: "soon"
      },
      { 
        name: "Squads", 
        path: "/projects/squads",
        logo: "https://framerusercontent.com/images/pBwgF4du4byUGDzFtqxnLoQwZqU.png",
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
      }
    ]
  },
  { 
    name: "SF Dashboards", 
    path: "/sf-dashboards", 
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    requiresInternalAuth: true,
  },
  { name: "Blogs", path: "/blogs", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
  { name: "Explorer", path: "/explorer", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", requiresAuth: true, hidden: true },
  { name: "Dashboards", path: "/dashboards", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", requiresAuth: true, hidden: true }
]; 
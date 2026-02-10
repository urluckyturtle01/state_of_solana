import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { SubMenuItem, MenuItem } from '@/app/components/shared/NavigationData';

export const useNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const { isAuthenticated, openLoginModal, isInternalAuth } = useAuth();

  const toggleDropdown = (itemName: string) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
    // Clear search when closing dropdown
    if (openDropdown === itemName) {
      setProjectSearchTerm('');
    }
  };

  // Filter projects based on search term
  const getFilteredProjects = (subItems: SubMenuItem[] | undefined) => {
    if (!subItems) return [];
    if (!projectSearchTerm) return subItems;
    
    return subItems.filter(item => 
      item.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
    );
  };

  const handleNavigation = (item: MenuItem, e: React.MouseEvent) => {
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

  // Check if menu item is active
  const isMenuItemActive = (item: MenuItem) => {
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

    return { isActive, isSubItemActive };
  };

  // Filter menu items based on authentication
  const getFilteredMenuItems = (menuItems: MenuItem[]) => {
    return menuItems.filter(item => {
      // Hide items that require internal auth if not authenticated via internal password
      if (item.requiresInternalAuth && !isInternalAuth()) {
        return false;
      }
      return !item.hidden;
    });
  };

  return {
    pathname,
    openDropdown,
    setOpenDropdown,
    projectSearchTerm,
    setProjectSearchTerm,
    isAuthenticated,
    isInternalAuth,
    toggleDropdown,
    getFilteredProjects,
    handleNavigation,
    isMenuItemActive,
    getFilteredMenuItems,
    openLoginModal
  };
}; 
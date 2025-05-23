import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promises as fsp } from 'fs';

// Helper function to recursively delete a directory
async function deleteDirectory(directoryPath: string) {
  try {
    // Read directory contents
    const items = await fsp.readdir(directoryPath, { withFileTypes: true });
    
    // Process each item in the directory
    for (const item of items) {
      const itemPath = path.join(directoryPath, item.name);
      
      if (item.isDirectory()) {
        // Recursively delete subdirectories
        await deleteDirectory(itemPath);
      } else {
        // Delete files
        await fsp.unlink(itemPath);
      }
    }
    
    // Finally delete the empty directory
    await fsp.rmdir(directoryPath);
    return true;
  } catch (error) {
    console.error(`Error deleting directory ${directoryPath}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.menuId) {
      return NextResponse.json(
        { error: 'Menu ID is required' },
        { status: 400 }
      );
    }
    
    const menuId = data.menuId;
    console.log(`Attempting to delete menu: ${menuId}`);
    
    // Get the root directory
    const rootDir = process.cwd();
    
    // 1. Update the menuPages.ts file
    await updateMenuPagesConfig(rootDir, menuId);
    
    // 2. Update the navigation files
    await updateNavigation(rootDir, menuId);
    
    // 3. Delete the directory and all files
    const menuDir = path.join(rootDir, 'app', menuId);
    
    try {
      // Check if directory exists
      await fs.access(menuDir);
      // Delete the directory
      await deleteDirectory(menuDir);
      console.log(`Deleted directory: ${menuDir}`);
    } catch (error) {
      // Directory doesn't exist or can't be accessed
      console.warn(`Directory ${menuDir} does not exist or cannot be accessed`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Menu "${menuId}" has been deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Function to update menuPages.ts config file
async function updateMenuPagesConfig(rootDir: string, menuId: string) {
  const configPath = path.join(rootDir, 'app/admin/config/menuPages.ts');
  let content = await fs.readFile(configPath, 'utf-8');
  
  // Extract existing menu options and pages except for the one being deleted
  const menuOptionsRegex = /export const MENU_OPTIONS: MenuItem\[\] = \[([\s\S]*?)\];/;
  const menuPagesRegex = /export const MENU_PAGES: Record<string, MenuPage\[\]> = \{([\s\S]*?)\};/;
  
  const menuOptionsMatch = content.match(menuOptionsRegex);
  const menuPagesMatch = content.match(menuPagesRegex);
  
  if (!menuOptionsMatch || !menuPagesMatch) {
    throw new Error('Could not parse the menu configuration file');
  }
  
  // Remove the menu from options - match structured and inline formats
  // This handles both formats:
  // { id: 'menuId', name: 'Name', icon: 'icon' },
  // AND
  // {
  //   id: "menuId",
  //   name: "Name",
  //   icon: "icon"
  // },
  const menuOptionRegex = new RegExp(
    `(\\s*\\{[^{]*?id:\\s*["']${menuId}["'][^}]*?\\},?)|(\\s*\\{\\s*id:\\s*["']${menuId}["'][\\s\\S]*?\\},?)`,
    'g'
  );
  let menuOptions = menuOptionsMatch[1].replace(menuOptionRegex, '');
  
  // Remove consecutive commas that might be left after deletion
  menuOptions = menuOptions.replace(/,\s*,/g, ',');
  
  // Fix trailing commas
  menuOptions = menuOptions.trim();
  if (menuOptions.endsWith(',')) {
    menuOptions = menuOptions.slice(0, -1).trim();
  }
  
  // Remove the menu from pages along with its entire page array
  const menuPageEntryRegex = new RegExp(`\\s*["']${menuId}["']:\\s*\\[[\\s\\S]*?\\],?`, 'g');
  let menuPages = menuPagesMatch[1].replace(menuPageEntryRegex, '');
  
  // Remove consecutive commas that might be left after deletion
  menuPages = menuPages.replace(/,\s*,/g, ',');
  
  // Fix trailing commas
  menuPages = menuPages.trim();
  if (menuPages.endsWith(',')) {
    menuPages = menuPages.slice(0, -1).trim();
  }
  
  // Also look for any orphaned pages that might be left outside a properly structured array
  // This helps catch any irregular entries that might be in the file
  const pagesForMenuRegex = new RegExp(`\\s*\\{[^{]*?path:\\s*["']/${menuId}/[^"']*["'][^}]*\\},?`, 'g');
  menuPages = menuPages.replace(pagesForMenuRegex, '');
  
  // Clean up again after orphaned page removal
  menuPages = menuPages.replace(/,\s*,/g, ','); // Remove consecutive commas
  menuPages = menuPages.replace(/,(\s*)\}/g, '\n}'); // Remove trailing commas before closing braces
  menuPages = menuPages.trim();
  if (menuPages.endsWith(',')) {
    menuPages = menuPages.slice(0, -1).trim();
  }
  
  // Create the new file content completely from scratch
  const newContent = `// Define menu options and menu page types
export interface MenuItem {
  id: string;
  name: string;
  icon: string;
}

export interface MenuPage {
  id: string;
  name: string;
  path: string;
}

// Define available icons
export const AVAILABLE_ICONS = [
  { id: 'home', name: 'Home' },
  { id: 'chart-bar', name: 'Chart Bar' },
  { id: 'currency-dollar', name: 'Currency Dollar' },
  { id: 'coin', name: 'Coin' },
  { id: 'chart-pie', name: 'Chart Pie' },
  { id: 'document', name: 'Document' },
  { id: 'cog', name: 'Settings' }
];

// Define menu options
export const MENU_OPTIONS: MenuItem[] = [
${menuOptions}
];

// Define page configurations for each menu
export const MENU_PAGES: Record<string, MenuPage[]> = {
${menuPages}
};

// Helper function to get pages for a specific menu
export function getPagesForMenu(menuId: string): MenuPage[] {
  return MENU_PAGES[menuId] || [];
}

// Helper function to find which menu a page belongs to
export function findMenuForPage(pageId: string): string | null {
  for (const [menuId, pages] of Object.entries(MENU_PAGES)) {
    if (pages.some(page => page.id === pageId)) {
      return menuId;
    }
  }
  return null;
}`;
  
  // Write the completely new file
  await fs.writeFile(configPath, newContent, 'utf-8');
  console.log(`Updated menuPages.ts - removed ${menuId}`);
}

// Function to update navigation files
async function updateNavigation(rootDir: string, menuId: string) {
  const menuPath = `/${menuId}`;
  
  // Update Sidebar
  const sidebarPath = path.join(rootDir, 'app/components/Sidebar.tsx');
  let sidebarContent = await fs.readFile(sidebarPath, 'utf-8');
  
  // Find the menuItems array
  const menuItemsRegex = /const menuItems = \[([\s\S]*?)\];/;
  const menuItemsMatch = sidebarContent.match(menuItemsRegex);
  
  if (menuItemsMatch) {
    // Remove the menu item with this path
    const menuEntryRegex = new RegExp(`\\s*\\{\\s*name:[^}]*path:\\s*["']${menuPath}["'][^}]*\\},?`);
    let menuItems = menuItemsMatch[1].replace(menuEntryRegex, '');
    
    // Fix trailing commas
    if (menuItems.trim().endsWith(',')) {
      menuItems = menuItems.trim();
    } else {
      menuItems = menuItems.replace(/,\s*$/, '');
    }
    
    // Replace the menuItems array
    sidebarContent = sidebarContent.replace(menuItemsRegex, `const menuItems = [\n${menuItems}\n];`);
    
    // Write the updated sidebar file
    await fs.writeFile(sidebarPath, sidebarContent, 'utf-8');
    console.log(`Updated Sidebar.tsx - removed menu: ${menuId}`);
  }
  
  // Update MobileNavbar
  const mobileNavbarPath = path.join(rootDir, 'app/components/MobileNavbar.tsx');
  let mobileNavbarContent = await fs.readFile(mobileNavbarPath, 'utf-8');
  
  // Find the menuItems array
  const mobileMenuItemsRegex = /const menuItems = \[([\s\S]*?)\];/;
  const mobileMenuItemsMatch = mobileNavbarContent.match(mobileMenuItemsRegex);
  
  if (mobileMenuItemsMatch) {
    // Remove the menu item with this path
    const menuEntryRegex = new RegExp(`\\s*\\{\\s*name:[^}]*path:\\s*["']${menuPath}["'][^}]*\\},?`);
    let mobileMenuItems = mobileMenuItemsMatch[1].replace(menuEntryRegex, '');
    
    // Fix trailing commas
    if (mobileMenuItems.trim().endsWith(',')) {
      mobileMenuItems = mobileMenuItems.trim();
    } else {
      mobileMenuItems = mobileMenuItems.replace(/,\s*$/, '');
    }
    
    // Replace the menuItems array
    mobileNavbarContent = mobileNavbarContent.replace(mobileMenuItemsRegex, `const menuItems = [\n${mobileMenuItems}\n];`);
    
    // Write the updated mobile navbar file
    await fs.writeFile(mobileNavbarPath, mobileNavbarContent, 'utf-8');
    console.log(`Updated MobileNavbar.tsx - removed menu: ${menuId}`);
  }
} 
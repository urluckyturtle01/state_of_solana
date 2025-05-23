import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.menuId || !data.pageId) {
      return NextResponse.json(
        { error: 'Menu ID and Page ID are required' },
        { status: 400 }
      );
    }
    
    const { menuId, pageId } = data;
    console.log(`Attempting to delete page ${pageId} from menu ${menuId}`);
    
    // Get the root directory
    const rootDir = process.cwd();
    
    // Update the menuPages.ts file
    const updatedMenu = await updateMenuPagesConfig(rootDir, menuId, pageId);
    
    // If menu is now empty, remove it from navigation
    if (updatedMenu.isEmpty) {
      await updateNavigation(rootDir, menuId);
    }
    
    // Delete the page file
    const pagePath = path.join(rootDir, 'app', menuId, pageId, 'page.tsx');
    
    try {
      // Check if file exists
      await fs.access(pagePath);
      // Delete the file
      await fs.unlink(pagePath);
      
      // Try to delete the directory if it's empty
      const pageDir = path.join(rootDir, 'app', menuId, pageId);
      try {
        // This will fail if the directory is not empty, which is fine
        await fs.rmdir(pageDir);
        console.log(`Deleted directory: ${pageDir}`);
      } catch (error) {
        console.warn(`Could not delete directory ${pageDir}. It may not be empty.`);
      }
      
      console.log(`Deleted page file: ${pagePath}`);
    } catch (error) {
      // File doesn't exist or can't be accessed
      console.warn(`File ${pagePath} does not exist or cannot be accessed`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Page "${pageId}" has been deleted from menu "${menuId}" successfully`
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Function to update menuPages.ts config file
async function updateMenuPagesConfig(rootDir: string, menuId: string, pageId: string) {
  const configPath = path.join(rootDir, 'app/admin/config/menuPages.ts');
  let content = await fs.readFile(configPath, 'utf-8');
  
  // Extract existing pages for the menu
  const menuPagesRegex = new RegExp(`["']${menuId}["']:\\s*\\[(.*?)\\]`, 's');
  const menuPagesMatch = content.match(menuPagesRegex);
  
  if (!menuPagesMatch) {
    throw new Error(`Could not find pages for menu "${menuId}"`);
  }
  
  // Remove the page from the array - handle both single-line and multi-line formats
  const pageRegex = new RegExp(
    `(\\s*\\{[^{]*?id:\\s*["']${pageId}["'][^}]*?\\},?)|(\\s*\\{\\s*id:\\s*["']${pageId}["'][\\s\\S]*?\\},?)`,
    'g'
  );
  let pagesContent = menuPagesMatch[1].replace(pageRegex, '');
  
  // Remove consecutive commas that might be left after deletion
  pagesContent = pagesContent.replace(/,\s*,/g, ',');
  
  // Fix trailing commas
  pagesContent = pagesContent.trim();
  if (pagesContent.endsWith(',')) {
    pagesContent = pagesContent.slice(0, -1).trim();
  }
  
  // Check for orphaned pages - pages not in any specific menu structure
  // First update the current menu's pages
  if (pagesContent.trim() === '') {
    // Menu has no more pages, keep an empty array
    content = content.replace(menuPagesRegex, `"${menuId}": []`);
  } else {
    content = content.replace(menuPagesRegex, `"${menuId}": [${pagesContent}]`);
  }
  
  // Now search for orphaned pages
  const orphanedPageRegex = new RegExp(
    `(\\s*\\{[^{]*?id:\\s*["']${pageId}["'][^}]*?\\},?)|(\\s*\\{\\s*id:\\s*["']${pageId}["'][\\s\\S]*?\\},?)`,
    'g'
  );
  
  // Replace any remaining orphaned pages outside of valid menu structures
  content = content.replace(orphanedPageRegex, '');
  
  // Remove any double commas that might have been created
  content = content.replace(/,\s*,/g, ',');
  
  // Cleanup: ensure there are no empty arrays with trailing commas
  content = content.replace(/\[\s*\],/g, '[]');
  
  // Reload the helper functions part if it was removed or duplicated
  const helperFunctions = `
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
  
  // Check if helper functions are missing
  if (!content.includes('export function getPagesForMenu')) {
    // Add the helper functions at the end
    content = content.replace(/};(\s*)$/, `};\n${helperFunctions}`);
  }
  
  // Clean up any trailing commas before closing braces
  content = content.replace(/,(\s*)\}/g, '\n}');
  content = content.replace(/,(\s*)];/g, '\n];');
  
  await fs.writeFile(configPath, content, 'utf-8');
  console.log(`Updated menuPages.ts - removed page ${pageId} from menu ${menuId}`);
  
  // Return if the menu is now empty (no pages left)
  return { isEmpty: pagesContent.trim() === '' };
}

// Function to update navigation files when a menu becomes empty
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
    console.log(`Updated Sidebar.tsx - removed empty menu: ${menuId}`);
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
    console.log(`Updated MobileNavbar.tsx - removed empty menu: ${menuId}`);
  }
} 
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
  
  // First extract full file structure
  const menuOptionsRegex = /export const MENU_OPTIONS: MenuItem\[\] = \[([\s\S]*?)\];/;
  const menuPagesRegex = /export const MENU_PAGES: Record<string, MenuPage\[\]> = \{([\s\S]*?)\};/;
  
  const menuOptionsMatch = content.match(menuOptionsRegex);
  const menuPagesMatch = content.match(menuPagesRegex);
  
  if (!menuOptionsMatch || !menuPagesMatch) {
    throw new Error('Could not parse the menu configuration file');
  }
  
  // Get menu options content - we'll leave this unchanged when deleting a page
  const menuOptions = menuOptionsMatch[1].trim();
  
  // Extract existing pages for the specific menu
  const specificMenuRegex = new RegExp(`["']${menuId}["']:\\s*\\[(.*?)\\]`, 's');
  const specificMenuMatch = menuPagesMatch[1].match(specificMenuRegex);
  
  if (!specificMenuMatch) {
    throw new Error(`Could not find pages for menu "${menuId}"`);
  }
  
  // Remove the specific page from the array - handle both single-line and multi-line formats
  const pageRegex = new RegExp(
    `(\\s*\\{[^{]*?id:\\s*["']${pageId}["'][^}]*?\\},?)|(\\s*\\{\\s*id:\\s*["']${pageId}["'][\\s\\S]*?\\},?)`,
    'g'
  );
  let pagesContent = specificMenuMatch[1].replace(pageRegex, '');
  
  // Remove consecutive commas that might be left after deletion
  pagesContent = pagesContent.replace(/,\s*,/g, ',');
  
  // Fix trailing commas
  pagesContent = pagesContent.trim();
  if (pagesContent.endsWith(',')) {
    pagesContent = pagesContent.slice(0, -1).trim();
  }
  
  // Get the full MENU_PAGES content
  let menuPages = menuPagesMatch[1];
  
  // Now replace only the specific menu's pages section
  // First, get the entire entry including the commas
  const fullMenuEntryRegex = new RegExp(`(,?\\s*["']${menuId}["']:\\s*\\[[\\s\\S]*?\\]\\s*,?)`, 'g');
  const fullMenuEntryMatch = menuPages.match(fullMenuEntryRegex);
  
  if (!fullMenuEntryMatch) {
    throw new Error(`Could not find complete menu entry for "${menuId}"`);
  }
  
  let replacement;
  if (pagesContent.trim() === '') {
    // Menu has no more pages, keep an empty array
    replacement = `"${menuId}": []`;
  } else {
    // Replace with the updated content
    replacement = `"${menuId}": [${pagesContent}]`;
  }
  
  // Preserve commas correctly
  const menuEntry = fullMenuEntryMatch[0];
  let newMenuEntry;
  
  if (menuEntry.startsWith(',')) {
    // If it starts with a comma, it's not the first entry
    newMenuEntry = `,\n  ${replacement}`;
  } else if (menuEntry.endsWith(',')) {
    // If it ends with a comma, it's not the last entry
    newMenuEntry = `\n  ${replacement},`;
  } else {
    // If it's both the first and last entry (only entry)
    newMenuEntry = `\n  ${replacement}`;
  }
  
  // Replace the entry with proper commas preserved
  menuPages = menuPages.replace(fullMenuEntryRegex, newMenuEntry);
  
  // Ensure proper formatting and no duplicate commas
  menuPages = menuPages.replace(/,\s*,/g, ',');
  menuPages = menuPages.replace(/,\s*}/g, '\n}');
  
  // Generate updated complete content
  let updatedContent = content.replace(
    menuPagesRegex,
    `export const MENU_PAGES: Record<string, MenuPage[]> = {${menuPages}};`
  );
  
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
  if (!updatedContent.includes('export function getPagesForMenu')) {
    // Add the helper functions at the end
    updatedContent = updatedContent.replace(/};(\s*)$/, `};\n${helperFunctions}`);
  }
  
  // Final clean-up to ensure commas between entries but not trailing commas
  updatedContent = updatedContent.replace(/}\s*,\s*};/g, '}\n};');
  updatedContent = updatedContent.replace(/(\["'][\w-]+["']:\s*\[[^\]]*\])\s*(?!,|\s*})/g, '$1,');
  
  await fs.writeFile(configPath, updatedContent, 'utf-8');
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
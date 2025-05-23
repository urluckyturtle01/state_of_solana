import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.menuId || !data.menuName || !data.menuIcon || !data.pages) {
      return NextResponse.json(
        { error: 'Missing required fields: menuId, menuName, menuIcon, pages' },
        { status: 400 }
      );
    }
    
    const { menuId, menuName, menuIcon, menuDescription, pages } = data;
    
    // Get the root directory
    const rootDir = process.cwd();
    
    // Update menu configuration files
    await updateMenuPagesConfig(rootDir, menuId, menuName, menuIcon, pages);
    
    // Update navigation components
    await updateNavigation(rootDir, menuId, menuName, menuIcon);
    
    return NextResponse.json({
      success: true,
      message: `Menu "${menuName}" has been added successfully`
    });
  } catch (error) {
    console.error('Error updating menu configuration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to update menu configuration in menuPages.ts
async function updateMenuPagesConfig(
  rootDir: string,
  menuId: string,
  menuName: string,
  menuIcon: string,
  pages: { id: string; name: string; path: string }[]
) {
  const menuPagesPath = path.join(rootDir, 'app', 'admin', 'config', 'menuPages.ts');
  let content = await fs.readFile(menuPagesPath, 'utf-8');
  
  // Add menu option
  const menuOptionsRegex = /export const MENU_OPTIONS: MenuItem\[\] = \[([\s\S]*?)\];/;
  const menuOptionsMatch = content.match(menuOptionsRegex);
  
  if (!menuOptionsMatch) {
    throw new Error('Could not find MENU_OPTIONS in menuPages.ts');
  }
  
  // Get existing menu options
  let menuOptions = menuOptionsMatch[1].trim();
  
  // Check if menu already exists
  const menuRegex = new RegExp(
    `(\\{[^{]*?id:\\s*["']${menuId}["'][^}]*?\\})|(\\{\\s*id:\\s*["']${menuId}["'][\\s\\S]*?\\})`,
    'g'
  );
  const menuExists = menuRegex.test(menuOptions);
  
  if (!menuExists) {
    // Create the new menu option
    const newMenuOption = `  {
    id: "${menuId}",
    name: "${menuName}",
    icon: "${menuIcon}"
  }`;
    
    // Add comma if not empty and ensure we don't add duplicate commas
    if (menuOptions) {
      // Check if the last character of the trimmed menuOptions is a comma
      const lastChar = menuOptions.trim().slice(-1);
      if (lastChar === ',') {
        menuOptions += '\n' + newMenuOption;
      } else {
        menuOptions += ',\n' + newMenuOption;
      }
    } else {
      menuOptions = newMenuOption;
    }
    
    // Replace the menu options
    content = content.replace(
      menuOptionsRegex,
      `export const MENU_OPTIONS: MenuItem[] = [\n${menuOptions}\n];`
    );
  }
  
  // Add menu pages
  const menuPagesRegex = /export const MENU_PAGES: Record<string, MenuPage\[\]> = {([\s\S]*?)};/;
  const menuPagesMatch = content.match(menuPagesRegex);
  
  if (!menuPagesMatch) {
    throw new Error('Could not find MENU_PAGES in menuPages.ts');
  }
  
  // Get existing menu pages
  let menuPages = menuPagesMatch[1].trim();
  
  // Create the pages array content
  const pagesContent = pages.map(page => `    {
      id: "${page.id}",
      name: "${page.name}",
      path: "${page.path}"
    }`).join(',\n');
  
  // Create the new menu pages entry
  const newMenuPages = `  "${menuId}": [
${pagesContent}
  ]`;
  
  // Add comma if not empty and ensure we don't add duplicate commas
  if (menuPages) {
    // Check if the last character of the trimmed menuPages is a comma
    const lastChar = menuPages.trim().slice(-1);
    if (lastChar === ',') {
      menuPages += '\n' + newMenuPages;
    } else {
      menuPages += ',\n' + newMenuPages;
    }
  } else {
    menuPages = newMenuPages;
  }
  
  // Replace the menu pages
  content = content.replace(
    menuPagesRegex,
    `export const MENU_PAGES: Record<string, MenuPage[]> = {\n${menuPages}\n};`
  );
  
  // Write the updated file
  await fs.writeFile(menuPagesPath, content, 'utf-8');
  console.log(`Updated menuPages.ts with new menu: ${menuId}`);
}

// Function to update the navigation components
async function updateNavigation(
  rootDir: string,
  menuId: string,
  menuName: string,
  iconName: string
) {
  const menuPath = `/${menuId}`;
  const iconPath = getIconPathFromName(iconName);
  
  // Update Sidebar
  await updateNavigationFile(
    path.join(rootDir, 'app/components/Sidebar.tsx'),
    menuId,
    menuName,
    menuPath,
    iconPath
  );
  
  // Update MobileNavbar
  await updateNavigationFile(
    path.join(rootDir, 'app/components/MobileNavbar.tsx'),
    menuId,
    menuName,
    menuPath,
    iconPath
  );
}

// Helper function to update a navigation file (Sidebar or MobileNavbar)
async function updateNavigationFile(
  filePath: string,
  menuId: string,
  menuName: string,
  menuPath: string,
  iconPath: string
) {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Find the menuItems array
  const menuItemsRegex = /const menuItems = \[([\s\S]*?)\];/;
  const menuItemsMatch = content.match(menuItemsRegex);
  
  if (!menuItemsMatch) {
    throw new Error(`Could not find menuItems array in ${filePath}`);
  }
  
  // Get existing menu items
  let menuItems = menuItemsMatch[1].trim();
  
  // Check if the menu already exists
  const menuRegex = new RegExp(`path:\\s*["']${menuPath}["']`);
  const menuExists = menuRegex.test(menuItems);
  
  if (menuExists) {
    console.log(`Menu ${menuId} already exists in ${path.basename(filePath)}`);
    return;
  }
  
  // Create the new menu item with proper SVG path format
  const newMenuItem = `  { name: "${menuName}", path: "${menuPath}", icon: "${iconPath}" }`;
  
  // Add comma if not empty
  if (menuItems) {
    menuItems += ',\n' + newMenuItem;
  } else {
    menuItems = newMenuItem;
  }
  
  // Replace the menuItems array
  const updatedContent = content.replace(
    menuItemsRegex,
    `const menuItems = [\n${menuItems}\n];`
  );
  
  // Write the updated file
  await fs.writeFile(filePath, updatedContent, 'utf-8');
  console.log(`Updated ${path.basename(filePath)} with new menu: ${menuId}`);
}

// Helper function to convert icon name to its path in the navigation components
function getIconPathFromName(iconName: string): string {
  // SVG path mapping for older components that use path strings
  const iconPaths: Record<string, string> = {
    'home': "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    'chart-bar': "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
    'currency-dollar': "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    'coin': "M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z",
    'chart-pie': "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    'document': "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    'cog': "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    // Default to a generic icon if the icon name isn't found
    'default': "M13 10V3L4 14h7v7l9-11h-7z"
  };
  
  // For now, just return the SVG path as both Sidebar and MobileNavbar
  // use the same SVG path approach
  return iconPaths[iconName] || iconPaths['default'];
} 
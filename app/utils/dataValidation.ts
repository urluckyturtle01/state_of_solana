// Data validation utilities for dashboard system

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: any[];
  textboxes: any[];
  createdBy?: string;
}

export interface NormalizedData {
  dashboards: any[];
  charts: any[];
  textboxes: any[];
}

// Validate a single dashboard object
export function validateDashboard(dashboard: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!dashboard.id || typeof dashboard.id !== 'string') {
    errors.push('Dashboard must have a valid ID');
  }

  if (!dashboard.name || typeof dashboard.name !== 'string' || dashboard.name.trim().length === 0) {
    errors.push('Dashboard must have a non-empty name');
  }

  if (!dashboard.createdAt) {
    errors.push('Dashboard must have a creation date');
  } else if (!(dashboard.createdAt instanceof Date) && typeof dashboard.createdAt !== 'string') {
    errors.push('Dashboard creation date must be a Date object or ISO string');
  }

  if (!dashboard.lastModified) {
    errors.push('Dashboard must have a last modified date');
  } else if (!(dashboard.lastModified instanceof Date) && typeof dashboard.lastModified !== 'string') {
    errors.push('Dashboard last modified date must be a Date object or ISO string');
  }

  // Arrays
  if (!Array.isArray(dashboard.charts)) {
    errors.push('Dashboard charts must be an array');
  }

  if (!Array.isArray(dashboard.textboxes)) {
    errors.push('Dashboard textboxes must be an array');
  }

  // Consistency checks
  if (Array.isArray(dashboard.charts) && typeof dashboard.chartsCount === 'number') {
    if (dashboard.charts.length !== dashboard.chartsCount) {
      warnings.push(`Dashboard chartsCount (${dashboard.chartsCount}) doesn't match actual charts array length (${dashboard.charts.length})`);
    }
  }

  // Name length
  if (dashboard.name && dashboard.name.length > 100) {
    warnings.push('Dashboard name is unusually long (>100 characters)');
  }

  // Description length
  if (dashboard.description && dashboard.description.length > 500) {
    warnings.push('Dashboard description is unusually long (>500 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate an array of dashboards
export function validateDashboards(dashboards: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(dashboards)) {
    errors.push('Dashboards must be an array');
    return { isValid: false, errors, warnings };
  }

  // Check for duplicate IDs
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();

  dashboards.forEach((dashboard, index) => {
    const dashboardResult = validateDashboard(dashboard);
    
    // Prefix individual dashboard errors with index
    dashboardResult.errors.forEach(error => {
      errors.push(`Dashboard ${index}: ${error}`);
    });

    dashboardResult.warnings.forEach(warning => {
      warnings.push(`Dashboard ${index}: ${warning}`);
    });

    // Check for duplicate IDs
    if (dashboard.id) {
      if (ids.has(dashboard.id)) {
        duplicateIds.add(dashboard.id);
      } else {
        ids.add(dashboard.id);
      }
    }
  });

  // Report duplicate IDs
  duplicateIds.forEach(id => {
    errors.push(`Duplicate dashboard ID found: ${id}`);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate normalized data structure
export function validateNormalizedData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check top-level structure
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors, warnings };
  }

  // Check required arrays
  if (!Array.isArray(data.dashboards)) {
    errors.push('Data must contain a dashboards array');
  }

  if (!Array.isArray(data.charts)) {
    errors.push('Data must contain a charts array');
  }

  if (!Array.isArray(data.textboxes)) {
    errors.push('Data must contain a textboxes array');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Validate dashboards
  const dashboardResult = validateDashboards(data.dashboards);
  errors.push(...dashboardResult.errors);
  warnings.push(...dashboardResult.warnings);

  // Validate chart references
  const dashboardIds = new Set(data.dashboards.map((d: any) => d.id));
  
  data.charts.forEach((chart: any, index: number) => {
    if (!chart.id) {
      errors.push(`Chart ${index}: Missing ID`);
    }
    
    if (!chart.dashboardId) {
      errors.push(`Chart ${index}: Missing dashboardId`);
    } else if (!dashboardIds.has(chart.dashboardId)) {
      errors.push(`Chart ${index}: References non-existent dashboard ${chart.dashboardId}`);
    }

    if (!chart.name || typeof chart.name !== 'string') {
      errors.push(`Chart ${index}: Missing or invalid name`);
    }

    if (!chart.type || typeof chart.type !== 'string') {
      errors.push(`Chart ${index}: Missing or invalid type`);
    }
  });

  // Validate textbox references
  data.textboxes.forEach((textbox: any, index: number) => {
    if (!textbox.id) {
      errors.push(`Textbox ${index}: Missing ID`);
    }
    
    if (!textbox.dashboardId) {
      errors.push(`Textbox ${index}: Missing dashboardId`);
    } else if (!dashboardIds.has(textbox.dashboardId)) {
      errors.push(`Textbox ${index}: References non-existent dashboard ${textbox.dashboardId}`);
    }

    if (textbox.content === undefined || textbox.content === null) {
      errors.push(`Textbox ${index}: Missing content`);
    }

    if (!textbox.width || !['half', 'full'].includes(textbox.width)) {
      errors.push(`Textbox ${index}: Invalid width (must be 'half' or 'full')`);
    }
  });

  // Check for orphaned items
  const chartDashboardIds = new Set(data.charts.map((c: any) => c.dashboardId));
  const textboxDashboardIds = new Set(data.textboxes.map((t: any) => t.dashboardId));
  
  dashboardIds.forEach(dashboardId => {
    const hasCharts = chartDashboardIds.has(dashboardId);
    const hasTextboxes = textboxDashboardIds.has(dashboardId);
    
    if (!hasCharts && !hasTextboxes) {
      warnings.push(`Dashboard ${dashboardId} has no charts or textboxes`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Sanitize and clean dashboard data
export function sanitizeDashboard(dashboard: any): Dashboard {
  const now = new Date();
  
  return {
    id: String(dashboard.id || generateId()),
    name: String(dashboard.name || 'Untitled Dashboard').trim().substring(0, 100),
    description: dashboard.description ? String(dashboard.description).trim().substring(0, 500) : undefined,
    chartsCount: Math.max(0, parseInt(dashboard.chartsCount) || 0),
    createdAt: parseDate(dashboard.createdAt) || now,
    lastModified: parseDate(dashboard.lastModified) || now,
    charts: Array.isArray(dashboard.charts) ? dashboard.charts : [],
    textboxes: Array.isArray(dashboard.textboxes) ? dashboard.textboxes : [],
    createdBy: dashboard.createdBy ? String(dashboard.createdBy).trim() : undefined
  };
}

// Sanitize normalized data
export function sanitizeNormalizedData(data: any): NormalizedData {
  if (!data || typeof data !== 'object') {
    return { dashboards: [], charts: [], textboxes: [] };
  }

  return {
    dashboards: Array.isArray(data.dashboards) ? data.dashboards.map(sanitizeDashboard) : [],
    charts: Array.isArray(data.charts) ? data.charts : [],
    textboxes: Array.isArray(data.textboxes) ? data.textboxes : []
  };
}

// Helper functions
function parseDate(value: any): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Log validation results in a user-friendly way
export function logValidationResult(result: ValidationResult, context: string = 'Data validation'): void {
  if (result.isValid) {
    console.log(`✅ ${context}: All validations passed`);
  } else {
    console.error(`❌ ${context}: Validation failed`);
    result.errors.forEach(error => console.error(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠️ ${context}: Warnings found`);
    result.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
} 
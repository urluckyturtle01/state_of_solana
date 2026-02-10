# Separate Authentication for SF Dashboards and DFlow

## Problem
When logged into DFlow, accessing SF Dashboards would not require a password (and vice versa). Both sections were sharing the same authentication storage (`solana_dashboard_auth`), so logging into one gave access to both, even though they have different passwords.

## Solution
Implemented **section-specific authentication storage** so each section (sf-dashboards and dflow) has its own independent authentication state.

## Changes Made

### 1. AuthContext - Section-Specific Storage

**File**: `app/contexts/AuthContext.tsx`

#### Added Helper Functions:
```typescript
// Check auth for a specific section
const checkInitialAuth = (section?: string) => {
  if (section) {
    // Check section-specific: sf-dashboards_auth or dflow_auth
    const storageKey = `${section}_auth`;
    const cookieKey = `${section}_session`;
    return hasLocalAuth || hasAuthCookie;
  }
  // Fallback to generic auth for backward compatibility
  return genericAuth;
};

// Get section from URL path
const getSectionFromPath = (pathname: string | null): string | null => {
  if (pathname?.startsWith('/sf-dashboards')) return 'sf-dashboards';
  if (pathname?.startsWith('/dflow')) return 'dflow';
  return null;
};
```

#### Updated setIsAuthenticated:
Now accepts a `section` parameter and stores auth separately:
```typescript
setIsAuthenticated(value: boolean, section?: string)

// Creates section-specific storage:
// - sf-dashboards_auth / sf-dashboards_session
// - dflow_auth / dflow_session
```

#### Added Path Change Listener:
```typescript
useEffect(() => {
  // Recheck auth when navigating between sections
  const section = getSectionFromPath(window.location.pathname);
  const isAuthed = checkInitialAuth(section || undefined);
  setManualAuth(isAuthed);
}, [pathname]);
```

### 2. LoginModal - Pass Section to Auth

**File**: `app/components/auth/LoginModal.tsx`

Updated to pass the section when setting authentication:
```typescript
const section = getSection(); // 'dflow' or 'sf-dashboards'
setIsAuthenticated(true, section); // Store auth for specific section
```

## Authentication Storage Structure

### Before (Shared):
```
localStorage:
  - solana_dashboard_auth: 'true' (shared by both)

cookies:
  - solana_dashboard_session=authenticated (shared by both)
```

### After (Separate):
```
localStorage:
  - sf-dashboards_auth: 'true' (SF dashboards only)
  - dflow_auth: 'true' (DFlow only)

cookies:
  - sf-dashboards_session=authenticated (SF dashboards only)
  - dflow_session=authenticated (DFlow only)
```

## How It Works

### Scenario 1: Login to DFlow
1. User visits `/dflow`
2. Enters DFlow password (`dflow123`)
3. System stores: `dflow_auth=true` and `dflow_session=authenticated`
4. User can access all `/dflow` routes ✅
5. User visits `/sf-dashboards` → Login required ✅ (separate auth)

### Scenario 2: Login to SF Dashboards
1. User visits `/sf-dashboards`
2. Enters SF password (different from DFlow)
3. System stores: `sf-dashboards_auth=true` and `sf-dashboards_session=authenticated`
4. User can access all `/sf-dashboards` routes ✅
5. User visits `/dflow` → Login required ✅ (separate auth)

### Scenario 3: Logged into Both
1. User can log into both sections separately
2. Each maintains its own 7-day authentication
3. Logging out of one doesn't affect the other

## Security Benefits

1. **Independent Access Control**: Each section requires its own password
2. **Separate Sessions**: Can't use DFlow password to access SF Dashboards
3. **Granular Logout**: Can log out of one section without affecting the other
4. **Different Passwords**: Each section can have different password requirements

## Backward Compatibility

The system still checks for the generic `solana_dashboard_auth` as a fallback for any existing authenticated sessions. This ensures users who were already logged in don't get logged out after the update.

## Testing Checklist

- ✅ Login to DFlow → Can access `/dflow` routes
- ✅ While logged into DFlow → `/sf-dashboards` requires password
- ✅ Login to SF Dashboards → Can access `/sf-dashboards` routes  
- ✅ While logged into SF → `/dflow` requires password
- ✅ Can be logged into both sections simultaneously
- ✅ Logout from one section doesn't affect the other
- ✅ Auth persists for 7 days per section
- ✅ Auth persists across page refreshes

## localStorage Keys

Check your browser's localStorage to verify:
- `sf-dashboards_auth` - SF Dashboards authentication
- `dflow_auth` - DFlow authentication
- `solana_dashboard_auth` - Generic auth (legacy)

## Cookie Keys

Check your browser's cookies:
- `sf-dashboards_session` - SF Dashboards session
- `dflow_session` - DFlow session
- `solana_dashboard_session` - Generic session (legacy)

## Environment Variables

No changes needed - still uses:
- `INTERNAL_AUTH_PASSWORD` for SF Dashboards
- `DFLOW_AUTH_PASSWORD` for DFlow

Each password is checked independently when logging into its respective section.


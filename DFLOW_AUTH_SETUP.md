# DFlow Authentication Setup

## Summary

The DFlow section (`/dflow`) has been successfully protected with password authentication, similar to the SF Dashboards implementation. This document explains the setup and changes made.

## 🔐 Password Protection

The `/dflow` route now requires password authentication using a separate environment variable.

### Environment Variable

Add this to your `.env.local` file:

```env
DFLOW_AUTH_PASSWORD=dflow123
```

**Note:** You can change `dflow123` to any password you prefer. Just make sure to update the environment variable on your deployment platform (e.g., Vercel).

## 🛠️ Changes Made

### 1. Updated AuthContext (`app/contexts/AuthContext.tsx`)
- Added `/dflow` to `INTERNAL_AUTH_ROUTES` array
- Updated `openLoginModal` to handle both sf-dashboards and dflow routes

### 2. Updated ProtectedRoute (`app/components/auth/ProtectedRoute.tsx`)
- Modified `isInternalAuthRoute` function to check for both `/sf-dashboards` and `/dflow` paths
- Now protects dflow pages with the same authentication mechanism

### 3. Updated API Route (`app/api/auth/verify-password/route.ts`)
- Added support for section-based password verification
- Now accepts a `section` parameter in the request body
- Checks `DFLOW_AUTH_PASSWORD` for dflow section
- Checks `INTERNAL_AUTH_PASSWORD` for sf-dashboards section (backward compatible)

### 4. Updated LoginModal (`app/components/auth/LoginModal.tsx`)
- Added `usePathname` hook to detect current route
- Automatically determines which section (dflow or sf-dashboards) is being accessed
- Sends appropriate section parameter to API for password verification
- Tracks authentication events per section

### 5. Updated Documentation (`AUTHENTICATION_SETUP.md`)
- Added `DFLOW_AUTH_PASSWORD` to environment variables section
- Updated protected routes list to include `/dflow`
- Documented internal password authentication flow
- Added notes about environment variable usage

## 🔄 How It Works

### User Flow
1. User navigates to any `/dflow` route (e.g., `/dflow/app-stats`)
2. System checks if user is authenticated for internal routes
3. If not authenticated, login modal appears
4. User enters password (`dflow123` by default)
5. System sends password + section='dflow' to `/api/auth/verify-password`
6. Server checks password against `DFLOW_AUTH_PASSWORD` environment variable
7. On success, authentication is stored in localStorage and cookies for 7 days
8. User can now access all `/dflow` routes

### Technical Flow
```
User Access /dflow
    ↓
ProtectedRoute checks isInternalAuthRoute()
    ↓
Not authenticated? → Show LoginModal
    ↓
LoginModal detects section via pathname
    ↓
User enters password
    ↓
POST /api/auth/verify-password { password, section: 'dflow' }
    ↓
Server checks password === process.env.DFLOW_AUTH_PASSWORD
    ↓
Success → Store in localStorage + cookies
    ↓
User authenticated for 7 days
```

## 🎯 Benefits of This Implementation

1. **Separate Passwords**: SF Dashboards and DFlow can have different passwords
2. **Backward Compatible**: Existing SF Dashboards authentication still works
3. **Shared Storage**: Both use the same localStorage/cookie storage for simplicity
4. **Secure**: Passwords are stored server-side only in environment variables
5. **Persistent**: Authentication lasts 7 days via localStorage and cookies
6. **Tracked**: Analytics track which section users log into

## 🚀 Deployment Checklist

When deploying to production (e.g., Vercel):

1. ✅ Add `DFLOW_AUTH_PASSWORD=dflow123` to environment variables
2. ✅ Ensure `INTERNAL_AUTH_PASSWORD` is still set for SF Dashboards
3. ✅ Test login on `/dflow` routes
4. ✅ Test login on `/sf-dashboards` routes
5. ✅ Verify authentication persists across page refreshes
6. ✅ Test logout functionality

## 📝 Notes

- Both sf-dashboards and dflow share the same authentication storage
- Once authenticated with either password, user can access BOTH sections
- This is by design for simplicity - if you need separate authentication per section, we would need to implement separate localStorage keys
- The default password is `dflow123` but you should change it in production
- Password verification happens server-side for security
- Passwords are never exposed to the browser

## 🔧 Customization

### To Change the Default Password
Update the environment variable in your `.env.local` or deployment platform:
```env
DFLOW_AUTH_PASSWORD=your-new-password-here
```

### To Implement Separate Authentication per Section
If you want users to authenticate separately for sf-dashboards and dflow:
1. Create separate localStorage keys (e.g., `sf_dashboard_auth`, `dflow_auth`)
2. Update the auth checking logic to verify section-specific keys
3. Modify the `isInternalAuth` function to accept a section parameter

### To Add More Protected Sections
1. Add the route to `INTERNAL_AUTH_ROUTES` in `AuthContext.tsx`
2. Update `isInternalAuthRoute` in `ProtectedRoute.tsx`
3. Add a new environment variable (e.g., `NEWSECTION_AUTH_PASSWORD`)
4. Update the API route to handle the new section

## ✅ Testing

The authentication flow has been implemented. To test:

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/dflow`
3. You should see a login modal
4. Enter password: `dflow123` (or your custom password)
5. You should be authenticated and able to access dflow pages
6. Authentication should persist for 7 days

## 🤝 Similar to SF Dashboards

The implementation exactly mirrors the SF Dashboards authentication system:
- Same login modal UI
- Same authentication storage mechanism
- Same 7-day persistence
- Same logout functionality
- Only difference: uses `DFLOW_AUTH_PASSWORD` instead of `INTERNAL_AUTH_PASSWORD`



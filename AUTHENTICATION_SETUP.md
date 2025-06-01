# Authentication Setup Guide

This application uses NextAuth.js with Google OAuth for authentication. Explorer and Dashboards pages require user authentication.

## 🔧 Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## 🔑 Google OAuth Setup

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "State of Solana"
   - User support email: your email
   - Developer contact information: your email
4. Add authorized domains if deploying to production
5. Save and continue through the scopes and test users steps

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the Client ID and Client Secret

### 4. Generate NextAuth Secret
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## 🎯 Protected Routes

The following routes require authentication:
- `/explorer` - Blockchain explorer
- `/dashboards` - Custom dashboards

All other routes are publicly accessible.

## 🚀 How It Works

1. **Sidebar Navigation**: When users click on Explorer or Dashboards in the sidebar, the app checks authentication status
2. **Login Modal**: If not authenticated, a login modal appears with Google sign-in
3. **Route Protection**: Protected routes automatically redirect to login if accessed directly
4. **User Profile**: Authenticated users see their profile in the sidebar with logout option

## 🔄 Authentication Flow

1. User clicks on protected route (Explorer/Dashboards)
2. App checks authentication status via NextAuth
3. If not authenticated, login modal opens
4. User signs in with Google OAuth
5. After successful authentication, user can access protected routes
6. User profile appears in sidebar with logout option

## 🛠️ Development

Start the development server:
```bash
npm run dev
```

The authentication system will work on `http://localhost:3000` with proper environment variables configured.

## 📝 Notes

- Authentication state is managed by NextAuth.js and React Context
- Session persistence is handled automatically
- Google OAuth provides user profile information (name, email, image)
- All protected routes check authentication status on the client side
- Non-protected routes remain accessible without login 
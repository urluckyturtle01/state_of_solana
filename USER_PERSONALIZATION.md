# User Personalization System

This document describes the user-specific personalization system implemented for dashboards and explorer data, similar to Gmail's approach.

## Overview

The system automatically saves and retrieves user-specific data including:
- **Dashboards**: User's custom dashboards with charts and textboxes
- **Explorer Visualizations**: Saved charts and visualizations from the Explorer
- **User Preferences**: Settings like default page size, theme, etc.
- **Selected Columns**: User's column selections in Explorer APIs

## Architecture

### Data Storage
- **S3 Storage**: User data is stored in AWS S3 as JSON files
- **File Structure**: `user-data/{userEmail}.json`
- **Authentication**: Uses NextAuth.js with Google OAuth
- **Auto-sync**: Data is automatically saved when changes are made (with 1-second debounce)

### Context System
1. **AuthContext**: Manages authentication state
2. **DashboardContext**: Manages user-specific dashboards
3. **UserDataContext**: Manages explorer data and preferences

## Features

### 🎯 **Personalized Experience**
- Each user sees only their own dashboards and visualizations
- Default dashboards are created for new users
- Seamless login/logout experience with data persistence

### 💾 **Auto-Save System**
- Changes are automatically saved to S3 after 1 second of inactivity
- Real-time save notifications
- No manual save required

### 📊 **User Statistics**
- Dashboard showing user's data summary:
  - Number of dashboards
  - Total charts created
  - Explorer visualizations saved
  - APIs used

### 🔒 **Secure Access**
- Session-based authentication
- Server-side session validation
- Protected API endpoints

## API Endpoints

### GET `/api/user-data`
Retrieves user-specific data for authenticated users.

**Response:**
```json
{
  "success": true,
  "userData": {
    "userId": "user@example.com",
    "email": "user@example.com", 
    "name": "User Name",
    "dashboards": [...],
    "explorerData": {
      "savedVisualizations": [...],
      "selectedColumns": {...},
      "preferences": {...}
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModified": "2024-01-01T00:00:00Z"
  },
  "isNewUser": false
}
```

### POST `/api/user-data`
Saves user-specific data to S3.

**Request Body:**
```json
{
  "dashboards": [...],
  "explorerData": {
    "savedVisualizations": [...],
    "selectedColumns": {...},
    "preferences": {...}
  }
}
```

## Components

### Core Components
- **AuthWrapper**: Provides authentication and data contexts
- **UserProfile**: Shows user info and statistics
- **SaveNotification**: Displays save status
- **LoginModal**: Google OAuth login interface

### Data Management
- **DashboardProvider**: Manages user dashboards
- **UserDataProvider**: Manages explorer data
- **Auto-save Logic**: Debounced saving with user feedback

## User Flow

### New User Login
1. User authenticates with Google OAuth
2. System checks S3 for existing user data
3. If new user, creates default dashboard structure
4. Returns user data and sets `isNewUser: true`

### Returning User Login
1. User authenticates with Google OAuth
2. System retrieves existing data from S3
3. Populates dashboards and explorer data
4. User sees their personalized workspace

### Data Modification
1. User makes changes (creates dashboard, saves visualization, etc.)
2. Context updates local state immediately
3. Auto-save triggers after 1 second of inactivity
4. Data is saved to S3 with user feedback
5. Save notification shows success/error state

## Environment Variables

Required environment variables for S3 storage:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=state-of-solana

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Benefits

### 👥 **Multi-User Support**
- Isolated user workspaces
- No data conflicts between users
- Scalable user management

### 💡 **Enhanced UX**
- Familiar Gmail-like experience
- Persistent user state
- Intuitive data management

### 🚀 **Performance**
- Debounced auto-save reduces API calls
- Context-based state management
- Efficient data loading

### 🔧 **Maintainability**
- Modular architecture
- Clear separation of concerns
- Well-documented API structure

## Usage Examples

### Creating a Dashboard
```typescript
const { createDashboard } = useDashboards();
const newDashboard = createDashboard("My Dashboard", "Description");
// Automatically saved to S3 within 1 second
```

### Saving Explorer Visualization
```typescript
const { addVisualization } = useUserData();
addVisualization({
  id: 'viz-123',
  name: 'SOL Price Chart',
  configuration: {...},
  chartConfig: {...},
  chartData: [...],
  createdAt: new Date()
});
// Automatically saved to S3 within 1 second
```

### Accessing User Statistics
```typescript
const { dashboards } = useDashboards();
const { explorerData } = useUserData();

const totalCharts = dashboards.reduce((sum, d) => sum + d.chartsCount, 0);
const visualizations = explorerData.savedVisualizations.length;
```

## Future Enhancements

- **Data Export**: Allow users to export their data
- **Team Sharing**: Share dashboards between users
- **Version History**: Track changes over time
- **Backup/Restore**: Automated backup system
- **Advanced Permissions**: Role-based access control 
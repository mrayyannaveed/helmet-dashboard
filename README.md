# Smart Helmet Dashboard - Refactored

This is a refactored version of the Smart Helmet Dashboard application using a modular component-based architecture with the Next.js App Router.

## Architecture Overview

The application has been refactored from a monolithic structure to a modular architecture:

- `components/auth/` - Authentication-related components (LoginView, RegisterView)
- `components/dashboard/` - Dashboard view components (DashboardView, LiveView, AnalysisView, HistoryView)
- `components/layout/` - Layout components (Sidebar, DashboardLayout)
- `components/ui/` - Reusable UI components (LoadingSpinner, ErrorBox)
- `hooks/` - Custom React hooks (useAuth, useHelmetData)
- `types/` - TypeScript type definitions
- `app/` - Next.js App Router pages

## Features

- **Authentication**: Secure login and registration with JWT token management
- **Dashboard**: Real-time helmet monitoring and analytics
- **Live Data**: Live telemetry data display
- **Analysis**: Data analytics with charts and visualizations
- **History**: Accident history tracking with filtering
- **Responsive Design**: Mobile-friendly interface

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env.local` and update the `NEXT_PUBLIC_API_BASE` to match your backend server:
   ```bash
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. **Start the Backend**:
   ```bash
   cd backend
   python main.py
   ```

4. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## API Error Handling

The application includes robust error handling for network issues:

- Network connection errors are caught and displayed gracefully
- Invalid tokens are automatically cleared
- Retry mechanisms for failed requests
- User-friendly error messages

## Custom Hooks

- `useAuth`: Manages authentication state, login, registration, and token handling
- `useHelmetData`: Handles fetching helmet data, events, and trips with error handling

## Component Structure

- Each major view is now in its own component file
- Shared UI elements are in the `components/ui` directory
- Layout components are in the `components/layout` directory
- Authentication components are in the `components/auth` directory
- Dashboard-specific components are in the `components/dashboard` directory

## API Integration

The application uses Axios with interceptors for:
- Automatic token attachment to requests
- Error handling for network issues
- Token refresh on 401 responses
- Consistent error messaging

## Security Considerations

- JWT tokens are stored in localStorage
- Authentication state is validated on each page load
- Protected routes are enforced through the dashboard layout
- Network requests have timeout and error handling
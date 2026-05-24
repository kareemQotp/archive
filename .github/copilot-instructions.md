# Archive System - AI Coding Agent Instructions

## Project Overview

Firebase-based Arabic document management system featuring advanced notifications, barcode scanning, role-based access control, and secure cloud storage with Progressive Web App capabilities.

### Core Architecture
- **Backend**: Firebase Cloud Functions (TypeScript), Firebase Firestore
- **Frontend**: Pure JavaScript SPA with Arabic RTL support
- **Database**: Firestore with comprehensive security rules
- **Storage**: Firebase Storage with file type validation
- **Auth**: Firebase Authentication with custom user profiles
- **Security**: Firestore security rules, role-based permissions, activity logging

### Major Components
- `public/`: Complete frontend application with HTML pages and assets (40+ pages)
- `public/assets/js/`: Modular JavaScript architecture with 40+ specialized modules
- `functions/`: TypeScript Cloud Functions organized in `/auth`, `/firestore`, `/storage`, `/utils`
- `firestore.rules`: Role-based security with helper functions for admin/archive_officer roles (95 lines)
- `firebase.json`: Firebase configuration for hosting with SPA routing
- `scripts/`: Node.js utility scripts for departments, file movements, notifications
- PowerShell scripts: `deploy-archive-tech.ps1`, `clean-manager.ps1`, `version-manager.ps1` for Windows workflows

## Core Commands

### Development
```bash
# Setup and serve locally
npm install
firebase serve --only hosting

# Cloud Functions
cd functions
npm install && npm run build
firebase emulators:start --only functions

# Deploy all services
npm run deploy
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
```

### Testing
```bash
# Frontend testing
npm test
npm run test:notifications

# Performance testing (via browser)
# Uses performance-tester.js and auto-test-reporter.js
```

### Build/Deploy
```bash
# Complete deployment
firebase deploy

# Selective deployment
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules

# PowerShell scripts (Windows-specific)
.\deploy-archive-tech.ps1    # Full Firebase deployment with project setup
.\clean-manager.ps1          # Clean build artifacts and cache
.\version-manager.ps1        # Version management and tagging

# Node.js scripts
node scripts/setup_departments.js
node scripts/create_files_with_qr.js
node scripts/fix_notifications.js
```

## Critical Architecture Patterns

### JavaScript Module System
- **Firebase Init**: `firebase-init.js` initializes all Firebase services with fallback config
- **Auth Layer**: `unified-auth.js` provides centralized authentication with role management
- **Permission System**: `ui-permission-controller.js` dynamically shows/hides UI elements
- **Activity Logging**: All user actions tracked via `activity-logger.js` with Arabic timestamps
- **Notification Hub**: Multiple notification systems (`smart-notifications.js`, `notification-service.js`)
- **Module Registration**: All modules register themselves on `window` object for global access

### Firebase Integration Patterns
- **Initialization Sequence**: Firebase SDK → Auth → Firestore → Storage → Functions → Messaging
- **Error Handling**: Arabic error messages with comprehensive activity logging
- **Auth State**: Uses `firebase.auth.Auth.Persistence.LOCAL` for session persistence
- **Custom Events**: `firebaseReady` and `firebaseAuthReady` events coordinate module loading

## Repository-Specific Style Rules

### JavaScript Code Style
- ES6+ module pattern with window object registration
- Arabic comments and JSDoc where appropriate
- Unified authentication system (`unified-auth.js`)
- Firebase SDK 11.9.1 initialization patterns
- Comprehensive error handling with activity logging
- Modular architecture with single responsibility modules

### File Organization
- HTML pages in `public/` root with semantic naming
- JavaScript modules in `public/assets/js/` with clear purposes
- Firebase initialization in `firebase-init.js`
- Authentication centralized in `unified-auth.js`
- UI permissions controlled via `ui-permission-controller.js`
- Activity tracking via `activity-logger.js`

### Security Patterns
- **Role-based Access**: `isAdmin()`, `isArchiveOfficer()` helper functions in Firestore rules
- **User Permissions**: Documents readable by all authenticated users, writable by creators/admins
- **File Movements**: Only admins and archive officers can create movement records
- **Activity Logging**: Comprehensive tracking via `activity-logger.js` with Arabic timestamps
- **Authentication Flow**: Unified system handles login attempts, lockouts, session persistence
- **Permission UI**: Dynamic element visibility based on user role via `ui-permission-controller.js`

### Arabic RTL Development Patterns
- **Language Support**: Arabic comments in code, RTL CSS considerations throughout
- **User Interface**: Bootstrap 5 RTL classes, Font Awesome icons with RTL positioning
- **Error Messages**: User-facing alerts in Arabic with technical details in English logs
- **Form Validation**: Arabic validation messages with proper RTL text direction
- **Date/Time**: Arabic locale formatting for timestamps and activity logs

### Firebase Integration
- Firestore for data storage with Arabic support
- Cloud Functions for server-side logic (TypeScript)
- Firebase Storage for document management
- Firebase Auth for user authentication
- Firebase Messaging for push notifications
- Firebase Hosting for PWA deployment

### Naming Conventions
- Arabic variable names in comments where appropriate
- camelCase for JavaScript functions/variables
- Module names describe functionality clearly
- HTML files use semantic Arabic-friendly naming
- CSS classes follow BEM methodology with RTL support

### Error Handling
- Arabic error messages for user-facing alerts
- Comprehensive activity logging for debugging
- Firebase error codes properly handled
- Graceful degradation for offline functionality
- Custom error reporting via `auto-test-reporter.js`

## Key Configuration

### Firebase Settings
- Firebase SDK v11.9.1 with all services enabled
- Firestore security rules with role-based access
- Cloud Functions runtime: Node.js 18
- Firebase Hosting with PWA manifest
- Firebase Storage with file type validation

### Supported File Types
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: PNG, JPG, JPEG, GIF, WebP
- Barcode scanning via browser APIs and libraries

### Security Configuration
- Firestore rules enforce user permissions
- File upload size limits enforced
- Activity logging for audit trails
- Role-based UI element visibility
- Firebase Auth state persistence

## Development Notes

### Module Loading & Dependencies
- **Firebase Init**: Always wait for `firebaseReady` custom event before using Firebase services
- **Auth Dependency**: Use `firebaseAuthReady` event or check `window.auth` availability
- **Module Pattern**: Each JS module registers itself on `window` object (e.g., `window.unifiedAuth`)
- **Error Handling**: All modules include Arabic error messages for users, English for console logs

### Key Integration Points
- **Barcode Scanner**: Uses `barcode-scanner.js` with camera API and image upload fallbacks
- **Notification System**: Multiple systems - `smart-notifications.js` for advanced rules, simple variants for basic alerts
- **File Management**: `file-management-dashboard.js` handles uploads with drag-drop and Firebase Storage integration
- **Activity Tracking**: All user actions logged via `activity-logger.js` with timestamp and user context

### Windows Development Workflow
- **PowerShell Scripts**: Primary deployment via `deploy-archive-tech.ps1` with automatic project setup
- **Version Management**: `version-manager.ps1` handles tagging and release management
- **Clean Builds**: `clean-manager.ps1` clears Firebase cache and build artifacts
- **Terminal**: Use PowerShell for all commands; scripts handle Firebase CLI authentication

## Migration Status

Successfully migrated from Flask/SQLite to Firebase:
- ✅ Firebase project fully configured
- ✅ Frontend converted to pure JavaScript
- ✅ Authentication system unified
- ✅ Firestore security rules implemented
- ✅ Cloud Functions architecture ready
- ✅ PWA deployment on Firebase Hosting

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
- `public/`: Complete frontend application with HTML pages and assets
- `public/assets/js/`: Modular JavaScript architecture with 25+ specialized modules
- `functions/`: TypeScript Cloud Functions for server-side logic
- `firestore.rules`: Comprehensive role-based security rules
- `firebase.json`: Complete Firebase configuration for hosting, functions, firestore

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

# Scripts
./scripts/deploy.sh          # Production deployment
node scripts/setup_departments.js
node scripts/create_files_with_qr.js
```

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
- Firebase Authentication with custom user profiles
- Firestore security rules for role-based access
- Activity logging for all user actions
- File upload validation and secure storage
- CSRF protection via Firebase patterns
- Rate limiting implemented in Cloud Functions

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

- Arabic interface requires RTL CSS considerations
- PWA capabilities with service worker and manifest
- Modular JavaScript architecture for maintainability
- Firebase initialization must wait for DOM ready
- Activity logging helps debug user issues
- Permission system controls page access dynamically

## Migration Status

Successfully migrated from Flask/SQLite to Firebase:
- ✅ Firebase project fully configured
- ✅ Frontend converted to pure JavaScript
- ✅ Authentication system unified
- ✅ Firestore security rules implemented
- ✅ Cloud Functions architecture ready
- ✅ PWA deployment on Firebase Hosting

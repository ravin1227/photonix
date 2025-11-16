# Photonix Mobile App - Tech Stack Specification

## Overview

This document outlines the recommended technology stack for the Photonix mobile application, designed to work with the existing Rails backend API.

---

## Backend Stack (Existing)

### Core Framework
- **Ruby on Rails 8.1.1** - API-only backend
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and Sidekiq job queue
- **Puma** - Web server

### Key Backend Features
- **JWT Authentication** - Token-based auth (`jwt` gem)
- **RESTful API** - JSON API endpoints (`/api/v1/*`)
- **CORS Support** - `rack-cors` for cross-origin requests
- **Background Jobs** - Sidekiq for async processing
- **Image Processing** - MiniMagick, image_processing gem
- **EXIF Extraction** - exifr gem
- **Pagination** - Kaminari

### API Endpoints Structure
```
/api/v1/
  - auth/signup, auth/login
  - photos (index, show, create, destroy, download, thumbnail)
  - albums (CRUD + add/remove photos)
  - tags (index, show, create)
```

---

## Mobile App Stack (Recommended)

### Primary Recommendation: **React Native CLI**

#### Why React Native CLI?
1. **Cross-platform** - Single codebase for iOS and Android
2. **Full native control** - Direct access to native modules and APIs
3. **Native performance** - Maximum performance for photo-heavy apps
4. **Flexibility** - Complete control over build process and native code
5. **2025-ready** - Active development, modern patterns
6. **Photo handling** - Excellent libraries for image caching, thumbnails, and galleries

#### Core Framework
- **React Native 0.74+** - Latest stable version
- **TypeScript** - Type safety and better DX
- **React Navigation 6+** - Navigation library

#### State Management
- **Zustand** or **Redux Toolkit** - Lightweight, modern state management
  - Zustand recommended for simplicity
  - Redux Toolkit if complex state logic needed

#### Navigation
- **React Navigation 6+** - Industry standard, excellent performance
  - Stack Navigator (onboarding, photo viewer)
  - Tab Navigator (bottom navigation)
  - Drawer Navigator (optional for settings)

#### Networking & API
- **Axios** or **Fetch API** - HTTP client
  - Axios recommended for interceptors (JWT refresh)
- **React Query (TanStack Query)** - Server state management
  - Caching, background refetching, infinite scroll
  - Perfect for photo galleries with pagination

#### Image Handling
- **react-native-fast-image** - High-performance image component
  - Caching, progressive loading, priority loading
- **react-native-image-picker** - Native photo selection
- **react-native-image-crop-picker** - Advanced image selection
- **expo-image** - Expo's optimized image component (alternative)

#### QR Code (Optional)
- **expo-barcode-scanner** - QR code scanning for server connection
- Note: Camera access not needed - app uses device photo library for uploads

#### UI Components & Styling
- **React Native Paper** or **NativeBase** - Component library
  - Material Design components
  - Bottom sheets, dialogs, cards built-in
- **Styled Components** or **StyleSheet API** - Styling
  - Styled Components for theme support (light/dark mode)
- **react-native-reanimated** - Smooth animations
- **react-native-gesture-handler** - Advanced gestures (swipe, pinch)

#### Caching & Storage
- **AsyncStorage** - Simple key-value storage (settings, tokens)
- **react-native-fs** or **expo-file-system** - File system access
- **react-native-cached-image** - Image caching (if not using fast-image)

#### Forms & Validation
- **React Hook Form** - Form management
- **Zod** or **Yup** - Schema validation

#### Utilities
- **date-fns** - Date formatting and manipulation
- **react-native-mmkv** - Fast key-value storage (alternative to AsyncStorage)
- **react-native-share** - Native share sheet
- **react-native-haptic-feedback** - Haptic feedback

#### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Flipper** - Debugging (if using bare React Native)
- **React Native Debugger** - Standalone debugger

---

## Alternative Stack Options

### Option 2: Flutter
**Pros:**
- Excellent performance
- Single codebase
- Great for complex animations
- Strong type system (Dart)

**Cons:**
- Different language (Dart)
- Smaller ecosystem for some use cases
- Steeper learning curve if team is JS-focused

**Key Packages:**
- `http` or `dio` - HTTP client
- `cached_network_image` - Image caching
- `image_picker` - Photo selection
- `qr_code_scanner` - QR scanning
- `provider` or `riverpod` - State management
- `go_router` - Navigation

### Option 3: Native Development
**iOS:**
- Swift + SwiftUI
- URLSession for networking
- Combine or async/await for async operations

**Android:**
- Kotlin + Jetpack Compose
- Retrofit for networking
- Coroutines for async operations

**Pros:**
- Best performance
- Full platform access
- Native look and feel

**Cons:**
- Two separate codebases
- More development time
- Higher maintenance cost

---

## Recommended Architecture Pattern

### Project Structure (React Native + Expo)
```
photonix-mobile/
├── app/                    # Navigation structure (Expo Router)
│   ├── (auth)/            # Auth stack
│   │   ├── welcome.tsx
│   │   ├── connect.tsx
│   │   └── login.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Home gallery
│   │   ├── search.tsx
│   │   ├── albums.tsx
│   │   ├── people.tsx
│   │   └── settings.tsx
│   └── photo/[id].tsx     # Photo viewer
├── components/            # Reusable components
│   ├── PhotoGrid.tsx
│   ├── PhotoCard.tsx
│   ├── BottomSheet.tsx
│   └── ...
├── services/              # API services
│   ├── api.ts            # Axios instance
│   ├── auth.ts           # Auth service
│   ├── photos.ts         # Photo API
│   └── albums.ts         # Album API
├── hooks/                 # Custom hooks
│   ├── usePhotos.ts
│   ├── useAuth.ts
│   └── ...
├── store/                 # State management
│   ├── authStore.ts
│   └── ...
├── utils/                 # Utilities
│   ├── storage.ts
│   └── ...
└── types/                 # TypeScript types
    ├── photo.ts
    └── ...
```

### State Management Strategy
- **Server State**: React Query (photos, albums, people)
- **Client State**: Zustand (auth, UI state, settings)
- **Form State**: React Hook Form

### API Integration Pattern
```typescript
// services/api.ts
- Axios instance with base URL
- Request interceptor (add JWT token)
- Response interceptor (handle 401, refresh token)
- Error handling

// hooks/usePhotos.ts
- React Query hooks
- Infinite scroll queries
- Optimistic updates
```

---

## Key Technical Decisions

### 1. Image Loading Strategy
- **Thumbnails first** - Load low-res thumbnails immediately
- **Progressive loading** - Load full-res on demand
- **Caching** - Cache thumbnails and recent full-res images
- **Lazy loading** - Load images as user scrolls

### 2. Offline Support
- **Cache metadata** - Store photo metadata locally
- **Cache thumbnails** - Store all thumbnails
- **Queue uploads** - Queue failed uploads for retry
- **Offline indicators** - Clear UI feedback when offline

### 3. Authentication Flow
- **JWT tokens** - Store in secure storage (Keychain/Keystore)
- **Token refresh** - Automatic refresh before expiry
- **Biometric auth** - Optional Face ID/Touch ID for app unlock

### 4. Upload Strategy
- **Background uploads** - Continue when app backgrounded
- **Chunked uploads** - For large files
- **Resumable uploads** - Resume on failure
- **Compression** - Compress before upload (optional)

### 5. Performance Optimizations
- **Virtualized lists** - Use FlatList for photo grids
- **Image optimization** - Request appropriately sized images
- **Debounced search** - Debounce search input
- **Memoization** - Memoize expensive components

---

## Development Workflow

### Setup
1. **Expo CLI** - `npx create-expo-app`
2. **TypeScript template** - Use TypeScript from start
3. **Install dependencies** - Core libraries listed above

### Development
- **Expo Go** - Test on physical devices via Expo Go app
- **Development build** - Custom dev client for native modules
- **Hot reload** - Fast iteration

### Testing
- **Jest** - Unit testing
- **React Native Testing Library** - Component testing
- **Detox** or **Maestro** - E2E testing

### Building
- **EAS Build** - Expo's build service
- **iOS**: TestFlight → App Store
- **Android**: Internal testing → Play Store

---

## Integration with Backend

### API Client Setup
```typescript
// Base URL configuration
- Development: http://192.168.1.100:3000/api/v1
- Production: https://your-server.com/api/v1
- Auto-discovery: mDNS/Bonjour for local network
```

### Authentication Flow
1. User enters server address (or scans QR)
2. Login with username/password
3. Receive JWT token
4. Store token securely
5. Include token in all API requests
6. Refresh token before expiry

### Data Synchronization
- **Pull to refresh** - Manual sync
- **Background sync** - Periodic sync when app opens
- **Real-time updates** - WebSocket (future enhancement)

---

## Platform-Specific Considerations

### iOS
- **Photo Library Access** - NSPhotoLibraryUsageDescription
- **Local Network** - NSLocalNetworkUsageDescription
- **Background Uploads** - Background fetch capability

### Android
- **Storage Permissions** - READ_MEDIA_IMAGES (Android 13+)
- **Network Security** - Allow cleartext for local IP (dev only)
- **Background Uploads** - WorkManager for background jobs

---

## Recommended Stack Summary

### Primary Choice: **React Native CLI + TypeScript**

**Core:**
- React Native 0.74+
- TypeScript
- React Navigation 6+

**Essential Libraries:**
- React Navigation 6
- React Query (TanStack Query)
- Zustand
- Axios
- react-native-fast-image
- expo-camera
- expo-image-picker
- React Hook Form
- Styled Components

**Why This Stack:**
✅ Single codebase for iOS + Android  
✅ Modern, well-maintained ecosystem  
✅ Excellent photo handling libraries  
✅ Easy QR code scanning  
✅ Great developer experience  
✅ Active community and support  
✅ Can achieve native-level performance  
✅ Over-the-air updates possible  

---

## Next Steps

1. **Initialize project** - `npx create-expo-app photonix-mobile --template`
2. **Set up TypeScript** - Configure tsconfig.json
3. **Install core dependencies** - Navigation, state management, API client
4. **Set up API service** - Axios instance with interceptors
5. **Create base navigation** - Stack and tab navigators
6. **Implement authentication** - Login flow, token storage
7. **Build first screen** - Home gallery with photo grid
8. **Add image loading** - Implement thumbnail loading and caching
9. **Test on devices** - iOS and Android physical devices
10. **Iterate** - Follow wireframe spec for remaining screens

---

*Last Updated: 2025*  
*Status: Recommended Stack - Ready for Implementation*


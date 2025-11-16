# Photonix Mobile App

A self-hosted, AI-powered personal photo gallery mobile application built with React Native CLI.

## Tech Stack

- **React Native 0.82.1** - Cross-platform mobile framework
- **TypeScript** - Type safety
- **React Navigation 6** - Navigation library
- **React Native CLI** - Native development setup

## Project Structure

```
photonix-mobile/
├── src/
│   ├── navigation/        # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/           # Screen components
│   │   ├── auth/          # Authentication screens
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── ConnectScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── PermissionsScreen.tsx
│   │   └── main/          # Main app screens
│   │       ├── HomeScreen.tsx
│   │       ├── SearchScreen.tsx
│   │       ├── AlbumsScreen.tsx
│   │       ├── PeopleScreen.tsx
│   │       └── SettingsScreen.tsx
│   └── App.tsx            # Root component
├── ios/                   # iOS native project
├── android/               # Android native project
└── package.json
```

## Setup

### Prerequisites

- Node.js 20+
- iOS: Xcode and CocoaPods
- Android: Android Studio and Android SDK

### Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS, install CocoaPods:
```bash
cd ios && pod install && cd ..
```

3. Start Metro bundler:
```bash
npm start
```

4. Run on iOS:
```bash
npm run ios
```

5. Run on Android:
```bash
npm run android
```

## Current Status

**Frontend-only implementation** - Static UI screens with no functionality yet.

### Implemented Screens

- ✅ Welcome Screen
- ✅ Server Connection Screen
- ✅ Login Screen
- ✅ Permissions Screen
- ✅ Home Gallery Screen (static)
- ✅ Search Screen (static)
- ✅ Albums Screen (static)
- ✅ People Screen (static)
- ✅ Settings Screen (static)

### Next Steps

- Add API integration
- Implement state management
- Add image loading and caching
- Implement photo upload flow
- Add navigation between screens

## Development

This is a frontend-only implementation focusing on UI structure. Functionality will be added in subsequent phases.

## Documentation

- See `WIREFRAME_SPEC.md` for detailed UX wireframe specifications
- See `TECH_STACK.md` for technology stack details

# CalcPro - Replit Agent Guide

## Overview

CalcPro is a disguised evidence vault mobile application built with React Native (Expo). It appears to be a standard calculator app but secretly contains a secure evidence storage vault accessible via PIN codes. The app supports two PINs: a "secret" PIN that unlocks the real vault, and a "decoy" PIN that could show a different view. Evidence types include photos, videos, audio recordings, and text notes, all encrypted locally on the device with forensic metadata tracking (timestamps, device info, GPS, chain of custody IDs).

The project has a dual architecture: an Expo/React Native frontend for the mobile app and an Express.js backend server. The backend currently has minimal functionality (user schema scaffolding) while the core app logic runs client-side.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router for file-based routing
- **State Management**: React Context (`AppProvider` in `lib/app-context.tsx`) manages app mode (calculator/vault/setup), evidence items, and PIN state. TanStack React Query is available for server data fetching but the app primarily works offline
- **Navigation**: Single-screen app with three modes rendered conditionally in `app/index.tsx` — no traditional multi-screen navigation. Modes are: `setup` (first-time PIN configuration), `calculator` (disguise mode), and `vault` (evidence management)
- **Animations**: react-native-reanimated for button press animations, transitions, and UI feedback
- **UI**: Custom-built calculator UI mimicking iOS calculator. Dark theme throughout. No UI library — all components are hand-crafted with StyleSheet

### Security & Encryption
- **PIN Hashing**: SHA-256 via expo-crypto with a static salt (`silentshield_salt_v1`)
- **Data Encryption**: AES encryption via crypto-js with PBKDF2 key derivation (10,000 iterations). Each encryption operation generates a random salt
- **Storage**: AsyncStorage for encrypted evidence and app configuration. No server-side storage of sensitive data
- **Dual PIN System**: Secret PIN unlocks real vault; decoy PIN triggers alternate behavior

### Forensic Metadata
- Evidence items capture detailed metadata: timestamps, device info (via expo-device), GPS coordinates (via expo-location), integrity hashes, chain of custody IDs
- Metadata types defined in `lib/types.ts`, collection logic in `lib/forensics.ts`

### Backend Server
- **Framework**: Express.js 5 with TypeScript, compiled via esbuild for production
- **Database**: PostgreSQL via Drizzle ORM. Schema defined in `shared/schema.ts` (currently just a users table)
- **Storage Layer**: `server/storage.ts` has an in-memory storage implementation (`MemStorage`) with interface for future database migration
- **API**: Routes registered in `server/routes.ts`, currently empty. All routes should be prefixed with `/api`
- **CORS**: Configured for Replit domains and localhost development
- **Static Serving**: In production, serves a landing page and Expo web build from `dist/` directory

### Build & Development
- **Dev**: Two processes — `expo:dev` for the mobile app, `server:dev` for the Express backend
- **Production**: `expo:static:build` creates web bundle, `server:build` compiles server, `server:prod` runs production server on port 5000
- **Database Migrations**: `drizzle-kit push` for schema synchronization
- **Path Aliases**: `@/*` maps to project root, `@shared/*` maps to `./shared/*`

## External Dependencies

### Core Services
- **PostgreSQL**: Database (configured via `DATABASE_URL` environment variable). Drizzle ORM for schema management and queries. Currently only has a `users` table — the main evidence vault data is stored client-side in AsyncStorage
- **AsyncStorage**: Primary client-side encrypted data store for evidence and app configuration

### Expo Modules
- `expo-camera`: Photo/video capture for evidence collection
- `expo-audio`: Audio recording for evidence
- `expo-image-picker`: Image selection from device gallery
- `expo-location`: GPS coordinates for forensic metadata
- `expo-device`: Device information for forensic metadata
- `expo-crypto`: SHA-256 hashing for PIN verification
- `expo-secure-store`: Available but primary encryption uses crypto-js
- `expo-haptics`: Tactile feedback on button presses

### JavaScript Libraries
- `crypto-js`: AES encryption and PBKDF2 key derivation for evidence encryption
- `drizzle-orm` + `drizzle-zod`: Database ORM with Zod schema validation
- `@tanstack/react-query`: Server state management (available but lightly used)
- `react-native-reanimated`: Smooth animations
- `react-native-gesture-handler`: Touch gesture support
- `react-native-keyboard-controller`: Keyboard-aware scrolling
# Speakeasy

React Native mobile app built with **Expo** and **TypeScript**. All app tooling and dependencies live in this `frontend/` directory only.

## Requirements

- **Node.js** 20.x or newer (LTS recommended; matches current Expo tooling)
- **npm** (bundled with Node)
- For device testing: [Expo Go](https://expo.dev/go) on a physical phone, or an emulator/simulator

This project uses **Expo SDK 54**, which matches the **Expo Go** builds from the iOS App Store and Google Play. If you later move to SDK 55+, you may need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) or the SDK-specific Expo Go install path from the [Expo changelog](https://expo.dev/changelog).

## Setup

```bash
cd frontend
npm install
```

## Run the app

Start the Metro bundler and DevTools:

```bash
npm start
```

Or equivalently:

```bash
npx expo start
```

From the DevTools terminal UI you can:

- Press **a** to open on **Android** emulator (Android Studio / SDK required)
- Press **w** to open in the **web** build (if supported by your dependencies)
- Scan the QR code with **Expo Go** (iOS Camera or Expo Go on Android)

**iOS Simulator** (macOS with Xcode only):

```bash
npm run ios
```

**Android emulator** (with emulator already running):

```bash
npm run android
```

## Scripts

| Script            | Description                    |
| ----------------- | ------------------------------ |
| `npm start`       | Start Expo dev server          |
| `npm run android` | Start Expo and target Android  |
| `npm run ios`     | Start Expo and target iOS      |
| `npm run web`     | Start Expo and open web target |
| `npm run typecheck` | Run `tsc --noEmit`           |

## Project layout

- `App.tsx` — root component
- `src/screens/` — screen components
- `src/components/` — shared UI pieces
- `app.json` — Expo config (name **Speakeasy**, slug `speakeasy`)

## Native IDs

- **iOS** `bundleIdentifier`: `com.speakeasy.app`
- **Android** `package`: `com.speakeasy.app`

Change these in `app.json` before shipping to stores if you use a different namespace.

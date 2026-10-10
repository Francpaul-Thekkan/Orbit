# Orbit Beta v1 build status

## Implemented

- Offline web/PWA source, Windows Electron app, Android Capacitor app, and an iOS source project.
- Four-step startup setup, an empty personal workspace with no demo data, saved name/currency/theme preferences, an offline in-app guide, and a standalone START-HERE.md guide.
- Windows installer and portable packaging; Android development APK packaging.
- Usage windows, reset timers, subscription tracking, account ranking, backups, themes, and activity history.
- Optional Google sign-in and Drive app-data sync in the **web/PWA**. Setup is documented in `GOOGLE-SYNC-SETUP.md`; public OAuth configuration remains intentionally empty.
- Sync preserves immutable cloud versions, detects conflicting edits, requests a version choice, and saves a local recovery copy before replacing data.

## Verified

- 23 domain/sync tests: usage limits, reset math, billing, malformed backups, first sync, conflicts, concurrent versions, deletions, failures, and token expiry.
- Browser workflows: empty first run, setup completion and preference persistence, setup rerun preserving accounts, account changes, usage caps, reset confirmation, backups, offline reload/edit/reload, guide navigation, and responsive layout.
- Two isolated browser profiles with mocked Google endpoints: authorization, upload/download, conflict resolution, local recovery, token not persisted, disconnect, and offline use. This is not a live Google integration test.
- Electron UI launches without a web server and persists edits. Native sync is visibly disabled until platform OAuth is implemented.

## Limits and remaining work

- A Google Cloud OAuth client ID, Drive API configuration, approved origins, and consent-screen settings are required for actual Google sign-in. None have been supplied; no real Google data was accessed.
- Native Google sign-in for Electron and Capacitor is not implemented. Use the installed web app for Google sync after configuration, or transfer JSON backups between native apps.
- APKs are development-signed and have not been tested on a physical phone/emulator. Windows binaries are unsigned. macOS and native iOS builds require a Mac; neither Apple binary is supplied.
- AI provider usage remains manual. Google sync shares Orbit's saved data; it does not fetch Claude, Gemini, Codex, or ChatGPT usage.
- No live web deployment is included. Host the contents of `dist/` on an HTTPS static host to distribute the PWA.
- Android system backup remains enabled and follows device settings.

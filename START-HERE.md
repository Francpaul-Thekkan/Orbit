# Welcome to Orbit Beta v1

Orbit starts with **your own empty workspace**. No demo accounts, sample prices, or made-up usage balances are loaded.

## Start the app

- **Windows installer:** run `Orbit-v1.0.0-beta-win-x64-setup.exe`, choose an installation folder, and open Orbit from Start or your desktop.
- **Windows portable:** open `Orbit-v1.0.0-beta-win-x64-portable.exe` directly. Both Windows builds are unsigned. Your workspace is stored in your Windows user profile, not inside the executable.
- **Android:** install `Orbit-v1.0.0-beta-android-debug.apk`. This is a development-signed package for personal use, not a Play Store release. Installation may require allowing apps from the source you used to open it.
- **Web locally:** in the `orbit` project folder, run `npm ci` then `npm start`. Open `http://localhost:4173`. The local web version is separate from your desktop app workspace.

The web app is not currently published. Native iPhone and macOS binaries are not included; their source projects require a Mac to build and sign.

## Your first launch

1. **Welcome:** choose Get started.
2. **Your workspace:** choose a workspace name, default currency, and dark or light appearance.
3. **Know your limits:** read how usage windows and resets are tracked.
4. **Ready to go:** add your first account, restore an existing Orbit JSON backup, or open your empty workspace.

Setup does not require an internet connection in the native apps. In a browser, complete one successful online load to cache the interface for offline use. Preferences are remembered on this device. Existing accounts are preserved when you upgrade or rerun setup.

## Add an account

Choose Claude, Gemini, ChatGPT, Codex, or Other. Use a label such as Work or Personal. Enter the actual plan, free/paid/trial status, price per billing cycle, and relevant renewal/expiry dates. Email is optional; never store passwords in notes.

Add one usage window for each limit shown by the provider. Enter its total, amount used, unit, duration, and next reset time. A session might be 5 hours and a week is 168 hours, but follow your account's actual rules. If a provider shows percentages, use a total of 100 and the `%` unit.

The most constrained window determines availability. No recorded window means unknown usage. The app does not automatically connect to provider usage APIs.

## Everyday use

- **Overview:** account availability, upcoming resets, and subscription costs.
- **Update usage:** enter current consumption or confirm that a provider actually reset its window.
- **Use next:** account recommendations based on your recorded availability and selected task.
- **Calendar:** reset, renewal, and expiry dates in your device timezone.
- **Activity:** a local history of changes.
- **Settings:** backups, theme, startup setup, Google sync configuration, and data management.
- **Setup guide:** a complete guide built into the app and available offline. On a phone, open it from Settings.

## Keep your data

Export a backup from Settings regularly and before uninstalling, clearing storage, or moving devices. Imports replace the current workspace after confirmation. Backups include your labels, account identifiers, usage, notes, and activity in plain JSON.

Google Drive sync is optional in browsers and installed web apps. Real sign-in needs the one-time configuration in [GOOGLE-SYNC-SETUP.md](GOOGLE-SYNC-SETUP.md). Native Google sign-in is not included yet; desktop and Android apps can transfer backups manually. Google sync copies Orbit data and does not retrieve live AI provider usage.

## If something looks wrong

- **A timer says Due now:** check the provider, then confirm its reset in Update usage.
- **An account is missing from Use next:** check for exhaustion, a due reset, expiry, a paused account, or missing usage windows.
- **Monthly spend looks doubled:** if two products share one subscription, enter that subscription's price on only one account.
- **Google connection is unavailable:** configure the public OAuth web client ID and use the browser app. No client secret is needed.
- **Old interface after a web update:** close every Orbit browser tab and reopen the app online. Keep your data; do not clear site storage just to refresh the interface.
- **Saved data cannot be read:** export the original saved data from Settings before clearing anything.

Windows packaging and offline workflows have automated tests. Android builds are compiled but have not been tested on a physical phone. The feature limits above remain real; this release's onboarding does not imply live provider connections or finished Apple-platform distribution.

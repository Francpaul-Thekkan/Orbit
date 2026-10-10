# Orbit Beta v1 — data handling

This describes the shipped app, not an operator-specific policy for a hosted service. Deployment owners should add their identity, contact information, hosting practices, and other details required for their deployment.

## Local workspace

Orbit stores labels, optional account email identifiers, provider and plan names, subscriptions, limits, notes, preferences, and activity in local Web Storage. It does not request AI-account passwords or API keys. Local tracking sends no workspace data to an Orbit backend; no such backend is included. The app includes no analytics SDK.

Browser storage is not an encrypted vault. Someone with access to the app/browser profile may read it. Clearing storage, uninstalling, or device loss can remove local data. Android system backup is enabled and follows device settings.

## Backups

JSON exports contain workspace data in plain text. Save or share them only where intended. Native mobile sharing uses the system share sheet and writes an export to app cache. Import replaces the workspace after confirmation. Setup preferences are device-specific.

## Optional Google Drive sync

Connecting loads Google's online identity SDK. Authorization requests identity/email and Drive application-data access. Sync stores workspace versions in the connected user's Drive appDataFolder; ordinary Drive documents are not requested. Google processes authorization and stored data under its own policies. Orbit displays the connected email to help you select the correct workspace.

Tokens remain in memory and are cleared on disconnect/reload. Data is not end-to-end encrypted. Remote versions remain until hidden application data is removed through Drive app-management settings; no automatic retention limit exists. Deleting a local account does not remove earlier cloud snapshots. A pre-sync recovery copy may remain locally until replaced or local data is cleared.

Disconnecting stops the session but does not delete data. Revoke access in your Google Account settings. Optional automatic sync runs only while the app is open. Native OAuth is not included in Beta v1.

## Hosting and links

A hosted PWA downloads files from the chosen provider, which may collect request logs under its own policies. Provider links open external websites with their own data practices. No hosted service is supplied with this release.

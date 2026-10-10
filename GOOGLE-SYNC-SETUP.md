# Google sign-in and Drive sync setup

Orbit can sync its workspace between browsers and installed web apps using a person's Google account. Google configuration is intentionally empty until you create your own public OAuth client ID. No secret belongs in the app.

## One-time setup for the app owner

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API** for that project.
3. In **Google Auth Platform**, configure Branding and Audience. Add your own email and the people testing Orbit as test users while the app is in testing mode.
4. Add these scopes under Data Access:
   - `openid`
   - `email`
   - `https://www.googleapis.com/auth/drive.appdata`
5. Create an OAuth client of type **Web application**. Register `http://localhost:4173` as an authorized JavaScript origin for development (use localhost in the browser). Add the exact HTTPS origin of your eventual hosted app for production. Scheme, hostname, and port must match; do not include a path.
6. Copy the **client ID**, which ends with `.apps.googleusercontent.com`. Do not copy or send a client secret.
7. In Orbit → Settings → Google app setup, paste the client ID. This saves it only on this browser. For a distributed web app, put the public ID in `dist/config.js` as `GOOGLE_CLIENT_ID`, bump the service-worker cache version, and publish the updated source. Users then see the connection button without entering configuration themselves.
8. Open your personal workspace, click **Connect Google Drive**, then **Continue with Google**. The first button loads Google's online SDK; the second directly opens its authorization popup.
9. Confirm the Google email displayed and click **Sync now**. Enable automatic sync if desired. Repeat using the same app and Google account on your other device.

When inviting people beyond your test-user list, complete Google's audience/publishing requirements. Configure a support email, privacy policy, and verified domain as required by Google. Do not assume that a private hosting URL is available to other people; website audience is independent from Google login.

## How sync behaves

- Local operation requires no Google account or network. New installations start with an empty personal workspace and a startup guide.
- Sync uploads account labels, email identifiers, subscriptions, limits, notes, and activity to the **appDataFolder** in the connected person's Drive. It does not request access to normal Drive documents. It is not end-to-end encrypted.
- Each uploaded workspace is an immutable version. New versions reference their previous versions. Simultaneous writes create multiple heads and a visible conflict rather than an overwrite. Old versions are retained; no automatic remote deletion or history compaction is implemented. This uses Drive storage over time.
- If only the cloud changed, sync downloads it. If only this device changed, sync uploads it. If both changed, choose a whole workspace to continue with. Download both copies first to combine edits manually; automatic record-level merging is not implemented.
- Before replacing local data, Orbit keeps a recovery copy. Settings → Export pre-sync recovery copy downloads it. Newer replacements replace that single local recovery copy.
- Automatic sync runs after local saves, on reconnect, and once per minute while the app is visible. It pauses during editing, conflicts, and errors. It cannot operate while the app is closed.
- Access tokens stay in memory. They are not written to backups, localStorage, or source. Reloading the app or token expiry requires reconnecting. This avoids keeping a long-lived Google credential in browser storage.
- Disconnect clears this device's in-memory session but leaves local data and Drive versions. Revoke access through your Google Account's third-party connections. Manage/delete hidden application data through Google Drive's Manage Apps settings. Deleting a local account does not erase earlier cloud snapshots.
- Different Google accounts have separate sync baselines. Every new sign-in requires a deliberate Sync now before automatic sync resumes. Verify the displayed email before that click.

## Native apps

The packaged Windows/macOS Electron host and Android/iOS Capacitor hosts currently keep sync disabled, with an explanation in Settings. Google's browser OAuth library cannot be used as a substitute for native platform sign-in. Native OAuth with external browser/PKCE or platform Google authorization, platform client IDs, redirect handling, and secure credentials is still required. The native apps continue to work offline and can exchange JSON backups with the web app.

## Validation and limitations

Automated tests use an in-memory Drive mock to cover upload/download, concurrent versions, offline/error handling, malformed cloud backups, and UI setup. A real Google consent and Drive round-trip has not been verified. Configure an OAuth client and validate a complete live sync between two browser profiles before offering Google sync to users.

### Official references

- [Google OAuth token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google client setup and allowed origins](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Drive application-specific data](https://developers.google.com/workspace/drive/api/guides/appdata)

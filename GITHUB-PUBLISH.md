# Publish Orbit Beta v1 on GitHub

Use these ready-to-copy fields. Nothing has been uploaded. Your GitHub username, live website, license, and signing identities remain owner-specific settings.

## Repository name

```text
Orbit
```

## Description

```text
Offline-first AI account manager for Claude, ChatGPT, Codex, Gemini, and more. Track recorded usage, reset countdowns, subscriptions, trials, and which account to use next. Windows, Android, and web/PWA. Beta v1.
```

## Other repository fields

| Field | Value |
| --- | --- |
| Owner | Your GitHub account |
| Visibility | Public for anyone to view/download; Private otherwise |
| Add README | Off; the source already includes one |
| Add .gitignore | None; the source already includes one |
| Choose a license | None for now; license selection is pending |
| Default branch | `main` |
| Website | Leave blank until you deploy the app |

Public visibility does not itself grant an open-source license. Choose a license before describing the project as open source. See [GitHub's licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## About → Topics

Add each topic separately:

```text
ai account-manager usage-tracker subscription-manager offline-first pwa electron capacitor android windows claude chatgpt codex gemini
```

## Upload the source

Extract `releases/Orbit-Beta-v1-Source.zip` into a new folder. Upload its contents, including hidden files. `package.json`, `README.md`, `dist/`, and `.github/` must be at the repository root, not inside an extra `orbit` directory. Do not upload just the ZIP as your repository source.

The clean ZIP excludes installed dependencies, build caches, local hosting configuration, test profiles, private signing material, and release binaries. For the full tree, GitHub Desktop is convenient: add the extracted folder as a local repository (create it there when prompted), commit, and use Publish repository. Alternatively, use Git and copy the exact remote URL GitHub provides. Do not stage `node_modules/`, `artifacts/`, or `releases/` from the original workspace.

**First commit summary**

```text
Release Orbit Beta v1
```

**First commit description**

```text
Add the offline-first Orbit AI account manager with guided setup, manual usage tracking, reset timers, subscription tracking, account recommendations, backups, and optional web Google Drive sync. Include Windows and mobile source projects, build checks, documentation, and beta release notes.
```

## GitHub release fields

After uploading source, open Releases and create a release. See [GitHub's release guide](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository?tool=webui).

| Field | Paste / select |
| --- | --- |
| Tag | `v1.0.0-beta` — create this tag |
| Target | `main`, at the commit containing this beta |
| Release title | `Orbit Beta v1` |
| Description | Copy all of `RELEASE-DESCRIPTION.txt` (plain text, no Markdown headings) |
| Set as a pre-release | Checked |
| Set as latest stable release | Leave unchecked if offered |
| Discussion | Optional; leave off unless Discussions is enabled |

The three app downloads are together in `releases/v1.0.0-beta/`. Attach only these files:

```text
Orbit-v1.0.0-beta-win-x64-setup.exe
Orbit-v1.0.0-beta-win-x64-portable.exe
Orbit-v1.0.0-beta-android-debug.apk
```

Save a draft to review the text and attachments, then publish when ready. EXE/APK files belong in release attachments, not the Git source tree. Do not attach older internal builds.

## Optional website and Google login

Deploy `dist/` contents to an HTTPS static host. Put the resulting URL in the repository Website field. For Google login, follow `GOOGLE-SYNC-SETUP.md`, configure your public client ID, update the service-worker cache, and redeploy. Never put OAuth client secrets in this app or repository. Test live sign-in and sync between two devices before offering it to users.

## Included GitHub documents

README with screenshots, release notes, changelog, startup guide, Google setup guide, data-handling document, contributing guide, issue forms, PR template, and a manual app-build workflow. The workflow does not publish anything automatically.

The privacy document describes the source release. Add your own operator/contact and hosting details if you need a public privacy policy for a deployed service. No license grant or personal contact details have been invented.

# Working on Orbit

License selection is pending; no open-source license is currently supplied.

Use Node.js 22 or newer. Run `npm ci`, `npm run build`, `npm test`, and `npm start`. Open `http://localhost:4173`. See README for native builds and UI tests.

## Report a problem

Use the bug form with platform, app version, steps, expected behavior, and actual result. Do not upload account emails, real backups, tokens, or private notes. Use synthetic examples. State whether the problem affects browser/PWA, Electron, or Android.

## Propose a change

Keep changes focused and explain their user-visible outcome and verification. Test usage/reset calculations and backup/sync changes carefully. Never silently overwrite a workspace or infer provider balances. Preserve offline operation, keyboard access, and reduced-motion behavior.

The canonical web source is `dist/`. Rebuild the native bridge with `npm run build`, then use `npx cap sync` before native builds. Bump the service-worker cache for changed app files. Do not edit generated mobile web assets directly.

Never commit dependencies, build caches, test profiles, signing keys, tokens, or OAuth client secrets. Public OAuth client IDs are configuration, but live credentials and private backups do not belong in fixtures.

## Release checks

Run domain/sync tests and relevant UI checks. Rebuild distributed binaries after modifying bundled assets. Verify versions, fresh setup, offline persistence, and backup recovery. Keep release notes honest about untested platforms and integrations.

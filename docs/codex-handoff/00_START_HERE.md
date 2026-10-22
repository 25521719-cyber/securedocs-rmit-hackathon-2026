# SecureDocs / TideCloak — Codex implementation handoff

## Ground rules
The Flameblue UI is already designed. Reuse the exported source code if available. The screenshots in `screenshots/` and the original user video `tide.mp4` are visual/interaction references, **not** proof of secure functionality. Do **not** redesign the UI or replace the existing backend without evidence.

## Codex assignment (paste into VS Code Codex)

You are responsible for turning the existing SecureDocs visual prototype into a real, secure, functional app using TideCloak.

1. INSPECT: Read AGENTS.md, package.json, app structure, existing integrations, env templates, tests, Docker config, and git status. First identify framework and source of truth. If only screenshots or video exist, rebuild the UI accurately without inventing a different design. Never overwrite unrelated code or commit secrets.
2. BASELINE: Run non-destructive setup, lint/typecheck/build/tests. Record current failures. Preserve existing working routes.
3. UI: Match reference screenshots. Keep Documents, Shared With Me, document editor, access/sharing drawer, Settings / Integration Readiness, role/status badges, and the 5-step presentation scenario. Replace mock handlers with actual flows only when the backend supports them. Remove or clearly label demo mode; don't falsely claim security is enabled.
4. TIDECLOAK: Check actual health/configuration of localhost:8080, realm `securedocs`, Tide IdP, client/redirect URI, licensing and SDK requirements based on OFFICIAL docs (https://docs.tide.org/). Prior failures: Midgard FinalizeWallet/GetLicenseDetails HTTP 503; generate-initial-key POST 404; DetermineGVRKExpiry Insufficient data; duplicate resource on retries. Diagnose methodically before reenrollment/recreating realm. Do not silently bypass failures or substitute fake auth.
5. REAL APP: Implement backend persistence and workflows: authenticated document create/read/update/delete, owned/shared listing, access requests, owner approval/revocation, collaborator viewing after grant, administrator metadata-only when not explicitly granted access. Define permissions server-side; do NOT trust role simulation in the browser. Use encryption appropriate to Tide's documented E2EE and verify end-to-end behavior; never claim encrypted/secure while it is not.
6. SECURITY: Deny-by-default; check access on every server endpoint and content retrieval path, including direct URL/API. Keep confidential plaintext out of localStorage, logs, analytics and public caches. Validate ownership of request/approval actions. No privileged browser-only admin bypass. Respect the distinction between admin control-plane privileges and content decryption access.
7. TEST: Create automated tests for owner/collaborator/admin and denied paths; test login/logout/expired session; test grant/revoke and unauthorized direct API calls. Verify UI in browser, typecheck, lint, build, and runtime; cite commands with outcomes. If TideCloak itself is broken, isolate blocker and provide reproducible logs and next steps instead of marking integration DONE.
8. HANDOFF: Present concise report: implemented, tested, remaining TideCloak blockers, files changed, run commands, environment variables needed, and manual setup steps. Keep the UI aesthetically as shown in screenshots. Work in small verifiable commits/patches.

Order: inspect/baseline -> diagnose TideCloak -> integrate auth -> implement server-side document access -> build the UI flows -> verify negative permissions and visuals. If a critical external dependency is blocked, complete independent non-security work and explicitly mark the integration as blocked.

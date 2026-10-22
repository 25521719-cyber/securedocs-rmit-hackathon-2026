# Test plan

Automated API and policy tests: `npm.cmd test`. It builds and starts Next.js, verifies the production document endpoint fails closed, tests invalid and denied demo requests, create/list/delete across server restarts, collaborator request, owner approval and revocation, administrator content omission, concurrent writes from two processes, corrupt/unavailable storage, and production demo opt-in.

Static gates: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`.

Dependency audit on 2026-10-22: `npm audit --omit=dev` reported zero production dependency findings. The full audit reported five high findings in the ESLint development toolchain; npm's suggested fix downgrades `eslint-config-next` across a major version and was not applied. Recheck when a compatible patched release is available.

Browser tests: `npm.cmd run test:e2e` uses installed Microsoft Edge through Playwright. It covers create, edit, reload persistence, preview, sharing request, owner approval, collaborator viewing, revocation, delete, and all five presenter steps. A screenshot of the Shared With Me page is saved under ignored `test-results/`. Settings, search/filter, and narrow viewport behavior remain manual UI checks. Browser tests exercise the simulation and are **not proof of secure authorization**.

Before real release: add authenticated integration tests for login/logout/expired session, direct API denial, grant/revoke, administrator metadata-only, encrypted content storage, and TideCloak failure handling. These cannot be green while TideCloak integration is absent.

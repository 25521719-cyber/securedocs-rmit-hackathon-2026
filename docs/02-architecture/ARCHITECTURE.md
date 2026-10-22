# Architecture and security boundary

The client in `app/page.tsx` renders the reference screens and calls `/api/demo`. The demo API uses `lib/demo-store.ts` for a local JSON file and `lib/demo-policy.ts` for the presentation role rules. Metadata is returned for each document; demo body text is omitted for the selected collaborator until grant and for the selected administrator. Since the role comes from the request, this is **not an authorization boundary**.

Demo inputs are type checked and size limited. The store validates JSON on read, serializes writes across local processes with a lock directory, flushes a temporary file, and replaces the state file atomically. A corrupt or unavailable store returns 503 and is not reset implicitly. This design is for a local filesystem, not a distributed filesystem or production database. In production builds, `/api/demo` requires `SECUREDOCS_ENABLE_DEMO=true`; the flag makes an untrusted demo public and must never be interpreted as enabling security.

The production route `/api/documents` is fail-closed (503) for every method. `lib/secure-boundary.ts` defines a verified-principal identity contract, the intended metadata/content/edit policy, and a protected-content readiness contract. `requireProductionServices` throws until verified implementations are configured. The Tide envelope and SDK operations are deliberately not guessed. No real token validation, encryption, or production database is active. Connecting TideCloak requires:

1. Verify realm, client, redirect URI, Tide IdP, wallet/license state, and the previously failing routes with current logs and official Tide documentation.
2. Implement OIDC authorization code with PKCE and verified server-side sessions. Do not accept a role supplied by the browser.
3. Map authenticated subject and trusted claims to a server-side Owner / Collaborator / Administrator policy on every listing, document read, mutation, and direct API route. Administrators receive metadata only unless separately granted content access under an explicit policy.
4. Choose and verify Tide-supported end-to-end encryption and a production database before storing confidential data. Keep keys and plaintext out of browser persistence, logs, and public caches.
5. Run login/logout/expiry, direct URL, grant/revoke, and negative administrator tests end to end.

The demo JSON store supports concurrent app processes on one local filesystem, but is not suitable for untrusted users, network filesystems, or confidential data.

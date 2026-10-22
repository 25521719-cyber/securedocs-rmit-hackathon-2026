# TideCloak diagnostic status

Checked 2026-10-22 from this workspace:

- `http://localhost:8080/` returned 200 and served the Tide console shell with base `/realms/master/tide-console/`.
- `http://localhost:8080/realms/securedocs/.well-known/openid-configuration` returned 200. The advertised issuer is `http://localhost:8080/realms/securedocs`.
- The advertised JWKS endpoint returned two public verification keys. A generic account-client login request returned 400, so no SecureDocs client or redirect URI was verified.
- The installed Tide console JavaScript calls `POST /admin/realms/{realm}/vendorResources/generate-initial-key` and `GET /admin/realms/{realm}/vendorResources/getLicenseDetails`. Anonymous GET/HEAD probes of the key path and GET of the license path returned 401, consistent with admin protection. An authenticated POST was not attempted because it may generate a key and the required admin session was unavailable. These probes do not prove the earlier POST 404 or Midgard 503 is resolved.
- The first realm discovery attempt could not connect; subsequent requests succeeded. Availability was intermittent during this run.
- Docker Desktop processes were present, but `docker` was not on PATH and a targeted search found no CLI. WSL access returned `E_ACCESS_DENIED`. Container image/tag, configuration, and logs could not be inspected here.
- `https://docs.tide.org/` could not be reached from this environment.

The prior reported failures remain unverified: Midgard `FinalizeWallet` / `GetLicenseDetails` HTTP 503, `generate-initial-key` POST 404, `DetermineGVRKExpiry` insufficient data, and duplicate resource on retry. Realm discovery success does **not** establish that Tide wallet finalization, license, IdP, SDK, or encryption is operational. The old 404 could reflect a different route or version, but this cannot be concluded without the failing URL and request trace. Current logs are needed to distinguish an upstream licensing outage from configuration or route/version mismatch. Do not retry enrollment or recreate the realm blindly.

Required next diagnostics: deployment/Compose files with secrets redacted, container image tags, current TideCloak and Midgard logs surrounding a single failing request, exact failing request method/path and response status, Tide IdP and license state, SecureDocs client ID and registered redirect URI. Compare these with the official Tide quickstart and FAQ when reachable. No credentials or keys should be copied into this repository.

## When TideCloak is available

1. The TideCloak operator supplies the redacted deployment config, image tags, and current Midgard/TideCloak logs. Verify the realm issuer, Tide IdP, license/wallet status, SecureDocs client ID, and exact registered redirect URI. Compare the installed routes with the official documentation for that image version.
2. Reproduce **one** authenticated failing action with the operator and correlate its request ID, method, path, status, and logs. Resolve the reported 503 upstream cause and 404 route/version cause before any new enrollment or key generation. Preserve a backup of the realm before configuration changes.
3. Implement the `IdentityAdapter` in `lib/secure-boundary.ts` using OIDC authorization code with PKCE, a validated issuer/JWKS/audience, and server-side sessions. Map only verified subject and trusted claims to the policy. Add login, logout, expiry, and direct-route denial tests.
4. Confirm Tide’s documented end-to-end encryption and grant/revoke lifecycle, then implement the `ProtectedContentAdapter` with the verified SDK. Choose a production repository for encrypted document payloads and metadata. Keep plaintext and keys out of the demo store, logs, and public caches.
5. Replace the 503 production route with handlers that authenticate and authorize every operation, including listing and direct document reads. Verify owner, granted collaborator, revoked collaborator, and administrator metadata-only paths end to end before removing any “not connected” status.

The required Tide client settings and SDK parameters are deliberately **TBD**. Do not guess environment variable names or add secrets to `.env.example` until the live configuration is verified.

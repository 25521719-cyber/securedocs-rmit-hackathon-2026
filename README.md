# SecureDocs

**RMIT Hackathon 2026 | Tide UNLOCKED Challenge 2**

SecureDocs is a document workspace demonstrating how [Tide Foundation's TideCloak](https://tide.org/unlocked/) can enforce privacy through Emergent Authority. This implementation uses a **simulated TideCloak integration** under Tide's official **[Plan C](https://tide.org/unlocked/#plan-c)** authorization, which permits simulated sign-in, roles, access checks, and protection mechanisms when the live Tide network is unavailable.

## The trust problem

Traditional document systems give administrators and server operators full access to user data. Even with encryption, the service provider or a privileged administrator can often access decryption keys, override access controls, or read content without the document owner's knowledge.

**Emergent Authority** solves this by distributing trust across the Tide network. No single party can unilaterally access protected content. The document owner must explicitly grant access, and that decision is enforced cryptographically by the Tide network consensus, not by a server-side flag that an administrator could change.

## What is simulated (Plan C)

| Capability | Simulated behavior | Live TideCloak behavior |
|---|---|---|
| Identity verification | Browser-selectable role picker (no authentication) | OIDC authorization code flow with PKCE via TideCloak |
| Document encryption | Base64 encoding labeled as "NOT encryption" | Tide SDK end-to-end encryption with distributed key management |
| Access grant/revoke | Server-side boolean flag in local JSON file | Cryptographic re-encryption via Tide network consensus |
| Administrator isolation | Server-side policy omits body from API response | Administrator never possesses decryption key material; enforced by Tide network |
| Token validation | Fake JWT-like object with no signature verification | RS256/ES256 signature verification against TideCloak JWKS endpoint |

**No simulated behavior provides real cryptographic security.** Every simulated element is clearly labeled in the UI and API responses.

## Three personas

- **Owner (Alex Morgan)**: Creates documents, controls all access grants and revocations, can edit document content.
- **Collaborator (Maya Chen)**: Requests access to documents, can view content only after the owner explicitly approves.
- **Administrator (Jordan Brooks)**: Can see document metadata (title, owner, timestamps) but **cannot** independently view document content or override access decisions.

## Setup and run

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd` rather than the PowerShell shims.

## Verify

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

- `npm test` builds and runs API, policy, and TideCloak simulation adapter tests against isolated temporary stores.
- `npm run test:e2e` builds the app, starts it on an available port, and runs Playwright against installed Microsoft Edge.
- Tests cover: identity simulation, access policy evaluation, document lifecycle, three-persona authorization, encryption simulation round-trip, emergent authority metadata, presenter flow, and negative paths.

## Architecture

```
app/page.tsx          Single-page demo UI (role picker, document CRUD, presenter flow)
app/api/demo/         Demo API with simulation metadata in every response
app/api/documents/    Production route (503 until real TideCloak connected)
lib/tidecloak-sim.ts  TideCloak simulation adapter (identity, policy, encryption)
lib/secure-boundary.ts  Production interfaces (IdentityAdapter, ProtectedContentAdapter)
lib/demo-policy.ts    Demo role-based document view policy
lib/demo-store.ts     Local JSON file store with file locking
lib/demo-types.ts     Shared TypeScript types
lib/demo-input.ts     Request validation utilities
```

The simulation adapter (`lib/tidecloak-sim.ts`) implements the same `IdentityAdapter` and `ProtectedContentAdapter` interfaces defined in `lib/secure-boundary.ts`. When a real TideCloak integration is ready, the simulation adapter is replaced without changing any other application code.

## Intended TideCloak integration

When TideCloak is available, the following steps complete the real integration:

1. Verify realm, client ID, redirect URI, Tide IdP, and wallet/license state against official Tide documentation.
2. Implement `IdentityAdapter` using OIDC authorization code with PKCE, validated issuer/JWKS/audience, and server-side sessions.
3. Implement `ProtectedContentAdapter` using the Tide SDK for end-to-end encryption.
4. Replace the 503 production route with authenticated, authorized handlers.
5. Run login/logout/expiry, direct-route denial, grant/revoke, and administrator metadata-only tests end to end.

The existing local TideCloak realm is preserved and not modified. See [TideCloak status](docs/03-integration/TIDECLOAK.md) for diagnostic details.

## Limitations

- **No real authentication**: Roles are selected via a browser dropdown. Anyone can switch roles.
- **No real encryption**: Document content is stored as plaintext in `.data/demo-documents.json`. The "encryption" shown is base64 encoding, explicitly labeled as not real encryption.
- **No real token validation**: Simulated tokens are unsigned objects for display purposes only.
- **No real administrator restriction**: The administrator content denial is a server-side policy check, not cryptographic enforcement.
- **Local storage only**: The demo JSON store is for local filesystem use, not suitable for production or confidential data.
- **Production route closed**: `/api/documents` returns 503 until verified TideCloak integration is complete.

## Deployment

```powershell
docker build -t securedocs .
docker run --rm -p 3000:3000 -e SECUREDOCS_ENABLE_DEMO=true -v securedocs-demo:/app/.data securedocs
```

The demo API is disabled by default in production builds. Set `SECUREDOCS_ENABLE_DEMO=true` only for isolated public-data demonstrations.

## Demo script (two minutes)
https://drive.google.com/file/d/1-aP78HU9V0cI9yBrDRGcoD-HecTQ2kGD/view?usp=sharing
See [DEMO_SCRIPT.md](docs/04-demo/DEMO_SCRIPT.md) for the full presenter guide. Quick version:

1. **Open and reset** (10s): Navigate to Shared With Me, click Reset demo. State: "This is a simulation under Tide's Plan C. No real security is active."
2. **Owner creates document** (15s): Click "Run next step". Alex creates a confidential document. Show the Simulation badge and policy card.
3. **Collaborator requests access** (15s): Click "Run next step". Maya requests access. Preview shows "Content not available".
4. **Owner approves** (15s): Click "Run next step". Open Sharing drawer to show the grant. Note: this is a flag toggle, not cryptographic re-encryption.
5. **Collaborator views** (15s): Click "Run next step". Maya can now see the content. This simulates a successful decryption grant.
6. **Administrator denied** (20s): Click "Show denial". Jordan sees metadata but "Content not available". Explain Emergent Authority: in live TideCloak, the administrator never possesses key material.
7. **Integration readiness** (15s): Open Settings. Show the four readiness cards. All show "Not connected" or "Demo only". The production endpoint returns 503.
8. **Wrap-up** (15s): Summarize: "Everything you saw is simulated. With TideCloak, these access decisions would be cryptographically enforced by the Tide network, not by our server."

## Recording instructions

1. Start the app: `npm.cmd run dev`
2. Open http://localhost:3000 in a browser (preferably at 1280x720 or higher).
3. Start screen recording (OBS, Windows Game Bar, or similar).
4. Follow the two-minute demo script above.
5. Export recording as MP4. Verify the simulation banners and disclaimers are visible throughout.

## References

- [Tide UNLOCKED Challenge](https://tide.org/unlocked/)
- [Plan C Authorization](https://tide.org/unlocked/#plan-c)
- [Architecture](docs/02-architecture/ARCHITECTURE.md)
- [TideCloak Status](docs/03-integration/TIDECLOAK.md)
- [Test Plan](docs/05-testing/TEST_PLAN.md)

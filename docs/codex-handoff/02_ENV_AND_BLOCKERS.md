# TideCloak known state / troubleshooting notes

As reported earlier by the user (do not assume it is still the same):
- Local environment: Windows 11, Docker Desktop/WSL, Node + npm.
- TideCloak previously served on `http://localhost:8080`.
- Keycloak/Tide realm `securedocs`; `tide` identity provider exists, setup incomplete.
- Errors previously seen: `Midgard.FinalizeWallet` / `GetLicenseDetails` returned 503; `generate-initial-key` POST 404; `DetermineGVRKExpiry` failed due to insufficient data; retries sometimes produced duplicate resource.
- These are unresolved until confirmed with **current** logs and independent test. Do not equate UI simulation with cryptographic or IAM integration.

Official references:
- https://docs.tide.org/
- https://docs.tide.org/Admin/Quick-deploy-test
- https://docs.tide.org/get-started/Tidecloak%20Quickstart
- https://docs.tide.org/FAQ/

Diagnostics should record Docker image/tag, environment, effective base URLs, issuer/redirect URIs, network reachability, realm/IdP/license state, logs and reproducible request route/method. Redact tokens/passwords/private keys in reports.

Do not run a greenfield scaffold over an existing repository. If a fresh reference app is useful, build it in a separate temporary directory and compare config; do not recreate the existing realm without a backup and explicit need.

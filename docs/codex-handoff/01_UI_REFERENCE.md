# UI/interaction observations from tide.mp4 (53 seconds)

## Visual identity
- App: **SecureDocs**; pale gray/lavender background; white cards; indigo primary buttons; vertical left sidebar.
- Workspace banner: "RMIT Hackathon" (demo workspace).
- Sidebar: Documents, Shared With Me, Settings; simulated active roles Owner, Collaborator, Administrator. Footer identifies "Simulation mode".
- Top banner: "Simulation only" / "TideCloak Not Connected", with link to Integration Readiness. This statement is essential until real TideCloak verification passes.

## Screens and behavior
1. Documents / Shared With Me: header, search, access filter, rows with title, owner, updated, access; view, edit, share, delete controls and New document.
2. Document preview: right-side drawer, owner/classification, status, document body only when access allows, edit/share CTAs.
3. Editor: Create a confidential document; title, content, Save, Cancel; access policy side panel (Owner can edit, Collaborator requests access, Administrator metadata only). Empty title validation shown.
4. Presenter flow: five steps: (1) Owner creates confidential doc; (2) Collaborator requests access; (3) Owner approves; (4) Collaborator views; (5) Administrator denied document content. The 5th step must be a proven negative access test in a real implementation.
5. Settings / Integration readiness: honest readouts of auth adapter, authorization policy, encryption, admin controls and what is not connected.
6. Role switching in UI is **simulation only**, not an acceptable production mechanism to change the authenticated user's privileges.

## Access model to implement and verify
- Owner: create/read/update/delete own document, decide sharing, revoke grants.
- Collaborator: deny reading confidential content until explicit grant; after approval can read under defined policy; do not assume editing rights unless granted.
- Administrator: may inspect allowed metadata per policy, but must NOT get document plaintext by virtue of admin UI role alone.
- Denied access applies to both UI and server/API; a preview hiding text is not sufficient.

## Screenshots
See named files in `screenshots/`. Original video is preferable for timing/interactions. The exported Flameblue source, if available, is authoritative for visual structure and should be used directly.

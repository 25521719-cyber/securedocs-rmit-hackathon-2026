# SecureDocs hackathon demonstration

Use public sample text only. Begin by saying: **“This is a document-workflow simulation. The role selector is not authentication, and demo data is unencrypted. TideCloak integration is pending.”**

1. Open **Shared With Me** and click **Reset demo**. Point out the persistent simulation banner and the integration status link.
2. Click **Run next step** to create **Hackathon access proof**. Explain that the Owner can create and edit demo documents. Open its preview if useful.
3. Click **Run next step** again. The presenter flow records Maya’s collaborator request. Explain that demo content is withheld from the selected collaborator until the owner approves.
4. Click **Run next step** to approve the request as Alex. Open **Sharing** to show the grant and the **Revoke access** control.
5. Click **Run next step**. The selected collaborator’s preview shows the public sample body. This illustrates a grant, not a verified identity or cryptographic access decision.
6. Close the preview and click **Show denial**. The selected administrator sees document metadata and **Content not available**. This is a simulated negative result; it does not prove real administrator isolation.
7. Open **Settings**. State that authentication, Tide-supported end-to-end encryption, and production storage are not connected. If asked for a real endpoint, `/api/documents` returns 503 until those services are verified.

Optional CRUD walkthrough: create a separate public demo document, edit its content, request and approve access, revoke it, and delete it. The local JSON store persists across app restarts but is not confidential storage.

Live TideCloak integration requires the diagnostics and steps in `docs/03-integration/TIDECLOAK.md`. Do not retry wallet enrollment or key generation during this presentation without new evidence and the required admin operator.

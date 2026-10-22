"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_PEOPLE, type DemoDocumentView, type DemoRole } from "@/lib/demo-types";

type Page = "documents" | "shared" | "settings" | "editor";
type Data = { documents: DemoDocumentView[]; step: number };
type SymbolName = "shield" | "file" | "users" | "settings" | "plus" | "arrow" | "check" | "close" | "search" | "eye" | "edit" | "share" | "trash" | "lock" | "rotate" | "key" | "user" | "warning";
const paths: Record<SymbolName, React.ReactNode> = {
  shield: <><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  file: <><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h8M8 16h8"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.6 2.3 1.8.8 2.1-1.1 2.8 2.8-1.1 2.1.8 1.8L23 11v4l-2.3.6-.8 1.8 1.1 2.1-2.8 2.8-2.1-1.1-1.8.8L14 23h-4l-.6-2.3-1.8-.8-2.1 1.1-2.8-2.8 1.1-2.1-.8-1.8L1 15v-4l2.3-.6.8-1.8L3 6.5l2.8-2.8 2.1 1.1 1.8-.8L10 2Z" transform="translate(1 0) scale(.9)"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, check: <path d="m4 12 5 5L20 6"/>, close: <path d="M5 5 19 19M19 5 5 19"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>, eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  edit: <><path d="m4 17 12-12 3 3L7 20l-4 1 1-4ZM14 7l3 3"/></>, share: <><circle cx="18" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5M7 13l9 5"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 11v6m4-6v6"/></>, lock: <><rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  rotate: <><path d="M3 11a9 9 0 1 1 1.5 6M3 5v6h6"/></>, key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 2 2-2 2-2-2-2 2 2 2-4 4"/></>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></>, warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.5"/></>,
};
function Icon({ name, size = 18 }: { name: SymbolName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const steps = [
  ["Owner creates a confidential doc", "Alex creates a demo document in the workspace."],
  ["Collaborator requests access", "Maya asks to see the restricted document."],
  ["Owner approves access", "Alex reviews and grants the simulated policy."],
  ["Collaborator views the doc", "Maya can now see the demo content."],
  ["Administrator is denied", "Jordan sees metadata, never private content."],
] as const;
function dateLabel(value: string) {
  const age = Date.now() - new Date(value).getTime();
  if (age < 43200000) return "Just now";
  if (age < 129600000) return "Yesterday";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function AccessBadge({ doc }: { doc: DemoDocumentView }) {
  const label = doc.access === "owner" ? "Owner access" : doc.access === "collaborator" ? "Granted access" : doc.access === "pending" ? "Request pending" : "No access";
  return <span className={`pill access ${doc.access}`}><Icon name={doc.access === "denied" ? "lock" : "check"} size={14}/>{label}</span>;
}

export default function Home() {
  const [page, setPage] = useState<Page>("shared");
  const [role, setRole] = useState<DemoRole>("owner");
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"preview" | "sharing" | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/demo?role=${role}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setData(result);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load demo"); });
    return () => { active = false; };
  }, [role]);
  async function action(method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>, currentRole = role) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/demo", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, role: currentRole }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo operation failed");
      setData(result); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Demo operation failed"); return false; }
    finally { setBusy(false); }
  }
  const selectedDoc = data?.documents.find((doc) => doc.id === selected);
  const visible = useMemo(() => (data?.documents ?? []).filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || filter === doc.access)
  ), [data, search, filter]);
  function navigate(next: Page) { setPage(next); setDrawer(null); setSelected(null); setError(""); }
  function changeRole(next: DemoRole) { if (next !== role) setData(null); setRole(next); setDrawer(null); setSelected(null); setError(""); }
  function openEditor(doc?: DemoDocumentView) {
    if (role !== "owner") { setError("Only the demo owner can edit documents."); return; }
    setEditing(doc?.id ?? null); setTitle(doc?.title ?? ""); setBody(doc?.body ?? ""); navigate("editor");
  }
  async function save() {
    if (!title.trim() || !body.trim()) { setError("Add a document title and content before saving."); return; }
    const ok = editing ? await action("PATCH", { action: "edit", id: editing, title, body }) : await action("POST", { title, body });
    if (ok) navigate("documents");
  }
  async function deleteDoc(doc: DemoDocumentView) {
    if (!window.confirm(`Delete “${doc.title}” from this public demo?`)) return;
    if (await action("DELETE", { id: doc.id })) { setDrawer(null); setSelected(null); }
  }
  async function nextStep() {
    const step = data?.step ?? 1;
    const proof = data?.documents.find((doc) => doc.title === "Hackathon access proof");
    if (step > 1 && !proof) { setError("The presenter document is missing. Reset the demo to start again."); return; }
    if (step === 1 && !proof && !await action("POST", { title: "Hackathon access proof", body: "Confidential presenter notes\n\nThis document is used to show explicit access decisions during the Tide UNLOCKED challenge. Public sample text only." }, "owner")) return;
    if (step === 2 && proof && !proof.collaboratorGranted && !await action("PATCH", { action: "request", id: proof.id }, "collaborator")) return;
    if (step === 3 && proof && !proof.collaboratorGranted && !await action("PATCH", { action: "approve", id: proof.id }, "owner")) return;
    if (step < 5 && !await action("PATCH", { action: "step", step: step + 1 }, "owner")) return;
    if (step === 4 || step === 5) {
      changeRole(step === 4 ? "collaborator" : "administrator");
      if (proof) { setSelected(proof.id); setDrawer("preview"); }
    }
  }
  const heading = page === "settings" ? "Settings" : page === "shared" ? "Shared With Me" : page === "editor" ? "Editor" : "Documents";

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Icon name="shield" size={22}/></div><div><strong>SecureDocs</strong><small>Privacy without blind trust</small></div></div>
      <div className="workspace"><div className="workspace-mark">S</div><div><strong>RMIT Hackathon</strong><small>Demo workspace</small></div><span>⌄</span></div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={page === "documents" || page === "editor" ? "active" : ""} onClick={() => navigate("documents")}><Icon name="file"/>Documents</button>
        <button className={page === "shared" ? "active" : ""} onClick={() => navigate("shared")}><Icon name="users"/>Shared With Me</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Icon name="settings"/>Settings</button>
      </nav>
      <div className="role-section"><div className="role-label">ACTIVE ROLE <span>SIMULATION</span></div>
        {(["owner", "collaborator", "administrator"] as const).map((item) => <button key={item} className={`role ${role === item ? "selected" : ""}`} onClick={() => changeRole(item)}><span className={`avatar ${item}`}>{DEMO_PEOPLE[item].initials}</span><span>{item[0].toUpperCase() + item.slice(1)}</span>{role === item && <Icon name="check" size={17}/>}</button>)}
      </div>
      <div className="sidebar-footer"><span className="status-dot"/> <strong>Simulation mode</strong><small>Public demo data. No real security.</small></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div><span>Workspace</span><span className="crumb">›</span><strong>{heading}</strong></div><div className="top-actions"><span className="simulation"><span className="status-dot"/> Simulation</span><button className="button primary" onClick={() => openEditor()}><Icon name="plus"/>New document</button></div></header>
      <main className="content">
        <div className="notice"><div className="notice-icon"><Icon name="shield" size={22}/></div><div className="notice-copy"><div><strong>Simulation only</strong><span className="pill amber">TideCloak Not Connected</span></div><p>Demo roles are selectable. Documents are stored as unencrypted local demo data. Do not enter secrets.</p></div><button className="text-link" onClick={() => navigate("settings")}>View integration readiness <Icon name="arrow"/></button></div>
        {error && <div className="error-message" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16}/></button></div>}
        {page === "editor" && <>
          <div className="page-heading editor-heading"><div><div className="eyebrow">{editing ? "DOCUMENT / SIMULATION" : "NEW DOCUMENT / SIMULATION"}</div><h1>{editing ? "Edit demo document" : "Create a confidential document"}</h1><p>Public demo content is saved unencrypted on this local server. Do not enter sensitive information.</p></div><div className="heading-actions"><button className="button secondary" onClick={() => navigate("documents")}>Cancel</button><button className="button primary" disabled={busy} onClick={save}><Icon name="check"/>Save document</button></div></div>
          <div className="editor-grid"><div className="editor-card"><span className="pill amber"><Icon name="lock" size={15}/> Demo / confidential</span><input aria-label="Document title" className="title-input" placeholder="Document title" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)}/><textarea aria-label="Document content" placeholder="Write demo content here..." value={body} maxLength={50000} onChange={(event) => setBody(event.target.value)}/></div><aside className="policy-card"><div className="card-eyebrow"><Icon name="key" size={17}/> ACCESS POLICY</div><h3>Owner-only until shared</h3><p>As the Owner simulation, you can edit this document. Other roles need an explicit demo access decision.</p><div className="policy-row"><span><i className="green-dot"/>Owner</span><span>Can edit</span></div><div className="policy-row"><span><i className="blue-dot"/>Collaborator</span><span>Request access</span></div><div className="policy-row"><span><i className="gray-dot"/>Administrator</span><span>Metadata only</span></div><div className="policy-warning"><Icon name="warning" size={18}/>No real encryption or backend authorization is connected.</div></aside></div>
        </>}
        {page === "settings" && <>
          <div className="page-heading"><div className="eyebrow">WORKSPACE / SETTINGS</div><h1>Integration readiness</h1><p>Current connection status and the work required before handling confidential data.</p></div>
          <section className="readiness-hero"><div className="notice-icon"><Icon name="shield" size={24}/></div><div><span className="pill amber">TideCloak Not Connected</span><h2>Ready for a real integration, not pretending to have one.</h2><p>SecureDocs currently demonstrates document workflows with unencrypted local demo storage. Connect and verify real authentication, authorization, encryption, and secure storage before handling confidential data.</p></div></section>
          <div className="readiness-grid">{([
            ["user", "Authentication adapter", "Not connected", "No verified TideCloak session or identity is available."],
            ["shield", "Authorization policy engine", "Demo only", "Selectable roles illustrate policy; they are not authenticated identities."],
            ["lock", "Document encryption", "Not connected", "Demo content is stored as plaintext on the local server."],
            ["key", "Administrator controls", "Demo only", "Administrator sees metadata in the demo and does not receive content by role alone."],
          ] as const).map(([icon, label, status, description]) => <div className="readiness-card" key={label}><div className="card-top"><span className="mini-icon"><Icon name={icon}/></span><span className={`pill ${status === "Demo only" ? "amber" : "gray"}`}>{status}</span></div><h3>{label}</h3><p>{description}</p><span className="readiness-foot">TideCloak integration pending <Icon name="arrow" size={16}/></span></div>)}</div>
          <section className="plan-c-section" style={{ marginTop: "24px", padding: "24px", background: "#fff", border: "1px solid var(--line)", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <span className="pill amber" style={{ marginBottom: "8px" }}>Tide Foundation Plan C</span>
                <h3 style={{ margin: "8px 0 4px", fontSize: "18px" }}>Emergent Authority &amp; Trust Boundary</h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>Simulated TideCloak protections authorized under Plan C while network connectivity is restored.</p>
              </div>
            </div>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.6", margin: "0 0 16px" }}><strong>Emergent Authority:</strong> No single party &mdash; not the administrator, not the server operator &mdash; can unilaterally access protected content. Access decisions emerge from Tide network consensus, requiring the document owner&apos;s explicit cryptographic approval.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)" }}>
                    <th style={{ padding: "8px 12px" }}>Capability</th>
                    <th style={{ padding: "8px 12px" }}>Simulated Behavior (Plan C)</th>
                    <th style={{ padding: "8px 12px" }}>Live TideCloak Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>Identity verification</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>Selectable demo role (no authentication)</td>
                    <td style={{ padding: "8px 12px", color: "#166534" }}>OIDC Authorization Code Flow with PKCE</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>Document encryption</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>Base64 encoding (NOT real encryption)</td>
                    <td style={{ padding: "8px 12px", color: "#166534" }}>Tide SDK end-to-end encryption with distributed keys</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>Access grant/revoke</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>Server-side flag toggle in local JSON file</td>
                    <td style={{ padding: "8px 12px", color: "#166534" }}>Cryptographic re-encryption via Tide consensus</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>Administrator isolation</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>Server policy omits body; admin sees metadata only</td>
                    <td style={{ padding: "8px 12px", color: "#166534" }}>Zero access: Admin never possesses decryption keys</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>Token validation</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>Unsigned demo token object for display</td>
                    <td style={{ padding: "8px 12px", color: "#166534" }}>RS256/ES256 signature verification via JWKS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>}
        {(page === "documents" || page === "shared") && <>
          {page === "shared" && <section className="presenter"><div className="presenter-top"><div><div className="card-eyebrow">▶ &nbsp;PRESENTER FLOW</div><h2>Permission story, made visible</h2><p>Drive the complete Owner → Collaborator → Administrator demo in five clear steps.</p></div><button className="button secondary" disabled={busy} onClick={async () => { if (await action("PATCH", { action: "reset" }, "owner")) changeRole("owner"); }}><Icon name="rotate"/>Reset demo</button></div><div className="step-grid">{steps.map(([label, description], index) => <div className={`step ${index + 1 === (data?.step ?? 1) ? "current" : ""} ${index + 1 < (data?.step ?? 1) ? "done" : ""}`} key={label}><span className="step-number">{index + 1 < (data?.step ?? 1) ? <Icon name="check" size={15}/> : index + 1}</span><div><strong>{label}</strong><small>{description}</small></div></div>)}</div><div className="presenter-bottom"><div><span>STEP {data?.step ?? 1} OF 5</span><strong>{steps[(data?.step ?? 1) - 1][0]}</strong></div><button className="button primary" disabled={busy} onClick={nextStep}>{data?.step === 5 ? "Show denial" : "Run next step"}<Icon name="arrow"/></button></div></section>}
          <div className="page-heading list-heading"><div><div className="eyebrow">WORKSPACE / {role.toUpperCase()} SIMULATION</div><h1>{page === "shared" ? "Shared with me" : "Documents"}</h1><p>{page === "shared" ? "Documents with an explicit access relationship." : "Manage documents in the demo workspace."}</p></div><button className="button primary" onClick={() => openEditor()}><Icon name="plus"/>New document</button></div>
          <div className="list-tools"><label className="search-box"><Icon name="search"/><input placeholder="Search documents" value={search} onChange={(event) => setSearch(event.target.value)}/></label><div><select aria-label="Filter access" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All access</option><option value="owner">Owner access</option><option value="collaborator">Collaborator access</option><option value="pending">Pending</option><option value="denied">No access</option></select><span>{visible.length} document{visible.length === 1 ? "" : "s"}</span></div></div>
          <section className="document-table"><div className="table-head"><span>DOCUMENT</span><span>OWNER</span><span>UPDATED</span><span>ACCESS</span><span/></div>{visible.map((doc) => <div className="document-row" key={doc.id}><div className="doc-identity"><span className="file-icon"><Icon name="file" size={22}/></span><div><strong>{doc.title}</strong><small><Icon name="lock" size={12}/> Demo / confidential</small></div></div><div className="owner-cell"><span className="avatar owner">AM</span>Alex Morgan</div><div className="muted">{dateLabel(doc.updatedAt)}</div><div><AccessBadge doc={doc}/></div><div className="row-actions"><button title="View" aria-label={`View ${doc.title}`} onClick={() => { setSelected(doc.id); setDrawer("preview"); }}><Icon name="eye"/></button>{role === "owner" && <><button title="Edit" aria-label={`Edit ${doc.title}`} onClick={() => openEditor(doc)}><Icon name="edit"/></button><button title="Sharing" aria-label={`Share ${doc.title}`} onClick={() => { setSelected(doc.id); setDrawer("sharing"); }}><Icon name="share"/></button><button title="Delete" aria-label={`Delete ${doc.title}`} onClick={() => void deleteDoc(doc)}><Icon name="trash"/></button></>}</div></div>)}{visible.length === 0 && <div className="empty-state">No documents match this view.</div>}</section>
        </>}
      </main>
    </div>
    {drawer && selectedDoc && <div className="drawer-layer"><button className="drawer-backdrop" onClick={() => setDrawer(null)} aria-label="Close panel"/><aside className="drawer" aria-label={drawer === "preview" ? "Document preview" : "Sharing settings"}><div className="drawer-head"><span>{drawer === "preview" ? "DOCUMENT PREVIEW" : "SHARING & ACCESS"}</span><button onClick={() => setDrawer(null)} aria-label="Close panel"><Icon name="close"/></button></div><div className="drawer-body"><div className="drawer-title"><span className="file-icon"><Icon name={drawer === "preview" ? "file" : "share"} size={24}/></span><div><h2>{selectedDoc.title}</h2><p>Updated {dateLabel(selectedDoc.updatedAt)}</p></div></div><div className="badges"><AccessBadge doc={selectedDoc}/><span className="pill gray">Simulation</span></div><div className="drawer-meta"><div><small>Owner</small><span><span className="avatar owner">AM</span>Alex Morgan</span></div><div><small>Classification</small><span><Icon name="lock" size={17}/>Demo / confidential</span></div></div>{drawer === "preview" ? <><div className="content-box">{selectedDoc.body ? <><strong><Icon name="check" size={17}/> Content visible to {role[0].toUpperCase() + role.slice(1)}</strong><p>{selectedDoc.body}</p></> : <><strong><Icon name="lock" size={17}/> Content not available</strong><p>{role === "administrator" ? "Administrator cannot independently access document content. Under Emergent Authority, administrative privileges do not grant content decryption keys." : "The current demo role cannot view this document body. This is a simulated decision, not real security."}</p></>}</div><div className="drawer-buttons">{role === "owner" && <><button className="button primary" onClick={() => openEditor(selectedDoc)}><Icon name="edit"/>Edit document</button><button className="button secondary" onClick={() => setDrawer("sharing")}><Icon name="share"/>Sharing</button></>}{role === "collaborator" && !selectedDoc.collaboratorGranted && <button className="button primary" disabled={busy || selectedDoc.requestStatus === "pending"} onClick={() => void action("PATCH", { action: "request", id: selectedDoc.id })}>{selectedDoc.requestStatus === "pending" ? "Request pending" : "Request access"}</button>}</div></> : <><h3>Access requests</h3><p className="muted">Maya Chen · Collaborator</p><div className="request-card"><span className="avatar collaborator">MC</span><div><strong>{selectedDoc.collaboratorGranted ? "Access granted" : selectedDoc.requestStatus === "pending" ? "Request pending" : "No access request"}</strong><p>{selectedDoc.collaboratorGranted ? "Maya may view demo content." : selectedDoc.requestStatus === "pending" ? "Maya is waiting for the owner’s decision." : "Maya can request access from the document preview."}</p></div></div>{role === "owner" && selectedDoc.requestStatus === "pending" && !selectedDoc.collaboratorGranted && <button className="button primary" disabled={busy} onClick={() => void action("PATCH", { action: "approve", id: selectedDoc.id })}>Approve access</button>}{role === "owner" && selectedDoc.collaboratorGranted && <button className="button secondary" disabled={busy} onClick={() => void action("PATCH", { action: "revoke", id: selectedDoc.id })}>Revoke access</button>}</>}<p className="drawer-foot"><Icon name="shield" size={15}/>Simulation only. No real authentication, encryption, or secure storage.</p></div></aside></div>}
  </div>;
}

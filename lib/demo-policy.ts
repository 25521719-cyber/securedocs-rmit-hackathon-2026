import type { DemoDocument, DemoDocumentView, DemoRole } from "./demo-types";

// This is an instructional policy only. Demo roles are chosen by the browser.
// Never use this as a production authorization decision.
export function viewDemoDocument(document: DemoDocument, role: DemoRole): DemoDocumentView {
  const { body, ...metadata } = document;
  if (role === "owner") return { ...metadata, body, access: "owner" };
  if (role === "collaborator" && document.collaboratorGranted) {
    return { ...metadata, body, access: "collaborator" };
  }
  return {
    ...metadata,
    access: role === "collaborator" && document.requestStatus === "pending" ? "pending" : "denied",
  };
}

export function canEditDemo(role: DemoRole) {
  return role === "owner";
}

import { NextResponse } from "next/server";
import { canEditDemo, viewDemoDocument } from "@/lib/demo-policy";
import { DemoError, DemoStorageError, findDemoDocument, readDemoState, updateDemoState } from "@/lib/demo-store";
import { initialState } from "@/lib/demo-store";
import { readDemoPayload, requiredText } from "@/lib/demo-input";
import type { DemoDocument, DemoRole } from "@/lib/demo-types";
import { getSimulationMetadata, viewDocumentWithSimulation } from "@/lib/tidecloak-sim";

function demoEnabled() {
  return process.env.SECUREDOCS_ENABLE_DEMO === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.SECUREDOCS_ENABLE_DEMO !== "false");
}

function unavailable() {
  return NextResponse.json({ error: "Insecure demo is disabled" }, {
    status: 503, headers: { "Cache-Control": "no-store", "X-SecureDocs-Mode": "UNTRUSTED-DEMO" },
  });
}

function roleOf(value: unknown): DemoRole {
  if (value === "owner" || value === "collaborator" || value === "administrator") return value;
  throw new DemoError(400, "Choose a demo role");
}

function response(state: Awaited<ReturnType<typeof readDemoState>>, role: DemoRole) {
  return NextResponse.json(
    {
      step: state.step,
      documents: state.documents.map((doc) => viewDemoDocument(doc, role)),
      simulation: getSimulationMetadata(),
      simulatedViews: state.documents.map((doc) => viewDocumentWithSimulation(doc, role)),
      demo: true,
    },
    { headers: { "Cache-Control": "no-store", "X-SecureDocs-Mode": "UNTRUSTED-DEMO" } },
  );
}

function errorResponse(error: unknown) {
  const status = error instanceof DemoError ? error.status : error instanceof DemoStorageError ? 503 : 500;
  const message = error instanceof DemoError ? error.message : error instanceof DemoStorageError ? "Demo storage unavailable" : "Demo operation failed";
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", "X-SecureDocs-Mode": "UNTRUSTED-DEMO" } });
}

export async function GET(request: Request) {
  if (!demoEnabled()) return unavailable();
  try {
    const role = roleOf(new URL(request.url).searchParams.get("role"));
    return response(await readDemoState(), role);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (!demoEnabled()) return unavailable();
  try {
    const payload = await readDemoPayload(request);
    const role = roleOf(payload.role);
    if (!canEditDemo(role)) throw new DemoError(403, "Only the demo owner can create documents");
    const title = requiredText(payload.title, "title", 160);
    const body = requiredText(payload.body, "content", 50000);
    const state = await updateDemoState((state) => {
      const document: DemoDocument = {
        id: crypto.randomUUID(), title, body, owner: "Alex Morgan", updatedAt: new Date().toISOString(),
        requestStatus: "none", collaboratorGranted: false,
      };
      state.documents.unshift(document);
      return state;
    });
    return response(state, role);
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  if (!demoEnabled()) return unavailable();
  try {
    const payload = await readDemoPayload(request);
    const role = roleOf(payload.role);
    const action = requiredText(payload.action, "action", 20);
    const state = await updateDemoState((state) => {
      if (action === "reset") {
        if (role !== "owner") throw new DemoError(403, "Only the demo owner can reset the demo");
        Object.assign(state, initialState());
        return state;
      }
      if (action === "step") {
        if (role !== "owner") throw new DemoError(403, "Only the demo owner can advance the presenter flow");
        if (!Number.isInteger(payload.step)) throw new DemoError(400, "Enter a valid presenter step");
        if (payload.step !== state.step + 1 || state.step >= 5) throw new DemoError(409, "Presenter steps must advance in order");
        state.step = payload.step as number;
        return state;
      }
      const id = requiredText(payload.id, "document id", 128);
      const document = findDemoDocument(state, id);
      if (action === "request") {
        if (role !== "collaborator") throw new DemoError(403, "Only the demo collaborator can request access");
        if (!document.collaboratorGranted) document.requestStatus = "pending";
      } else if (action === "approve" || action === "revoke") {
        if (role !== "owner") throw new DemoError(403, "Only the demo owner can change grants");
        if (action === "approve" && document.requestStatus !== "pending") throw new DemoError(409, "No pending request");
        document.collaboratorGranted = action === "approve";
        document.requestStatus = action === "approve" ? "approved" : "none";
      } else if (action === "edit") {
        if (role !== "owner") throw new DemoError(403, "Only the demo owner can edit");
        const title = requiredText(payload.title, "title", 160);
        const body = requiredText(payload.body, "content", 50000);
        document.title = title; document.body = body; document.updatedAt = new Date().toISOString();
      } else throw new DemoError(400, "Unknown demo action");
      return state;
    });
    return response(state, role);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  if (!demoEnabled()) return unavailable();
  try {
    const payload = await readDemoPayload(request);
    const role = roleOf(payload.role);
    if (role !== "owner") throw new DemoError(403, "Only the demo owner can delete");
    const state = await updateDemoState((state) => {
      const id = requiredText(payload.id, "document id", 128);
      const index = state.documents.findIndex((doc) => doc.id === id);
      if (index < 0) throw new DemoError(404, "Document not found");
      state.documents.splice(index, 1);
      return state;
    });
    return response(state, role);
  } catch (error) { return errorResponse(error); }
}

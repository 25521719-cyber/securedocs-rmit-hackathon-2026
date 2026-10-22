import assert from "node:assert/strict";
import test from "node:test";
import { canReadMetadata, canReadContent, canEdit, requireProductionServices, IntegrationUnavailable } from "../lib/secure-boundary.ts";

test("verified-principal policy separates metadata, content, and editing", () => {
  const document = { ownerId: "alex", viewerIds: [] };
  const owner = { subjectId: "alex", administrator: false };
  const collaborator = { subjectId: "maya", administrator: false };
  const admin = { subjectId: "jordan", administrator: true };
  assert.equal(canReadContent(owner, document), true);
  assert.equal(canEdit(owner, document), true);
  assert.equal(canReadContent(collaborator, document), false);
  assert.equal(canEdit(collaborator, document), false);
  assert.equal(canReadMetadata(admin, document), true);
  assert.equal(canReadContent(admin, document), false);
  assert.equal(canEdit(admin, document), false);
  document.viewerIds.push("maya");
  assert.equal(canReadContent(collaborator, document), true);
  assert.equal(canEdit(collaborator, document), false);
  document.viewerIds.pop();
  assert.equal(canReadContent(collaborator, document), false);
});

test("production services are unavailable until verified implementations are configured", () => {
  assert.throws(requireProductionServices, IntegrationUnavailable);
});

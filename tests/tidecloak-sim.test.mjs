import assert from "node:assert/strict";
import test from "node:test";
import {
  SIMULATED_USERS,
  SimulatedIdentityAdapter,
  SimulatedProtectedContentAdapter,
  issueSimulatedToken,
  isTokenExpired,
  evaluateAccess,
  viewDocumentWithSimulation,
  getSimulationMetadata,
  EMERGENT_AUTHORITY_EXPLANATION,
} from "../lib/tidecloak-sim.ts";

test("simulated users cover all three personas", () => {
  assert.equal(SIMULATED_USERS.owner.displayName, "Alex Morgan");
  assert.equal(SIMULATED_USERS.owner.administrator, false);
  assert.equal(SIMULATED_USERS.collaborator.displayName, "Maya Chen");
  assert.equal(SIMULATED_USERS.collaborator.administrator, false);
  assert.equal(SIMULATED_USERS.administrator.displayName, "Jordan Brooks");
  assert.equal(SIMULATED_USERS.administrator.administrator, true);
  assert.notEqual(SIMULATED_USERS.owner.subjectId, SIMULATED_USERS.collaborator.subjectId);
  assert.notEqual(SIMULATED_USERS.owner.subjectId, SIMULATED_USERS.administrator.subjectId);
});

test("simulated token contains expected fields and is marked simulated", () => {
  const token = issueSimulatedToken(SIMULATED_USERS.owner);
  assert.equal(token.simulated, true);
  assert.equal(token.sub, "sim-alex-morgan");
  assert.equal(token.name, "Alex Morgan");
  assert.ok(token.roles.includes("owner"));
  assert.ok(!token.roles.includes("realm-admin"));
  assert.ok(token.iat > 0);
  assert.ok(token.exp > token.iat);
  assert.equal(token.iss, "http://localhost:8080/realms/securedocs");
});

test("administrator token includes realm-admin role", () => {
  const token = issueSimulatedToken(SIMULATED_USERS.administrator);
  assert.ok(token.roles.includes("realm-admin"));
  assert.ok(token.roles.includes("administrator"));
});

test("token expiry check works correctly", () => {
  const token = issueSimulatedToken(SIMULATED_USERS.owner);
  assert.equal(isTokenExpired(token), false);
  const expired = { ...token, exp: Math.floor(Date.now() / 1000) - 10 };
  assert.equal(isTokenExpired(expired), true);
});

test("simulated identity adapter returns null for real requests", async () => {
  const adapter = new SimulatedIdentityAdapter();
  const request = new Request("http://localhost:3000/api/documents");
  const result = await adapter.authenticate(request);
  assert.equal(result, null);
});

test("simulated identity adapter returns principal for demo roles", () => {
  const adapter = new SimulatedIdentityAdapter();
  const owner = adapter.authenticateSimulated("owner");
  assert.equal(owner.subjectId, "sim-alex-morgan");
  assert.equal(owner.administrator, false);
  const admin = adapter.authenticateSimulated("administrator");
  assert.equal(admin.administrator, true);
});

test("simulated content adapter encrypt/decrypt round-trips", async () => {
  const adapter = new SimulatedProtectedContentAdapter();
  await adapter.assertReady();
  const plaintext = "Confidential demo content for RMIT Hackathon";
  const encrypted = adapter.simulateEncrypt(plaintext);
  assert.equal(encrypted.simulated, true);
  assert.equal(encrypted.algorithm, "SIMULATED-BASE64-NOT-ENCRYPTION");
  assert.notEqual(encrypted.ciphertext, plaintext);
  const decrypted = adapter.simulateDecrypt(encrypted);
  assert.equal(decrypted, plaintext);
});

test("owner can read content, edit, grant, and revoke", () => {
  const principal = { subjectId: "sim-alex-morgan", administrator: false };
  const doc = { ownerId: "sim-alex-morgan", viewerIds: [] };
  assert.equal(evaluateAccess(principal, doc, "read-metadata").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "read-content").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "read-content").wouldBeCryptographic, true);
  assert.equal(evaluateAccess(principal, doc, "edit").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "grant").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "revoke").allowed, true);
});

test("collaborator without grant cannot read content", () => {
  const principal = { subjectId: "sim-maya-chen", administrator: false };
  const doc = { ownerId: "sim-alex-morgan", viewerIds: [] };
  assert.equal(evaluateAccess(principal, doc, "read-content").allowed, false);
  assert.equal(evaluateAccess(principal, doc, "edit").allowed, false);
  assert.equal(evaluateAccess(principal, doc, "grant").allowed, false);
});

test("collaborator with grant can read content but not edit", () => {
  const principal = { subjectId: "sim-maya-chen", administrator: false };
  const doc = { ownerId: "sim-alex-morgan", viewerIds: ["sim-maya-chen"] };
  assert.equal(evaluateAccess(principal, doc, "read-content").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "edit").allowed, false);
  assert.equal(evaluateAccess(principal, doc, "grant").allowed, false);
});

test("administrator can read metadata but NOT content", () => {
  const principal = { subjectId: "sim-jordan-brooks", administrator: true };
  const doc = { ownerId: "sim-alex-morgan", viewerIds: [] };
  assert.equal(evaluateAccess(principal, doc, "read-metadata").allowed, true);
  assert.equal(evaluateAccess(principal, doc, "read-content").allowed, false);
  const decision = evaluateAccess(principal, doc, "read-content");
  assert.match(decision.reason, /Administrator cannot independently/);
  assert.equal(decision.wouldBeCryptographic, true);
  assert.equal(evaluateAccess(principal, doc, "edit").allowed, false);
  assert.equal(evaluateAccess(principal, doc, "grant").allowed, false);
  assert.equal(evaluateAccess(principal, doc, "revoke").allowed, false);
});

test("viewDocumentWithSimulation gives owner full access", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "none", collaboratorGranted: false,
  };
  const view = viewDocumentWithSimulation(doc, "owner");
  assert.equal(view.body, "Secret content");
  assert.equal(view.access, "owner");
  assert.equal(view.accessDecision.allowed, true);
  assert.equal(view.simulatedToken.simulated, true);
});

test("viewDocumentWithSimulation denies collaborator without grant", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "none", collaboratorGranted: false,
  };
  const view = viewDocumentWithSimulation(doc, "collaborator");
  assert.equal(view.body, undefined);
  assert.equal(view.access, "denied");
  assert.equal(view.accessDecision.allowed, false);
});

test("viewDocumentWithSimulation shows pending for collaborator with request", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "pending", collaboratorGranted: false,
  };
  const view = viewDocumentWithSimulation(doc, "collaborator");
  assert.equal(view.body, undefined);
  assert.equal(view.access, "pending");
});

test("viewDocumentWithSimulation grants collaborator after approval", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "approved", collaboratorGranted: true,
  };
  const view = viewDocumentWithSimulation(doc, "collaborator");
  assert.equal(view.body, "Secret content");
  assert.equal(view.access, "collaborator");
  assert.equal(view.accessDecision.allowed, true);
});

test("viewDocumentWithSimulation denies administrator content", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "none", collaboratorGranted: false,
  };
  const view = viewDocumentWithSimulation(doc, "administrator");
  assert.equal(view.body, undefined);
  assert.equal(view.access, "denied");
  assert.equal(view.accessDecision.allowed, false);
  assert.match(view.accessDecision.reason, /Administrator/);
});

test("simulation metadata is properly labeled", () => {
  const meta = getSimulationMetadata();
  assert.equal(meta.mode, "simulation");
  assert.equal(meta.planC, true);
  assert.equal(meta.planCReference, "https://tide.org/unlocked/#plan-c");
  assert.equal(meta.tideCloakConnected, false);
  assert.match(meta.disclaimer, /simulated/i);
  assert.match(meta.disclaimer, /Plan C/);
});

test("emergent authority explanation covers all key operations", () => {
  const ea = EMERGENT_AUTHORITY_EXPLANATION;
  assert.ok(ea.concept.length > 50);
  assert.ok(ea.simulatedBehavior.length > 50);
  assert.equal(ea.liveEnforcement.length, 5);
  for (const item of ea.liveEnforcement) {
    assert.ok(item.operation.length > 0);
    assert.ok(item.simulated.length > 0);
    assert.ok(item.live.length > 0);
  }
});

test("revocation removes collaborator content access", () => {
  const doc = {
    id: "test-doc", title: "Test", body: "Secret content",
    owner: "Alex Morgan", updatedAt: new Date().toISOString(),
    requestStatus: "approved", collaboratorGranted: true,
  };
  const granted = viewDocumentWithSimulation(doc, "collaborator");
  assert.equal(granted.body, "Secret content");
  assert.equal(granted.access, "collaborator");
  doc.collaboratorGranted = false;
  doc.requestStatus = "none";
  const revoked = viewDocumentWithSimulation(doc, "collaborator");
  assert.equal(revoked.body, undefined);
  assert.equal(revoked.access, "denied");
});

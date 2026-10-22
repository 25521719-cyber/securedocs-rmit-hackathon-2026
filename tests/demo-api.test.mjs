import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startServer(port, dataDirectory, extraEnv = {}) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(), stdio: "ignore", env: {
      ...process.env, NEXT_TELEMETRY_DISABLED: "1", SECUREDOCS_DEMO_DATA_DIR: dataDirectory,
      SECUREDOCS_ENABLE_DEMO: "true", ...extraEnv,
    },
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(base)).ok) return child; } catch { /* server still starting */ }
    await delay(500);
  }
  child.kill();
  throw new Error(`Next.js server did not start on ${port}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("demo document lifecycle and denied paths", { timeout: 90000 }, async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-api-"));
  const processNext = await startServer(port, dataDirectory);
  let id;
  async function call(path, method = "GET", payload) {
    const response = await fetch(base + path, {
      method, headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    const page = await (await fetch(base)).text();
    assert.match(page, /SecureDocs/);
    assert.match(page, /Shared With Me/);
    assert.match(page, /TideCloak Not Connected/);
    assert.equal((await call("/api/documents")).status, 503);
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const secure = await call("/api/documents", method, { role: "owner", body: "Public sample content" });
      assert.equal(secure.status, 503);
      assert.doesNotMatch(JSON.stringify(secure.body), /Public sample content/);
    }
    assert.equal((await call("/api/demo?role=bogus")).status, 400);
    assert.equal((await fetch(base + "/api/demo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    })).status, 400, "malformed JSON is a client error");
    assert.equal((await fetch(base + "/api/demo", {
      method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}",
    })).status, 415, "JSON media type is required");
    assert.equal((await call("/api/demo", "POST", {
      role: "owner", title: { unexpected: true }, body: "Public sample",
    })).status, 400, "objects cannot become document titles");
    assert.equal((await call("/api/demo", "POST", {
      role: "owner", title: "Large", body: "x".repeat(70000),
    })).status, 413, "oversized requests are rejected");
    assert.equal((await call("/api/demo", "PATCH", {
      role: "owner", action: "step", step: 5,
    })).status, 409, "presenter steps cannot be skipped");
    assert.equal((await call("/api/demo", "POST", { role: "collaborator", title: "Denied", body: "Denied" })).status, 403);
    const title = `API test ${crypto.randomUUID()}`;
    const created = await call("/api/demo", "POST", { role: "owner", title, body: "Public sample content" });
    assert.equal(created.status, 200);
    id = created.body.documents.find((item) => item.title === title)?.id;
    assert.ok(id);
    const collaborator = await call("/api/demo?role=collaborator");
    const before = collaborator.body.documents.find((item) => item.id === id);
    assert.equal(before.body, undefined);
    assert.equal(before.access, "denied");
    const admin = await call("/api/demo?role=administrator");
    assert.equal(admin.body.documents.find((item) => item.id === id).body, undefined);
    assert.equal((await call("/api/demo", "PATCH", { role: "administrator", action: "approve", id })).status, 403);
    assert.equal((await call("/api/demo", "PATCH", { role: "administrator", action: "request", id })).status, 403);
    assert.equal((await call("/api/demo", "PATCH", { role: "owner", action: "edit", id: { value: id }, title, body: "Changed" })).status, 400);
    assert.equal((await call("/api/demo", "PATCH", { role: "owner", action: "unknown", id })).status, 400);
    assert.equal((await call("/api/demo", "PATCH", { role: "collaborator", action: "edit", id, title, body: "Changed" })).status, 403);
    assert.equal((await call("/api/demo", "PATCH", { role: "collaborator", action: "request", id })).status, 200);
    const approved = await call("/api/demo", "PATCH", { role: "owner", action: "approve", id });
    assert.equal(approved.status, 200);
    assert.equal((await call("/api/demo", "PATCH", { role: "owner", action: "approve", id })).status, 409);
    const granted = await call("/api/demo?role=collaborator");
    assert.equal(granted.body.documents.find((item) => item.id === id).body, "Public sample content");
    assert.equal((await call("/api/demo?role=administrator")).body.documents.find((item) => item.id === id).body, undefined);
    assert.equal((await call("/api/demo", "PATCH", { role: "owner", action: "revoke", id })).status, 200);
    assert.equal((await call("/api/demo?role=collaborator")).body.documents.find((item) => item.id === id).body, undefined);
    assert.equal((await call("/api/demo", "PATCH", { role: "collaborator", action: "request", id })).status, 200);
    assert.equal((await call("/api/demo?role=collaborator")).body.documents.find((item) => item.id === id).access, "pending");
    assert.equal((await call("/api/demo", "DELETE", { role: "administrator", id })).status, 403);
    assert.equal((await call("/api/demo", "DELETE", { role: "owner", id })).status, 200);
    id = undefined;
    assert.equal((await call("/api/demo", "DELETE", { role: "owner", id: "privacy-research-brief" })).status, 200);
    assert.equal((await call("/api/demo", "PATCH", { role: "owner", action: "reset" })).status, 200);
    assert.ok((await call("/api/demo?role=owner")).body.documents.some((item) => item.id === "privacy-research-brief"), "reset restores seed documents");
  } finally {
    if (id) await call("/api/demo", "DELETE", { role: "owner", id }).catch(() => undefined);
    await stopServer(processNext);
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test("concurrent server processes preserve every demo creation", { timeout: 90000 }, async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-concurrent-"));
  const ports = [await freePort(), await freePort()];
  const servers = [];
  try {
    for (const port of ports) servers.push(await startServer(port, dataDirectory));
    await fetch(`http://127.0.0.1:${ports[0]}/api/demo?role=owner`);
    const titles = Array.from({ length: 40 }, (_, index) => `Concurrent ${index}`);
    const writes = await Promise.all(titles.map((title, index) => fetch(`http://127.0.0.1:${ports[index % 2]}/api/demo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", title, body: "Public sample" }),
    })));
    assert.ok(writes.every((response) => response.status === 200), "all concurrent writes complete");
    const state = await (await fetch(`http://127.0.0.1:${ports[0]}/api/demo?role=owner`)).json();
    assert.equal(state.documents.filter((document) => document.title.startsWith("Concurrent ")).length, titles.length);
  } finally {
    await Promise.all(servers.map(stopServer));
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test("document create and delete persist across server restarts", { timeout: 90000 }, async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-restart-"));
  let child;
  try {
    const firstPort = await freePort();
    child = await startServer(firstPort, dataDirectory);
    const created = await fetch(`http://127.0.0.1:${firstPort}/api/demo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", title: "Restart proof", body: "Public sample" }),
    });
    assert.equal(created.status, 200);
    const id = (await created.json()).documents.find((item) => item.title === "Restart proof").id;
    await stopServer(child);
    const secondPort = await freePort();
    child = await startServer(secondPort, dataDirectory);
    const afterRestart = await (await fetch(`http://127.0.0.1:${secondPort}/api/demo?role=owner`)).json();
    assert.ok(afterRestart.documents.some((item) => item.id === id));
    const deleted = await fetch(`http://127.0.0.1:${secondPort}/api/demo`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", id }),
    });
    assert.equal(deleted.status, 200);
    await stopServer(child);
    const thirdPort = await freePort();
    child = await startServer(thirdPort, dataDirectory);
    const afterDeleteRestart = await (await fetch(`http://127.0.0.1:${thirdPort}/api/demo?role=owner`)).json();
    assert.ok(afterDeleteRestart.documents.every((item) => item.id !== id));
  } finally {
    if (child) await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test("unavailable or corrupt demo storage returns a service error", { timeout: 90000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "securedocs-storage-"));
  const blocked = join(root, "blocked");
  await writeFile(blocked, "not a directory");
  const port = await freePort();
  const child = await startServer(port, blocked);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/demo?role=owner`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Demo storage unavailable" });
    const write = await fetch(`http://127.0.0.1:${port}/api/demo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", title: "Cannot save", body: "Sample" }),
    });
    assert.equal(write.status, 503);
  } finally {
    await stopServer(child);
    await rm(root, { recursive: true, force: true });
  }
});

test("corrupt stored JSON is not silently replaced", { timeout: 90000 }, async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-corrupt-"));
  await writeFile(join(dataDirectory, "demo-documents.json"), "{");
  const port = await freePort();
  const child = await startServer(port, dataDirectory);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/demo?role=owner`);
    assert.equal(response.status, 503);
    const mutation = await fetch(`http://127.0.0.1:${port}/api/demo`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", action: "reset" }),
    });
    assert.equal(mutation.status, 503);
  } finally {
    await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test("demo API is disabled by default in a production server", { timeout: 90000 }, async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-disabled-"));
  const port = await freePort();
  const child = await startServer(port, dataDirectory, { SECUREDOCS_ENABLE_DEMO: "false" });
  try {
    for (const method of ["GET", "POST"]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/demo?role=owner`, {
        method, headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ role: "owner", title: "Denied", body: "Sample" }) : undefined,
      });
      assert.equal(response.status, 503);
    }
  } finally {
    await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

const dataDirectory = await mkdtemp(join(tmpdir(), "securedocs-e2e-"));
const port = await freePort();
const baseURL = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  cwd: process.cwd(),
  stdio: "ignore",
  env: { ...process.env, SECUREDOCS_ENABLE_DEMO: "true", SECUREDOCS_DEMO_DATA_DIR: dataDirectory, NEXT_TELEMETRY_DISABLED: "1" },
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Next.js exited before browser tests");
    try { if ((await fetch(baseURL)).ok) { ready = true; break; } } catch { /* starting */ }
    await delay(500);
  }
  if (!ready) throw new Error("Next.js did not become ready for browser tests");
  const browserTests = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, SECUREDOCS_E2E_BASE_URL: baseURL },
  });
  const [code] = await once(browserTests, "exit");
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([once(server, "exit"), delay(5000)]);
  }
  await rm(dataDirectory, { recursive: true, force: true });
}

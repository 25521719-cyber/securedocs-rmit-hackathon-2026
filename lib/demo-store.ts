import { mkdir, readFile, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { DemoDocument, DemoState } from "./demo-types";

const directory = process.env.SECUREDOCS_DEMO_DATA_DIR
  ? resolve(process.env.SECUREDOCS_DEMO_DATA_DIR)
  : join(process.cwd(), ".data");
const file = join(directory, "demo-documents.json");
const lock = join(directory, ".demo-documents.lock");

export function initialState(): DemoState {
  return {
    step: 1,
    documents: [
      {
        id: "privacy-research-brief",
        title: "Privacy Research Brief",
        body: "Demo research notes for the RMIT Hackathon.\n\nThis is public sample text for the presentation. Do not enter private information in demo documents.",
        owner: "Alex Morgan",
        updatedAt: "2026-10-21T10:00:00.000Z",
        requestStatus: "none",
        collaboratorGranted: false,
      },
      {
        id: "tide-unlocked-challenge-notes",
        title: "Tide UNLOCKED Challenge Notes",
        body: "Demo challenge notes.\n\nIllustrate the difference between document metadata and content access.",
        owner: "Alex Morgan",
        updatedAt: "2026-10-20T10:00:00.000Z",
        requestStatus: "none",
        collaboratorGranted: false,
      },
    ],
  };
}

function isValidState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DemoState>;
  if (!Number.isInteger(state.step) || state.step! < 1 || state.step! > 5 || !Array.isArray(state.documents)) return false;
  const ids = new Set<string>();
  for (const item of state.documents) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" ||
      typeof item.title !== "string" || typeof item.body !== "string" ||
      typeof item.owner !== "string" || typeof item.updatedAt !== "string" ||
      !["none", "pending", "approved"].includes(item.requestStatus) ||
      typeof item.collaboratorGranted !== "boolean" || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}

async function readStateFile(): Promise<DemoState | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!isValidState(parsed)) throw new DemoStorageError();
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new DemoStorageError();
  }
}

async function writeStateFile(state: DemoState) {
  const temporary = join(directory, `demo-${crypto.randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(state, null, 2), { flag: "wx", flush: true });
    await rename(temporary, file);
  } catch {
    await unlink(temporary).catch(() => undefined);
    throw new DemoStorageError();
  }
}

async function withFileLock<T>(operation: () => Promise<T>): Promise<T> {
  try { await mkdir(directory, { recursive: true }); } catch { throw new DemoStorageError(); }
  const deadline = Date.now() + 10000;
  while (true) {
    try { await mkdir(lock); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw new DemoStorageError();
      try {
        if (Date.now() - (await stat(lock)).mtimeMs > 30000) await rmdir(lock);
      } catch (staleError) {
        if ((staleError as NodeJS.ErrnoException).code !== "ENOENT" &&
          (staleError as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw new DemoStorageError();
      }
      if (Date.now() >= deadline) throw new DemoStorageError();
      await delay(10 + Math.random() * 15);
    }
  }
  try { return await operation(); }
  finally {
    try { await rmdir(lock); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new DemoStorageError();
    }
  }
}

export async function readDemoState(): Promise<DemoState> {
  const existing = await readStateFile();
  if (existing) return existing;
  return withFileLock(async () => {
    const current = await readStateFile();
    if (current) return current;
    const state = initialState();
    await writeStateFile(state);
    return state;
  });
}

let queue: Promise<unknown> = Promise.resolve();

export function updateDemoState<T>(mutate: (state: DemoState) => T | Promise<T>): Promise<T> {
  const operation = queue.then(() => withFileLock(async () => {
    const state = await readStateFile() ?? initialState();
    const result = await mutate(state);
    await writeStateFile(state);
    return result;
  }));
  queue = operation.catch(() => undefined);
  return operation;
}

export function findDemoDocument(state: DemoState, id: string): DemoDocument {
  const document = state.documents.find((item) => item.id === id);
  if (!document) throw new DemoError(404, "Document not found");
  return document;
}

export class DemoError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class DemoStorageError extends Error {
  constructor() { super("Demo storage unavailable"); }
}

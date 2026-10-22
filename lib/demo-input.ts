import { DemoError } from "./demo-store";

const MAX_REQUEST_BYTES = 64 * 1024;

export async function readDemoPayload(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new DemoError(415, "Send application/json");
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    throw new DemoError(413, "Demo request is too large");
  }
  if (!request.body) throw new DemoError(400, "A JSON object is required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new DemoError(413, "Demo request is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new DemoError(400, "A valid JSON object is required");
  }
}

export function requiredText(value: unknown, field: string, limit: number): string {
  if (typeof value !== "string") throw new DemoError(400, `Enter a valid ${field}`);
  const result = value.trim();
  if (!result || result.length > limit) throw new DemoError(400, `Enter a valid ${field}`);
  return result;
}

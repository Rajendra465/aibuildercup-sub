import fs from "fs";
import path from "path";

/**
 * Tiny JSON-file collection store. Each collection is one array in
 * `${DATA_DIR}/<name>.json`. Good enough for a single Cloud Run instance or
 * local dev; swap for Firestore when traffic needs it.
 */
export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function collectionPath(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid collection name: ${name}`);
  }
  return path.join(dataDir(), `${name}.json`);
}

export function readCollection<T>(name: string, fallback: readonly T[] = []): T[] {
  const filePath = collectionPath(name);
  if (!fs.existsSync(filePath)) return [...fallback];

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [...fallback];
  } catch (error) {
    console.error(`Corrupt collection ${name}; using fallback`, error);
    return [...fallback];
  }
}

export function writeCollection<T>(name: string, items: readonly T[]): void {
  const filePath = collectionPath(name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2));
  fs.renameSync(tmpPath, filePath);
}

export function appendToCollection<T>(name: string, item: T, fallback: readonly T[] = []): T[] {
  const next = [...readCollection<T>(name, fallback), item];
  writeCollection(name, next);
  return next;
}

export function upsertInCollection<T extends { id: string }>(name: string, item: T, fallback: readonly T[] = []): T[] {
  const current = readCollection<T>(name, fallback);
  const next = current.some((entry) => entry.id === item.id)
    ? current.map((entry) => (entry.id === item.id ? item : entry))
    : [...current, item];
  writeCollection(name, next);
  return next;
}

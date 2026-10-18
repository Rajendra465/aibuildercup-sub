import type { Firestore } from "firebase-admin/firestore";

/**
 * Durable persistence in Cloud Firestore (via the Firebase Admin SDK).
 *
 * The app reads its collections synchronously from the local JSON store, which acts as a
 * per-instance cache. When FIRESTORE_ENABLED=1 every write is mirrored to Firestore, and on
 * server start the cache is hydrated from Firestore, so campaigns, analytics events, scene
 * analyses and render jobs survive Cloud Run instance restarts and scale-outs.
 */
export const SYNCED_COLLECTIONS = ["campaigns", "ad-events", "scene-safety", "scout"] as const;
const JOBS = "jobs";
const BATCH_LIMIT = 400;

let db: Firestore | null = null;
const knownIds = new Map<string, Set<string>>();
const queues = new Map<string, Promise<void>>();

export const firestoreEnabled = (): boolean => process.env.FIRESTORE_ENABLED === "1";

async function getDb(): Promise<Firestore> {
  if (db) return db;
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  // On Cloud Run, Application Default Credentials come from the service account.
  const app = getApps()[0] ?? initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
  const instance = getFirestore(app);
  // Next bundles this module more than once (instrumentation + routes) and they share one
  // Firestore instance, so settings() succeeds only for the first copy that gets here.
  try {
    instance.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already configured by another bundle copy.
  }
  db = instance;
  return instance;
}

const docId = (item: unknown, index: number): string => {
  const id = (item as { id?: unknown })?.id;
  return typeof id === "string" && id ? id.replace(/\//g, "_") : `item-${index}`;
};

/** Runs writes for one key in order, so a slow write never lands after a newer one. */
function enqueue(key: string, task: () => Promise<void>): void {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.then(task).catch((error) => console.error(`Firestore sync failed for ${key}`, error));
  queues.set(key, next);
}

export function mirrorCollection<T>(name: string, items: readonly T[]): void {
  if (!firestoreEnabled()) return;
  const snapshot = items.map((item, index) => ({ id: docId(item, index), data: JSON.parse(JSON.stringify(item)) as Record<string, unknown> }));
  enqueue(name, async () => {
    const store = await getDb();
    const ids = new Set(snapshot.map((entry) => entry.id));
    const removed = [...(knownIds.get(name) ?? [])].filter((id) => !ids.has(id));
    const ops: { id: string; data: Record<string, unknown> | null }[] = [...snapshot, ...removed.map((id) => ({ id, data: null }))];
    for (let start = 0; start < ops.length; start += BATCH_LIMIT) {
      const batch = store.batch();
      for (const op of ops.slice(start, start + BATCH_LIMIT)) {
        const ref = store.collection(name).doc(op.id);
        if (op.data) batch.set(ref, op.data);
        else batch.delete(ref);
      }
      await batch.commit();
    }
    knownIds.set(name, ids);
  });
}

export function mirrorJob<T extends { id: string }>(job: T): void {
  if (!firestoreEnabled()) return;
  const data = JSON.parse(JSON.stringify(job)) as Record<string, unknown>;
  enqueue(`${JOBS}/${job.id}`, async () => {
    const store = await getDb();
    await store.collection(JOBS).doc(docId(job, 0)).set(data);
  });
}

/** Loads every synced collection from Firestore. Returns name -> items for collections that have data. */
export async function loadFromFirestore(): Promise<Map<string, unknown[]>> {
  const loaded = new Map<string, unknown[]>();
  if (!firestoreEnabled()) return loaded;
  const store = await getDb();
  for (const name of SYNCED_COLLECTIONS) {
    const snap = await store.collection(name).get();
    knownIds.set(name, new Set(snap.docs.map((doc) => doc.id)));
    if (!snap.empty) loaded.set(name, snap.docs.map((doc) => doc.data()));
  }
  return loaded;
}

export async function listFirestoreJobs<T>(): Promise<T[]> {
  if (!firestoreEnabled()) return [];
  const store = await getDb();
  const snap = await store.collection(JOBS).get();
  return snap.docs.map((doc) => doc.data() as T);
}

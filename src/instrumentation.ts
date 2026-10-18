/** Runs once when the server starts: hydrate the local cache from Cloud Firestore. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.FIRESTORE_ENABLED !== "1") return;
  const { loadFromFirestore } = await import("./lib/store/firestore-sync");
  const { writeLocalCollection } = await import("./lib/store/json-store");
  try {
    const loaded = await loadFromFirestore();
    for (const [name, items] of loaded) writeLocalCollection(name, items);
    console.log(`Hydrated ${loaded.size} collections from Firestore`);
  } catch (error) {
    console.error("Firestore hydration failed; starting from local data", error);
  }
}

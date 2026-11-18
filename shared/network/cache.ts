import { buildMapNetwork, isNetwork } from "./network";
import type { Network } from "../types/v1/network";

export const NETWORK_STORAGE_KEY = "metro-shared-network-v1";

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// Keep writes ordered even when storage finishes asynchronous calls out of order.
const writes = new WeakMap<Storage, Promise<void>>();

// An empty or incomplete response must never replace a usable offline map.
export async function loadNetwork(storage: Storage): Promise<Network | null> {
  await writes.get(storage);
  const value = await storage.getItem(NETWORK_STORAGE_KEY);
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isNetwork(parsed) && !buildMapNetwork(parsed).incomplete
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export async function saveNetwork(
  storage: Storage,
  network: Network,
): Promise<void> {
  if (buildMapNetwork(network).incomplete) return;
  const write = (writes.get(storage) ?? Promise.resolve()).then(() =>
    storage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(network)),
  );
  writes.set(
    storage,
    write.catch(() => undefined),
  );
  await write;
}

// Wait for earlier saves so a pending fetch cannot restore data after logout.
export async function clearNetwork(storage: Storage): Promise<void> {
  const clear = (writes.get(storage) ?? Promise.resolve()).then(() =>
    storage.removeItem(NETWORK_STORAGE_KEY),
  );
  writes.set(
    storage,
    clear.catch(() => undefined),
  );
  await clear;
}

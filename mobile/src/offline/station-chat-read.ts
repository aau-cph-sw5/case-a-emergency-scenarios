import AsyncStorage from "@react-native-async-storage/async-storage";

// The newest message a steward has already read in their current station's
// thread (MET-A-029, #446). Kept on the phone so the unread badge survives
// disconnects, backgrounding and app restarts. One record per steward keeps
// storage bounded; a marker for another activation or station is ignored and
// cleared at stand-down or sign-out. A lost marker only shows read messages
// as new again.

const KEY_PREFIX = "station-chat-read/";

type ReadRecord = {
  activationId: number;
  station: string;
  lastReadId: number;
};

function key(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function parseRecord(raw: string | null): ReadRecord | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { activationId, station, lastReadId } = parsed as Record<
      string,
      unknown
    >;
    if (
      typeof activationId !== "number" ||
      !Number.isFinite(activationId) ||
      typeof station !== "string" ||
      typeof lastReadId !== "number" ||
      !Number.isFinite(lastReadId)
    ) {
      return null;
    }
    return { activationId, station, lastReadId };
  } catch {
    return null;
  }
}

async function readRecord(userId: string): Promise<ReadRecord | null> {
  try {
    return parseRecord(await AsyncStorage.getItem(key(userId)));
  } catch {
    return null;
  }
}

export async function lastReadMessageId(
  userId: string,
  activationId: number,
  station: string,
): Promise<number | null> {
  const record = await readRecord(userId);
  if (
    record === null ||
    record.activationId !== activationId ||
    record.station !== station
  ) {
    return null;
  }
  return record.lastReadId;
}

export async function markStationChatRead(
  userId: string,
  activationId: number,
  station: string,
  messageId: number,
): Promise<void> {
  const existing = await lastReadMessageId(userId, activationId, station);
  if (existing !== null && existing >= messageId) return;
  try {
    const record: ReadRecord = {
      activationId,
      station,
      lastReadId: messageId,
    };
    await AsyncStorage.setItem(key(userId), JSON.stringify(record));
  } catch {
    // A lost marker only shows already read messages as new again.
  }
}

export async function forgetStationChatRead(
  userId: string,
  keepActivationId: number | null,
): Promise<void> {
  try {
    if (keepActivationId !== null) {
      const record = await readRecord(userId);
      if (record !== null && record.activationId === keepActivationId) return;
    }
    await AsyncStorage.removeItem(key(userId));
  } catch {
    // Leaving a stale marker behind cannot affect a later activation.
  }
}

export async function clearStationChatRead(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((name) =>
      name.startsWith(KEY_PREFIX),
    );
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Sign-out still finishes; a leftover marker only affects its own thread.
  }
}

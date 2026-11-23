import AsyncStorage from "@react-native-async-storage/async-storage";

// Which messages in a station's thread this steward wrote on this phone
// (MET-A-029, #335). The thread belongs to the station, so every steward
// checked in there writes as the station, and the server never says who
// wrote a message. The phone remembers the clientMessageId of each message it
// sent, so the chat can tell the steward's own messages from colleagues'.
// Kept per steward, activation and station; a lost list only makes the
// steward's own messages look like a colleague's.

const KEY_PREFIX = "station-chat-own/";

function key(userId: string, activationId: number, station: string): string {
  return `${KEY_PREFIX}${userId}/${activationId}/${station}`;
}

// The ids are compared in lower case, as the server stores them.
export async function ownMessageIds(
  userId: string,
  activationId: number,
  station: string,
): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(userId, activationId, station));
    const ids: unknown = raw === null ? [] : JSON.parse(raw);
    return new Set(
      Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export async function rememberOwnMessage(
  userId: string,
  activationId: number,
  station: string,
  clientMessageId: string,
): Promise<void> {
  const ids = await ownMessageIds(userId, activationId, station);
  ids.add(clientMessageId.toLowerCase());
  try {
    await AsyncStorage.setItem(
      key(userId, activationId, station),
      JSON.stringify([...ids]),
    );
  } catch {
    // The message is still sent; it only shows as a colleague's later.
  }
}

// Forgets every remembered message id on the phone, for all stewards
// (MET-A-029, #445). Called at sign-out so a signed-out phone keeps none.
export async function forgetOwnMessages(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((name) =>
      name.startsWith(KEY_PREFIX),
    );
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // A leftover id list only marks messages as own if the same id appears again.
  }
}

import React from "react";

export function ConnectionState({ isConnected }: { isConnected: boolean }) {
  return <p>State: {"" + isConnected}</p>;
}

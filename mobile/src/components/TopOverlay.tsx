import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

// The corner rounding of a notification, as on Android (16).
export const overlayRadius = 16;

// THE place a notification shows in the steward app: on top of the screen, at
// the top, over whatever is there. It is positioned absolutely, so nothing
// under it moves or shrinks while it shows, and it lets touches through
// everywhere except on the notifications themselves. Several notifications
// stack in a column, the newest on top. Put it last inside the screen's own
// container (RoleView).
export function TopOverlay({ children }: { children: ReactNode }) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    gap: 8,
    left: 8,
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 10,
  },
});

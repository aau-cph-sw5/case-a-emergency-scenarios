import { useState, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// THE way content opens and closes in the steward app (#377). The content is
// always laid out at its full, open size and pinned to the edge of the box
// that stands still (anchor). When the box opens or closes (animateNextLayout
// moves its other edge), that moving edge uncovers or covers the content
// pixel by pixel, like a frame sliding over it. The text itself never moves,
// fades or appears late.
//
// Example: the tasks after check in are pinned to the bottom of their box,
// so the heading strip sliding up uncovers them from the top down; the other
// stations are pinned to the top, so the tasks strip sliding down uncovers
// them. openStyle is the box's size when open (for example flex: 1); closed,
// the box has no height and its content is hidden from touch and screen
// readers.
export function RevealBox({
  open,
  anchor,
  openStyle,
  children,
  testID,
}: {
  open: boolean;
  anchor: "top" | "bottom";
  openStyle: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}) {
  // The open height, kept while the box is closed, so the content keeps its
  // size (and its place) while the box closes and opens again.
  const [height, setHeight] = useState(0);

  return (
    <View
      style={[open ? openStyle : { height: 0 }, { overflow: "hidden" }]}
      onLayout={(event) => {
        if (open) setHeight(event.nativeEvent.layout.height);
      }}
      pointerEvents={open ? "auto" : "none"}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!open}
      testID={testID}
    >
      <View
        testID={testID && `${testID}-content`}
        style={
          height > 0
            ? { position: "absolute", left: 0, right: 0, [anchor]: 0, height }
            : // Not measured yet (the first time it is open): in the flow.
              { flex: 1 }
        }
      >
        {children}
      </View>
    </View>
  );
}

import Svg, { Path } from "react-native-svg";

// Metro's double arrow from the brand guide: two thin chevrons with round
// ends (#375). The slide shows three of them in its track, pointing the way
// the knob goes, and one on the knob itself. height sets the size; the width
// follows from the drawing (15 by 12).
export function DoubleArrow({
  height,
  color,
}: {
  height: number;
  color: string;
}) {
  return (
    <Svg
      width={(height * 15) / 12}
      height={height}
      viewBox="0 0 15 12"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 1.5l4.5 4.5-4.5 4.5M7.5 1.5l4.5 4.5-4.5 4.5" />
    </Svg>
  );
}

import Svg, { Path } from "react-native-svg";
import { palette } from "../../../shared/Theme";

// Metro's logo (#376), unchanged from the RGB version without box in the
// brand guide's logo pack (brandguide.m.dk), in Summer Red. The drawing is
// mobile/assets/metro-logo.svg, cropped to the logo itself; it is repeated
// here because the app draws SVG with react-native-svg and has no loader for
// .svg files. The guide allows the logo without its white box only on a white
// background, so it belongs on the white header. height sets the size; the
// width follows from the drawing (688 by 492).
export function MetroLogo({ height }: { height: number }) {
  return (
    <Svg
      width={(height * 688) / 492}
      height={height}
      viewBox="156 254 688 492"
      accessibilityRole="image"
      accessibilityLabel="Metro"
    >
      <Path
        fill={palette.metroSummerRed}
        d="M815.16,581.6h-128.15l-27.13-323.58-.26-3.29h-123.97l-.54,2.91-35.66,186.44-39.32-186.51-.59-2.85h-118.53l-.26,3.29-27.08,323.58h-128.8c-15.92,0-28.92,13.05-28.92,28.97v105.91c0,15.97,13,28.97,28.92,28.97h630.31c15.92,0,28.92-13.05,28.92-28.97v-105.91c0-15.97-13-28.97-28.92-28.97ZM605.13,581.6h-69.35l51.75-231.39,17.6,231.39ZM413.23,349.51l54.45,232.08h-72.04l17.59-232.08Z"
      />
    </Svg>
  );
}

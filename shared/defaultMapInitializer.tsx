import MapRender from './MapRenderer';
import { getLines } from '../mockData/data';
import { lineColors } from './Theme';

const colors = {
  M1: lineColors[0],
  M2: lineColors[1],
  M3: lineColors[2],
  M4: lineColors[3],
};
 
// Renders the original M1-M4 map from data.js
export default function DefaultMapInitializer() {
  return <MapRender lines={getLines().map((l) => ({ ...l, tracks: [1, 2] }))} colors={colors} />;
}
 

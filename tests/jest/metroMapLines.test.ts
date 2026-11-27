import {
  idleStretchLines,
  IDLE_LINE,
  OPEN_LINE,
} from "../../web/src/components/metroMapLines";
import { connectionKey } from "../../shared/network/network";

const line = (
  name: string,
  connections: [string, string][],
  tracks = [1, 2],
) => ({
  name,
  tracks,
  connections,
});

it("shared open track is drawn once, duplicate connections collapse", () => {
  const closed = line("Spærret", [["A", "B"]], [1]);
  const m1 = line("M1", [
    ["A", "B"],
    ["B", "A"],
    ["B", "C"],
  ]);
  const m2 = line("M2", [["A", "B"]]);
  const out = idleStretchLines([m1, m2], [closed], closed);
  const open = out.filter((l) => l.name.startsWith(OPEN_LINE));
  expect(open).toHaveLength(1);
  expect(open[0].name).toBe(`${OPEN_LINE}-M1`);
  expect(open[0].connectionTracks?.[connectionKey("A", "B")]).toEqual([2]);
  const idle = out.find((l) => l.name === IDLE_LINE);
  expect(idle?.connections).toEqual([["B", "C"]]);
  expect(idle?.tracks).toEqual([1, 2]);
});

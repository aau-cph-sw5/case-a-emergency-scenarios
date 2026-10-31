import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomedViewBox } from "../../mobile/src/screens/map-zoom.ts";

const parse = (viewBox) => viewBox.split(" ").map(Number);
// The map box on an A52/A55: about 387 x 250 dp.
const WIDTH = 387;
const HEIGHT = 250;

test("zooms in so the 18 unit station names are at least 12 dp", () => {
  const [, , width] = parse(
    zoomedViewBox(["FOR", "KN", "KGN"], WIDTH, HEIGHT, 1),
  );
  assert.ok((WIDTH / width) * 18 >= 12);
});

test("zooms in further at a larger font size", () => {
  const [, , normal] = parse(
    zoomedViewBox(["FOR", "KN", "KGN"], WIDTH, HEIGHT, 1),
  );
  const [, , large] = parse(
    zoomedViewBox(["FOR", "KN", "KGN"], WIDTH, HEIGHT, 2),
  );
  assert.ok(large < normal);
  assert.ok((WIDTH / large) * 18 >= 24);
});

test("keeps the box's shape and the whole stretch in view", () => {
  const [x, y, width, height] = parse(
    zoomedViewBox(["FOR", "KN", "KGN"], WIDTH, HEIGHT, 2),
  );
  assert.ok(Math.abs(height / width - HEIGHT / WIDTH) < 0.01);
  // FOR and KGN, the ends of the stretch.
  for (const [stationX, stationY] of [
    [465, 343],
    [648, 347],
  ]) {
    assert.ok(stationX > x && stationX < x + width);
    assert.ok(stationY > y && stationY < y + height);
  }
});

test("never zooms out past the whole map", () => {
  const [x, , width] = parse(
    zoomedViewBox(["VAN", "CPH", "ORK", "VEA"], WIDTH, HEIGHT, 1),
  );
  assert.equal(x, 0);
  assert.equal(width, 950);
});

test("shows the whole map when nothing can be placed or measured", () => {
  assert.equal(zoomedViewBox(["XYZ"], WIDTH, HEIGHT, 1), undefined);
  assert.equal(zoomedViewBox(["FOR"], 0, 0, 1), undefined);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OVERLAY_ASPECT,
  fitViewBoxToAspect,
  zoomedViewBox,
} from "../../mobile/src/screens/map-zoom.ts";

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

test("fitViewBoxToAspect expands height to match portrait aspect and keeps area centered", () => {
  const fitted = fitViewBoxToAspect("10 110 380 280", 0, 0);
  const [x, y, width, height] = parse(fitted);
  assert.equal(x, 10);
  assert.equal(width, 380);
  assert.ok(Math.abs(width / height - DEFAULT_OVERLAY_ASPECT) < 0.01);
  assert.ok(y <= 110 && y + height >= 390);
});

test("fitViewBoxToAspect expands width to match landscape container", () => {
  const fitted = fitViewBoxToAspect("10 110 380 280", 600, 300);
  const [x, y, width, height] = parse(fitted);
  assert.equal(y, 110);
  assert.equal(height, 280);
  assert.equal(width, 560);
  assert.equal(x, -80);
});

test("fitViewBoxToAspect handles undefined and invalid viewBox strings", () => {
  assert.equal(fitViewBoxToAspect(undefined, 400, 500), undefined);
  assert.equal(fitViewBoxToAspect("bad", 400, 500), "bad");
  assert.equal(fitViewBoxToAspect("0 0 0 100", 400, 500), "0 0 0 100");
});

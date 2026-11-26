import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { SCENARIO_CHANNEL_ID } from "../../shared/push-channels.js";
import {
  inLineGroupOrder,
  scenarioMessage,
} from "../../src/services/push-service.js";

// ADR 0014: what a phone offline at send time gets
test("a scenario push replaces an older one for the same line group and expires after an hour", () => {
  const message = scenarioMessage(
    ["token"],
    "M3_M4",
    "started",
    "Brand på Nørreport",
  );

  assert.deepEqual(message.tokens, ["token"]);
  assert.equal(message.android?.collapseKey, "scenario-M3_M4");
  assert.equal(message.android?.ttl, 60 * 60 * 1000);
  assert.equal(message.android?.priority, "high");
  assert.equal(message.android?.notification?.channelId, SCENARIO_CHANNEL_ID);
});

test("a scenario push says whether the scenario started or ended", () => {
  const started = scenarioMessage(["token"], "M1_M2", "started", "Brand");
  const ended = scenarioMessage(["token"], "M1_M2", "ended", "Brand");

  assert.deepEqual(started.notification, {
    title: "Scenarie startet",
    body: "Brand",
  });
  assert.deepEqual(ended.notification, {
    title: "Scenarie afsluttet",
    body: "Brand",
  });
});

test("a line group's pushes go out in order, so a slow 'ended' cannot overtake 'started'", async () => {
  const sent: string[] = [];

  await Promise.all([
    inLineGroupOrder("M1_M2", async () => {
      await delay(20);
      sent.push("ended");
    }),
    inLineGroupOrder("M1_M2", async () => {
      sent.push("started");
    }),
  ]);

  assert.deepEqual(sent, ["ended", "started"]);
});

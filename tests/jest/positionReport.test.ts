import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { sendPositionReport } from "../../mobile/src/api/position-report";
import { ERROR_CODES } from "../../shared/error-codes";

function respond(status: number, body?: unknown) {
  return jest.spyOn(global, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("no body");
      return body;
    },
  } as Response);
}

afterEach(() => jest.restoreAllMocks());

describe("sendPositionReport (MET-A-013)", () => {
  it("posts the station with the token and confirms an accepted report", async () => {
    const fetchMock = respond(201, {});

    const result = await sendPositionReport("token-1", "Station B", 1);

    expect(result).toEqual({ ok: true, message: "Position sendt: Station B" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/position-reports$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(JSON.parse(init.body as string)).toMatchObject({
      activationId: 1,
      station: "Station B",
    });
  });

  it("sends the event when one is given, and leaves it out otherwise", async () => {
    const fetchMock = respond(202, {});

    await sendPositionReport("token", "Station B", 1, "ARRIVED");
    await sendPositionReport("token", "Station B", 1);

    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    );
    expect(bodies[0].event).toBe("ARRIVED");
    expect("event" in bodies[1]).toBe(false);
  });

  it("shows a refusal in Danish from the error code", async () => {
    respond(422, { error: { code: ERROR_CODES.STATION_NOT_IN_SCENARIO } });

    expect(await sendPositionReport("token", "Station X", 1)).toEqual({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
      code: ERROR_CODES.STATION_NOT_IN_SCENARIO,
    });
  });

  it("explains a status change the server does not permit (#310)", async () => {
    respond(409, { error: { code: ERROR_CODES.INVALID_STATUS_TRANSITION } });

    expect(await sendPositionReport("token", "Station C", 1, "EN_ROUTE")).toEqual({
      ok: false,
      message:
        "Din status er ændret et andet sted. Vi henter din aktuelle status.",
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
    });
  });

  it("tells the steward why a report against a superseded scenario was refused", async () => {
    respond(409, { error: { code: ERROR_CODES.SCENARIO_STOOD_DOWN } });

    expect(await sendPositionReport("token", "Station B", 1)).toEqual({
      ok: false,
      message:
        "Scenariet er blevet stoppet eller skiftet. Positionen blev ikke modtaget.",
    });
  });

  it("falls back to a general message for an unknown code or no body", async () => {
    respond(500);

    expect(await sendPositionReport("token", "Station B", 1)).toEqual({
      ok: false,
      message: "Positionen blev ikke modtaget.",
    });
  });

  it("says there is no connection when the request fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("offline"));

    expect(await sendPositionReport("token", "Station B", 1)).toEqual({
      ok: false,
      message: "Ingen forbindelse til serveren.",
    });
  });
});

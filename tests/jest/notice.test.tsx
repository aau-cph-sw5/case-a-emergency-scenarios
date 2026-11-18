import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Vibration } from "react-native";
import type { ActiveScenarioView } from "../../shared/offline/use-active-scenario";
import {
  liveNotices,
  NoticeStack,
  stoodDownNotice,
} from "../../mobile/src/screens/Notice";

const snapshot = {
  scenario: { name: "Metro stop" },
} as unknown as Extract<ActiveScenarioView, { status: "live" }>["snapshot"];

// 14:32 and 15:05 on the phone's own clock, whatever time zone it runs in.
const at = (hour: number, minute: number) =>
  new Date(2026, 10, 18, hour, minute).toISOString();

const live = (
  notices: Extract<ActiveScenarioView, { status: "live" }>["notices"],
): ActiveScenarioView => ({ status: "live", snapshot, notices });

afterEach(() => jest.restoreAllMocks());

describe("the words of a notice", () => {
  it("tells a stood down scenario by its name", () => {
    expect(
      stoodDownNotice({ status: "stood-down", scenarioName: "Metro stop" }),
    ).toEqual({
      title: "Scenariet er afsluttet",
      text: "“Metro stop” er deaktiveret af kontrolrummet. Genoptag normal drift.",
    });
  });

  it("has no stood down notice for any other view", () => {
    expect(stoodDownNotice({ status: "none" })).toBeNull();
    expect(stoodDownNotice(live([]))).toBeNull();
  });

  it("lists the live notices newest first, each with its own words", () => {
    const notices = liveNotices(
      live([
        { id: 1, at: at(14, 32), kind: "activated" },
        { id: 2, at: at(15, 5), kind: "switched", from: "Station E" },
      ]),
    );

    expect(notices.map((notice) => notice.id)).toEqual([2, 1]);
    expect(notices[0]).toMatchObject({
      time: "15:05",
      title: "Scenariet er skiftet",
      text: "“Station E” er afløst af “Metro stop”.",
    });
    expect(notices[1]).toMatchObject({
      time: "14:32",
      title: "Nyt scenarie aktiveret",
      text: "“Metro stop” er aktiveret af kontrolrummet.",
    });
  });

  it("has no notices unless the scenario is live", () => {
    expect(liveNotices({ status: "none" })).toEqual([]);
  });
});

describe("NoticeStack", () => {
  const notices = [
    {
      id: 2,
      time: "15:05",
      title: "Scenariet er skiftet",
      text: "B afløser A.",
    },
    {
      id: 1,
      time: "",
      title: "Nyt scenarie aktiveret",
      text: "A er aktiveret.",
    },
  ];

  it("shows nothing without notices", () => {
    render(<NoticeStack notices={[]} onDismiss={jest.fn()} />);

    expect(screen.toJSON()).toBeNull();
  });

  it("shows every notice and vibrates once for each", () => {
    const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation();

    render(<NoticeStack notices={notices} onDismiss={jest.fn()} />);

    expect(screen.getByText("Scenariet er skiftet")).toBeTruthy();
    expect(screen.getByText("A er aktiveret.")).toBeTruthy();
    // The header says when the scenario was activated, and only the app name
    // when that time is not known.
    expect(screen.getByText("Metro Service · 15:05")).toBeTruthy();
    expect(screen.getByText("Metro Service")).toBeTruthy();
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("dismisses the one notice that was swiped away", () => {
    jest.useFakeTimers();
    jest.spyOn(Vibration, "vibrate").mockImplementation();
    const onDismiss = jest.fn();
    render(<NoticeStack notices={notices} onDismiss={onDismiss} />);

    const [newest] = screen.UNSAFE_root.findAll(
      (node) => typeof node.props.onAccessibilityAction === "function",
    );
    act(() =>
      newest.props.onAccessibilityAction({
        nativeEvent: { actionName: "dismiss" },
      }),
    );
    act(() => void jest.advanceTimersByTime(1000));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(2);
    jest.useRealTimers();
  });
});
